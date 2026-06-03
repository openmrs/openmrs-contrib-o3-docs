// Prefixes absolute internal documentation links in MDX content with the page's
// locale, e.g. [x](/docs/key-repositories) -> /en-US/docs/key-repositories.
//
// Nextra localizes generated navigation (sidebar/breadcrumbs) via
// `unstable_shouldAddLocaleToLinks`, but it leaves links written inline in the
// content untouched. Those previously resolved only because middleware rewrote
// locale-less paths at request time; the static export has no middleware, so we
// localize them at build time instead.
//
// The page's locale is taken from its source path (content/<locale>/...). Only
// documentation routes (first segment `docs`) and the bare home path are
// rewritten, so links to public assets (e.g. /o3-architecture.svg) are left
// alone. Next.js adds any configured basePath to these links at render time.

const LOCALE_FROM_PATH = /[\\/]content[\\/]([^\\/]+)[\\/]/

export default function remarkLocalizeLinks({ locales = [] } = {}) {
  return (tree, file) => {
    const sourcePath = file?.path || file?.history?.at(-1) || ''
    const locale = sourcePath.match(LOCALE_FROM_PATH)?.[1]
    if (!locale || !locales.includes(locale)) return

    const localize = (url) => {
      if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return url
      const [pathname] = url.split(/[?#]/)
      const firstSegment = pathname.split('/')[1] ?? ''
      if (locales.includes(firstSegment)) return url // already localized
      if (firstSegment === 'docs' || pathname === '/') return `/${locale}${url}`
      return url
    }

    const walk = (node) => {
      if (!node || typeof node !== 'object') return
      if (node.type === 'link' && typeof node.url === 'string') {
        node.url = localize(node.url)
      } else if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        Array.isArray(node.attributes)
      ) {
        for (const attr of node.attributes) {
          if (attr.type === 'mdxJsxAttribute' && attr.name === 'href' && typeof attr.value === 'string') {
            attr.value = localize(attr.value)
          }
        }
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) walk(child)
      }
    }

    walk(tree)
  }
}
