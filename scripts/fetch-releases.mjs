// Bakes the latest GitHub release for each repo referenced by the changelog into
// a static JSON file consumed by components/latest-release.jsx. This runs at
// build time (see the "prebuild" script) because GitHub Pages has no server to
// proxy/cache the GitHub API at request time, as the old /api route did.
//
// In CI the Actions-provided GITHUB_TOKEN raises the API rate limit to ~1000/hr,
// so the full repo set is fetched comfortably. Locally (no token) the
// unauthenticated 60/hr limit is still plenty for the handful of repos here.
//
// The script is intentionally fault-tolerant: a failed fetch for one repo leaves
// that repo's previously-baked data in place (or absent) rather than aborting the
// build. The component renders a "view releases on GitHub" fallback for any repo
// without data.

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const contentDir = join(root, 'content')
const outFile = join(root, 'data', 'releases.json')

const ORG = 'openmrs'

// We only keep the fields the component actually renders to keep the bundled
// JSON small; release bodies can be large and there are many repos.
function pick(release) {
  return {
    name: release.name,
    tag_name: release.tag_name,
    published_at: release.published_at,
    body: release.body,
  }
}

// Recursively collect every repo referenced via <LatestRelease repo="..." /> in
// the MDX content, so the data set stays in sync with the changelog without a
// hardcoded list.
async function collectRepos(dir, repos) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      await collectRepos(full, repos)
    } else if (entry.name.endsWith('.mdx')) {
      const text = await readFile(full, 'utf8')
      for (const match of text.matchAll(/repo="([^"]+)"/g)) {
        repos.add(match[1])
      }
    }
  }
  return repos
}

async function loadExisting() {
  if (!existsSync(outFile)) return {}
  try {
    return JSON.parse(await readFile(outFile, 'utf8'))
  } catch {
    return {}
  }
}

async function main() {
  const repos = [...(await collectRepos(contentDir, new Set()))].sort()
  const data = await loadExisting()

  const token = process.env.GITHUB_TOKEN
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'OpenMRS-O3-Docs',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }

  let updated = 0
  for (const repo of repos) {
    const url = `https://api.github.com/repos/${ORG}/${repo}/releases/latest`
    try {
      const response = await fetch(url, { headers })
      if (!response.ok) {
        console.warn(`[releases] ${repo}: HTTP ${response.status}, keeping existing data`)
        continue
      }
      data[repo] = pick(await response.json())
      updated++
    } catch (error) {
      console.warn(`[releases] ${repo}: ${error.message}, keeping existing data`)
    }
  }

  await mkdir(dirname(outFile), { recursive: true })
  await writeFile(outFile, `${JSON.stringify(data, null, 2)}\n`)
  console.log(`[releases] wrote ${Object.keys(data).length} repos (${updated} refreshed) to data/releases.json`)
}

main()
