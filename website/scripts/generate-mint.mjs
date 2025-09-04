import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const EN_ROOT = join(ROOT, 'website/src/pages/en');

function listDocs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'archived') continue;            // skip archived
      out.push(...listDocs(p));
    } else if (/\.(md|mdx)$/.test(name)) {
      if (name.startsWith('[')) continue;           // skip dynamic routes like [..].mdx
      out.push(p);
    }
  }
  return out.sort();
}

const files = listDocs(EN_ROOT);

const navigation = [{ group: 'Introduction', pages: ['index.md'] }];

const core = [];
const groups = {};

for (const abs of files) {
  const rel = relative(ROOT, abs).replace(/\\/g, '/'); // repo-relative
  const after = rel.split('website/src/pages/en/')[1];
  if (!after.includes('/')) {
    core.push(rel);                                    // top-level: about.mdx, contracts.mdx, etc.
  } else {
    const [first] = after.split('/');
    const group = first.replace(/-/g,' ').replace(/\b\w/g, m => m.toUpperCase()); // subgraphs -> Subgraphs
    (groups[group] ??= []).push(rel);
  }
}

if (core.length) navigation.push({ group: 'Core', pages: core });

for (const [group, pages] of Object.entries(groups)) {
  navigation.push({ group, pages });
}

const mint = {
  name: 'Taugraindor Docs',
  logo: '/website/public/logo.png',
  favicon: '/website/public/favicon.png',
  colors: { primary: '#4F46E5' },
  navigation
};

writeFileSync('mint.json', JSON.stringify(mint, null, 2));
console.log('mint.json written with', navigation.length, 'groups');
