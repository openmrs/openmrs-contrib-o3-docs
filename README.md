# O3 Docs

**⚠️ NOTE: THIS IS NO LONGER THE ACTIVELY MAINTAINED SOURCE OF TRUTH FOR O3 DEV DOCS. This effort has been moved to the [OpenMRS Wiki](https://openmrs.atlassian.net/wiki/x/94ABCQ)**

Documentation site for O3, the frontend framework for OpenMRS. This documentation is intended to enable developers to develop and deploy custom UI features for OpenMRS.

## Development

- Install dependencies using:

  ```bash
  pnpm install
  ```

- Start a dev server on port 3000 using:

  ```bash
  pnpm run dev
  ```

## Deployment

The site is a static export deployed to GitHub Pages by GitHub Actions. Each push
to `main` is built and published to the `gh-pages` branch, and pull requests opened
from this repository get a preview deploy under `/pr-preview/pr-<n>/`.

## Stack

- [Nextra](https://nextra.site/)
- [GitHub Pages](https://pages.github.com/)
- [Pagefind](https://pagefind.app/) (static search)
