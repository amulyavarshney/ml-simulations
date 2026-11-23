// node tools/make-revision.js : writes revision/index.html, one printable page with every lesson's revision card, memory tips and key code.
const fs = require('fs'), path = require('path');
global.window = {}; require('../assets/sims.js'); const S = window.SIMS;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let body = '', count = 0;
for (const cat of S.categories) {
  const items = S.items.filter((it) => it.cat === cat.id && fs.existsSync(path.join(__dirname, 'lessons', it.cat, it.slug + '.js')));
  if (!items.length) continue;
  body += `<section class="ls card rev-cat" id="${cat.id}"><div class="ls-head"><span class="ls-kick">Session ${cat.session}</span><h2>${esc(cat.name)}</h2></div>`;
  for (const it of items) {
    const L = require(path.join(__dirname, 'lessons', it.cat, it.slug + '.js')); count++;
    body += `<article class="rev"><h3><a href="../${it.cat}/${it.slug}/">${esc(it.title)}</a></h3><p class="cheat-line">${L.cheat}</p>`
      + `<div class="ls-tips">${L.remember.map((t) => `<div class="tipcard"><span class="tag">${esc(t.tag)}</span><p>${t.text}</p></div>`).join('')}</div>`
      + `<h4>Code to remember: ${L.code[0].title}</h4><pre class="ls-pre"><code>${esc(L.code[0].py)}</code></pre></article>`;
  }
  body += '</section>';
}
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revision sheet · ML II simulations</title>
<meta name="description" content="Every revision card, memory tip and key code snippet from the ML II simulations, on one printable page.">
<script>try{var t=localStorage.getItem('mlsim-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}</script>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231f4e79'/%3E%3Ccircle cx='11' cy='12' r='4.5' fill='%236da7ec'/%3E%3Cpath d='M21 24l5-9h-10z' fill='%23eb6834'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../assets/site.css">
</head>
<body>
<header class="top"><a class="brand" href="../">ML II <small>simulations</small></a><span class="crumbs">Revision sheet</span></header>
<main class="page">
<div class="titleblock"><h1>Revision sheet</h1><p class="lede">The revision card, the memory tips and the key code from each of the ${count} lessons, grouped by session. Read it the night before a quiz, then open a lesson to rebuild anything that feels fuzzy. Use your browser's print command for a paper copy.</p></div>
${body}
</main>
<footer class="foot">Advanced Machine Learning (ML II) · <a href="../">All simulations</a>.</footer>
</body>
</html>
`;
fs.mkdirSync(path.join(__dirname, '..', 'revision'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'revision', 'index.html'), html);
console.log('revision sheet written with', count, 'lessons');
