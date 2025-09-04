import { readFileSync, writeFileSync } from 'fs';

const json = JSON.parse(readFileSync('website/src/pages/en/index.json', 'utf8'));

let md = `# ${json.hero?.title ?? ''}\n\n${json.hero?.description ?? ''}\n`;

md += `\n## ${json.products?.title ?? ''}\n\n${json.products?.description ?? ''}\n`;
['subgraphs','substreams','tokenApi','graphNode','firehose'].forEach(k => {
  const p = json.products?.[k];
  if (p?.title || p?.description) {
    md += `\n### ${p.title ?? ''}\n${p.description ?? ''}\n`;
  }
});

const sn = json.supportedNetworks;
if (sn?.title) {
  let desc = sn?.description?.base ?? '';
  desc = desc.replace('{0}', sn?.description?.networks ?? '')
             .replace('{1}', sn?.description?.completeThisForm ?? '');
  md += `\n## ${sn.title}\n\n${desc}\n`;
}

md += `\n## ${json.guides?.title ?? ''}\n`;
['explorer','publishASubgraph','publishSubstreams','queryingBestPractices','timeseries','apiKeyManagement','transferToTheGraph'].forEach(k=>{
  const g = json.guides?.[k];
  if (g?.title || g?.description) {
    md += `\n### ${g.title ?? ''}\n${g.description ?? ''}\n`;
  }
});

md += `\n## ${json.videos?.title ?? ''}\n`;
['theGraphExplained','whatIsDelegating','howToIndexSolana'].forEach(k=>{
  const v = json.videos?.[k];
  if (v?.title || v?.description) {
    md += `\n### ${v.title ?? ''}\n${v.description ?? ''}\n`;
  }
});

writeFileSync('index.md', md.trim() + '\n');
console.log('index.md written');
