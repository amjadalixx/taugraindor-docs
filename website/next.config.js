// @ts-check

import nextra from 'nextra'
import rehypeMdxCodeProps from 'rehype-mdx-code-props'
import webpack from 'webpack'

import { translate } from '@edgeandnode/gds'

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

// Keep the build small: English only
const ONLY_LOCALE = 'en'

// Big sections to skip for now
const EXCLUDED_PREFIXES = [
  'ai-suite',
  'substreams',
  'token-api',
  'indexing',
  'resources',
  'archived',
]

const withNextra = nextra({
  theme: './src/layout/Layout.tsx',
  search: false,
  codeHighlight: false,
  defaultShowCopyCode: false,
  readingTime: true,

  transformPageMap(pageMap) {
    // Always translate using English strings
    const t = (/** @type {string} */ key) =>
      translate(
        translations,
        /** @type {import('@edgeandnode/gds').Locale} */ (ONLY_LOCALE),
        /** @type {any} */ (key),
      )

    // Drop non-English routes and excluded top-level sections
    const filterItems = (items) =>
      items
        .filter((item) => {
          if (!('route' in item) || typeof item.route !== 'string') return true
          const parts = item.route.split('/').filter(Boolean) // e.g. ["en","subgraphs", ...]
          const lang = parts[0]
          const section = parts[1] || ''
          if (lang && lang !== ONLY_LOCALE) return false
          if (EXCLUDED_PREFIXES.includes(section)) return false
          return true
        })
        .map((item) => {
          if ('children' in item && Array.isArray(item.children)) {
            return { ...item, children: filterItems(item.children) }
          }
          return item
        })

    const filtered = filterItems(pageMap)

    // Minimal sidebar so we don’t link to removed sections
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
  pageExtensions: ['tsx'], // Nextra will handle MDX
  reactStrictMode: true,
  basePath: env.BASE_PATH,
  trailingSlash: true,
  redirects: async () => [
    { source: '/', destination: '/en/', permanent: true },
  ],
  images: { unoptimized: true },
  i18n: {
    defaultLocale: ONLY_LOCALE,
    locales: [ONLY_LOCALE],
  },
  // 🔑 Hard-stop Webpack from including non-English page trees
  webpack: (config) => {
    // Ignore any MDX under src/pages/<non-en-locale>/** to prevent
    // importing nextra-page-map-<locale>.mjs chunks.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /src[\\/](pages|content)[\\/](ar|es|fa|ru|zh|ja|ko|pt|de|fr)([\\/].*)?\.mdx$/,
      })
    )
    return config
  },
})