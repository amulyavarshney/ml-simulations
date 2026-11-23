/* lesson.js: turns a lesson object (assets/lessons/<category>.js, built from tools/lessons/) into the teaching cards around a simulation.
 * UI.shell() calls UI.lesson(item, lesson) and places the pieces; pages without a lesson keep the older three cards. */
(function () {
  'use strict';
  const UI = window.UI, h = UI.h;
  const sv = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: fine */ } } };

  /* ---- tiny Python highlighter: comments, strings, keywords, numbers ---- */
  const KW = /^(import|from|as|def|return|for|in|if|else|elif|with|lambda|class|True|False|None|and|or|not|print|while|break|continue|pass|assert)$/;
  function highlight(src) {
    const out = [], re = /(#.*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|([A-Za-z_][A-Za-z_0-9]*)|(\d+\.?\d*(?:e-?\d+)?)/g;
    src.split('\n').forEach((line) => {
      let last = 0, m, html = '';
      const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      while ((m = re.exec(line))) {
        html += esc(line.slice(last, m.index)); last = re.lastIndex;
        if (m[1]) html += '<span class="tk-c">' + esc(m[1]) + '</span>';
        else if (m[2]) html += '<span class="tk-s">' + esc(m[2]) + '</span>';
        else if (m[3]) html += KW.test(m[3]) ? '<span class="tk-k">' + m[3] + '</span>' : esc(m[3]);
        else html += '<span class="tk-n">' + m[4] + '</span>';
      }
      out.push(html + esc(line.slice(last)));
    });
    return out.join('\n');
  }
  function copyText(text, btn) {
    const done = () => { const t = btn.textContent; btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = t; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallback());
    else fallback();
    function fallback() { const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } }); ta.value = text; document.body.append(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { /* ignore */ } ta.remove(); }
  }

  const sec = (id, kicker, title, cls) => { const s = h('section', { class: 'ls card ' + (cls || ''), id: id }, h('div', { class: 'ls-head' }, h('span', { class: 'ls-kick', text: kicker }), h('h2', { text: title }))); return s; };

  UI.lesson = function (it, L) {
    const key = 'mlsim-' + it.id;
    const parts = [];
    /* ---- intro: the idea in 30 seconds ---- */
    const intro = sec('idea', 'Start here', 'The idea in 30 seconds', 'ls-intro');
    intro.append(h('p', { class: 'ls-idea', html: L.idea }),
      h('div', { class: 'ls-two' },
        h('div', {}, h('h3', { text: 'Why do we need it?' }), h('p', { html: L.why })),
        h('div', {}, h('h3', { text: 'An everyday picture' }), h('p', { html: L.analogy }))),
      h('h3', { class: 'ls-sub', text: 'Words to know' }),
      h('dl', { class: 'ls-vocab' }, L.vocab.map((v) => [h('dt', { html: v[0] }), h('dd', { html: v[1] })])));

    /* ---- how to read the picture ---- */
    const read = sec('read', 'Before you click', 'How to read this simulation');
    read.append(h('div', { class: 'tablewrap' }, h('table', { class: 'ls-table' }, h('thead', {}, h('tr', {}, h('th', { text: 'You see' }), h('th', { text: 'It means' }))),
      h('tbody', {}, L.read.map((r) => h('tr', {}, h('td', { html: r[0] }), h('td', { html: r[1] })))))));

    /* ---- guided experiments ---- */
    const exp = sec('explore', 'Play with it', 'Guided experiments: do, see, understand');
    exp.append(h('p', { class: 'ls-lead', text: 'Do each one in the simulation above. Guess what you will see before you look, then open the explanation.' }),
      h('ol', { class: 'ls-exp' }, L.experiments.map((x, i) => {
        const why = h('div', { class: 'why', html: '<b>Why:</b> ' + x.why, hidden: true });
        const btn = h('button', { class: 'btn small', type: 'button', text: 'Show why', 'aria-expanded': 'false', onclick() { const open = why.hidden; why.hidden = !open; btn.textContent = open ? 'Hide why' : 'Show why'; btn.setAttribute('aria-expanded', String(open)); } });
        return h('li', {}, h('div', { class: 'do', html: '<b>Do:</b> ' + x.do }), h('div', { class: 'see', html: '<b>You should see:</b> ' + x.see }), btn, why);
      })));

    /* ---- step by step ---- */
    const steps = sec('steps', 'Understand it', 'The idea, step by step');
    steps.append(h('ol', { class: 'ls-steps' }, L.steps.map((s) => h('li', {}, h('h3', { html: s.h }), h('p', { html: s.p })))));

    /* ---- worked example ---- */
    const ex = L.example, exs = sec('example', 'See it with numbers', 'Worked example: ' + ex.title);
    exs.append(h('p', { html: ex.setup }));
    if (ex.table) exs.append(h('div', { class: 'tablewrap' }, h('table', { class: 'ls-table num' }, h('thead', {}, h('tr', {}, ex.table.head.map((t) => h('th', { html: t })))), h('tbody', {}, ex.table.rows.map((r) => h('tr', {}, r.map((c) => h('td', { html: c }))))))));
    exs.append(h('ol', { class: 'ls-walk' }, ex.walk.map((w) => h('li', { html: w }))), h('div', { class: 'ls-result', html: '<b>Result.</b> ' + ex.result }));

    /* ---- remember it ---- */
    const rem = sec('remember', 'Make it stick', 'Tips and tricks to remember it');
    rem.append(h('div', { class: 'ls-tips' }, L.remember.map((t) => h('div', { class: 'tipcard' }, h('span', { class: 'tag', text: t.tag }), h('p', { html: t.text })))));
    rem.append(h('h3', { class: 'ls-sub', text: 'Common mistakes' }),
      h('div', { class: 'ls-mist' }, L.mistakes.map((m) => h('div', { class: 'mist' }, h('p', { class: 'wrong', html: '<b>✗ Not this:</b> ' + m.wrong }), h('p', { class: 'right', html: '<b>✓ Instead:</b> ' + m.right })))));

    /* ---- code ---- */
    const code = sec('code', 'Syntax to remember', 'Tiny code snippets');
    code.append(h('p', { class: 'ls-lead', text: 'Each snippet runs as it stands (Python with NumPy and scikit-learn). Type it yourself once; typing is how syntax sticks.' }));
    L.code.forEach((c) => {
      const pre = h('pre', { class: 'ls-pre', tabindex: '0' }, h('code', { html: highlight(c.py) }));
      const btn = h('button', { class: 'btn small', type: 'button', text: 'Copy', onclick() { copyText(c.py, btn); } });
      code.append(h('div', { class: 'ls-code' }, h('div', { class: 'ls-codehead' }, h('h3', { html: c.title }), btn), pre,
        h('div', { class: 'ls-out' }, h('span', { class: 'lab', text: 'Prints' }), h('pre', { text: c.out })),
        h('h4', { text: 'Read it line by line' }),
        h('div', { class: 'tablewrap' }, h('table', { class: 'ls-table walk' }, h('tbody', {}, c.walk.map((r) => h('tr', {}, h('td', {}, h('code', { html: r[0].replace(/&/g, '&amp;').replace(/</g, '&lt;') })), h('td', { html: r[1] })))))),
        c.tip ? h('p', { class: 'ls-tip', html: '<b>Tip:</b> ' + c.tip }) : null));
    });

    /* ---- check yourself ---- */
    const chk = sec('check', 'Test yourself', 'Check yourself');
    let right = 0, done = 0; const score = h('p', { class: 'ls-score', 'aria-live': 'polite', text: 'Answer the three questions. Nothing is saved or sent.' });
    chk.append(score);
    L.check.forEach((q, qi) => {
      const fb = h('div', { class: 'fb', hidden: true }), opts = h('div', { class: 'opts' });
      q.options.forEach((o, oi) => opts.append(h('button', { class: 'btn', type: 'button', html: o, onclick() {
        if (fb.hidden === false) return; fb.hidden = false; done++; const ok = oi === q.answer; if (ok) right++;
        [...opts.children].forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('right'); else if (j === oi) b.classList.add('wrong'); });
        fb.innerHTML = (ok ? '<b class="good">Correct.</b> ' : '<b class="bad">Not quite.</b> ') + q.why;
        score.textContent = done === L.check.length ? 'You got ' + right + ' of ' + L.check.length + (right === L.check.length ? '. Nicely done.' : '. Re-read the explanation under each question, then try the experiments again.') : done + ' of ' + L.check.length + ' answered.';
      } })));
      chk.append(h('div', { class: 'ls-q' }, h('p', { class: 'q', html: '<b>' + (qi + 1) + '.</b> ' + q.q }), opts, fb));
    });
    const note = h('textarea', { class: 'ls-note', rows: 3, placeholder: 'Write your two-sentence answer here (it stays in this browser only).', 'aria-label': 'Your explanation' }); note.value = sv.get(key + '-note') || '';
    note.addEventListener('input', () => sv.set(key + '-note', note.value));
    const model = h('div', { class: 'model', html: '<b>A model answer:</b> ' + L.teachback.model, hidden: true });
    const mb = h('button', { class: 'btn small', type: 'button', text: 'Show a model answer', onclick() { model.hidden = !model.hidden; mb.textContent = model.hidden ? 'Show a model answer' : 'Hide the model answer'; } });
    chk.append(h('div', { class: 'ls-teach' }, h('h3', { text: 'Teach it back' }), h('p', { html: L.teachback.prompt }), note, mb, model));

    /* ---- revision card ---- */
    const card = sec('revise', 'Revise', 'Revision card', 'ls-cheat');
    const cb = h('button', { class: 'btn small', type: 'button', text: 'Copy', onclick() { copyText(it.title + '\n' + L.cheat.replace(/<[^>]+>/g, ''), cb); } });
    card.append(h('p', { class: 'cheat', html: L.cheat }), cb);

    const links = [['idea', 'Idea'], ['sim', 'Simulation'], ['explore', 'Experiments'], ['steps', 'Step by step'], ['example', 'Example'], ['remember', 'Remember'], ['code', 'Code'], ['check', 'Check'], ['revise', 'Revise']];
    const nav = h('nav', { class: 'ls-nav', 'aria-label': 'On this page' }, links.map((l) => h('a', { href: '#' + l[0], text: l[1] })));
    return { nav, intro, read, after: [exp, steps, exs, rem, code, chk, card] };
  };
})();
