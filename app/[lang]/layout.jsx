import { Footer, LastUpdated, Layout, LocaleSwitch, Navbar } from 'nextra-theme-docs'
import { Head, Search } from 'nextra/components'
import { getPageMap } from 'nextra/page-map'
import NavLogo from '../../components/nav-logo'
import { getDictionary } from '../_dictionaries/get-dictionary'
import '../../styles.css'

export default async function LangLayout({ children, params }) {
  const { lang } = await params
  const dictionary = await getDictionary(lang)
  const pageMap = await getPageMap(`/${lang}`)
  // Favicons live in public/ and are referenced with absolute paths, which are
  // not basePath-rewritten, so prefix them for project-subpath / preview builds.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

  return (
    <html lang={lang} dir="ltr" suppressHydrationWarning>
      <Head>
        <link rel="icon" href={`${basePath}/favicon.ico`} sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}/favicon-32x32.png`} />
        <link rel="icon" type="image/png" sizes="16x16" href={`${basePath}/favicon-16x16.png`} />
        <link rel="apple-touch-icon" sizes="180x180" href={`${basePath}/apple-icon-180x180.png`} />
      </Head>
      <body>
        <Layout
          navbar={
            <Navbar logo={<NavLogo />} projectLink="https://github.com/openmrs/openmrs-contrib-o3-docs">
              <LocaleSwitch lite />
              <a
                href="https://talk.openmrs.org"
                target="_blank"
                rel="noreferrer"
                className="nx-p-2"
              >
                Talk
              </a>
            </Navbar>
          }
          footer={<Footer>© {new Date().getFullYear()} OpenMRS</Footer>}
          docsRepositoryBase="https://github.com/openmrs/openmrs-contrib-o3-docs/blob/main"
          i18n={[
            { locale: 'en-US', name: 'English' },
            { locale: 'fr-FR', name: 'French' },
          ]}
          sidebar={{
            autoCollapse: true,
            defaultMenuCollapseLevel: 1,
          }}
          toc={{
            backToTop: dictionary.backToTop,
            float: true,
            title: dictionary.toc,
          }}
          editLink={dictionary.editPage}
          feedback={{ content: dictionary.feedback }}
          lastUpdated={<LastUpdated>{dictionary.lastUpdated}</LastUpdated>}
          search={
            <Search
              emptyResult={dictionary.searchEmptyResult}
              errorText={dictionary.searchError}
              loading={dictionary.searchLoading}
              placeholder={dictionary.searchPlaceholder}
            />
          }
          nextThemes={{ defaultTheme: 'system' }}
          themeSwitch={{
            dark: dictionary.dark,
            light: dictionary.light,
            system: dictionary.system,
          }}
          pageMap={pageMap}
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
