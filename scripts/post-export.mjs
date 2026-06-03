// Post-processes the static export (out/) to restore behaviour that previously
// depended on the Next.js server/middleware, which does not exist on GitHub Pages:
//
//  1. Root landing page  — middleware used to detect the visitor's language and
//     redirect "/" to the right locale. We instead ship out/index.html with a
//     client-side detector (localStorage -> navigator.languages -> en-US).
//  2. 404 fallback        — GitHub Pages serves 404.html for any unmatched path.
//     We inject the same detector so a locale-less deep link (e.g. /docs/intro)
//     is rerouted to its locale-prefixed equivalent instead of dead-ending.
//
// BASE_PATH must match next.config.mjs so the generated absolute URLs line up
// with the subpath the site is served from (project page or PR preview).

import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'out')

const basePath = process.env.BASE_PATH || ''
const locales = ['en-US', 'fr-FR']
const defaultLocale = 'en-US'
// Where "/" sends visitors: the locale home page (content/<locale>/index.mdx),
// served at the locale root.
const landing = '/'

// Shared detector, emitted verbatim into both the root page and 404.html. base,
// locales and defaultLocale are injected as literals so the script is fully
// self-contained (no module system on a static page).
const detectorSource = `
  const base = ${JSON.stringify(basePath)};
  const locales = ${JSON.stringify(locales)};
  const defaultLocale = ${JSON.stringify(defaultLocale)};
  const baseOf = (l) => l.toLowerCase().split('-')[0];
  function detect() {
    try {
      const stored = localStorage.getItem('locale');
      if (stored && locales.includes(stored)) return stored;
    } catch (e) {}
    const prefs = navigator.languages || (navigator.language ? [navigator.language] : []);
    for (const pref of prefs) {
      if (locales.includes(pref)) return pref;
      const match = locales.find((l) => baseOf(l) === baseOf(pref));
      if (match) return match;
    }
    return defaultLocale;
  }`

const rootScript = `(function () {${detectorSource}
  location.replace(base + '/' + detect() + ${JSON.stringify(landing)});
})();`

// On a 404, only redirect when the path is NOT already inside a known locale —
// otherwise it is a genuine missing page and we let the 404 content show
// (which also prevents redirect loops, since the redirect target always carries
// a locale prefix).
const notFoundScript = `(function () {${detectorSource}
  let path = location.pathname;
  if (base && path.startsWith(base)) path = path.slice(base.length);
  if (path.startsWith('/')) {
    const seg = path.split('/')[1];
    if (locales.includes(seg)) return;
  }
  location.replace(base + '/' + detect() + path + location.search + location.hash);
})();`

function noscriptLinks() {
  return locales
    .map((l) => `<a href="${basePath}/${l}${landing}">${l}</a>`)
    .join(' · ')
}

async function writeRootIndex() {
  const html = `<!DOCTYPE html>
<html lang="${defaultLocale}">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex" />
    <title>OpenMRS O3 Docs</title>
    <script>${rootScript}</script>
  </head>
  <body>
    <noscript>Choose a language: ${noscriptLinks()}</noscript>
  </body>
</html>
`
  await writeFile(join(outDir, 'index.html'), html)
  console.log('[post-export] wrote out/index.html (locale-detecting landing page)')
}

async function patch404() {
  const file = join(outDir, '404.html')
  if (!existsSync(file)) {
    console.warn('[post-export] out/404.html not found; skipping 404 enhancement')
    return
  }
  const html = await readFile(file, 'utf8')
  const tag = `<script>${notFoundScript}</script>`
  // Run the redirect as early as possible, before the (irrelevant) 404 UI paints.
  const patched = html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`
  await writeFile(file, patched)
  console.log('[post-export] injected locale-aware redirect into out/404.html')
}

async function main() {
  if (!existsSync(outDir)) {
    throw new Error('out/ not found; run "next build" (output: export) first')
  }
  await writeRootIndex()
  await patch404()
  // GitHub Pages runs Jekyll by default, which strips directories beginning with
  // an underscore (_next, _pagefind). An empty .nojekyll disables that.
  await writeFile(join(outDir, '.nojekyll'), '')
  console.log('[post-export] wrote out/.nojekyll')
}

main()
