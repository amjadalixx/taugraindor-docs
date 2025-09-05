// website/scripts/prune.js
import { rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

// Remove non-English locales
const nonEn = [
  'src/pages/ar','src/pages/es','src/pages/fa','src/pages/fr','src/pages/hi',
  'src/pages/id','src/pages/it','src/pages/ja','src/pages/ko','src/pages/pt',
  'src/pages/ru','src/pages/tr','src/pages/uk','src/pages/ur','src/pages/vi','src/pages/zh'
]

// Remove heavy English sections (keep only /en core + /en/subgraphs)
const heavy = [
  'src/pages/en/ai-suite',
  'src/pages/en/substreams',
  'src/pages/en/token-api',
  'src/pages/en/indexing',
  'src/pages/en/resources',
  'src/pages/en/archived'
]

// Safety: delete folders before build
for (const rel of [...nonEn, ...heavy]) {
  const p = join(root, rel)
  if (existsSync(p)) {
    console.log(`[prune] removing ${rel}`)
    rmSync(p, { recursive: true, force: true })
  } else {
    console.log(`[prune] skip (not found) ${rel}`)
  }
}

console.log('[prune] Completed cleanup: non-English and heavy sections removed.')