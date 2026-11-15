// node tools/make-readme.js : regenerates README.md (the catalogue table comes from assets/sims.js)
const fs = require('fs'), path = require('path');
global.window = {}; require('../assets/sims.js'); const S = window.SIMS;
const strip = (h) => h.replace(/<[^>]+>/g, '');
let table = '';
for (const cat of S.categories) {
  table += `\n### ${cat.name}\n\n${cat.blurb}\n\n| Simulation | What it shows |\n|---|---|\n`;
  for (const it of S.items.filter((x) => x.cat === cat.id)) table += `| [${it.title}](${it.cat}/${it.slug}/) | ${strip(it.blurb)} |\n`;
}
const md = `# Interactive machine learning simulations

${S.items.length} interactive, in-browser simulations covering PCA, t-SNE and UMAP, support vector machines, kernels, support vector regression, the one-class SVM, and model evaluation (validation, leakage and tuning).

**Live site:** https://amulyavarshney.github.io/ml-simulations/

Each page is one idea: drag points, move sliders and read the numbers. Every page also has a "What to notice" list and a "Try this" list. Some pages start with a "predict first" question.

## Catalogue
${table}
## How it is built

- **Plain static files.** HTML, CSS and vanilla JavaScript with canvas. No framework, no build step, no dependencies, and no network requests, so it also works offline: open \`index.html\` in a browser or serve the folder.
- **The algorithms are real.** \`assets/ml-core.js\` (PCA, SVD, trustworthiness, cross-validation folds), \`assets/ml-svm.js\` (a libsvm-style SMO solver behind SVC, epsilon-SVR and one-class SVM, plus logistic regression and TF-IDF) \`assets/ml-embed.js\` (t-SNE and UMAP) and \`assets/ml-eval.js\` (fold schemes, AUC, feature selection, nested cross-validation, a compact TPE sampler and the Session 5 data generators) are small and readable.
- **Colour and accessibility.** Series colours come from a palette checked for colour-blind separation in light and dark mode; classes also differ by marker shape. Every page works on a phone, respects the system dark-mode and reduced-motion settings, and has keyboard-operable controls.

## How the numbers are checked

\`tests/\` compares the JavaScript against scikit-learn on stored reference values:

\`\`\`sh
./tests/run-all.sh        # needs only Node.js
\`\`\`

- **PCA, SVD, trustworthiness, stratified folds:** agree with scikit-learn to rounding error (wine: 99.81% of variance on PC1 unscaled and 36.20% standardised; digits: 29 components for 95%).
- **SVC, SVR, one-class SVM:** same number of support vectors and decision values within about 4e-4 of scikit-learn at the same tolerance.
- **Logistic regression:** coefficients agree to 1e-8; the wine cross-validation curve agrees to within one validation sample.
- **Model evaluation:** the fold assignments of K-fold, stratified K-fold, group K-fold and the time-series split are identical to scikit-learn on stored inputs; the rank-based AUC and the ROC curve equal \`roc_auc_score\` and \`roc_curve\`; the F statistics and selected columns equal \`f_classif\` and \`SelectKBest\`; nearest centroid and k-nearest neighbours give the same predictions as scikit-learn. Property tests check that selection inside the folds stays near 50% on noise, that nested CV is below the best CV score on noise, and that the compact TPE beats random search on a smooth test function.
- **t-SNE:** the affinity matrix matches scikit-learn to 1e-10 and the first iterations follow its update rule. t-SNE is chaotic, so beyond a few iterations only quality (final KL divergence, trustworthiness) can be compared, not exact positions.
- **UMAP** is a compact re-implementation of the published recipe (smooth-kNN graph, fuzzy union, spectral start, edge-sampled SGD, transform of new points), **not** the \`umap-learn\` package, and is not bit-identical to it. Its curve parameters match SciPy's curve fit, and its graph and layout are checked by property tests.

To regenerate the reference values (needs Python with numpy, scipy, scikit-learn): \`python3 tests/make_reference_core.py\`, \`make_reference_svm.py\` and \`make_reference_embed.py\`.

## Run it locally

\`\`\`sh
python3 -m http.server 8000      # then open http://localhost:8000/
\`\`\`

## Deploy to GitHub Pages

The site is deployed by GitHub Actions (\`.github/workflows/pages.yml\`). On every push to \`main\` it runs the numerical checks in \`tests/\` and, if they pass, publishes the site. The tests and tooling are left out of the published files. You can also start it by hand from the **Actions** tab (**Run workflow**).

One-time setup in the repository on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is then served at \`https://<user>.github.io/<repository>/\`. All links are relative, so it works from any path, including after a rename.

## Adding a simulation

1. Add an entry to \`assets/sims.js\` (category, slug, title, text, the extra libraries it needs).
2. Create \`<category>/<slug>/sim.js\`; copy a similar page for the pattern (\`UI.shell(id)\` builds the page, \`UI.Plot\` draws).
3. Run \`node tools/make-pages.js\` to write the page's \`index.html\`, then \`node tools/make-readme.js\` to refresh this table.

## Data and credits

- UCI **Wine** recognition data (Forina et al., 1991) and UCI **Optical Recognition of Handwritten Digits** (Alpaydin & Kaynak), both CC BY 4.0, loaded through scikit-learn and embedded in \`assets/data/\`.
- The customer-message corpus in the text simulation, and the churn table and customer data in the Session 5 pages, are made up (generated in your browser).
- Some of the SVM pages point to StatQuest (Josh Starmer) videos on support vector machines as background viewing. The videos are cited, not reproduced; the examples and code here are original.

## Licence

The code, the page text and the made-up message corpus are released under the [MIT licence](LICENSE). The embedded datasets keep their own licences (CC BY 4.0, see above).
`;
fs.writeFileSync(path.join(__dirname, '..', 'README.md'), md); console.log('README.md written,', md.length, 'chars');
