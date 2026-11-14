# Advanced ML (ML II): interactive simulations

25 interactive, in-browser simulations for **Advanced Machine Learning (ML II)**, B.Tech AIML, Year 2, Term 2. They cover the live Python segments of **Sessions 1 to 4**: PCA, t-SNE and UMAP, support vector machines, kernels, support vector regression and the one-class SVM.

**Live site:** https://amulyavarshney.github.io/simulations/

Each page is one idea: drag points, move sliders and read the numbers. Every page also has a "What to notice" list, a "Try this" list and a pointer to the session slide or notebook step it comes from. Some pages start with a "predict first" question that matches an in-class poll.

## Catalogue

### PCA in practice (Session 1)

Variance, scaling, choosing the number of components, reconstruction, denoising and PCA inside a cross-validated pipeline.

| Simulation | What it shows |
|---|---|
| [Find the direction of maximum variance](pca/directions/) | Spin a line through a cloud of points. The direction that keeps the most variance is also the one that loses the least when you project, and it is exactly the first principal component. |
| [Scaling decides what PCA sees (wine)](pca/scaling/) | PCA maximises variance, and variance depends on units. On the raw wine data one feature measured in the hundreds takes over PC1. Standardise, or change a unit, and the picture changes. |
| [Scree plot, cumulative variance and choosing k (digits)](pca/choosing-k/) | Sixty-four pixel features, but digits live near a much smaller space. Slide k and watch reconstructions sharpen, then set a variance target and see how many components it asks for. |
| [Reconstruct and denoise digits](pca/denoising/) | Noise spreads over all 64 directions while a digit's shape lives in the top few. Keep only the leading components and much of the noise drops out. |
| [Tune k by cross-validation, inside the pipeline (wine)](pca/pipeline-cv/) | Scale, then PCA, then logistic regression, each step fitted on the training folds only. Sweep k, read the accuracy curve with its spread, and compare with the leaky shortcut. |

### Nonlinear embeddings: t-SNE and UMAP (Session 2)

Why linear maps miss curved structure, what perplexity and n_neighbors do, and how to read these plots without fooling yourself.

| Simulation | What it shows |
|---|---|
| [A linear map cannot unroll a curved sheet](embeddings/swiss-roll/) | A Swiss roll is a flat sheet rolled up in 3-D. PCA presses the roll flat and piles the turns on top of each other, while t-SNE and UMAP keep neighbours together and unroll it. Drag the roll to view it from any side. |
| [t-SNE: perplexity sets each point's neighbourhood](embeddings/tsne-perplexity/) | Every point gets its own Gaussian, widened until about “perplexity” neighbours carry real weight. Click a point to see its neighbourhood, then watch how perplexity reshapes a t-SNE map of the digits. |
| [t-SNE: same data, different seeds](embeddings/tsne-seeds/) | Run t-SNE three times on the same digits with the same settings. Neighbourhoods come out the same; where the clusters sit relative to each other does not. |
| [Reading plots honestly: sizes, gaps and structure from nothing](embeddings/misreading/) | Two experiments on what a 2-D map does and does not tell you: one dataset with a loose and a tight cluster, and pure noise that is made to look like clusters. |
| [UMAP: n_neighbors and min_dist](embeddings/umap-settings/) | n_neighbors sets how large a neighbourhood UMAP looks at; min_dist sets how tightly points may pack in the map. Change them, switch on the neighbour graph, and see what each one controls. |
| [UMAP places new points; t-SNE cannot](embeddings/new-points/) | UMAP learns a mapping, so unseen digits can be placed on an existing map. t-SNE has no such step: to add points you refit, and the old points move. |

### SVM I: maximum margin (Session 3)

The widest street, support vectors, the soft margin and C, hinge loss against log-loss, scaling, and a linear SVM on text.

| Simulation | What it shows |
|---|---|
| [The widest street on a number line](svm-margin/number-line/) | Twelve sensor readings, healthy on the left and failing on the right. Many thresholds separate them, but one leaves the widest street. Drag the readings and the threshold to find it. |
| [Hard-margin SVM in two features](svm-margin/max-margin/) | Many lines separate two groups of points. The maximum-margin line is the one with the widest empty street, and only the points touching the street matter. |
| [Soft margin: what C does](svm-margin/soft-margin/) | C sets the price of a point inside the street or on the wrong side. Small C buys a wide street and tolerates mistakes; large C buys few mistakes and a narrow street. Sweep it and watch cross-validated accuracy. |
| [Hinge loss against log-loss](svm-margin/hinge-vs-log/) | Both losses punish points on the wrong side. The hinge loss is exactly zero once a point is safely outside the street; the log-loss never quite reaches zero. Fit both to the same points and compare. |
| [Why SVMs need scaled features](svm-margin/scaling/) | The margin is measured in raw feature units, so the units you pick change the answer. Put the informative feature in tiny units and an unscaled SVM stops using it; standardise first and the answer no longer depends on units. |
| [A linear SVM on text (TF-IDF)](svm-margin/text/) | Turn sentences into TF-IDF vectors, fit a linear SVM, and see which words push a message towards billing or technical support. Type your own sentence to see the score broken down word by word. |

### SVM II: kernels (Session 4)

Lifting to higher dimensions, the kernel trick, polynomial and RBF kernels, the weighted-vote view, and tuning C with gamma.

| Simulation | What it shows |
|---|---|
| [Lift the number line into a plane](svm-kernels/lift/) | No single threshold separates these readings: the failing ones sit on both sides of the healthy ones. Lift each reading z to the point (z, z²) and a straight line in the plane does the job. |
| [Kernels are dot products in a lifted space](svm-kernels/kernel-identities/) | Three checks you can run yourself: the polynomial kernel equals a dot product of lifted points, an SVM solves XOR with exact weights of 1/8, and the RBF kernel is an infinite stack of polynomial kernels. |
| [Kernel playground: C, γ and who gets a vote](svm-kernels/playground/) | Draw your own data, pick a kernel, and tune C and γ. Switch on the probe to see how the RBF score is a weighted vote of support vectors. |
| [The RBF score as a weighted vote](svm-kernels/rbf-vote/) | On a number line the RBF score is easy to see: each support vector adds a bump of height α·y, the bumps add up, and the offset b shifts the total. Drag the probe and read every vote. |
| [Tune C and γ together](svm-kernels/c-gamma-grid/) | Every cell of the grid is an RBF SVM trained with one (C, γ) pair and scored on held-out points. Click a cell to see its boundary. The good region is a band, not a point. |

### SVM II: regression, anomalies and cost (Session 4)

Support vector regression and the epsilon-tube, the one-class SVM, and what training costs as data grows.

| Simulation | What it shows |
|---|---|
| [Support vector regression: the ε-tube](svm-beyond/svr-tube/) | SVR fits a curve with a tube of half-width ε around it. Points inside the tube cost nothing; only points on or outside it pull on the fit and become support vectors. |
| [One-class SVM and ν](svm-beyond/one-class/) | Fit a boundary around normal data only, with no labels. The parameter ν says how much of the training data may fall outside, and it also bounds the number of support vectors. |
| [Training cost grows roughly with n² (and what to use instead)](svm-beyond/cost-and-choice/) | Time an RBF SVM as the data grows and fit the exponent, then compare it with a linear model and a decision tree on the same data. Measured in your browser, so absolute times differ from scikit-learn. |

## How it is built

- **Plain static files.** HTML, CSS and vanilla JavaScript with canvas. No framework, no build step, no dependencies, and no network requests, so it also works offline: open `index.html` in a browser or serve the folder.
- **The algorithms are real.** `assets/ml-core.js` (PCA, SVD, trustworthiness, cross-validation folds), `assets/ml-svm.js` (a libsvm-style SMO solver behind SVC, epsilon-SVR and one-class SVM, plus logistic regression and TF-IDF) and `assets/ml-embed.js` (t-SNE and UMAP) are small and readable.
- **Colour and accessibility.** Series colours come from a palette checked for colour-blind separation in light and dark mode; classes also differ by marker shape. Every page works on a phone, respects the system dark-mode and reduced-motion settings, and has keyboard-operable controls.

## How the numbers are checked

`tests/` compares the JavaScript against scikit-learn on stored reference values:

```sh
./tests/run-all.sh        # needs only Node.js
```

- **PCA, SVD, trustworthiness, stratified folds:** agree with scikit-learn to rounding error (wine: 99.81% of variance on PC1 unscaled and 36.20% standardised; digits: 29 components for 95%).
- **SVC, SVR, one-class SVM:** same number of support vectors and decision values within about 4e-4 of scikit-learn at the same tolerance.
- **Logistic regression:** coefficients agree to 1e-8; the wine cross-validation curve agrees to within one validation sample.
- **t-SNE:** the affinity matrix matches scikit-learn to 1e-10 and the first iterations follow its update rule. t-SNE is chaotic, so beyond a few iterations only quality (final KL divergence, trustworthiness) can be compared, not exact positions.
- **UMAP** is a compact re-implementation of the published recipe (smooth-kNN graph, fuzzy union, spectral start, edge-sampled SGD, transform of new points), **not** the `umap-learn` package, and is not bit-identical to it. Its curve parameters match SciPy's curve fit, and its graph and layout are checked by property tests.

To regenerate the reference values (needs Python with numpy, scipy, scikit-learn): `python3 tests/make_reference_core.py`, `make_reference_svm.py` and `make_reference_embed.py`.

## Run it locally

```sh
python3 -m http.server 8000      # then open http://localhost:8000/
```

## Deploy to GitHub Pages

The repository is named `simulations`, so GitHub Pages serves it at `https://<user>.github.io/simulations/` next to a user site of the same account. In the repository on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)`**. The empty `.nojekyll` file turns off Jekyll processing. All links are relative, so the site works from any path.

## Adding a simulation

1. Add an entry to `assets/sims.js` (category, slug, title, text, the extra libraries it needs).
2. Create `<category>/<slug>/sim.js`; copy a similar page for the pattern (`UI.shell(id)` builds the page, `UI.Plot` draws).
3. Run `node tools/make-pages.js` to write the page's `index.html`, then `node tools/make-readme.js` to refresh this table.

## Data and credits

- UCI **Wine** recognition data (Forina et al., 1991) and UCI **Optical Recognition of Handwritten Digits** (Alpaydin & Kaynak), both CC BY 4.0, loaded through scikit-learn and embedded in `assets/data/`.
- The customer-message corpus in the text simulation is made up for this course.
- Session 3 and 4 pages point to pre-class viewing from StatQuest (Josh Starmer) on support vector machines. The videos are cited, not reproduced; the examples and code here are original.

No licence file has been added yet; choose one before inviting reuse.
