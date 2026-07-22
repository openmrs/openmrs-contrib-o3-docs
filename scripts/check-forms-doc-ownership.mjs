import { readdir, readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const markdownExtensions = new Set(['.md', '.mdx']);
const formsWikiPatterns = [
  /openmrs\.atlassian\.net\/wiki\/spaces\/[^/\s"'<>]+\/pages\/68747273(?:[/?#][^\s"'<>]*)?/i,
  /openmrs\.atlassian\.net\/wiki\/[^\s"'<>]*(?:O3(?:\+|%20)+Form(?:\+|%20)+Docs|\/Forms)(?:[^\s"'<>]*)?/i,
];
const locales = ['en-US', 'fr-FR'];
const requiredEnginePackages = [
  '@openmrs/esm-form-builder-app',
  '@openmrs/esm-form-engine-app',
  '@openmrs/esm-form-entry-app',
  '@openmrs/ngx-formentry',
];

async function collectMarkdownFiles(target) {
  const targetStat = await stat(target);
  if (targetStat.isFile()) {
    return markdownExtensions.has(path.extname(target)) ? [target] : [];
  }

  const entries = await readdir(target, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => collectMarkdownFiles(path.join(target, entry.name))),
  );
  return files.flat();
}

export async function findFormsWikiLinks(targets) {
  const files = (await Promise.all(targets.map(collectMarkdownFiles))).flat().sort();
  const violations = [];

  for (const file of files) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (formsWikiPatterns.some((pattern) => pattern.test(line))) {
        violations.push({ file, line: index + 1, text: line.trim() });
      }
    });
  }

  return violations;
}

export async function findFormsOwnershipViolations(contentRoot = 'content') {
  const violations = await findFormsWikiLinks([contentRoot]);

  for (const locale of locales) {
    const formsRoot = path.join(contentRoot, locale, 'docs', 'forms-in-o3');
    const builderGuide = path.join(formsRoot, 'build-forms-with-o3-form-builder.mdx');
    const builderGuideText = await readFile(builderGuide, 'utf8');
    if (/https?:\/\/ampath-forms\.vercel\.app/i.test(builderGuideText)) {
      violations.push({
        file: builderGuide,
        line: 1,
        text: 'The canonical O3 Form Builder guide delegates to AMPATH Forms.',
      });
    }

    const implementationsPage = path.join(formsRoot, 'form-engine-implementations.mdx');
    const implementationsText = await readFile(implementationsPage, 'utf8');
    for (const packageName of requiredEnginePackages) {
      if (!implementationsText.includes(packageName)) {
        violations.push({
          file: implementationsPage,
          line: 1,
          text: `The engine-selection page is missing ${packageName}.`,
        });
      }
    }
  }

  return violations;
}

async function main() {
  const targets = process.argv.slice(2);
  const violations = targets.length
    ? await findFormsWikiLinks(targets)
    : await findFormsOwnershipViolations();

  if (violations.length === 0) {
    console.log('Forms documentation ownership check passed.');
    return;
  }

  console.error(
    'Forms documentation ownership check failed. Keep default O3 product ' +
      'guidance in the canonical Forms in O3 section:',
  );
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line}: ${violation.text}`);
  }
  process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
