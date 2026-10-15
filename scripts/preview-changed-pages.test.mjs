import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { changedPagesSection, updatePreviewComment } from './preview-changed-pages.mjs';

async function exportedPages(t, routes) {
  const root = await mkdtemp(join(tmpdir(), 'preview-pages-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const route of routes) {
    await mkdir(join(root, route), { recursive: true });
    await writeFile(join(root, route, 'index.html'), '');
  }
  return root;
}
const file = (filename, status = 'modified') => ({ filename, status });

test('links current renamed routes and index pages under the preview base, excluding removed and unbuilt pages', async (t) => {
  const outputDir = await exportedPages(t, ['en-US/docs/new', 'fr-FR/docs', 'en-US/docs/deleted']);
  const section = await changedPagesSection([
    { ...file('content/en-US/docs/new.mdx', 'renamed'), previous_filename: 'content/en-US/docs/old.mdx' },
    file('content/fr-FR/docs/index.mdx', 'added'),
    file('content/en-US/docs/deleted.mdx', 'removed'),
    file('content/en-US/docs/missing.mdx'),
    file('content/en-US/docs/_meta.js'),
    file('content/en-US/docs/_partial.mdx'),
    file('README.md'),
  ], 'https://example.org/repo/pr-preview/pr-10/', outputDir);
  assert.match(section, /\[en-US: docs\/new\]\(https:\/\/example.org\/repo\/pr-preview\/pr-10\/en-US\/docs\/new\/\)/);
  assert.match(section, /\[fr-FR: docs\]\(https:\/\/example.org\/repo\/pr-preview\/pr-10\/fr-FR\/docs\/\)/);
  assert.doesNotMatch(section, /old|deleted|missing|_meta|_partial|README/);
});

test('caps links at five and groups language variants before truncating', async (t) => {
  const routes = ['en-US/docs/a', 'en-US/docs/b', 'en-US/docs/c', 'fr-FR/docs/a', 'fr-FR/docs/b', 'fr-FR/docs/c'];
  const outputDir = await exportedPages(t, routes);
  const section = await changedPagesSection(routes.map((route) => file(`content/${route}.mdx`)), 'https://example.org/preview', outputDir);
  const links = section.split('\n').filter((line) => line.startsWith('- '));
  assert.equal(links.length, 5);
  assert.match(links[0], /en-US: docs\/a/);
  assert.match(links[1], /fr-FR: docs\/a/);
  assert.match(section, /1 more changed page/);
});

test('encodes route segments and omits the section when no pages qualify', async (t) => {
  const outputDir = await exportedPages(t, ['fr-FR/docs/été']);
  assert.match(await changedPagesSection([file('content/fr-FR/docs/été.mdx')], 'https://example.org', outputDir), /fr-FR\/docs\/%C3%A9t%C3%A9\//);
  assert.equal(await changedPagesSection([file('scripts/build.mjs')], 'https://example.org', outputDir), '');
});

test('updates the existing bot comment, replaces stale links, and leaves its home link intact', async (t) => {
  const outputDir = await exportedPages(t, ['en-US/docs/new']);
  const home = '[View preview](https://example.org/preview/)\n<!-- Sticky Pull Request Commentpr-preview -->';
  let body = `${home}\n\n<!-- preview-changed-pages -->\nOld links`;
  let files = [file('content/en-US/docs/new.mdx')];
  let writes = 0;
  const github = {
    rest: { pulls: { listFiles: 'files' }, issues: { listComments: 'comments', updateComment: async (args) => {
      assert.equal(args.comment_id, 123);
      body = args.body;
      writes++;
    } } },
    paginate: async (endpoint, args) => {
      assert.equal(args.per_page, 100);
      return endpoint === 'files' ? files : [
        { id: 122, user: { login: 'contributor' }, body: home },
        { id: 123, user: { login: 'github-actions[bot]' }, body },
      ];
    },
  };
  const options = { github, context: { repo: { owner: 'openmrs', repo: 'docs' }, issue: { number: 10 } }, previewUrl: 'https://example.org/preview/', outputDir };
  await updatePreviewComment(options);
  assert.ok(body.startsWith(home));
  assert.doesNotMatch(body, /Old links/);
  assert.equal(body.match(/### Changed pages/g).length, 1);
  await updatePreviewComment(options);
  assert.equal(writes, 1);
  files = [];
  await updatePreviewComment(options);
  assert.equal(body, home);
});
