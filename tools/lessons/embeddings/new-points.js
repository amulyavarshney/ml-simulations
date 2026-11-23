// Lesson for embeddings/new-points. Widget numbers come from running assets/ml-embed.js on the page's own data (400 digits, 30 train + 10 test per class, subset seed 31, perplexity 30, PCA start).
module.exports = {
  idea: `UMAP learns a rule it can reuse: a new point is placed by looking up its nearest training points. t-SNE only places the points it was fitted on, so to add points you must refit, and the old points move too.`,
  why: `A map is useful only if you can place tomorrow's customers on it, and a classifier that uses the two map coordinates must be tested on points the map never saw. With t-SNE the map changes whenever the data does, so last month's picture cannot be reused and your test score is not honest.`,
  analogy: `A printed city map with a street index. A new house is placed by its nearest known neighbours, "between 12 Park Road and the temple", and the map stays as printed. t-SNE is a map that must be redrawn from scratch for every new house, and the redrawn map comes out rotated and rearranged, so last year's copy no longer matches.`,
  vocab: [
    [`Out-of-sample point`, `A point that was not used to fit the map: a new customer, or a held-out test digit.`],
    [`fit and transform`, `<code>fit</code> learns the map from the training data. <code>transform</code> places new points on that learned map without changing it. UMAP has both. scikit-learn's TSNE has no <code>transform</code>.`],
    [`Training and test set`, `Here 300 digits (30 per class) fit the map and 100 digits (10 per class) are held out to test it.`],
    [`10-NN accuracy`, `Classify a point by a vote of its 10 nearest training points, in the map or in the original pixels, and count the share it gets right.`],
    [`Baseline`, `The same classifier on the original 64 pixels. A map is worth using if its accuracy comes close to this with only 2 numbers per point.`],
    [`Data leakage`, `Information from the test rows reaching the training step, which makes the test score look better than it will be on genuinely new data.`],
    [`Refit`, `Running t-SNE again on training plus new points together. Every point, old and new, is free to move.`]],
  steps: [
    { h: `A t-SNE map is a list, not a rule`, p: `After t-SNE finishes you hold a table: one (x, y) row per point it was fitted on. Nothing in it says how to turn 64 pixel values into (x, y). A new image has no place on the map until you run the whole optimisation again.` },
    { h: `UMAP keeps what it needs`, p: `After fitting, UMAP keeps the training data and the map positions it found. That is enough to define a rule for new points: put the new point where the training points that resemble it sit.` },
    { h: `Neighbours and strengths`, p: `For a new digit, find its n_neighbors nearest training digits by pixel distance (not by map distance). Give them strengths with the same recipe as in the fit: ρ is the nearest distance, the nearest gets 1, and σ is searched so that the strengths add up to log₂(n_neighbors).` },
    { h: `Start at a weighted average`, p: `Place the new point at the strength-weighted average of its neighbours' map positions. Heavy neighbours pull most. This start is already close to the right place.` },
    { h: `Polish with the training points frozen`, p: `For 100 short rounds the new point is pulled toward its neighbours and pushed from random training points, as in the fit. Only the new point moves. The training points stay exactly where they were, so the map you already show people is unchanged.` },
    { h: `Use the coordinates as features`, p: `Train a classifier on the 300 training map positions and score it on the 100 placed test points. In the simulation, 10-NN on 2 UMAP numbers gets about 94% of the test digits right (92 to 96% over seeds), against 95% for 10-NN on all 64 pixels.` },
    { h: `t-SNE can only refit`, p: `To place the 100 test digits with t-SNE you fit again on all 400. The 300 old points are free to move. After the best possible rotation or flip, the median old point still moves 13 to 14 units, about a quarter (24 to 28%) of the map width. A picture you showed last week no longer matches.` },
    { h: `Fit inside the training fold`, p: `If you fit UMAP on all rows and then split into train and test, the test rows have helped shape the map, so the score is a little optimistic: 0.99 against 0.96 in our run. UMAP never sees the labels, so this is a milder leak than using y, but it is still a leak. Fit on the training rows only.` }],
  example: {
    title: `placing one new point by hand`,
    setup: `A new digit has its four nearest training digits at pixel distances <b>2.0, 2.5, 3.5 and 6.0</b>. Their positions on the map are in the last column. Where does UMAP first put the new point? (Here n_neighbors = 4, so the strengths must add up to log₂ 4 = 2.)`,
    table: { head: [`Training neighbour`, `Distance d`, `d − ρ (ρ = 2.0)`, `Strength (σ = 1.23)`, `Share`, `Map position`], rows: [
      [`A`, `2.0`, `0.0`, `1.000`, `0.500`, `(2.0, 1.0)`],
      [`B`, `2.5`, `0.5`, `0.666`, `0.333`, `(3.0, 1.5)`],
      [`C`, `3.5`, `1.5`, `0.295`, `0.148`, `(2.5, 0.0)`],
      [`D`, `6.0`, `4.0`, `0.039`, `0.019`, `(6.0, 3.0)`]] },
    walk: [
      `ρ is the nearest distance, 2.0. So d − ρ = 0, 0.5, 1.5, 4.0 and the first strength is exp(0) = 1.`,
      `Find σ so that the strengths add up to 2. Try σ = 1.0: 1 + 0.607 + 0.223 + 0.018 = 1.848, too small. Try σ = 1.3: 1 + 0.681 + 0.315 + 0.046 = 2.042, too big. Try σ = 1.2: 1.981. At σ = 1.23 the sum is 2.000.`,
      `Strengths at σ = 1.23: exp(−0.5/1.23) = 0.666, exp(−1.5/1.23) = 0.295, exp(−4.0/1.23) = 0.039, and 1 for A.`,
      `Turn them into shares by dividing by their sum (2.000): 0.500, 0.333, 0.148, 0.019.`,
      `Weighted average of the map positions: x = 0.500 × 2.0 + 0.333 × 3.0 + 0.148 × 2.5 + 0.019 × 6.0 = 1.000 + 0.999 + 0.369 + 0.116 = <b>2.48</b>.`,
      `y = 0.500 × 1.0 + 0.333 × 1.5 + 0.148 × 0.0 + 0.019 × 3.0 = 0.500 + 0.500 + 0 + 0.058 = <b>1.06</b>.`],
    result: `The new point starts at (2.48, 1.06), between A and B, close to the heaviest neighbour. D, six away in pixels, hardly tugs it. Then 100 small steps polish the position. A, B, C and D do not move.` },
  read: [
    [`Left card: UMAP, fitted on 300 training digits, then test digits transformed`, `Faded digit numbers are the 300 training digits. Bold digit numbers inside a coloured ring are the 100 test digits placed by <code>transform</code>. A ring that sits among faded digits with the same number means a good placement.`],
    [`Right card: t-SNE, training digits only`, `Before you press the button: a t-SNE map of the 300 training digits. After refitting: faded numbers are the old positions, solid numbers the new positions of the same training digits, and bold ringed numbers the test digits as the refit placed them.`],
    [`Lines on the t-SNE card (arrows)`, `Each joins a training digit's old position to its position after the refit, once the best rotation or flip has been applied. Long lines mean the map was rearranged.`],
    [`Readout: Test accuracy, 10-NN on the 64 pixels`, `The baseline: what the same classifier scores on the original features.`],
    [`Readout: Test accuracy, 10-NN on UMAP coordinates`, `The score using only the two map coordinates of the transformed test points. The 10 neighbours are the training digits on the UMAP map.`],
    [`Readout: Training points moved by transform`, `Measured by reading the fitted positions again after <code>transform</code>. It always says "none (0 of 300)", because <code>transform</code> never changes the stored training positions.`],
    [`Readout: t-SNE: median move of a training point`, `After the refit: how far the typical training digit moved, in map units and as a share of the map width.`],
    [`Slider: UMAP n_neighbors`, `Neighbourhood size for both the fit and the transform.`],
    [`Checkboxes: Show training digits / Show transformed test digits (circled)`, `Hide one group to see the other on its own.`],
    [`Buttons: New seed and Refit t-SNE with the test points`, `<i>New seed</i> reruns UMAP with another random start. The t-SNE map starts from PCA, so its picture does not change. <i>Refit</i> becomes available when the t-SNE map of the training digits has finished.`]],
  experiments: [
    { do: `Read <i>Test accuracy, 10-NN on the 64 pixels</i> and <i>Test accuracy, 10-NN on UMAP coordinates</i>. Press <i>New seed</i> twice more.`, see: `The baseline is 95%. The UMAP readout is about 94% (between 93% and 96% in our runs, whatever the seed).`, why: `Only 100 test digits, so one wrong digit costs a point. Two map coordinates keep almost all the class information that 64 pixel values carry, because digits of the same class sit close together on the map.` },
    { do: `Press <i>Refit t-SNE with the test points</i> and wait for the run to finish.`, see: `Lines appear on the t-SNE card. The readout says the median training digit moved about 13 to 14 units, roughly a quarter (24 to 28%) of the map width. The UMAP readout still says "none (0 of 300)".`, why: `The refit starts from the PCA of 400 digits and optimises everything again, so clusters shift and re-settle even after the best rotation. UMAP's transform never touched the training points.` },
    { do: `Untick <i>Show training digits</i>.`, see: `Only the 100 ringed test digits remain. They form groups, one per digit, at the places where the training digits of the same number were.`, why: `Each test digit was placed from its nearest training digits, so it lands among its own kind.` },
    { do: `Set <i>UMAP n_neighbors</i> to 5, then to 50.`, see: `The accuracy hardly moves: in our runs it stayed between 92% and 96% at 5 and at 50 neighbours, and the lowest value we ever saw was 89% (at 50, in one run).`, why: `With only 100 test digits one digit is one point, so differences of one or two points are noise. Fifty neighbours include more digits of other classes, as in the settings lesson, so a small loss is possible, but a few neighbours are enough to place a digit among its look-alikes.` }],
  remember: [
    { tag: `Picture`, text: `<b>Street index</b> against <b>redrawing the whole map</b>. UMAP looks the new house up. t-SNE draws a new map.` },
    { tag: `Rule of thumb`, text: `Anything whose output feeds a model must be <b>a function you can apply to new rows</b>: fit once, transform later. PCA and UMAP are. t-SNE is a picture, not a feature maker.` },
    { tag: `Sanity check`, text: `After <code>transform</code>, the training embedding must be unchanged: <code>np.allclose(before, after)</code> is True. If it is not, you refitted by accident.` },
    { tag: `Trick`, text: `Always score the same classifier on the original features as a baseline. Here 95% on pixels against about 94% on 2 coordinates: the map lost almost nothing.` },
    { tag: `Rule of thumb`, text: `Fit the map on the training rows only, or put it in a <code>Pipeline</code> so that cross-validation refits it inside every fold.` },
    { tag: `Formula in words`, text: `New position = strength-weighted average of the neighbours' map positions, then 100 small corrections.` }],
  mistakes: [
    { wrong: `"I can place test data with t-SNE by calling fit_transform on the test set."`, right: `That fits a second, unrelated map with its own rotation and scale. Test coordinates and training coordinates then live in different frames, and a classifier trained on one is meaningless on the other.` },
    { wrong: `"UMAP's transform moves the training points a little to make room."`, right: `It does not. The stored map is untouched (the readout says 0 of 300). Only the new point is moved.` },
    { wrong: `"Fitting the map on all the data is fine, because UMAP never sees the labels."`, right: `It is milder than label leakage but it is still a leak: the test points shaped the neighbour graph. In our run the score was 0.99 against 0.96 when the map was fitted on training rows only.` },
    { wrong: `"With t-SNE I just refit and the old points stay where they were."`, right: `They do not. The median old point moves about a quarter of the map width (24 to 28% here), even after the best rotation or flip.` }],
  code: [
    {
      title: `Fit UMAP on training digits, place unseen digits, classify`,
      py: `import numpy as np, umap
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

X, y = load_digits(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X[:1000], y[:1000], test_size=0.3, random_state=0)

um = umap.UMAP(n_neighbors=15, random_state=0).fit(X_tr)       # learn the map from training digits only
E_tr = um.embedding_.copy()
E_te = um.transform(X_te)                                       # place unseen digits on that map
knn = KNeighborsClassifier(n_neighbors=10).fit(E_tr, y_tr)
print("test shape:", E_te.shape, " accuracy above 0.9:", knn.score(E_te, y_te) > 0.9)
print("training points moved:", not np.allclose(E_tr, um.embedding_))`,
      out: `test shape: (300, 2)  accuracy above 0.9: True
training points moved: False`,
      walk: [
        [`train_test_split(X[:1000], y[:1000], test_size=0.3, random_state=0)`, `Split 1,000 digits into 700 training and 300 test rows. It returns four arrays in this fixed order: training features, test features, training labels, test labels. <code>random_state</code> fixes the shuffle.`],
        [`umap.UMAP(...).fit(X_tr)`, `<code>fit</code> learns the map from the 700 training digits only. The test digits have not been seen yet.`],
        [`um.embedding_.copy()`, `The learned training positions (underscore = result of <code>fit</code>). <code>.copy()</code> saves a snapshot so we can check later that nothing moved.`],
        [`um.transform(X_te)`, `Places the 300 test digits on the learned map. Shape (300, 2): one row per digit, two coordinates. This method does not exist on scikit-learn's TSNE.`],
        [`KNeighborsClassifier(n_neighbors=10).fit(E_tr, y_tr)`, `A 10-NN classifier trained on the 2-D training positions and their labels. <code>score</code> on the test positions gives the share it gets right.`],
        [`np.allclose(E_tr, um.embedding_)`, `True if the training positions are unchanged by <code>transform</code>. We print <code>not</code> of it, so False means nothing moved.`]],
      tip: `We print True/False instead of the accuracy because the exact value shifts a little with library versions. In our run it was about 0.96.`
    },
    {
      title: `t-SNE has no transform; a refit moves the old points`,
      py: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.manifold import TSNE
from scipy.linalg import orthogonal_procrustes

X = load_digits().data[:400]
print("TSNE has transform:", hasattr(TSNE(), "transform"))

old = TSNE(init="pca", random_state=0).fit_transform(X[:300])                 # map of 300 training digits
new = TSNE(init="pca", random_state=0).fit_transform(X)[:300]                 # refit with 100 more digits added
a, b = old - old.mean(0), new - new.mean(0)
b = b @ orthogonal_procrustes(b, a)[0]                                        # remove rotation and flip first
move = np.linalg.norm(a - b, axis=1) / np.ptp(a, axis=0).max()                # displacement / map width
print("median move above 5% of the map width:", np.median(move) > 0.05)`,
      out: `TSNE has transform: False
median move above 5% of the map width: True`,
      walk: [
        [`hasattr(TSNE(), "transform")`, `Asks Python whether the object has an attribute called <code>transform</code>. For TSNE the answer is False: it can only <code>fit_transform</code>.`],
        [`TSNE(...).fit_transform(X)[:300]`, `Refit on all 400 digits, then keep only the first 300 rows: the old training digits at their new positions.`],
        [`old - old.mean(0)`, `Subtract the average position so both maps are centred on the origin, a step needed before aligning.`],
        [`orthogonal_procrustes(b, a)[0]`, `The best rotation or flip matrix that takes <code>b</code> as close as possible to <code>a</code>. <code>b @ R</code> applies it. After this, any remaining difference is a real move, not a turn.`],
        [`np.linalg.norm(a - b, axis=1)`, `For each of the 300 digits, the length of the arrow from old to new position.`],
        [`np.ptp(a, axis=0).max()`, `The map's width, so the move can be given as a share of it. <code>np.median(...)</code> then takes the typical move.`]],
      tip: `The simulation's lines are exactly these arrows. We print a True/False threshold because the exact share depends on the library version.`
    },
    {
      title: `Why the map must be fitted on the training rows only`,
      py: `import numpy as np, umap
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier

X, y = load_digits(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(X[:1000], y[:1000], test_size=0.3, random_state=0)
score = lambda E_tr, E_te: KNeighborsClassifier(10).fit(E_tr, y_tr).score(E_te, y_te)

honest = umap.UMAP(random_state=0).fit(X_tr)                           # test digits never seen by the map
E = umap.UMAP(random_state=0).fit_transform(np.vstack([X_tr, X_te]))   # test digits help shape the map
leaky = score(E[:len(y_tr)], E[len(y_tr):])
print("map fitted on everything scores higher:", leaky > score(honest.embedding_, honest.transform(X_te)))`,
      out: `map fitted on everything scores higher: True`,
      walk: [
        [`score = lambda E_tr, E_te: ...`, `A short function that trains a 10-NN classifier on training map positions and returns the accuracy on test map positions. Written once, used twice.`],
        [`honest = umap.UMAP(...).fit(X_tr)`, `The correct way: the map is learned without the test digits, which are placed later with <code>transform</code>.`],
        [`np.vstack([X_tr, X_te])`, `Stack the two feature tables on top of each other: 1,000 rows. This map is fitted with the test rows included.`],
        [`E[:len(y_tr)]  /  E[len(y_tr):]`, `Split the joint map back into the first 700 rows (training) and the last 300 (test).`],
        [`leaky > score(...)`, `The leaky score is higher because test points helped decide the neighbour graph, so they land among their own kind more reliably than a truly new point would.`]],
      tip: `The gap is small here (about 3 points in our run) but it is always in the flattering direction. Fit inside the training fold.`
    }],
  check: [
    { q: `Which operation places a new customer on an existing 2-D map without changing the map?`, options: [`UMAP's transform`, `Calling TSNE().fit_transform on the new customers alone`, `Calling TSNE().transform on the new customers`, `Refitting PCA on the new customers`], answer: 0, why: `UMAP keeps the training data and positions and looks the new point up among them. scikit-learn's TSNE has no transform. fit_transform on new rows would draw a second, unrelated map. Refitting PCA on the new rows would also change the map.` },
    { q: `A new point has two neighbours on the map at (0, 0) and (4, 0) with strengths 1.0 and 0.25. Where does UMAP start it?`, options: [`(0.8, 0)`, `(2, 0)`, `(3.2, 0)`, `(1, 0)`], answer: 0, why: `The shares are 1.0/1.25 = 0.8 and 0.25/1.25 = 0.2. So x = 0.8 × 0 + 0.2 × 4 = 0.8, and y = 0.` },
    { q: `You fit UMAP on all 1,000 digits, then split into 700 training and 300 test rows and train a classifier on the map coordinates. Compared with fitting UMAP on the 700 training rows and transforming the test rows, the test score is likely to be:`, options: [`Slightly higher than the honest score, because the test rows helped shape the map`, `Identical, because UMAP never sees the labels`, `Lower, because the map has more points to fit`, `Impossible to compute`], answer: 0, why: `The test rows were part of the neighbour graph, so they sit more cleanly among their own class than a new point would. The score is optimistic, even though labels were not used.` }],
  teachback: { prompt: `In two sentences, explain to a friend why UMAP can place new points on a map but t-SNE cannot, and what that means for testing a classifier that uses the map.`, model: `UMAP keeps its training points and finds a new point's nearest training points in the original features, then places it at their weighted average position and polishes it without moving the old points. t-SNE only returns coordinates for the points it fitted, so adding points means a refit that moves everything, and a classifier built on map coordinates must be tested on points placed by a transform of a map fitted on the training rows only.` },
  cheat: `UMAP.transform places a new point by finding its nearest training points in the original space, giving them fuzzy strengths, starting at their weighted average map position and polishing for 100 rounds with the training points frozen. t-SNE has no transform: a refit moves old points (about a quarter of the map width here). Fit the map on training rows only, then transform the test rows.`
};
