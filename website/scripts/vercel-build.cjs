// website/scripts/vercel-build.js
const { execSync } = require("node:child_process");
const { renameSync, existsSync, mkdirSync, rmSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = process.cwd();
const PAGES = join(ROOT, "src/pages");

// keep only English on Vercel to reduce ~5k pages -> ~200
const ALL_LOCALES = [
  "ar","bn","de","en","es","fa","fr","hi","id","it","ja","ko","nl",
  "pl","pt","ro","ru","th","tr","uk","ur","vi","zh"
];
const KEEP = new Set(["en"]);

function stash(dir) {
  const tmp = dir + ".tmp-stash";
  if (!existsSync(tmp)) mkdirSync(tmp, { recursive: true });

  for (const loc of ALL_LOCALES) {
    if (KEEP.has(loc)) continue;
    const src = join(PAGES, loc);
    const dst = join(tmp, loc);
    if (existsSync(src)) {
      mkdirSync(tmp, { recursive: true });
      renameSync(src, dst);
      console.log(`>>> stashed ${join("src/pages", loc)}`);
    }
  }
  return tmp;
}

function restore(tmp) {
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