// scripts/prune.js
// Remove unwanted locales and stale caches before build to avoid
// "Can't resolve .../nextra-page-map-<locale>.mjs" errors.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure which locale(s) you want to keep
const KEEP_LOCALES = new Set(['en']);

// Paths relative to the website/ folder
const ROOT = path.resolve(__dirname, '..');
const SRC_PAGES = path.join(ROOT, 'src', 'pages');
const CACHES_TO_CLEAR = [
  path.join(ROOT, '.nextra'), // nextra build cache
  path.join(ROOT, '.next'),   // next build output, if any lingering locally
];

// Utility: exists?
const exists = (p) => {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

// Utility: rm -rf
const rimraf = (p) => {
  if (!exists(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
};

// Utility: list dirs
const listDirs = (p) => {
  if (!exists(p)) return [];
  return fs
    .readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
};

function pruneLocales() {
  if (!exists(SRC_PAGES)) {
    console.log(`[prune] No src/pages directory at ${SRC_PAGES}, skipping.`);
    return;
  }

  // Any folder directly under src/pages that looks like a locale code
  // (e.g., "en", "ar", "fr", etc.) and is NOT in KEEP_LOCALES gets removed.
  const topLevelDirs = listDirs(SRC_PAGES);

  for (const dir of topLevelDirs) {
    // Heuristic: treat a 2–5 letter folder name as a locale (en, ar, pt-BR, zh-CN, etc.)
    const isLocaleLike = /^[a-z]{2,3}(-[A-Z]{2})?$/.test(dir);
    if (!isLocaleLike) continue;

    if (!KEEP_LOCALES.has(dir)) {
      const target = path.join(SRC_PAGES, dir);
      console.log(`[prune] Removing non-kept locale folder: ${path.relative(ROOT, target)}`);
      rimraf(target);
    }
  }
}

function clearCaches() {
  for (const folder of CACHES_TO_CLEAR) {
    if (exists(folder)) {
      console.log(`[prune] Removing cache/output folder: ${path.relative(ROOT, folder)}`);
      rimraf(folder);
    }
  }
}

(function main() {
  try {
    console.log('[prune] Start');
    pruneLocales();
    clearCaches();
    console.log('[prune] Done');
  } catch (err) {
    console.error('[prune] Failed:', err);
    // Do not hard-fail CI; exit non-zero only if you prefer builds to stop.
    process.exit(0);
  }
})();