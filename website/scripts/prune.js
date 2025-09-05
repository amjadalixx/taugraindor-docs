// website/scripts/prune.js
// Remove non-English locales BEFORE Next.js builds so it never discovers /ar routes.

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..'); // -> website/
const srcDir = path.join(root, 'src');

// locales to delete completely
const NON_EN_LOCALES = ['ar','es','fa','ru','zh','ja','ko','pt','de','fr'];

function rmrf(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`[prune] Removed: ${targetPath}`);
    }
  } catch (e) {
    console.warn(`[prune] Failed to remove ${targetPath}:`, e?.message || e);
  }
}

function pruneLocaleFolders(baseDir) {
  NON_EN_LOCALES.forEach((loc) => {
    // Top-level locale folder: src/pages/ar, src/content/ar, etc.
    const localeDir = path.join(baseDir, loc);
    rmrf(localeDir);

    // In case the project uses nested content trees like src/pages/docs/ar
    // do a shallow scan of first-level subdirs and remove any /<subdir>/<loc>
    try {
      if (fs.existsSync(baseDir)) {
        const firstLevel = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of firstLevel) {
          if (entry.isDirectory()) {
            const maybeLocale = path.join(baseDir, entry.name, loc);
            rmrf(maybeLocale);
          }
        }
      }
    } catch (e) {
      console.warn(`[prune] Scan error in ${baseDir}:`, e?.message || e);
    }

    // If someone added single files like src/pages/ar.mdx (flat), remove them too
    const flatFile = path.join(baseDir, `${loc}.mdx`);
    rmrf(flatFile);
    const flatDir = path.join(baseDir, `${loc}`);
    rmrf(flatDir);
  });
}

function main() {
  console.log('[prune] Start pruning non-English locales…');

  // Remove non-EN under src/pages and src/content (both are common in Nextra repos)
  pruneLocaleFolders(path.join(srcDir, 'pages'));
  pruneLocaleFolders(path.join(srcDir, 'content'));

  // Safety: also remove any leftover build artifacts from prior local builds
  // (Vercel fresh containers won’t have these, but it’s harmless locally)
  rmrf(path.join(root, '.next'));
  rmrf(path.join(root, 'out'));

  console.log('[prune] Done.');
}

main();