import nextra from 'nextra'
import remarkLocalizeLinks from './scripts/remark-localize-links.mjs'

const locales = ['en-US', 'fr-FR']

// When deploying to a GitHub Pages project URL (e.g. openmrs.github.io/<repo>)
// or a PR preview subfolder, the site is served from a subpath rather than the
// domain root. BASE_PATH carries that prefix through to Next's basePath so all
// generated asset/link URLs resolve correctly. It is empty for root deployments
// (e.g. a custom domain), which keeps URLs unprefixed.
const basePath = process.env.BASE_PATH || ''

const withNextra = nextra({
  defaultShowCopyCode: true,
  search: { codeblocks: false },
  // Prefix generated links (nav, sidebar, etc.) with the active locale, e.g.
  // /en-US/docs/... rather than /docs/.... Nextra otherwise emits locale-less
  // links and relies on middleware to rewrite them — but the static export has
  // no middleware, so without this the links 404.
  unstable_shouldAddLocaleToLinks: true,
  mdxOptions: {
    // Localize absolute internal links written inline in the content, which
    // unstable_shouldAddLocaleToLinks (nav only) does not cover.
    remarkPlugins: [[remarkLocalizeLinks, { locales }]],
  },
})

export default withNextra({
  // Nextra reads its locales from this i18n config and then unsets it before
  // handing the config to Next.js, so it is compatible with `output: export`
  // (which otherwise rejects Next's native i18n). It drives the [lang] segment
  // and the static params generated for each locale. Locale detection itself is
  // handled client-side (see scripts/post-export.mjs) since there is no server.
  i18n: {
    locales,
    defaultLocale: 'en-US',
  },
  // GitHub Pages serves static files only, so we export a fully static site.
  output: 'export',
  // The static export has no image optimizer, so images are served as-is.
  images: { unoptimized: true },
  // Emit each route as a directory with an index.html, which GitHub Pages
  // resolves cleanly without server-side rewrites.
  trailingSlash: true,
  basePath,
  reactStrictMode: true,
  poweredByHeader: false,
})
