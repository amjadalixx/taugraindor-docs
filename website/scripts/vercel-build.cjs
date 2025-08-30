/** website/scripts/vercel-build.cjs
 * Stash non-English locales on Vercel to avoid OOM,
 * create stub translations for esbuild (predev), then restore.
 */
const { execSync } = require("node:child_process");
const { renameSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = process.cwd();
const PAGES = join(ROOT, "src/pages");

// keep only English on Vercel to reduce ~5k pages -> ~200
const ALL_LOCALES = [
  "ar","bn","de","en","es","fa","fr","hi","id","it","ja","ko","nl",
  "pl","pt","ro","ru","th","tr","uk","ur","vi","zh"
];
const KEEP = new Set(["en"]);

function mkStub(dir) {
  // minimal translations.ts so esbuild/tsup can resolve imports
  const stubPath = join(dir, "translations.ts");
  const stub = `const t = {};\nexport default t;\n`;
  writeFileSync(stubPath, stub, "utf8");
}

function stash(dir) {
  const tmp = dir + ".tmp-stash";
  if (!existsSync(tmp)) mkdirSync(tmp, { recursive: true });

  for (const loc of ALL_LOCALES) {
    if (KEEP.has(loc)) continue;
    const src = join(PAGES, loc);
    const dst = join(tmp, loc);
    if (existsSync(src)) {
      // move real locale out
      renameSync(src, dst);
      console.log(`>>> stashed ${join("src/pages", loc)}`);

      // recreate skinny folder with stub translations.ts
      mkdirSync(src, { recursive: true });
      mkStub(src);
      console.log(`>>> created stub ${join("src/pages", loc, "translations.ts")}`);
    }
  }
  return tmp;
}

function removeStubs() {
  for (const loc of ALL_LOCALES) {
    if (KEEP.has(loc)) continue;
    const locDir = join(PAGES, loc);
    const stub = join(locDir, "translations.ts");
    if (existsSync(stub)) {
      rmSync(stub, { force: true });
      // remove empty dir if nothing else inside
      try {
        const files = readdirSync(locDir);
        if (files.length === 0) rmSync(locDir, { recursive: true, force: true });
      } catch {}
      console.log(`>>> removed stub ${join("src/pages", loc, "translations.ts")}`);
    }
  }
}

function restore(tmp) {
  // clean stubs first so we can move real folders back
  removeStubs();

  for (const loc of ALL_LOCALES) {
    if (KEEP.has(loc)) continue;
    const src = join(tmp, loc);
    const dst = join(PAGES, loc);
    if (existsSync(src)) {
      renameSync(src, dst);
      console.log(`>>> restored ${join("src/pages", loc)}`);
    }
  }
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
}

(async () => {
  const doingVercel = process.env.VERCEL === "1";
  let stashDir = null;

  try {
    if (doingVercel) {
      console.log(">>> Stashing non-English locales to avoid OOM on Vercel...");
      stashDir = stash(PAGES);
      process.env.NODE_OPTIONS = "--max-old-space-size=8192";
    }

    console.log(">>> Running Next.js build...");
    execSync("pnpm predev", { stdio: "inherit" });
    execSync("next build", { stdio: "inherit" });

  } finally {
    if (doingVercel && stashDir) {
      console.log(">>> Restoring stashed locales...");
      restore(stashDir);
    }
  }
})();