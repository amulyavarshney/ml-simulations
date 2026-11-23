// node tools/make-lessons.js          : validate tools/lessons/<cat>/<slug>.js and write assets/lessons/<cat>.js
// node tools/make-lessons.js --check  : validate only (used by tests/test-lessons.js), exit 1 on any error
// Every simulation in assets/sims.js should have a lesson. The authoring guide is tools/LESSONS.md.
const fs = require('fs'), path = require('path');
global.window = {}; require('../assets/sims.js'); const S = window.SIMS;
const SRC = path.join(__dirname, 'lessons'), OUT = path.join(__dirname, '..', 'assets', 'lessons');
const checkOnly = process.argv.includes('--check');
const errors = [], warns = [];
const isStr = (x) => typeof x === 'string' && x.trim().length > 0;
const words = (s) => (String(s).replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
const BAD = /<script|onclick|onerror|javascript:|<iframe|<style/i;

function validate(id, L) {
  const e = (m) => errors.push(id + ': ' + m), w = (m) => warns.push(id + ': ' + m);
  const str = (k, max) => { if (!isStr(L[k])) e('missing text field "' + k + '"'); else if (max && words(L[k]) > max) w(k + ' has ' + words(L[k]) + ' words (aim for at most ' + max + ')'); };
  const arr = (k, min, max) => { if (!Array.isArray(L[k]) || L[k].length < min || (max && L[k].length > max)) { e('"' + k + '" needs ' + min + (max ? ' to ' + max : '+') + ' items'); return []; } return L[k]; };
  str('idea', 45); str('why', 70); str('analogy', 80); str('cheat', 70);
  arr('vocab', 3, 8).forEach((v, i) => { if (!Array.isArray(v) || !isStr(v[0]) || !isStr(v[1])) e('vocab[' + i + '] must be [term, definition]'); });
  arr('steps', 4, 8).forEach((s, i) => { if (!s || !isStr(s.h) || !isStr(s.p)) e('steps[' + i + '] needs h and p'); else if (words(s.p) > 90) w('steps[' + i + '] is ' + words(s.p) + ' words (aim for at most 90)'); });
  const ex = L.example;
  if (!ex || !isStr(ex.title) || !isStr(ex.setup) || !isStr(ex.result)) e('example needs title, setup and result');
  else {
    if (!Array.isArray(ex.walk) || ex.walk.length < 3) e('example.walk needs 3+ steps');
    if (ex.table) { if (!Array.isArray(ex.table.head) || !Array.isArray(ex.table.rows) || ex.table.rows.some((r) => r.length !== ex.table.head.length)) e('example.table rows must match head length'); }
  }
  arr('read', 3, 12).forEach((r, i) => { if (!Array.isArray(r) || !isStr(r[0]) || !isStr(r[1])) e('read[' + i + '] must be [what you see, what it means]'); });
  arr('experiments', 3, 6).forEach((x, i) => { if (!x || !isStr(x.do) || !isStr(x.see) || !isStr(x.why)) e('experiments[' + i + '] needs do, see, why'); });
  arr('remember', 3, 7).forEach((x, i) => { if (!x || !isStr(x.tag) || !isStr(x.text)) e('remember[' + i + '] needs tag and text'); });
  arr('mistakes', 2, 5).forEach((x, i) => { if (!x || !isStr(x.wrong) || !isStr(x.right)) e('mistakes[' + i + '] needs wrong and right'); });
  arr('code', 1, 3).forEach((c, i) => {
    if (!c || !isStr(c.title) || !isStr(c.py) || !isStr(c.out)) e('code[' + i + '] needs title, py and out (the exact printed output)');
    else {
      if (c.py.split('\n').length > 14) w('code[' + i + '] is ' + c.py.split('\n').length + ' lines (aim for at most 12)');
      if (!Array.isArray(c.walk) || c.walk.length < 3 || c.walk.some((r) => !Array.isArray(r) || !isStr(r[0]) || !isStr(r[1]))) e('code[' + i + '].walk needs 3+ [piece, meaning] rows');
    }
  });
  const ck = arr('check', 3, 3);
  ck.forEach((q, i) => { if (q && Array.isArray(q.options) && q.options.some((o) => /\b(all|none|both) of the above|\bboth (a|b|c)\b|\ba and b\b/i.test(o))) e('check[' + i + '] has an option that refers to other options; options are shuffled, so each must stand alone'); });
  ck.forEach((q, i) => { if (!q || !isStr(q.q) || !Array.isArray(q.options) || q.options.length < 3 || q.options.length > 4 || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || !isStr(q.why)) e('check[' + i + '] needs q, 3-4 options, a valid answer index and why'); });
  if (!L.teachback || !isStr(L.teachback.prompt) || !isStr(L.teachback.model)) e('teachback needs prompt and model');
  const total = JSON.stringify(L); if (BAD.test(total)) e('contains disallowed markup (script, inline handlers, style)');
  if (/—/.test(total)) w('contains an em dash; prefer a comma, colon or full stop');
  return L;
}

// Quiz options are shuffled deterministically when the lesson is compiled, so the right answer does not always sit in the same place.
function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffled(id, L) {
  const out = JSON.parse(JSON.stringify(L));
  out.check.forEach((q, qi) => {
    let a = hash(id + '#' + qi) || 1; const rnd = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const idx = q.options.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    q.options = idx.map((i) => L.check[qi].options[i]); q.answer = idx.indexOf(L.check[qi].answer);
  });
  return out;
}
const byCat = {}; let found = 0;
for (const it of S.items) {
  const f = path.join(SRC, it.cat, it.slug + '.js');
  if (!fs.existsSync(f)) { warns.push(it.id + ': no lesson yet'); continue; }
  delete require.cache[require.resolve(f)];
  let L; try { L = require(f); } catch (err) { errors.push(it.id + ': cannot load (' + err.message + ')'); continue; }
  validate(it.id, L); found++; (byCat[it.cat] = byCat[it.cat] || {})[it.id] = shuffled(it.id, L);
}
if (!checkOnly) {
  fs.mkdirSync(OUT, { recursive: true });
  for (const cat of Object.keys(byCat)) fs.writeFileSync(path.join(OUT, cat + '.js'), '/* generated by tools/make-lessons.js from tools/lessons/' + cat + '/*.js; do not edit by hand */\nwindow.LESSONS = Object.assign(window.LESSONS || {}, ' + JSON.stringify(byCat[cat]) + ');\n');
}
const missing = warns.filter((x) => /no lesson yet/.test(x)), other = warns.filter((x) => !/no lesson yet/.test(x));
other.forEach((x) => console.log('warning:', x)); errors.forEach((x) => console.log('ERROR:', x));
console.log('lessons: ' + found + ' of ' + S.items.length + (missing.length ? ' (' + missing.length + ' missing)' : '') + ', ' + errors.length + ' errors, ' + other.length + ' warnings');
if (errors.length || (process.argv.includes('--strict') && missing.length)) process.exit(1);
