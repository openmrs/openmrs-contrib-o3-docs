import { access } from 'node:fs/promises';
import { join } from 'node:path';

const sectionMarker = '<!-- preview-changed-pages -->';
const previewMarker = '<!-- Sticky Pull Request Commentpr-preview -->';

export async function changedPagesSection(files, previewUrl, outputDir = 'out') {
  const pages = [];
  for (const file of files) {
    if (file.status === 'removed') continue;
    const match = file.filename.match(/^content\/(en-US|fr-FR)\/(.+)\.mdx$/);
    if (!match) continue;
    const [, locale, path] = match;
    const segments = path.split('/');
    if (segments.some((segment) => segment.startsWith('_') || segment === '.' || segment === '..')) continue;
    if (segments.at(-1) === 'index') segments.pop();
    const route = [locale, ...segments];
    // Only link pages that the static export actually produced.
    try {
      await access(join(outputDir, ...route, 'index.html'));
    } catch {
      continue;
    }
    pages.push({ locale, path: segments.join('/'), route });
  }

  // Keep language variants together, even when GitHub lists all English files first.
  pages.sort((a, b) => a.path.localeCompare(b.path) || a.locale.localeCompare(b.locale));
  const uniquePages = [...new Map(pages.map((page) => [page.route.join('/'), page])).values()];
  if (!uniquePages.length) return '';

  const base = previewUrl.replace(/\/+$/, '');
  const links = uniquePages.slice(0, 5).map(({ locale, path, route }) => {
    const label = `${locale}: ${path || 'Home'}`.replace(/[\\`*_[\]<>]/g, '\\$&');
    return `- [${label}](${base}/${route.map(encodeURIComponent).join('/')}/)`;
  });
  const remainder = uniquePages.length - links.length;
  if (remainder > 0) {
    links.push(`\n${remainder} more changed ${remainder === 1 ? 'page' : 'pages'}. Browse the preview home link above for the full site.`);
  }
  return `${sectionMarker}\n### Changed pages\n\n${links.join('\n')}`;
}

export async function updatePreviewComment({ github, context, previewUrl, outputDir = 'out' }) {
  const { owner, repo } = context.repo;
  const pull_number = context.issue.number;
  const files = await github.paginate(github.rest.pulls.listFiles, { owner, repo, pull_number, per_page: 100 });
  const section = await changedPagesSection(files, previewUrl, outputDir);
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner, repo, issue_number: pull_number, per_page: 100,
  });
  const comment = comments.find((item) => item.user?.login === 'github-actions[bot]' && item.body?.includes(previewMarker));
  if (!comment) throw new Error('The preview action did not create its sticky comment.');
  const original = comment.body.split(sectionMarker)[0].trimEnd();
  const body = section ? `${original}\n\n${section}` : original;
  if (body !== comment.body) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: comment.id, body });
  }
}
