// Every lesson present must be valid (schema, quiz answers in range, code snippets with output). Missing lessons only warn here;
// run `node tools/make-lessons.js --strict` to require one lesson per simulation.
const cp = require('child_process'), path = require('path');
const r = cp.spawnSync('node', [path.join(__dirname, '..', 'tools', 'make-lessons.js'), '--check'], { encoding: 'utf8' });
process.stdout.write(r.stdout); process.stderr.write(r.stderr);
process.exit(r.status);
