/* Catalogue of simulations: drives the home page, the page shell (titles, notes, previous/next) and tools/make-pages.js.
   libs: extra scripts a page needs besides ml-core.js ('wine', 'digits', 'svm', 'embed'). */
window.SIMS = {
  categories: [
    { id: 'pca', name: 'PCA in practice', session: '1', blurb: 'Variance, scaling, choosing the number of components, reconstruction, denoising and PCA inside a cross-validated pipeline.' },
    { id: 'embeddings', name: 'Nonlinear embeddings: t-SNE and UMAP', session: '2', blurb: 'Why linear maps miss curved structure, what perplexity and n_neighbors do, and how to read these plots without fooling yourself.' },
    { id: 'svm-margin', name: 'SVM I: maximum margin', session: '3', blurb: 'The widest street, support vectors, the soft margin and C, hinge loss against log-loss, scaling, and a linear SVM on text.' },
    { id: 'svm-kernels', name: 'SVM II: kernels', session: '4', blurb: 'Lifting to higher dimensions, the kernel trick, polynomial and RBF kernels, the weighted-vote view, and tuning C with gamma.' },
    { id: 'svm-beyond', name: 'SVM II: regression, anomalies and cost', session: '4', blurb: 'Support vector regression and the epsilon-tube, the one-class SVM, and what training costs as data grows.' },
  ],
  items: [
    /* ---------------- Session 1: PCA ---------------- */
    {
      cat: 'pca', slug: 'directions', session: 1, title: 'Find the direction of maximum variance', short: 'Direction of maximum variance', libs: [],
      tags: ['pca', 'svd', 'eigenvector', 'variance'],
      blurb: 'Spin a line through a cloud of points. The direction that keeps the most variance is also the one that loses the least when you project, and it is exactly the first principal component.',
      notice: [
        'Variance along your line is largest at one angle, smallest at 90° from it, and follows a smooth curve in between.',
        '<b>Variance kept + squared distance lost = total variance</b> at every angle, so maximising one minimises the other.',
        'The eigenvalues of the covariance matrix and the squared singular values of the centred data (divided by n − 1) agree to rounding error: two routes, one answer.',
        'On a round cloud the curve is flat. There is no preferred direction, so PC1 means little.'],
      tryit: [
        'Rotate the line by hand until the variance readout stops growing, then press <i>Snap to PC1</i>. How close were you?',
        'Choose <i>Round cloud</i> and sweep the angle. What happens to the curve?',
        'Click in the plot to add a distant point. Does PC1 swing towards it?',
        'Drag points into two separate clusters. Which direction wins now?'],
      from: 'Session 1 · slides 13–14 (PCA finds the direction of maximum variance, then the next at right angles; the SVD of the centred data gives every component at once) and Appendix A (eigenvectors of the covariance matrix and the SVD agree).',
    },
    {
      cat: 'pca', slug: 'scaling', session: 1, title: 'Scaling decides what PCA sees (wine)', short: 'Scaling and PCA (wine)', libs: ['wine'],
      tags: ['pca', 'scaling', 'standardise', 'wine', 'units'],
      blurb: 'PCA maximises variance, and variance depends on units. On the raw wine data one feature measured in the hundreds takes over PC1. Standardise, or change a unit, and the picture changes.',
      notice: [
        'Unscaled, <b>proline</b> (standard deviation about 314) carries 99.8% of the variance, so PC1 is almost just proline.',
        'Standardised, PC1 explains 36.2% and its loadings spread across many features.',
        'Changing a feature\'s unit (say milligrams to grams) multiplies its variance by a million and rewires PC1, although no information changed.',
        'The three cultivars separate far better in the standardised map. The neighbour-purity readout puts a number on it.'],
      tryit: [
        'Answer the prediction question, then reveal.',
        'With <i>Standardise</i> off, set the unit multiplier of proline to 0.001, as if it were reported in kilograms. Which feature takes over?',
        'Pick <i>alcohol</i> and multiply it by 1000 instead.',
        'Turn <i>Standardise</i> on and repeat. Does the multiplier still matter?'],
      from: 'Session 1 · Poll 2 and slides 15–17 (unscaled wine, scaling inside a Pipeline) · Live Python Step 1 (wine, unscaled vs standardised).',
    },
    {
      cat: 'pca', slug: 'choosing-k', session: 1, title: 'Scree plot, cumulative variance and choosing k (digits)', short: 'Choosing k (digits)', libs: ['digits'],
      tags: ['pca', 'scree', 'explained variance', 'digits', 'reconstruction'],
      blurb: 'Sixty-four pixel features, but digits live near a much smaller space. Slide k and watch reconstructions sharpen, then set a variance target and see how many components it asks for.',
      notice: [
        'There is no sharp elbow: variance falls gradually, so the scree plot alone does not tell you k.',
        'A <b>95% target needs 29 of the 64 components</b>; 90% needs 21 and 99% needs 41.',
        'The squared error left over, as a share of the total, equals <b>1 − cumulative variance</b> exactly. Compare the two readouts.',
        'Digits are recognisable long before 95%, but fine strokes only return with more components.'],
      tryit: [
        'Answer the prediction question before touching a slider.',
        'Drag the variance target to 90%, 95% and 99% and note k each time.',
        'Set k = 2, 5 and 10. Which digits get confused first?',
        'Press <i>New digits</i> and check that the error identity still holds.'],
      from: 'Session 1 · Poll 3 and slides 18–22 (variance per component, 29 of 64 components for 95%, three ways to choose k) · Live Python Steps 2–3.',
    },
    {
      cat: 'pca', slug: 'denoising', session: 1, title: 'Reconstruct and denoise digits', short: 'Denoising with PCA', libs: ['digits'],
      tags: ['pca', 'denoising', 'reconstruction', 'noise'],
      blurb: 'Noise spreads over all 64 directions while a digit\'s shape lives in the top few. Keep only the leading components and much of the noise drops out.',
      notice: [
        'Error against the <i>clean</i> digits is <b>U-shaped in k</b>: too few components blur the digit, too many bring the noise back.',
        'The best k falls as the noise grows. With the default noise sample it is 48, 33, 15, 10 and 4 at σ = 1, 2, 4, 6 and 8.',
        'A fixed 50% variance target gives k = 12 at σ = 4, close to the best (15), but asks for 22 at σ = 8 where the best is 4. A variance target is a starting point, not a rule.',
        'At k = 64 the “denoised” image equals the noisy one: nothing was removed.',
        'The PCA is fitted on the noisy images only, as in the notebook, yet it still finds the digit directions.'],
      tryit: [
        'Set noise to 4 and find the k with the lowest error. Compare it with the variance-target button (50%).',
        'Raise the noise to 8. Where does the best k go?',
        'Set noise to 0. What does error against k look like?',
        'Press <i>New noise</i> and see how stable the best k is.'],
      from: 'Session 1 · slide 24 (keeping the top 12 components removes much of the noise) · Live Python Step 3 (denoising).',
    },
    {
      cat: 'pca', slug: 'pipeline-cv', session: 1, title: 'Tune k by cross-validation, inside the pipeline (wine)', short: 'k by cross-validation (wine)', libs: ['wine', 'svm'],
      tags: ['pipeline', 'cross-validation', 'leakage', 'pca', 'logistic regression'],
      blurb: 'Scale, then PCA, then logistic regression, each step fitted on the training folds only. Sweep k, read the accuracy curve with its spread, and compare with the leaky shortcut.',
      notice: [
        'Accuracy climbs steeply for the first few components, then flattens: <b>the curve, not a single number</b>, tells you where to stop.',
        'Error bars show how much accuracy moves between folds. Differences smaller than that are noise.',
        'On clean, small data like wine the leaky version is almost identical. The point is the procedure, and the shortcut costs you on harder data.',
        'The pipeline fits the scaler and PCA on each training fold, then only <i>applies</i> them to the held-out fold.'],
      tryit: [
        'Run the sweep and find the smallest k within one spread of the best.',
        'Switch on the leaky comparison and run again. How large is the gap?',
        'Look at k = 1: why is accuracy already well above one third?',
        'Compare the best k with the 13-feature baseline.'],
      from: 'Session 1 · slides 17 and 28 (put scaling and PCA inside a Pipeline; tune k by cross-validation without leaking validation data) · Live Python Step 4.',
    },
    /* ---------------- Session 2: t-SNE and UMAP ---------------- */
    {
      cat: 'embeddings', slug: 'swiss-roll', session: 2, title: 'A linear map cannot unroll a curved sheet', short: 'Swiss roll: PCA vs t-SNE vs UMAP', libs: ['embed', 'embedui'],
      tags: ['swiss roll', 'manifold', 'trustworthiness', 'pca', 't-sne', 'umap'],
      blurb: 'A Swiss roll is a flat sheet rolled up in 3-D. PCA presses the roll flat and piles the turns on top of each other, while t-SNE and UMAP keep neighbours together and unroll it. Drag the roll to view it from any side.',
      notice: [
        'Colour is the position <i>along the sheet</i>. A good 2-D map shows a smooth colour gradient; PCA shows bands lying on top of each other.',
        't-SNE and UMAP trust only <b>local</b> neighbourhoods, so they can unroll the sheet, at the price of cutting it and moving the pieces around.',
        'Trustworthiness (0 to 1) asks whether each point\'s 10 nearest neighbours in the map were also near in 3-D. It punishes false neighbours but not a torn sheet, so read it together with the colours.',
        'Orientation, flips and gaps in an unrolled map carry no meaning. Only who is near whom does.'],
      tryit: [
        'Answer the poll, then rotate the roll to look straight down its axis. Which of the three maps does that view resemble?',
        'Raise the noise. When does the sheet stop unrolling?',
        'Set perplexity and n_neighbors to 5. Does the map tear into pieces?',
        'Press <i>Re-run</i> with a new seed and see which pictures change and which score stays put.'],
      from: 'Session 2 · Poll 1 (what will PCA do to a Swiss roll?) and the nonlinear-map slides · Live Python Step 1 (Swiss roll with PCA, t-SNE, UMAP and trustworthiness).',
    },
    {
      cat: 'embeddings', slug: 'tsne-perplexity', session: 2, title: 't-SNE: perplexity sets each point\'s neighbourhood', short: 't-SNE and perplexity', libs: ['embed', 'embedui', 'digits'],
      tags: ['t-sne', 'perplexity', 'kl divergence', 'neighbourhood'],
      blurb: 'Every point gets its own Gaussian, widened until about “perplexity” neighbours carry real weight. Click a point to see its neighbourhood, then watch how perplexity reshapes a t-SNE map of the digits.',
      notice: [
        'Perplexity is the <b>effective number of neighbours</b>: the exponential of the entropy of a point\'s weights. The search for σ makes it equal the slider for every point.',
        'Dense regions get a narrow Gaussian and sparse ones a wide Gaussian, so each point looks at roughly the same number of neighbours.',
        'Very low perplexity fragments real clusters. Very high perplexity starts to merge distinct ones.',
        '<b>KL divergence falls as perplexity grows, yet the maps are not better.</b> Each perplexity defines a different target distribution, so KL values cannot be compared; trustworthiness can.'],
      tryit: [
        'Answer the quiz question, then drag perplexity to 2 and click a point in the sparse blob. How wide is its Gaussian?',
        'Run the digits at perplexity 2, 5, 15, 30 and 80 and compare the table: which column trends, and which does not?',
        'Click a dense-blob point and a sparse-blob point at the same perplexity. Which σ is larger?',
        'Find the smallest perplexity at which every digit forms a single clump.'],
      from: 'Session 2 · Quiz Q1 (which change helps when t-SNE splits a real cluster) and the t-SNE slides · Live Python Step 2 (perplexity and KL against trustworthiness).',
    },
    {
      cat: 'embeddings', slug: 'tsne-seeds', session: 2, title: 't-SNE: same data, different seeds', short: 't-SNE and random seeds', libs: ['embed', 'embedui', 'digits'],
      tags: ['t-sne', 'randomness', 'initialisation', 'reproducibility'],
      blurb: 'Run t-SNE three times on the same digits with the same settings. Neighbourhoods come out the same; where the clusters sit relative to each other does not.',
      notice: [
        'Trustworthiness is nearly identical across seeds: <b>local neighbourhoods are reproducible</b>.',
        'The correlation between the runs\' between-cluster distances is much lower: <b>the global arrangement is not</b>.',
        'Aligning the maps by rotation and reflection (Procrustes) removes the trivial differences, and the arrangement of clusters still differs.',
        'With PCA initialisation the starting point is fixed, so the runs agree far more. That is one reason it is the default in newer scikit-learn.'],
      tryit: [
        'Answer the poll, then compare the three maps. Which clusters are neighbours in all three?',
        'Switch to PCA initialisation and read the agreement again.',
        'Tick <i>Align to run 1</i>. What changes and what does not?',
        'Lower perplexity to 5 and note whether agreement gets better or worse.'],
      from: 'Session 2 · Poll 2 (two runs, different random seeds) · Live Python Step 2 (run-to-run randomness, centroid distances, trustworthiness).',
    },
    {
      cat: 'embeddings', slug: 'misreading', session: 2, title: 'Reading plots honestly: sizes, gaps and structure from nothing', short: 'Misreading t-SNE and UMAP', libs: ['embed', 'embedui'],
      tags: ['cluster size', 'noise', 'misreading', 't-sne', 'umap'],
      blurb: 'Two experiments on what a 2-D map does and does not tell you: one dataset with a loose and a tight cluster, and pure noise that is made to look like clusters.',
      notice: [
        'On the customer data, <b>apparent cluster size tracks how many points a cluster has, not how spread out it is</b>. Both methods draw the large tight cluster as widest and the truly loose one as tight.',
        'Distances between clusters in a map are not distances in the data. The second table lets you compare them.',
        'Pure noise has no clusters at all, yet low perplexity produces convincing clumps. Compare the four maps.',
        'The rule of thumb: <b>the map communicates; the original space measures</b>. Check any claim about size or distance in the original features.'],
      tryit: [
        'Answer the poll before running anything.',
        'Compare the “true” and “map” columns of the table. Which segment is actually the most spread out?',
        'Switch to <i>Structure from nothing</i> and look at perplexity 2 against 80. Which map would you be tempted to report?',
        'Press <i>New seed</i> a few times. Is the picture of the noise stable?'],
      from: 'Session 2 · Poll 3 (which customer segment looks widest?), Quiz Q2 (one UMAP cluster looks twice as wide) · Live Python Step 4 (cluster sizes, structure from nothing).',
    },
    {
      cat: 'embeddings', slug: 'umap-settings', session: 2, title: 'UMAP: n_neighbors and min_dist', short: 'UMAP settings', libs: ['embed', 'embedui', 'digits'],
      tags: ['umap', 'n_neighbors', 'min_dist', 'graph'],
      blurb: 'n_neighbors sets how large a neighbourhood UMAP looks at; min_dist sets how tightly points may pack in the map. Change them, switch on the neighbour graph, and see what each one controls.',
      notice: [
        'Small <b>n_neighbors</b> keeps fine local detail (and can fragment clusters); large values give a broader, more global picture.',
        '<b>min_dist</b> changes only the layout step: small values let points clump tightly, large values spread them out. The neighbour graph does not change.',
        'The curve shows the similarity UMAP aims for between two points a given distance apart in the map; min_dist is where it starts to fall.',
        'This is a compact re-implementation of UMAP\'s recipe (spectral start, edge-sampled SGD), not the umap-learn package.'],
      tryit: [
        'Set min_dist to 0 and then 0.9. Which setting would you use for a picture and which for clustering?',
        'Set n_neighbors to 3, then 60. Count the visible clusters each time.',
        'Switch on the graph. How many edges join different digit classes at n_neighbors = 15?',
        'Try the Swiss roll with n_neighbors 5 and 40.'],
      from: 'Session 2 · UMAP slides (graph, spectral start, learning rate falls from 1 to 0) · Live Python Step 3 (n_neighbors and min_dist on digits).',
    },
    {
      cat: 'embeddings', slug: 'new-points', session: 2, title: 'UMAP places new points; t-SNE cannot', short: 'New points: UMAP vs t-SNE', libs: ['embed', 'embedui', 'digits'],
      tags: ['umap', 'transform', 'out-of-sample', 'classifier input'],
      blurb: 'UMAP learns a mapping, so unseen digits can be placed on an existing map. t-SNE has no such step: to add points you refit, and the old points move.',
      notice: [
        'Transformed test digits land among training digits of the same class, so a classifier on the map coordinates can score them: that is an honest estimate because the map was fitted without them.',
        'Training points do not move when UMAP transforms new ones.',
        'Refitting t-SNE with the test points included moves the training points too. The arrows show how far, after the best rotation and reflection.',
        'In scikit-learn, <code>TSNE</code> has no <code>transform</code> method, and UMAP does.'],
      tryit: [
        'Compare the 10-neighbour accuracy of the transformed test points with the baseline in the original 64 pixels.',
        'Press <i>Refit t-SNE with the test points</i> and read the displacement.',
        'Hide the training digits and look only at where the test points landed.',
        'Lower n_neighbors to 5. Does transform accuracy change?'],
      from: 'Session 2 · UMAP slides and Quiz Q3 (a 2-D map feeding a classifier validated by cross-validation) · Live Python Step 3 (UMAP transforms new points; TSNE does not).',
    },
    /* ---------------- Session 3: SVM I ---------------- */
    {
      cat: 'svm-margin', slug: 'number-line', session: 3, title: 'The widest street on a number line', short: 'Margin on a number line', libs: ['svm', 'svmui'],
      tags: ['margin', 'threshold', 'support vectors', '1-d'],
      blurb: 'Twelve sensor readings, healthy on the left and failing on the right. Many thresholds separate them, but one leaves the widest street. Drag the readings and the threshold to find it.',
      notice: [
        'Any threshold inside the gap separates the data, yet the <b>margin</b> (distance to the nearest reading) is largest at exactly one place: the midpoint between the two closest opposite readings.',
        'Only those two nearest readings, the <b>support vectors</b>, decide the answer. Move any other reading and nothing changes.',
        'The tent-shaped curve shows margin against threshold position. It is zero wherever the threshold fails to separate the classes.',
        'With an odd reading inside the other class, no threshold separates the data. The soft margin accepts that one mistake and keeps a sensible threshold. At a very small C the penalty for a wide street dominates and the threshold drifts away.'],
      tryit: [
        'Drag the threshold to where you think the safest place is, then press <i>Snap to maximum margin</i>.',
        'Drag a reading that is <i>not</i> ringed. Does the best threshold move?',
        'Drag one of the two ringed readings towards the gap. Now what happens?',
        'Press <i>Add an odd reading</i>, then sweep C from 1000 down to 0.01. How does the street change, and at what C does the threshold stop making sense?'],
      from: 'Session 3 · Live Python Step 1 (a threshold, its margin and an odd applicant, on a number line) · the margin and support-vector slides.',
    },
    {
      cat: 'svm-margin', slug: 'max-margin', session: 3, title: 'Hard-margin SVM in two features', short: 'Hard margin in 2-D', libs: ['svm', 'svmui'],
      tags: ['hard margin', 'support vectors', 'margin width', 'separating line'],
      blurb: 'Many lines separate two groups of points. The maximum-margin line is the one with the widest empty street, and only the points touching the street matter.',
      notice: [
        'The faint lines are other lines that also separate the data. The SVM line is the one in the middle of the widest street.',
        'The <b>support vectors</b> (ringed) sit on the street\'s edges. Delete a point that is not ringed and the boundary does not change (see the readout); delete a ringed point and it usually does.',
        'The street is 2/‖w‖ wide. Maximising the margin means minimising ‖w‖.',
        'If the groups overlap, no line separates them and a hard margin does not exist. That is what the soft margin is for.'],
      tryit: [
        'Drag one ringed point away from the street. Does the street widen?',
        'Add a point deep inside the other group. What does the readout say about separability?',
        'Choose <i>Separated groups + one odd point</i>. How does one point change the street?',
        'Add many points far from the street and watch the boundary stay put.'],
      from: 'Session 3 · Live Python Step 2 (the margin and the support vectors in two features) · the hard-margin SVM slides.',
    },
    {
      cat: 'svm-margin', slug: 'soft-margin', session: 3, title: 'Soft margin: what C does', short: 'Soft margin and C', libs: ['svm', 'svmui'],
      tags: ['soft margin', 'C', 'slack', 'regularisation', 'cross-validation'],
      blurb: 'C sets the price of a point inside the street or on the wrong side. Small C buys a wide street and tolerates mistakes; large C buys few mistakes and a narrow street. Sweep it and watch cross-validated accuracy.',
      notice: [
        '<b>Small C</b>: wide street, many support vectors, some training errors tolerated. <b>Large C</b>: narrow street, fewer support vectors, the line bends to fit individual points.',
        'The SVM minimises ½‖w‖² + C·Σξ. The bars show how that total splits between a wide street (first term) and violations (second term).',
        'Training accuracy only rises with C, but cross-validated accuracy usually peaks in between: C is a bias–variance knob.',
        'The best C depends on the data. There is no universal default, so tune it by cross-validation.'],
      tryit: [
        'Start with the overlapping groups and sweep C from 0.01 to 1000. Where is cross-validated accuracy highest?',
        'Add an outlier deep in the other group. At which C does the line start to chase it?',
        'Switch to the separated groups. Does C still matter much?',
        'Compare the number of support vectors at C = 0.1 and C = 100.'],
      from: 'Session 3 · Live Python Step 3 (what C does to the street) and Step 6 (tune C by cross-validation) · the soft-margin slides.',
    },
    {
      cat: 'svm-margin', slug: 'hinge-vs-log', session: 3, title: 'Hinge loss against log-loss', short: 'Hinge vs log-loss', libs: ['svm', 'svmui'],
      tags: ['hinge loss', 'logistic regression', 'log-loss', 'support vectors'],
      blurb: 'Both losses punish points on the wrong side. The hinge loss is exactly zero once a point is safely outside the street; the log-loss never quite reaches zero. Fit both to the same points and compare.',
      notice: [
        'With margin m = y·f(x), a point with <b>m &gt; 1 costs the SVM nothing</b> and has no pull on the boundary. The logistic loss still pulls a little.',
        'So the SVM boundary is set by the few points near the street, while logistic regression listens to every point.',
        'Add an easy point far from the boundary: the SVM line does not move (beyond solver tolerance, about 0.0001), while the logistic line shifts measurably (about 0.01).',
        'Far on the wrong side, both losses grow linearly, so both are robust to a single wild point in a way squared error is not.'],
      tryit: [
        'Drag the margin slider from −2 to 3 and watch where the hinge loss reaches zero.',
        'Press <i>Add an easy point far away</i> and read both line shifts.',
        'Switch to the overlapping groups and compare the two lines. Do they agree?',
        'Move one point across the boundary and see which line reacts more.'],
      from: 'Session 3 · Live Python Step 3 and 3b (hinge loss: write the SVM yourself) · the hinge-versus-log-loss slides (ML I link).',
    },
    {
      cat: 'svm-margin', slug: 'scaling', session: 3, title: 'Why SVMs need scaled features', short: 'Scaling and SVMs', libs: ['svm', 'svmui'],
      tags: ['scaling', 'standardise', 'pipeline', 'units'],
      blurb: 'The margin is measured in raw feature units, so the units you pick change the answer. Put the informative feature in tiny units and an unscaled SVM stops using it; standardise first and the answer no longer depends on units.',
      notice: [
        'The <b>raw</b> SVM\'s cross-validated accuracy collapses when the informative feature is measured in very small numbers: its weight would have to be huge, and the penalty on ‖w‖² forbids that.',
        'The <b>standardised</b> SVM gives the same answer whatever the units, because every feature is rescaled to mean 0 and standard deviation 1 inside each training fold.',
        'This is why the pipeline starts with <code>StandardScaler</code>, fitted on the training rows only.',
        'In the raw picture the street looks fine; the trouble is what the street was measured in.'],
      tryit: [
        'Slide the unit of feature 1 to 0.01 and compare the two accuracies.',
        'Slide it to 100. Does the raw SVM recover?',
        'Look at the curve: for which units are the raw and standardised results equal?',
        'Press <i>New data</i> and check that the pattern holds on another sample.'],
      from: 'Session 3 · Live Python Step 4 (scaling: why the Pipeline starts with StandardScaler) · the feature-scaling slides.',
    },
    {
      cat: 'svm-margin', slug: 'text', session: 3, title: 'A linear SVM on text (TF-IDF)', short: 'Linear SVM on text', libs: ['svm'], scripts: ['corpus.js'],
      tags: ['text', 'tf-idf', 'linear svm', 'weights'],
      blurb: 'Turn sentences into TF-IDF vectors, fit a linear SVM, and see which words push a message towards billing or technical support. Type your own sentence to see the score broken down word by word.',
      notice: [
        'A linear SVM on text is just a <b>weight per word</b>. The score is the sum of weight × TF-IDF over the words present, plus an offset.',
        'The largest weights are words that separate the two topics, such as <i>payment</i>, <i>invoice</i> or <i>error</i>. Switch the stop-word list off and accidental cues such as <i>and</i>, <i>can</i> and <i>please</i> climb the list: with 48 training messages the SVM uses whatever separates them.',
        'Words that were never seen in training are ignored. A sentence made only of unseen words gets the offset alone.',
        'Hold-out accuracy is measured on only 12 messages, so one message is 8 points: 75% against 83% is a single message. The corpus is small and made up; real text needs far more data.'],
      tryit: [
        'Type “I was charged twice and the app crashed”. Which words win, and which are ignored?',
        'Lower C to 0.01 and look at the weights. Do they get smaller or more spread out?',
        'Use only unseen words (for example “banana pyjamas”). What is the prediction, and why?',
        'Find a sentence that the model gets wrong on purpose.'],
      from: 'Session 3 · Live Python Step 5 (a linear SVM on text) and Step 6 (tune C by cross-validation) · the TF-IDF slides.',
    },
    /* ---------------- Session 4: SVM II ---------------- */
    {
      cat: 'svm-kernels', slug: 'lift', session: 4, title: 'Lift the number line into a plane', short: 'Lifting a number line', libs: ['svm', 'svmui'],
      tags: ['lift', 'polynomial', 'feature map', 'kernel trick'],
      blurb: 'No single threshold separates these readings: the failing ones sit on both sides of the healthy ones. Lift each reading z to the point (z, z²) and a straight line in the plane does the job.',
      notice: [
        'The best single threshold gets at most <b>9 of 12</b> readings right. After the lift, one straight line separates all twelve.',
        'That straight line in the plane is a <b>pair of thresholds</b> on the original line (about −0.97 and 0.92 for the default readings).',
        'The SVM in the lifted plane is the ordinary linear SVM of Session 3: same margin, same support vectors (four here).',
        'The lift z → z² is one choice among many. The kernel trick lets the SVM use such a lift without ever computing it (next page).'],
      tryit: [
        'Slide the lift from 0 to 1 and watch the readings rise onto the parabola.',
        'Drag a failing reading into the middle of the healthy group. Is the lifted data still separable?',
        'Switch the map to “z² only”. Why does a single threshold work now?',
        'Try “z only (no lift)” and compare the best single-threshold accuracy.'],
      from: 'Session 4 · Part 1 (the lift, and Poll 1 on the lifted point) · Live Python Step 1 (from a lift to a kernel). Pre-class viewing: StatQuest, <i>Support Vector Machines Part 2: The Polynomial Kernel</i> (Josh Starmer).',
    },
    {
      cat: 'svm-kernels', slug: 'kernel-identities', session: 4, title: 'Kernels are dot products in a lifted space', short: 'Kernel identities', libs: ['svm', 'svmui'],
      tags: ['kernel trick', 'polynomial kernel', 'xor', 'rbf', 'taylor series'],
      blurb: 'Three checks you can run yourself: the polynomial kernel equals a dot product of lifted points, an SVM solves XOR with exact weights of 1/8, and the RBF kernel is an infinite stack of polynomial kernels.',
      notice: [
        'For <b>(a·b + r)²</b> the lifted point is (√(2r)·a, a², r). The dot product of two lifted points equals the kernel value, computed without lifting. At r = 1, K(2, 3) = 49; at r = ½ it is 42.25.',
        'XOR cannot be split by a line, but with the kernel (x·z + 1)² the four points get α = 1/8 each, b = 0, and the decision function is exactly <b>f(x) = x₁x₂</b>.',
        'The RBF kernel is a stack of polynomial kernels of every degree with weights 1/n!, from the Taylor series of e<sup>2γab</sup>. A handful of terms already agree to many digits.',
        'So an RBF SVM works in a space with infinitely many coordinates, yet each kernel value costs one exponential.'],
      tryit: [
        'Set a = 2, b = 3 and r = 1, then r = ½. Do the two numbers always agree?',
        'In the XOR panel, change the kernel offset r from 1 to 0. What happens to the fit?',
        'In the RBF panel, raise γ. How many terms are needed for six correct digits?',
        'Make |a·b| large. Why do more terms become necessary?'],
      from: 'Session 4 · the kernel-trick slides · Live Python Step 2 (rings, XOR and kernel identities). Pre-class viewing: StatQuest, <i>SVM Part 2 (polynomial kernel)</i> and <i>Part 3 (the radial kernel)</i>.',
    },
    {
      cat: 'svm-kernels', slug: 'playground', session: 4, title: 'Kernel playground: C, γ and who gets a vote', short: 'Kernel playground', libs: ['svm', 'svmui'],
      tags: ['rbf', 'polynomial', 'gamma', 'decision boundary', 'support vectors'],
      blurb: 'Draw your own data, pick a kernel, and tune C and γ. Switch on the probe to see how the RBF score is a weighted vote of support vectors.',
      notice: [
        'The <b>linear</b> kernel gives a straight street. The <b>polynomial</b> kernel bends it a limited amount. The <b>RBF</b> kernel can draw almost any shape.',
        '<b>γ is the reach of each support vector.</b> Large γ gives islands around single points (every point becomes a support vector); small γ gives a smooth, almost linear boundary.',
        'C and γ work together: a good boundary is found along a band of (C, γ) pairs, not at one value.',
        'With the probe on, each support vector casts a vote α·y·K. Far from every support vector, K ≈ 0 and <b>only the offset b decides</b>: an RBF SVM is not a normalised nearest-neighbour vote.'],
      tryit: [
        'Start with XOR and compare the three kernels at their defaults.',
        'On the moons data set γ to 0.1, 1, 10 and 1000 and watch the number of support vectors.',
        'Press <i>γ = “scale”</i> and see where scikit-learn\'s default lands.',
        'Switch the probe on, click far outside the data and read which term dominates.'],
      from: 'Session 4 · Live Python Steps 2–3 (rings and XOR; moons: what γ and C do; who gets a vote?).',
    },
    {
      cat: 'svm-kernels', slug: 'rbf-vote', session: 4, title: 'The RBF score as a weighted vote', short: 'RBF as a weighted vote', libs: ['svm', 'svmui'],
      tags: ['rbf', 'weighted vote', 'bumps', 'offset', 'gamma'],
      blurb: 'On a number line the RBF score is easy to see: each support vector adds a bump of height α·y, the bumps add up, and the offset b shifts the total. Drag the probe and read every vote.',
      notice: [
        'Every support vector contributes a bump <b>α·y·exp(−γ(z − zᵢ)²)</b>. The thick curve is the sum of the bumps plus the offset b, and its sign is the prediction.',
        'At the probe, a few nearby support vectors cast most of the vote. “Effective voters” counts how many (as (ΣK)² ∕ ΣK²).',
        'As γ grows, bumps narrow and effective voters fall towards one. Far from every support vector all bumps are ≈ 0 and the offset alone decides.',
        'Unlike a nearest-neighbour vote, the weights are not normalised. That is why a very large γ can call far-away points one class for no good reason.'],
      tryit: [
        'Put the probe at z = 1.0 with γ = 1 and read the four votes.',
        'Drag the probe far to the right. Which term takes over?',
        'Raise γ to 100 and then 1000. How many effective voters remain?',
        'Lower C to 0.5. How many support vectors vote now?'],
      from: 'Session 4 · the weighted-vote slides (RBF as a vote of support vectors) · Live Python Step 3 (who gets a vote?). Pre-class viewing: StatQuest, <i>SVM Part 3 (the radial kernel)</i>.',
    },
    {
      cat: 'svm-kernels', slug: 'c-gamma-grid', session: 4, title: 'Tune C and γ together', short: 'C × γ grid', libs: ['svm', 'svmui'],
      tags: ['grid search', 'C', 'gamma', 'hyperparameters', 'overfitting'],
      blurb: 'Every cell of the grid is an RBF SVM trained with one (C, γ) pair and scored on held-out points. Click a cell to see its boundary. The good region is a band, not a point.',
      notice: [
        'Bottom-left (small C, small γ) <b>underfits</b>: too smooth. Right-hand column (very large γ) <b>overfits</b>: every training point becomes a support vector and held-out accuracy collapses.',
        'The best cells lie along a <b>diagonal band</b>. Move to a smaller γ and a larger C compensates.',
        'scikit-learn\'s γ = “scale” (dashed column) lands close to the best region here, so it is a good starting point for the search.',
        'Training accuracy keeps rising towards the corner where test accuracy falls: always judge by held-out data.'],
      tryit: [
        'Click the best cell, then the right-hand column. What does each boundary look like?',
        'Switch the grid to training accuracy and compare the corners.',
        'Raise the noise. Does the good band shrink?',
        'Press <i>New data</i> and check whether the best cell stays in the same region.'],
      from: 'Session 4 · Live Python Steps 3–4 (what γ and C do on moons; tune C and γ together) · the γ = “scale” slide.',
    },
    {
      cat: 'svm-beyond', slug: 'svr-tube', session: 4, title: 'Support vector regression: the ε-tube', short: 'SVR and the ε-tube', libs: ['svm', 'svmui'],
      tags: ['svr', 'epsilon', 'regression', 'tube'],
      blurb: 'SVR fits a curve with a tube of half-width ε around it. Points inside the tube cost nothing; only points on or outside it pull on the fit and become support vectors.',
      notice: [
        'Inside the tube the loss is <b>exactly zero</b>; outside it grows linearly, like the hinge. Only points on or beyond the tube edge are support vectors.',
        'A wider tube (larger ε) means <b>fewer support vectors</b> and a smoother, less detailed fit. The lower-left plot counts them across ε.',
        'C caps how hard the fit may chase points outside the tube; γ sets how wiggly an RBF fit can be.',
        'Because the loss grows only linearly, one wild point cannot dominate the way it does in least squares.'],
      tryit: [
        'Set ε = 0.02 and then ε = 0.5. Count the support vectors each time.',
        'Add an outlier far from the curve. How far does the fit move at C = 1 and at C = 100?',
        'Switch to the linear kernel on the sine data. What is the tube telling you?',
        'Raise γ at a small ε. When does the fit start to follow the noise?'],
      from: 'Session 4 · the SVR slides (epsilon-insensitive tube) · Live Python Step 5 (support vector regression and the ε-tube).',
    },
    {
      cat: 'svm-beyond', slug: 'one-class', session: 4, title: 'One-class SVM and ν', short: 'One-class SVM', libs: ['svm', 'svmui'],
      tags: ['one-class svm', 'anomaly detection', 'nu', 'outliers'],
      blurb: 'Fit a boundary around normal data only, with no labels. The parameter ν says how much of the training data may fall outside, and it also bounds the number of support vectors.',
      notice: [
        'ν is an <b>upper bound on the fraction of training points outside</b> the boundary and a <b>lower bound on the fraction of support vectors</b>. The readouts check both.',
        'A small ν gives a tight-fitting but permissive boundary that flags few points; a large ν flags more.',
        'γ controls the shape: small γ gives a smooth blob, large γ wraps tightly around individual points.',
        'No labelled anomalies were used. The model describes where the normal data lives and treats everything else as unusual.'],
      tryit: [
        'Set ν = 0.05 and then ν = 0.3. Read the three fractions each time.',
        'Add three points far from the cloud and see whether they are flagged.',
        'Raise γ until the boundary breaks into islands. What does that do to false alarms on fresh normal data?',
        'Use the probe to score a point just outside the boundary.'],
      from: 'Session 4 · the one-class SVM slides (bridge to Module 5, anomaly detection) · Live Python Step 7 (one-class SVM and ν).',
    },
    {
      cat: 'svm-beyond', slug: 'cost-and-choice', session: 4, title: 'Training cost grows roughly with n² (and what to use instead)', short: 'Cost and choice', libs: ['svm'],
      tags: ['complexity', 'scaling', 'model choice', 'trees', 'logistic regression'],
      blurb: 'Time an RBF SVM as the data grows and fit the exponent, then compare it with a linear model and a decision tree on the same data. Measured in your browser, so absolute times differ from scikit-learn.',
      notice: [
        'Doubling n multiplies SVM training time by roughly <b>four</b>: the fitted exponent is close to 2 (a little less on easy data, a little more on noisy data).',
        'The linear model and the tree grow roughly in step with n. At 64,000 rows they take about a second or less here, while the SVM extrapolates to tens of seconds and would need a kernel matrix of tens of gigabytes if stored in full. Exact numbers depend on your machine.',
        'Accuracy depends on the shape of the data: a straight boundary is no better than chance on rings and XOR and clearly worse on moons, while an SVM and a tree both cope.',
        'Absolute times depend on your machine and on this JavaScript implementation; the <i>exponent</i> and the ranking are the lessons.'],
      tryit: [
        'Run the timing and read the exponent. Raise the noise and run again.',
        'Compare the extrapolated time at 64,000 rows with the measured time of the other two models.',
        'Choose the XOR data and see which model copes.',
        'Choose the linearly separable data. Is the SVM worth its cost here?'],
      from: 'Session 4 · Live Python Step 6 (cost and choice) · the “when to prefer trees or linear models” slides.',
    },
  ],
};

window.SIMS.items.forEach(function (it) { it.id = it.cat + "/" + it.slug; });
