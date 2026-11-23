// node tools/check-lesson-code.js [filter]
// Runs every Python snippet in every lesson (needs Python with numpy, scipy and scikit-learn; set PY=/path/to/python)
// and compares what it prints with the `out` text shown to the learner, so the page never shows an output that does not happen.
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
global.window = {}; require('../assets/sims.js'); const S = window.SIMS;
const PY = process.env.PY || 'python3', filter = process.argv[2] || '';
const norm = (s) => String(s).replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').trim();
let ok = 0, bad = 0, total = 0; const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lesson-code-'));
for (const it of S.items) {
  if (filter && !it.id.includes(filter)) continue;
  const f = path.join(__dirname, 'lessons', it.cat, it.slug + '.js'); if (!fs.existsSync(f)) continue;
  const L = require(f);
  (L.code || []).forEach((c, i) => {
    total++; const r = cp.spawnSync(PY, ['-I', '-W', 'ignore', '-c', c.py], { cwd: tmp, encoding: 'utf8', timeout: 120000, env: Object.assign({}, process.env, { PYTHONHASHSEED: '0', OMP_NUM_THREADS: '1' }) });
    const got = norm(r.stdout), want = norm(c.out);
    if (r.status !== 0) { bad++; console.log('FAIL (error) ' + it.id + ' code[' + i + '] ' + c.title + '\n  ' + (r.stderr || '').trim().split('\n').slice(-3).join('\n  ')); }
    else if (got !== want) { bad++; console.log('FAIL (output differs) ' + it.id + ' code[' + i + '] ' + c.title + '\n  shown : ' + want.replace(/\n/g, '\n          ') + '\n  actual: ' + got.replace(/\n/g, '\n          ')); }
    else ok++;
  });
}
console.log('snippets: ' + ok + ' ok, ' + bad + ' failed, of ' + total);
process.exit(bad ? 1 : 0);
