// website/scripts/vercel-build.cjs
const { execSync } = require("node:child_process");
const { renameSync, existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = process.cwd();
const PAGES = join(ROOT, "src/pages");
const DYNAMIC_LOCALE_DIR = join(PAGES, "[locale]");

// keep only English on Vercel to reduce ~5k pages -> ~200
// include all locales that may appear in routes/_meta/translations
const ALL_LOCALES = [
  "ar","bn","cs","de","en","es","fa","fr","hi","id","it","ja","ko","mr","nl",
  "pl","pt","ro","ru","sv","th","tr","uk","ur","vi","zh"
];
const KEEP = new Set(["en"]);

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function makeStubTranslations(loc) {
  // Some build steps import "@/pages/<loc>/translations"
  const dir = join(PAGES, loc);
  const stub = join(dir, "translations.ts");
  ensureDir(dir);
  if (!existsSync(stub)) {
    writeFileSync(
      stub,
      `// auto-stubbed on Vercel\nexport default {} as const;\n`,
      "utf8"
    );
    console.log(`>>> created stub ${join("src/pages", loc, "translations.ts")}`);
  }
}

function stashLocales(dir) {
  const tmp = dir + ".tmp-stash";
  ensureDir(tmp);

  // Stash the dynamic [locale] route so Next doesn't try to build non-en roots.
  if (existsSync(DYNAMIC_LOCALE_DIR)) {
    const dst = join(tmp, "[locale]");
    renameSync(DYNAMIC_LOCALE_DIR, dst);
    console.log(`>>> stashed src/pages/[locale]`);
  }

  // Stash per-locale folders; keep only KEEP (en)
  for (const loc of ALL_LOCALES) {
    if (KEEP.has(loc)) continue;
    const src = join(PAGES, loc);
    const dst = join(tmp, loc);
    if (existsSync(src)) {
      renameSync(src, dst);
      console.log(`>>> stashed ${join("src/pages", loc)}`);
    }
    // ensure imports still resolve during predev/tsup
    makeStubTranslations(loc);
  }

  return tmp;
}

function restoreLocales(tmp) {
  // Restore [locale] folder
  const stashedDyn = join(tmp, "[locale]");
  if (existsSync(stashedDyn)) {
    renameSync(stashedDyn, DYNAMIC_LOCALE_DIR);
    console.log(`>>> restored src/pages/[locale]`);
  }

  // Restore locale folders
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
      console.log(">>> Stashing non-English locales and [locale] route to avoid OOM on Vercel...");
      stashDir = stashLocales(PAGES);
      process.env.NODE_OPTIONS = "--max-old-space-size=8192";
      process.env.NEXT_PUBLIC_LIMIT_LOCALES = "en";
    }

    console.log(">>> Running Next.js build...");
    execSync("pnpm predev", { stdio: "inherit" });
    execSync("next build", { stdio: "inherit" });

  } finally {
    if (doingVercel && stashDir) {
      console.log(">>> Restoring stashed locales and [locale] route...");
      restoreLocales(stashDir);
    }
  }
})();