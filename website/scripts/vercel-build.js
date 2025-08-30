import { execSync } from "child_process";
import fs from "fs";

console.log(">>> Stashing heavy sections to avoid OOM on Vercel...");

const paths = [
  "src/pages/en/api",
  "src/pages/en/networks",
  "src/pages/en/indexing/reference",
  "src/pages/en/subgraphs/reference"
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    const stashPath = `.ci-stash/${p}`;
    fs.mkdirSync(stashPath, { recursive: true });
    execSync(`mv ${p} ${stashPath}`);
    console.log(`Moved ${p} -> ${stashPath}`);
  }
}

console.log(">>> Running Next.js build with increased heap...");
execSync("pnpm predev", { stdio: "inherit" });
execSync("NODE_OPTIONS='--max-old-space-size=8192' next build", {
  stdio: "inherit"
});