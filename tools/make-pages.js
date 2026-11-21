// node tools/make-pages.js : writes <category>/<slug>/index.html for every simulation listed in assets/sims.js
// (each page is the same small shell; the behaviour lives in that folder's sim.js)
const fs = require('fs'), path = require('path');
global.window = {}; require('../assets/sims.js'); const S = window.SIMS;
const LIB = { core: 'ml-core.js', svm: 'ml-svm.js', embed: 'ml-embed.js', wine: 'data/wine.js', digits: 'data/digits.js', embedui: 'embed-ui.js', svmui: 'svm-ui.js', eval: 'ml-eval.js', evalui: 'eval-ui.js', decide: 'ml-decide.js', decideui: 'decide-ui.js' };
const AFTER_UI = ['embedui', 'svmui', 'evalui', 'decideui'];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/<[^>]+>/g, '');
let made = 0;
for (const it of S.items) {
  const dir = path.join(__dirname, '..', it.cat, it.slug); const simjs = path.join(dir, 'sim.js');
  if (!fs.existsSync(simjs)) { console.log('skip (no sim.js):', it.id); continue; }
  const libs = ['core', ...(it.libs || [])].filter((v, i, a) => a.indexOf(v) === i);
  const order = ['core', 'wine', 'digits', 'svm', 'embed', 'eval', 'decide']; libs.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const pre = libs.filter((l) => !AFTER_UI.includes(l)), post = libs.filter((l) => AFTER_UI.includes(l));
  const scripts = ['sims.js', ...pre.map((l) => LIB[l]), 'ui.js', ...post.map((l) => LIB[l])].map((f) => `<script src="../../assets/${f}" defer></script>`).join('\n');
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(it.title)} · ML II simulations</title>
<meta name="description" content="${esc(it.blurb)}">
<script>try{var t=localStorage.getItem('mlsim-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231f4e79'/%3E%3Ccircle cx='11' cy='12' r='4.5' fill='%236da7ec'/%3E%3Cpath d='M21 24l5-9h-10z' fill='%23eb6834'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../../assets/site.css">
${scripts}
${(it.scripts || []).map((f) => `<script src="${f}" defer></script>`).join('\n')}
<script src="sim.js" defer></script>
</head>
<body>
<div id="app"></div>
<noscript><p style="padding:24px">This simulation needs JavaScript. Everything runs locally in your browser.</p></noscript>
</body>
</html>
`;
  fs.writeFileSync(path.join(dir, 'index.html'), html); made++;
}
console.log('pages written:', made, 'of', S.items.length);
