// @ts-check

import nextra from 'nextra'
import rehypeMdxCodeProps from 'rehype-mdx-code-props'

import { translate } from '@edgeandnode/gds'

import { translations } from './dist/i18n.js'
import rehypeUnwrapImages from './dist/mdxPlugins/rehypeUnwrapImages.js'
import remarkCallouts from './dist/mdxPlugins/remarkCallouts.js'
import remarkTransformRemoteDocs from './dist/mdxPlugins/remarkTransformRemoteDocs.js'

/** Only keep these locales */
const ALLOWED_LOCALES = ['en', 'zh', 'ko', 'ja', 'ru']
const DEFAULT_LOCALE = 'en'

const env = {
  ENVIRONMENT: process.env.ENVIRONMENT,
  ORIGIN: process.env.ORIGIN,
  BASE_PATH: process.env.BASE_PATH,
  ALGOLIA_API_KEY: process.env.ALGOLIA_API_KEY,
  ALGOLIA_APP_ID: process.env.ALGOLIA_APP_ID,
  MIXPANEL_TOKEN:
    process.env.NODE_ENV === 'production'
      ? process.env.ENVIRONMENT === 'production'
        ? 'cfeac8baf33c9b4d255f28d57f3c9148' // production
        : 'e57a9892339b2acfd02943c86b746d32' // staging
      : '', // local dev (no tracking)
  GOOGLE_ANALYTICS_MEASUREMENT_ID:
    process.env.NODE_ENV === 'production' ? 'G-5MK48LFNKY' : '',
}

const withNextra = nextra({
  theme: './src/layout/Layout.tsx',
  search: false,
  codeHighlight: false,
  defaultShowCopyCode: false,
  readingTime: true,

  transformPageMap(pageMap) {
    // drop any items whose top-level locale folder isn’t allowed
    const filterItems = (items) =>
      items
        .filter((item) => {
          if (!('route' in item) || typeof item.route !== 'string') return true
          const parts = item.route.split('/').filter(Boolean) // e.g. ["en","about"]
          const locale = parts[0]
          if (!locale) return true
          return ALLOWED_LOCALES.includes(locale)
        })
        .map((item) => {
          if ('children' in item && Array.isArray(item.children)) {
            return { ...item, children: filterItems(item.children) }
          }
          return item
        })

    const filtered = filterItems(pageMap)

    // compute a locale for the “virtual” index entry we add
    const firstRoute = filtered[0] && 'route' in filtered[0] ? filtered[0].route : undefined
    const currentLocale =
      typeof firstRoute === 'string' && firstRoute.startsWith('/')
        ? (firstRoute.split('/').filter(Boolean)[0] || DEFAULT_LOCALE)
        : DEFAULT_LOCALE

    const t = (/** @type {string} */ key) =>
      translate(
        translations,
        /** @type {import('@edgeandnode/gds').Locale} */ (currentLocale),
        /** @type {any} */ (key),
      )

    // sidebar (_meta) kept minimal & safe for all allowed locales
    const metaFile = {
      index: t('index.title'),
      about: '',
      'supported-networks': '',
      contracts: '',
      '---1': { type: 'separator' },
      subgraphs: { type: 'children', title: t('global.navigation.subgraphs') },
      '---2': { type: 'separator' },
      substreams: { type: 'children', title: t('global.navigation.substreams') },
      '---3': { type: 'separator' },
      'token-api': { type: 'children', title: t('global.navigation.tokenApi') },
      '---4': { type: 'separator' },
      'ai-suite': { type: 'children', title: t('global.navigation.ai-suite') },
      '---5': { type: 'separator' },
      indexing: { type: 'children', title: t('global.navigation.indexing') },
      '---6': { type: 'separator' },
      resources: { type: 'children', title: t('global.navigation.resources') },
      archived: { type: 'children', title: t('global.navigation.archived') },
    }

    return [
      { data: metaFile },
      { route: `/${currentLocale}`, name: 'index', frontMatter: {} },
      ...filtered,
    ]
  },

  mdxOptions: {
    remarkPlugins: [remarkCallouts, remarkTransformRemoteDocs],
    rehypePlugins: [rehypeUnwrapImages, rehypeMdxCodeProps],
  },
})

/** @type {import('next').NextConfig} */
export default withNextra({
  env,
  output: 'export',
  distDir: process.env.NODE_ENV === 'production' ? '../out/docs' : undefined,
  experimental: {
    // Fix scroll restoration (see https://github.com/vercel/next.js/issues/37893#issuecomment-1221335543)
    scrollRestoration: true,
  },
  pageExtensions: ['tsx', 'md', 'mdx'],
  reactStrictMode: true,
  basePath: env.BASE_PATH,
  trailingSlash: true,
  redirects: async () => [
    { source: '/', destination: `/${DEFAULT_LOCALE}/`, permanent: true },
  ],
  images: { unoptimized: true },

  // Ensure Next/Nextra only advertises these locales
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: ALLOWED_LOCALES,
  },

  // Extra safety: ignore “page map” chunks for removed locales if anything still imports them
  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /nextra-page-map-(ar|cs|de|es|fr|hi|it|mr|nl|pl|pt|ro|sv|tr|uk|ur|vi)\.mjs$/,
      })
    )
    return config
  },
})