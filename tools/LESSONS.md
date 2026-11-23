# Writing a lesson for a simulation

Every simulation page has two layers: the interactive widget (`<category>/<slug>/sim.js`) and a **lesson** that teaches the concept end to end.
A lesson is one file, `tools/lessons/<category>/<slug>.js`, that exports a plain object. `node tools/make-lessons.js` validates it and writes `assets/lessons/<category>.js`; `assets/lesson.js` renders it around the simulation.

**Read `tools/lessons/svm-margin/max-margin.js` first. It is the model lesson: copy its depth, tone and structure.**

## Why these lessons exist

Students told us the classes read from notes, do not explain the code, and are not interactive. They end up learning from AI tools. So a lesson must work for someone who has no one to explain it to:
define every term, show every step of the arithmetic, explain every token of every code line, and tell the learner how to remember it.
A lesson is **not** a description of the page. Do not repeat what the widget labels already say. Teach the concept.

## The fields (all required; limits are checked by the validator)

| Field | What it is | Size |
|---|---|---|
| `idea` | The whole concept in plain words, 1 to 2 sentences. | up to 45 words |
| `why` | The problem it solves, concrete, with the cost of getting it wrong. | up to 70 words |
| `analogy` | An everyday picture (roads, kitchens, exams, cricket, shops). Must map onto the real concept, not just decorate it. | up to 80 words |
| `vocab` | `[[term, definition], ...]` the 3 to 8 words a learner must own. Definitions in plain words. | 3 to 8 items |
| `steps` | `[{h, p}, ...]` the concept built from zero: problem, naive attempt, what goes wrong, the fix, the formula, the limit. Each step adds one new idea. | 4 to 8 steps, up to 90 words each |
| `example` | `{title, setup, table?: {head, rows}, walk: [...], result}` a small worked example with real numbers that a student can redo by hand or calculator. Every number comes from code you ran. | walk: 3 or more lines |
| `read` | `[[what you see, what it means], ...]` how to read the simulation: every colour, line, marker and readout that is not obvious. Use the exact labels the page shows. | 3 to 12 rows |
| `experiments` | `[{do, see, why}, ...]` things to do in the widget, what will happen, and why. Each must be doable with the page's real controls and must really produce what you say. | 3 to 6 |
| `remember` | `[{tag, text}, ...]` tips and tricks to remember it: a picture, a rule of thumb, a mnemonic, a formula in words, a sanity check. Tags: Picture, Mnemonic, Rule of thumb, Trick, Formula in words, Sanity check, Link to code. No forced acronyms. | 3 to 7 |
| `mistakes` | `[{wrong, right}, ...]` real misconceptions students have, each corrected. | 2 to 5 |
| `code` | `[{title, py, out, walk, tip?}, ...]` tiny snippets. `py` is complete and runnable (imports included), 12 lines at most, deterministic. `out` is the exact printed output. `walk` is `[[code piece, what it means], ...]` explaining the syntax token by token: argument names, the trailing-underscore attributes, `fit` versus `transform`, shapes, why double brackets. | 1 to 3 snippets, walk 3+ rows |
| `check` | `[{q, options, answer, why}, ...]` exactly 3 questions: one concept, one numeric or code-reading, one "what would happen if". `answer` is the index of the right option. `why` explains the right answer. | exactly 3, with 3 or 4 options |
| `teachback` | `{prompt, model}` ask the learner to explain it in two sentences; `model` is a good answer. | |
| `cheat` | The revision card: the concept and its key formula or rule in 2 to 3 sentences. | up to 70 words |

Allowed HTML inside text: `<b>`, `<i>`, `<code>`, `<sub>`, `<sup>`, `<br>`, and `<span class="eq">formula</span>` for inline formulas. Use Unicode for maths (σ ² √ ≈ ≥ ‖w‖ Σ). No scripts, styles or event handlers. Write the file with ordinary JS strings (single quotes; escape `'` as `\'`) or template literals.

## Style

- Audience: second-year B.Tech students, many reading English as a second language. Short sentences. One idea per sentence. Say "you".
- Define a term the first time it appears. Never use "obviously", "clearly" or "simply".
- Prefer a concrete number to an adjective. "The street is 2.83 wide", not "the street is wide".
- The running story across the course is credit risk (customers, defaults, loans, rupees), but use whatever example teaches best.
- Tips and tricks must be genuinely useful: a way of seeing it, a check that catches errors, a rule that says when to use what. Skip jokes and cute acronyms unless the acronym really helps.
- Code comments and walk rows must explain *why*, not just restate the line.
- No em dashes (use a comma, colon or full stop). No filler such as "In this lesson we will".

## Accuracy rules (a wrong lesson is worse than none)

1. **Every number you write must come from code you ran.** Run Python with `PY=/private/tmp/claude-503/-Users-avarshney2/52d9cf78-885b-494d-924f-f1861de1092a/scratchpad/labenv/bin/python` (it has numpy, scipy, scikit-learn, pandas, matplotlib, umap-learn). The simulations' JavaScript can be loaded in Node (see how `tests/test-*.js` load `assets/ml-*.js`) to see what the widget really computes.
2. **Every experiment must be true of the real widget.** Read the simulation's `sim.js` (and the `assets/*.js` it uses) so you know the exact controls, their labels and ranges, the presets, and what each readout computes. If the widget is random, say what is typical, not an exact value.
3. **Every code snippet is executed by `node tools/check-lesson-code.js <slug>` and its printed output must equal `out` exactly.** Round floats (`round`, `np.round`, f-strings) and always set `random_state`.
4. Do not copy numbers from slides without re-running them. If you find that a slide, a note or the widget contradicts your computation, say so in your report.
5. Keep within what the simulation and Sessions 1 to 6 cover. Do not introduce a new method just to fill space.

## Checking your work

```
node tools/make-lessons.js --check                       # schema, sizes, forbidden markup
PY=<python above> node tools/check-lesson-code.js <slug> # runs your snippets, compares outputs
```

Do not run `node tools/make-lessons.js` without `--check`, and do not edit any file except your own lessons: other people are writing theirs at the same time.

## Where to read for context

- The widget: `<category>/<slug>/sim.js`, the libraries it loads (`assets/ml-*.js`, `assets/*-ui.js`), and its entry in `assets/sims.js` (title, blurb, `notice`, `tryit`, `from`).
- Class material for consistency of terms: `~/Downloads/AML_Session<N>_doc_sources/*Teaching_Notes.md` and `*Derivations.md` (Sessions 4, 5, 6), `~/Downloads/AML_Session3_*.pdf`, `~/Downloads/AML_Session1_Kickoff_and_PCA.pptx`. These are background; verify by computing.
