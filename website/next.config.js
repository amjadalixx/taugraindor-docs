// @ts-check

import nextra from 'nextra'
import rehypeMdxCodeProps from 'rehype-mdx-code-props'

import { defaultLocale as gdsDefaultLocale, translate } from '@edgeandnode/gds'

import { translations } from './dist/i18n.js'
import rehypeUnwrapImages from './dist/mdxPlugins/rehypeUnwrapImages.js'
import remarkCallouts from './dist/mdxPlugins/remarkCallouts.js'
import remarkTransformRemoteDocs from './dist/mdxPlugins/remarkTransformRemoteDocs.js'

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
  GOOGLE_ANALYTICS_MEASUREMENT_ID: process.env.NODE_ENV === 'production' ? 'G-5MK48LFNKY' : '',
}

// We’ll keep only English to reduce build size
const ONLY_LOCALE = 'en'

const withNextra = nextra({
  theme: './src/layout/Layout.tsx',
  search: false,
  codeHighlight: false,
  defaultShowCopyCode: false,
  readingTime: true,

  transformPageMap(pageMap) {
    // Determine locale for meta labels
    const route = pageMap[0] && 'route' in pageMap[0] ? pageMap[0].route : undefined
    const localeInRoute = typeof route === 'string' ? route.slice(1, 3) : gdsDefaultLocale
    const locale = ONLY_LOCALE // force English for now

    const t = (/** @type {string} */ key) =>
      translate(
        translations,
        /** @type {import('@edgeandnode/gds').Locale} */ (locale),
        /** @type {any} */ (key),
      )

    // Exclude heavy top-level sections to shrink the number of pages generated.
    // Top-level section is the second segment of the route: `/en/<section>/...`
    const EXCLUDED_PREFIXES = [
      'ai-suite',
      'substreams',
      'token-api',
      'indexing',
      'resources',
      'archived',
    ]

    /** @param {any[]} items */
    const filterItems = (items) =>
      items
        .filter((item) => {
          // keep non-route nodes (like meta)
          if (!('route' in item) || typeof item.route !== 'string') return true

          const parts = item.route.split('/').filter(Boolean) // e.g., ["en","subgraphs","..."]
          const section = parts[1] || ''
          // also filter out any non-English routes
          const lang = parts[0]
          if (lang && lang !== ONLY_LOCALE) return false
          return !EXCLUDED_PREFIXES.includes(section)
        })
        .map((item) => {
          if ('children' in item && Array.isArray(item.children)) {
            return { ...item, children: filterItems(item.children) }
          }
          return item
        })

    const filtered = filterItems(pageMap)

    // Keep the nav minimal so we don't link to removed sections
    const metaFile = {
      index: t('index.title'),
      about: '',
      'supported-networks': '',
      contracts: '',
      '---1': { type: 'separator' },
      subgraphs: { type: 'children', title: t('global.navigation.subgraphs') },
    }

    return [
      { data: metaFile },
      {
        route: `/${ONLY_LOCALE}`,
        name: 'index',
        frontMatter: {},
      },
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
  pageExtensions: ['tsx'],
  reactStrictMode: true,
  basePath: env.BASE_PATH,
  trailingSlash: true,
  redirects: async () => [
    {
      source: '/',
      destination: '/en/',
      permanent: true,
    },
  ],
  images: {
    unoptimized: true,
  },
  i18n: {
    defaultLocale: ONLY_LOCALE,
    locales: [ONLY_LOCALE], // English only
  },
})