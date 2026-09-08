import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findFormsOwnershipViolations,
  findFormsWikiLinks,
} from './check-forms-doc-ownership.mjs';

test('allows canonical O3 Forms links and unrelated Wiki links', async () => {
  const violations = await findFormsWikiLinks([
    'scripts/fixtures/forms-doc-ownership/allowed.mdx',
  ]);

  assert.deepEqual(violations, []);
});

test('rejects links to the retired Forms Wiki page', async () => {
  const violations = await findFormsWikiLinks([
    'scripts/fixtures/forms-doc-ownership/rejected.mdx',
  ]);

  assert.equal(violations.length, 2);
  assert.deepEqual(
    violations.map(({ line }) => line),
    [1, 3],
  );
});

test('accepts the canonical Forms documentation contract', async () => {
  const violations = await findFormsOwnershipViolations();

  assert.deepEqual(violations, []);
});
