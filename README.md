# Interactive machine learning simulations

41 interactive, in-browser simulations covering PCA, t-SNE and UMAP, support vector machines, kernels, support vector regression, the one-class SVM, and model evaluation (validation, leakage and tuning, calibration, decisions from costs and comparing models).

**Live site:** https://amulyavarshney.github.io/ml-simulations/

Each page is one idea: drag points, move sliders and read the numbers. Every page also has a "What to notice" list and a "Try this" list. Some pages start with a "predict first" question.

## Catalogue

### PCA in practice

Variance, scaling, choosing the number of components, reconstruction, denoising and PCA inside a cross-validated pipeline.

| Simulation | What it shows |
|---|---|
| [Find the direction of maximum variance](pca/directions/) | Spin a line through a cloud of points. The direction that keeps the most variance is also the one that loses the least when you project, and it is exactly the first principal component. |
| [Scaling decides what PCA sees (wine)](pca/scaling/) | PCA maximises variance, and variance depends on units. On the raw wine data one feature measured in the hundreds takes over PC1. Standardise, or change a unit, and the picture changes. |
| [Scree plot, cumulative variance and choosing k (digits)](pca/choosing-k/) | Sixty-four pixel features, but digits live near a much smaller space. Slide k and watch reconstructions sharpen, then set a variance target and see how many components it asks for. |
| [Reconstruct and denoise digits](pca/denoising/) | Noise spreads over all 64 directions while a digit's shape lives in the top few. Keep only the leading components and much of the noise drops out. |
| [Tune k by cross-validation, inside the pipeline (wine)](pca/pipeline-cv/) | Scale, then PCA, then logistic regression, each step fitted on the training folds only. Sweep k, read the accuracy curve with its spread, and compare with the leaky shortcut. |

### Nonlinear embeddings: t-SNE and UMAP

Why linear maps miss curved structure, what perplexity and n_neighbors do, and how to read these plots without fooling yourself.

| Simulation | What it shows |
|---|---|
| [A linear map cannot unroll a curved sheet](embeddings/swiss-roll/) | A Swiss roll is a flat sheet rolled up in 3-D. PCA presses the roll flat and piles the turns on top of each other, while t-SNE and UMAP keep neighbours together and unroll it. Drag the roll to view it from any side. |
| [t-SNE: perplexity sets each point's neighbourhood](embeddings/tsne-perplexity/) | Every point gets its own Gaussian, widened until about “perplexity” neighbours carry real weight. Click a point to see its neighbourhood, then watch how perplexity reshapes a t-SNE map of the digits. |
| [t-SNE: same data, different seeds](embeddings/tsne-seeds/) | Run t-SNE three times on the same digits with the same settings. Neighbourhoods come out the same; where the clusters sit relative to each other does not. |
| [Reading plots honestly: sizes, gaps and structure from nothing](embeddings/misreading/) | Two experiments on what a 2-D map does and does not tell you: one dataset with a loose and a tight cluster, and pure noise that is made to look like clusters. |
| [UMAP: n_neighbors and min_dist](embeddings/umap-settings/) | n_neighbors sets how large a neighbourhood UMAP looks at; min_dist sets how tightly points may pack in the map. Change them, switch on the neighbour graph, and see what each one controls. |
| [UMAP places new points; t-SNE cannot](embeddings/new-points/) | UMAP learns a mapping, so unseen digits can be placed on an existing map. t-SNE has no such step: to add points you refit, and the old points move. |

### SVM I: maximum margin

The widest street, support vectors, the soft margin and C, hinge loss against log-loss, scaling, and a linear SVM on text.

| Simulation | What it shows |
|---|---|
| [The widest street on a number line](svm-margin/number-line/) | Twelve sensor readings, healthy on the left and failing on the right. Many thresholds separate them, but one leaves the widest street. Drag the readings and the threshold to find it. |
| [Hard-margin SVM in two features](svm-margin/max-margin/) | Many lines separate two groups of points. The maximum-margin line is the one with the widest empty street, and only the points touching the street matter. |
| [Soft margin: what C does](svm-margin/soft-margin/) | C sets the price of a point inside the street or on the wrong side. Small C buys a wide street and tolerates mistakes; large C buys few mistakes and a narrow street. Sweep it and watch cross-validated accuracy. |
| [Hinge loss against log-loss](svm-margin/hinge-vs-log/) | Both losses punish points on the wrong side. The hinge loss is exactly zero once a point is safely outside the street; the log-loss never quite reaches zero. Fit both to the same points and compare. |
| [Why SVMs need scaled features](svm-margin/scaling/) | The margin is measured in raw feature units, so the units you pick change the answer. Put the informative feature in tiny units and an unscaled SVM stops using it; standardise first and the answer no longer depends on units. |
| [A linear SVM on text (TF-IDF)](svm-margin/text/) | Turn sentences into TF-IDF vectors, fit a linear SVM, and see which words push a message towards billing or technical support. Type your own sentence to see the score broken down word by word. |

### SVM II: kernels

Lifting to higher dimensions, the kernel trick, polynomial and RBF kernels, the weighted-vote view, and tuning C with gamma.

| Simulation | What it shows |
|---|---|
| [Lift the number line into a plane](svm-kernels/lift/) | No single threshold separates these readings: the failing ones sit on both sides of the healthy ones. Lift each reading z to the point (z, z²) and a straight line in the plane does the job. |
| [Kernels are dot products in a lifted space](svm-kernels/kernel-identities/) | Three checks you can run yourself: the polynomial kernel equals a dot product of lifted points, an SVM solves XOR with exact weights of 1/8, and the RBF kernel is an infinite stack of polynomial kernels. |
| [Kernel playground: C, γ and who gets a vote](svm-kernels/playground/) | Draw your own data, pick a kernel, and tune C and γ. Switch on the probe to see how the RBF score is a weighted vote of support vectors. |
| [The RBF score as a weighted vote](svm-kernels/rbf-vote/) | On a number line the RBF score is easy to see: each support vector adds a bump of height α·y, the bumps add up, and the offset b shifts the total. Drag the probe and read every vote. |
| [Tune C and γ together](svm-kernels/c-gamma-grid/) | Every cell of the grid is an RBF SVM trained with one (C, γ) pair and scored on held-out points. Click a cell to see its boundary. The good region is a band, not a point. |

### SVM II: regression, anomalies and cost

Support vector regression and the epsilon-tube, the one-class SVM, and what training costs as data grows.

| Simulation | What it shows |
|---|---|
| [Support vector regression: the ε-tube](svm-beyond/svr-tube/) | SVR fits a curve with a tube of half-width ε around it. Points inside the tube cost nothing; only points on or outside it pull on the fit and become support vectors. |
| [One-class SVM and ν](svm-beyond/one-class/) | Fit a boundary around normal data only, with no labels. The parameter ν says how much of the training data may fall outside, and it also bounds the number of support vectors. |
| [Training cost grows roughly with n² (and what to use instead)](svm-beyond/cost-and-choice/) | Time an RBF SVM as the data grows and fit the exponent, then compare it with a linear model and a decision tree on the same data. Measured in your browser, so absolute times differ from scikit-learn. |

### Model evaluation I: validation, leakage and tuning

Why one split is a lottery, choosing folds that match the data, leakage through preprocessing and through features, tuning without fooling yourself, and reading learning and validation curves.

| Simulation | What it shows |
|---|---|
| [One test set is one draw of the lottery](evaluation/split-lottery/) | The same data and the same model, scored by 200 different random splits, by 5-fold cross-validation and by repeated 5-fold. A single hold-out number can be far off when the data is small; averaging over folds steadies it. |
| [Choose the folds that match the data](evaluation/split-schemes/) | K-fold, stratified, group and time-series splits drawn row by row. Pick the kind of data and see what each scheme gets wrong: the class share in each test fold, groups on both sides, and test rows from before the training rows. |
| [Random folds vs the real world](evaluation/random-vs-real/) | Two ways a random split flatters a model: customers with several rows each, and a relationship that drifts over time. Compare random folds with honest folds and with what you really get on new customers or on the future. |
| [Noise can score 90%: selecting features before cross-validation](evaluation/preprocessing-leak/) | The labels are coin flips and every feature is noise, yet choosing features on all the rows before cross-validation scores far above 50%. Choose them inside each training fold and the score falls back to 50%. |
| [The churn model with 0.99 AUC that falls to 0.7 in use](evaluation/target-leak/) | A made-up churn table in which three columns are written by the churn event itself. Scored on the table they give 0.99 AUC however you split it; scored on the day before customers decide, the same model falls to about 0.7. |
| [Grid, random and smart search under a budget](evaluation/search-strategies/) | Train a fixed number of RBF SVMs chosen by a grid, by seeded random search and by a compact TPE sampler, on a table of C and γ scores. See which values each one tries, and how big the difference in the best score really is. |
| [The best score you picked is not the score you will get](evaluation/nested-cv/) | Choose the best of m settings by 5-fold CV and the score you report is flattered by the choice. Nested cross-validation and fresh data show what the chosen model really delivers, over many simulated datasets. |
| [Complexity: where the validation score turns](evaluation/validation-curve/) | One complexity knob, the RBF width γ, plotted against the training score and the 5-fold CV score. Move γ and see the boundary go from too smooth to too wiggly, with a plain diagnosis for each zone. |
| [Would more data help?](evaluation/learning-curve/) | Hold the model fixed and grow the training set: plot the training and the CV score. A big gap that shrinks asks for more data; two low curves that agree ask for a richer model; two high curves that agree mean you are done. |

### Model evaluation II: calibration, decisions and comparing models

Can you trust a model's probabilities, how to turn them into decisions from costs, and how to say with evidence that one model is really better than another.

| Simulation | What it shows |
|---|---|
| [Does a 70% forecast come true 70% of the time?](decisions/reliability-diagram/) | A forecast of 70% should come true on about 70% of such cases, like a 70% chance of rain: sort a loan model’s probabilities into bins, compare each bin with what really happened, and see which models can be trusted. |
| [Fixing the probabilities: Platt scaling and isotonic regression](decisions/calibration-fix/) | Fit Platt scaling (two numbers) or isotonic regression (a staircase) on a separate calibration set, apply it to held-out applicants, and see how the reliability curve, the scores and the ranking change. |
| [Pick the cut-off from the costs, not from 0.5](decisions/cost-threshold/) | Turn a calibrated probability into a yes or no from the money at stake: approve when the chance of repayment is above loss / (gain + loss), and see why 0.5 loses money and why an over-confident model breaks the rule. |
| [Is 86% really better than 85%?](decisions/test-set-noise/) | Two models with true accuracies of 85% and 86% will not score 85% and 86% on a test set: simulate 1,000 comparisons to see how often chance reverses the order, and use a bootstrap interval to judge one test set. |
| [Only the rows where the models disagree matter](decisions/mcnemar/) | Two models scored on the same test rows differ only where one is right and the other wrong, so McNemar’s test looks only at those rows (b against c) and a paired bootstrap gives an interval for the difference. |
| [The paired t-test across CV folds fools you](decisions/cv-t-test/) | Compare two models that are equally good, over and over on fresh data: a paired t-test on cross-validation fold differences cries “different” far too often, and Nadeau and Bengio’s corrected version does not. |
| [Same accuracy, different errors by group](decisions/group-metrics/) | Choose one threshold for everyone or one per group, and read the approval rate, true positive rate, false positive rate, precision, accuracy and profit that the same model gives for each group of made-up applicants. |

## How it is built

- **Plain static files.** HTML, CSS and vanilla JavaScript with canvas. No framework, no build step, no dependencies, and no network requests, so it also works offline: open `index.html` in a browser or serve the folder.
- **The algorithms are real.** `assets/ml-core.js` (PCA, SVD, trustworthiness, cross-validation folds), `assets/ml-svm.js` (a libsvm-style SMO solver behind SVC, epsilon-SVR and one-class SVM, plus logistic regression and TF-IDF) `assets/ml-embed.js` (t-SNE and UMAP) `assets/ml-eval.js` (fold schemes, AUC, feature selection, nested cross-validation, a compact TPE sampler and the data generators for the evaluation pages) and `assets/ml-decide.js` (reliability bins, Platt scaling, isotonic regression, Gaussian naive Bayes, profit against a threshold, McNemar and bootstrap tests, Student-t and chi-square distributions, the corrected resampled t-test and the made-up loan tables) are small and readable.
- **Colour and accessibility.** Series colours come from a palette checked for colour-blind separation in light and dark mode; classes also differ by marker shape. Every page works on a phone, respects the system dark-mode and reduced-motion settings, and has keyboard-operable controls.

## How the numbers are checked

`tests/` compares the JavaScript against scikit-learn on stored reference values:

```sh
./tests/run-all.sh        # needs only Node.js
```

- **PCA, SVD, trustworthiness, stratified folds:** agree with scikit-learn to rounding error (wine: 99.81% of variance on PC1 unscaled and 36.20% standardised; digits: 29 components for 95%).
- **SVC, SVR, one-class SVM:** same number of support vectors and decision values within about 4e-4 of scikit-learn at the same tolerance.
- **Logistic regression:** coefficients agree to 1e-8; the wine cross-validation curve agrees to within one validation sample.
- **Model evaluation:** the fold assignments of K-fold, stratified K-fold, group K-fold and the time-series split are identical to scikit-learn on stored inputs; the rank-based AUC and the ROC curve equal `roc_auc_score` and `roc_curve`; the F statistics and selected columns equal `f_classif` and `SelectKBest`; nearest centroid and k-nearest neighbours give the same predictions as scikit-learn. Property tests check that selection inside the folds stays near 50% on noise, that nested CV is below the best CV score on noise, and that the compact TPE beats random search on a smooth test function.
- **Model evaluation II:** the Brier score, log-loss and the reliability bins (with their counts) equal `brier_score_loss`, `log_loss` and `calibration_curve`; the isotonic regression thresholds and predictions equal `IsotonicRegression`; Platt scaling equals an unregularised `LogisticRegression` of the label on the score; Gaussian naive Bayes and the k-nearest-neighbour vote profile equal `GaussianNB` and `KNeighborsClassifier`; the exact McNemar p-value equals `scipy.stats.binomtest`, and the chi-square, Student-t and incomplete-beta functions, the paired t-test and the confusion counts by group equal SciPy and scikit-learn. Property tests check that calibration maps never decrease, that Platt scaling and isotonic regression lower the Brier score of an over-confident model, that the best threshold sits near loss / (gain + loss) for calibrated probabilities, that the naive paired t-test over cross-validation folds raises more false alarms than the corrected one, and that the bootstrap interval covers the true difference about 95% of the time.
- **t-SNE:** the affinity matrix matches scikit-learn to 1e-10 and the first iterations follow its update rule. t-SNE is chaotic, so beyond a few iterations only quality (final KL divergence, trustworthiness) can be compared, not exact positions.
- **UMAP** is a compact re-implementation of the published recipe (smooth-kNN graph, fuzzy union, spectral start, edge-sampled SGD, transform of new points), **not** the `umap-learn` package, and is not bit-identical to it. Its curve parameters match SciPy's curve fit, and its graph and layout are checked by property tests.

To regenerate the reference values (needs Python with numpy, scipy, scikit-learn): `python3 tests/make_reference_core.py`, `make_reference_svm.py`, `make_reference_embed.py`, `make_reference_eval.py` and `make_reference_decide.py`.

## Run it locally

```sh
python3 -m http.server 8000      # then open http://localhost:8000/
```

## Deploy to GitHub Pages

The site is deployed by GitHub Actions (`.github/workflows/pages.yml`). On every push to `main` it runs the numerical checks in `tests/` and, if they pass, publishes the site. The tests and tooling are left out of the published files. You can also start it by hand from the **Actions** tab (**Run workflow**).

One-time setup in the repository on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The site is then served at `https://<user>.github.io/<repository>/`. All links are relative, so it works from any path, including after a rename.

## Adding a simulation

1. Add an entry to `assets/sims.js` (category, slug, title, text, the extra libraries it needs).
2. Create `<category>/<slug>/sim.js`; copy a similar page for the pattern (`UI.shell(id)` builds the page, `UI.Plot` draws).
3. Run `node tools/make-pages.js` to write the page's `index.html`, then `node tools/make-readme.js` to refresh this table.

## Data and credits

- UCI **Wine** recognition data (Forina et al., 1991) and UCI **Optical Recognition of Handwritten Digits** (Alpaydin & Kaynak), both CC BY 4.0, loaded through scikit-learn and embedded in `assets/data/`.
- The customer-message corpus in the text simulation, the churn table and customer data in the evaluation pages, and the loan tables in the calibration, decision and model-comparison pages, are made up (generated in your browser).
- Some of the SVM pages point to StatQuest (Josh Starmer) videos on support vector machines as background viewing. The videos are cited, not reproduced; the examples and code here are original.

## Licence

The code, the page text and the made-up message corpus are released under the [MIT licence](LICENSE). The embedded datasets keep their own licences (CC BY 4.0, see above).
