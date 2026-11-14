/* A linear SVM on text: TF-IDF features, learned word weights, per-word breakdown of a typed sentence. */
(function () {
  'use strict';
  const { stage, side } = UI.shell('svm-margin/text');
  const h = UI.h, K = window.CORPUS;
  const docs = []; for (let i = 0; i < 30; i++) { docs.push({ t: K.billing[i], c: 0 }); docs.push({ t: K.technical[i], c: 1 }); }
  const train = docs.filter((_, i) => i % 5 !== 0), test = docs.filter((_, i) => i % 5 === 0);
  let C = 1, useStop = true, text = 'Please send a refund for my last payment', tf = null, model = null, w = null;
  const SAMPLES = ['Please send a refund for my last payment', 'The login page shows a blank screen after the update', 'I was charged twice for the subscription and the app crashed', 'banana pyjamas'];

  const c = UI.panel(side, 'Model');
  UI.slider(c, { label: 'C', min: 0.01, max: 1000, log: true, value: C, fmt: (v) => UI.sci(v), onInput(v) { C = v; fitModel(); } });
  UI.check(c, { label: 'Drop common words (stop-word list)', value: true, onChange(v) { useStop = v; fitModel(); } });
  const rd = UI.panel(side, 'Readouts'), R = UI.read(rd, [{ id: 'voc', label: 'Vocabulary (words seen in training)' }, { id: 'tr', label: 'Training accuracy (48 messages)' }, { id: 'te', label: 'Hold-out accuracy (12 messages)' }, { id: 'sv', label: 'Support vectors' }]);
  const ex = UI.panel(side, 'Try a sentence'); SAMPLES.forEach((s) => ex.append(h('button', { class: 'btn', type: 'button', style: { margin: '0 6px 6px 0', textAlign: 'left' }, text: s, onclick() { ta.value = s; text = s; show(); } })));

  const ta = h('textarea', { rows: 2, style: { width: '100%', padding: '10px 12px', font: 'inherit', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', resize: 'vertical' }, 'aria-label': 'Your sentence' }); ta.value = text;
  ta.addEventListener('input', () => { text = ta.value; show(); });
  const out = h('div'), card1 = h('section', { class: 'card panel' }, h('h3', { text: 'Your sentence' }), ta, out); stage.append(card1);
  const learned = h('div'), card2 = h('section', { class: 'card panel' }, h('h3', { text: 'What the SVM learned: words with the largest weights' }), learned); stage.append(card2);
  const hold = h('div'), card3 = h('section', { class: 'card panel' }, h('h3', { text: 'Hold-out messages' }), hold); stage.append(card3);

  const bar = (v, max, color) => h('span', { style: { display: 'inline-block', height: '10px', width: Math.max(2, Math.abs(v) / max * 100) + '%', background: color, borderRadius: '2px', verticalAlign: 'middle' } });
  function fitModel() {
    tf = ML.tfidf(train.map((d) => d.t), { stop: useStop ? K.stop : [], minDf: 1 }); const y = train.map((d) => (d.c ? 1 : -1));
    model = ML.svc(tf.X, y, { kernel: 'linear', C, tol: 1e-4, maxMs: 400 }); w = model.w;
    const acc = (docsX, X) => docsX.filter((d, i) => model.predict(X[i]) === (d.c ? 1 : -1)).length / docsX.length, Xte = test.map((d) => tf.transform(d.t));
    R.set('voc', String(tf.vocab.length)); R.set('tr', UI.pct(acc(train, tf.X), 0)); R.set('te', UI.pct(acc(test, Xte), 0)); R.set('sv', model.nSV + ' of ' + train.length);
    // learned weights
    const order = ML.argsort(Array.from(w), true), topT = order.slice(0, 10), topB = order.slice(-10).reverse(), max = Math.max(...Array.from(w).map(Math.abs)) || 1;
    const col = (items, color, label) => h('div', null, h('div', { class: 'note', html: '<b>' + label + '</b>' }), h('table', { class: 't' }, h('tbody', null, items.map((j) => h('tr', null, h('td', { text: tf.vocab[j] }), h('td', { style: { width: '55%', textAlign: 'left' } }, bar(w[j], max, color)), h('td', { text: UI.f(w[j], 2) }))))));
    learned.textContent = ''; const g = h('div', { class: 'row' }); g.append(col(topB, UI.colors().c[0], '→ billing (negative weights)'), col(topT, UI.colors().c[1], '→ technical (positive weights)')); learned.append(g, h('p', { class: 'note', html: 'Score = Σ weight × TF-IDF + offset (' + UI.f(model.b, 2) + '). Positive = technical, negative = billing.' }));
    hold.textContent = ''; hold.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['message', 'true', 'predicted', 'score'].map((t) => h('th', { text: t })))), h('tbody', null, test.map((d, i) => { const s = model.decision(Xte[i]), pred = s >= 0 ? 1 : 0, wrong = pred !== d.c; return h('tr', { style: wrong ? { color: 'var(--bad)', fontWeight: 700 } : {} }, h('td', { style: { textAlign: 'left', maxWidth: '360px' }, text: d.t }), h('td', { text: K.labels[d.c] }), h('td', { text: K.labels[pred] + (wrong ? ' ✗' : '') }), h('td', { text: UI.f(s, 2) })); }))));
    show();
  }
  function show() {
    if (!model) return; const toks = tf.tokens(text), x = tf.transform(text), known = toks.filter((t) => tf.vocab.includes(t)), unknown = toks.filter((t) => !tf.vocab.includes(t)), score = model.decision(x), pred = score >= 0 ? 1 : 0;
    const contrib = []; tf.vocab.forEach((v, j) => { if (x[j] !== 0) contrib.push({ word: v, v: w[j] * x[j] }); }); contrib.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)); const max = Math.max(1e-9, ...contrib.map((q) => Math.abs(q.v)));
    out.textContent = '';
    out.append(h('p', { style: { margin: '10px 0 6px' }, html: 'Prediction: <b style="color:' + (pred ? 'var(--c2)' : 'var(--c1)') + '">' + K.labels[pred] + '</b> · score ' + UI.f(score, 2) + ' (' + (Math.abs(score) >= 1 ? 'outside' : 'inside') + ' the street, which ends at ±1)' }));
    if (!contrib.length) out.append(h('p', { class: 'note', html: 'No known words in this sentence, so only the offset (' + UI.f(model.b, 2) + ') decides.' }));
    else out.append(h('table', { class: 't' }, h('thead', null, h('tr', null, ['word', 'pushes towards', 'weight × TF-IDF'].map((t) => h('th', { text: t })))), h('tbody', null, contrib.map((q) => h('tr', null, h('td', { text: q.word }), h('td', { style: { textAlign: 'left', width: '50%' } }, bar(q.v, max, q.v >= 0 ? UI.colors().c[1] : UI.colors().c[0]), ' ', h('span', { class: 'note', text: q.v >= 0 ? 'technical' : 'billing' })), h('td', { text: UI.f(q.v, 3) }))), h('tr', null, h('td', { text: 'offset' }), h('td', null), h('td', { text: UI.f(model.b, 3) })))));
    if (unknown.length) out.append(h('p', { class: 'note', html: 'Ignored (never seen in training): <i>' + [...new Set(unknown)].join(', ') + '</i>' }));
  }
  fitModel();
})();
