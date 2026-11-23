// Lesson for embeddings/swiss-roll. Numbers come from the widget's own JS (ml-embed.js, default data: 350 points, noise 0.3, seed 1) and scikit-learn.
module.exports = {
  idea: `A Swiss roll is a sheet curled in 3-D, so points far apart on the sheet can be close in 3-D. PCA, a straight projection, piles the layers on top of each other. t-SNE and UMAP trust only short distances, so they can unroll it.`,
  why: `Real data often lies on a thin curved surface inside a space with many features. If your 2-D picture lays different parts of that surface on top of each other, you see neighbours that do not exist and you report groups or relations that are not there. You need a map you can trust locally, and a number that tests that trust.`,
  analogy: `A rolled-up carpet. Photograph it from the end and you see the spiral of cloth, but the whole length of the carpet is squashed into one spot. Photograph it from the side and the layers hide each other. Neither picture shows the carpet as it is. To see the pattern you must unroll it. An ant on the carpet always knows which patch is next to which, because it walks on the cloth, not through the air between layers.`,
  vocab: [
    [`Manifold`, `The thin curved surface (or curve) your data lies on, even though it sits in a space with more dimensions. The roll is a 2-D sheet inside 3-D.`],
    [`Linear map (PCA)`, `Projects every point onto the same flat plane, the one along which the points spread most. It can tilt and squash, but it cannot unroll.`],
    [`Nonlinear embedding`, `A 2-D map built from neighbour relations (t-SNE, UMAP). Because it only keeps who is near whom, it can bend a sheet flat.`],
    [`Neighbourhood`, `The k points nearest to a given point. Here k = 10 when we score a map.`],
    [`Distance along the sheet`, `How far you must travel without leaving the surface. For two points on neighbouring turns of the roll it is much more than the straight line through the air between them.`],
    [`False neighbour`, `A point that is among the 10 nearest in the 2-D map but was not among the 10 nearest in the original 3-D data.`],
    [`Trustworthiness`, `A score from 0 to 1. For every point, look at its 10 nearest neighbours in the map and penalise each false neighbour by how far down the 3-D neighbour list it really was. 1 means no false neighbours.`]],
  steps: [
    { h: `The data: a sheet curled up`, p: `Each of the 350 points has three numbers (x, y, z), but only two numbers really matter: where the point is along the sheet (the colour) and its height y. A sheet has 2 degrees of freedom. The roll only hides that by bending it through 3-D.` },
    { h: `Straight-line distance can lie`, p: `Take two points at the same height, one full turn apart along the sheet. In 3-D they are 6.3 apart. To walk from one to the other along the sheet you must travel 57. For nearby points the two distances agree. The further apart the points, the more they disagree.` },
    { h: `PCA can only take a shadow`, p: `PCA keeps the two straight directions with the most spread and drops the third. A roll spreads almost equally in all three (about 42%, 30% and 28% of the variance), so PCA has no good plane to choose. Drop the height and you get a spiral with every height piled on one spot. Drop another direction and the layers overlap.` },
    { h: `Use only short distances`, p: `t-SNE and UMAP first record, for each point, who its close neighbours are (about 30 for perplexity 30, 15 for UMAP). In a small patch the sheet is almost flat, so straight distance is honest there. They then place the points in 2-D so that those neighbour relations hold.` },
    { h: `The price: cuts and shuffled pieces`, p: `Knowing only local neighbours, the method is free to cut the sheet and put the pieces anywhere, flipped or turned. You often see separate strands in the picture. Inside a strand the colours change smoothly. Where the strands sit relative to each other carries no meaning.` },
    { h: `Measure the trust`, p: `For each point take its 10 nearest in the map. Any that were not among its 10 nearest in 3-D are false neighbours, penalised by (3-D rank minus 10). Add up and rescale to 0 to 1. On a 350-point roll: in PCA's map 45% of neighbours are false and they are on average the 94th nearest in 3-D (score 0.89). In t-SNE's map about 16% are false, but typically only the 17th nearest, a near miss (score 0.997).` },
    { h: `What trustworthiness cannot see`, p: `It looks for false neighbours only. A map that cuts the sheet into a dozen strands still scores 0.99, because every strand keeps its true neighbours. And it is judged against the 3-D points you gave it: if noise pushes layers into each other, those wrong neighbours count as right. Always read the score together with the colours.` }],
  example: {
    title: `two points 6.3 apart that are 57 apart on the sheet`,
    setup: `The widget's roll has x = t·cos t, z = t·sin t, with t between 4.7 and 14.1, and y between 0 and 21. Seen from the end it is a spiral whose radius equals t. Pick the point at <b>t = 6.0</b> and compare it with three others at the same height.`,
    table: { head: [`Second point`, `Straight line in 3-D`, `Along the sheet ≈ (t₂² − t₁²)/2`, `Along ÷ straight`], rows: [
      [`t = 6.2 (a short step)`, `1.23`, `1.2`, `1.0`],
      [`t = 6.0 + π (half a turn)`, `15.14`, `23.8`, `1.6`],
      [`t = 6.0 + 2π (one full turn)`, `6.28`, `57.4`, `9.1`]] },
    walk: [
      `First point: x = 6.0·cos 6.0 = 5.76 and z = 6.0·sin 6.0 = −1.68 (angles in radians).`,
      `One full turn later, t = 6.0 + 2π = 12.28. The angle is the same, so the point lies on the same ray out from the axis: x = 12.28·cos 6.0 = 11.79 and z = −3.43.`,
      `Straight line (same y, so ignore it): √((11.79 − 5.76)² + (−3.43 + 1.68)²) = √39.5 = <b>6.28</b>. Both points are on one ray, so this is just the difference of the radii, 12.28 − 6.00 = 2π. The gap between layers is 2π everywhere on the roll.`,
      `Along the sheet: a small step dt moves you about t·dt along the spiral (the radius is t). So the length from t₁ to t₂ is about ∫ t dt = (t₂² − t₁²)/2 = (150.88 − 36)/2 = <b>57.4</b>. The exact integral, which keeps the small extra √(1 + t²), gives 57.8.`,
      `Ratio: 57.4 / 6.28 = 9.1. Believe the straight line and these two points look like neighbours. On the sheet they are nine times further apart.`,
      `Now the safe zone. With 350 points the median distance from a point to its 10th nearest neighbour is 4.2, which is less than the layer gap 6.3, so a 10-neighbour list stays inside one layer. With 150 points it is 6.4 and the lists reach the next layer. With 600 points it is 3.2.`],
    result: `A neighbourhood is trustworthy while it is smaller than the gap between layers (6.3). At 350 points and noise 0.3 only 1.5% of the entries in the 10-neighbour lists come from a part of the sheet more than half a turn away. At noise 2.0 it is 13.8%, and the maps copy those wrong neighbours.` },
  read: [
    [`The Swiss roll in 3-D (top)`, `Your points, coloured by position along the sheet (light to dark). Drag to rotate.`],
    [`Button: Look along the roll's axis`, `Shows the spiral cross-section. The colours run in order, but the whole height of the roll is squashed onto the spiral.`],
    [`Button: Side view`, `Shows a rectangle: the layers sit behind one another and hide each other.`],
    [`PCA card`, `A flat straight-line shadow of the roll. Look for colour bands that cross or pile up.`],
    [`t-SNE card and UMAP card`, `Unrolled maps. Colours should change smoothly along each strand. Strands may be cut, shuffled and flipped.`],
    [`Caption: trustworthiness 0.xxx`, `The score from step 6 for that map, also listed in the panel <i>Trustworthiness (10 neighbours)</i>. Higher is better, 1 is perfect. It is judged against the 3-D points you see, noise included, and it catches false neighbours, not cuts. It shows "running…" while the map is still settling.`],
    [`Readout: Variance PCA keeps`, `The share of the roll's spread inside the two PCA directions, about 70 to 74%. The missing 26 to 30% is the direction PCA threw away.`],
    [`Slider: Points and Noise`, `How many points, and how much random jitter is added to x, y and z. Noise makes the layers blur into each other.`],
    [`Sliders: t-SNE perplexity and UMAP n_neighbors`, `How many neighbours each method looks at. Small gives short strands, large gives big sweeping shapes.`],
    [`Button: Re-run with a new seed`, `Draws a new roll (new points) and restarts both methods, so every score can change.`]],
  experiments: [
    { do: `Answer the poll. Then press <i>Look along the roll's axis</i>, <i>Side view</i> and <i>Default view</i>, and compare each with the <i>PCA</i> card. Finally press <i>Re-run with a new seed</i> a few times and watch the PCA card.`, see: `The axis view is a clean spiral, the side view a rectangle with hidden layers. At the default data the PCA card is a tilted shadow between the two, with colour bands crossing. On most new seeds (4 of the next 5 we tried) the PCA card turns into a near copy of the spiral, yet its score stays only 0.92 to 0.94.`, why: `PCA keeps the two directions of largest spread. A roll has three almost equal ones, so which one it drops depends on the sample. Every straight 2-D view loses a whole direction: a spiral hides the height, and then points 21 units apart vertically become map neighbours.` },
    { do: `Move <i>Noise</i> from 0.30 up to 2.00 and watch the t-SNE and UMAP cards and their scores.`, see: `The colour gradients break up into patches. The scores slip only a little: t-SNE from about 0.997 to 0.992 and UMAP from 0.993 to 0.986, while PCA stays near 0.88.`, why: `Noise pushes layers into each other: 1.5% of 10-neighbour entries come from a part of the sheet more than half a turn away at noise 0.3, and 13.8% at noise 2.0. The maps copy those neighbours, and the score is measured against the same noisy 3-D points, so it hardly notices.` },
    { do: `Set <i>t-SNE perplexity</i> to 5 and <i>UMAP n_neighbors</i> to 5.`, see: `Both maps break into many short strands, a dozen or more. Scores stay high: about 0.993 for t-SNE and 0.983 for UMAP.`, why: `Tiny neighbourhoods have too little overlap to stitch the strands together, and trustworthiness does not penalise cuts, only false neighbours.` },
    { do: `Return to the defaults and set <i>Points</i> to 150, then to 600.`, see: `With 150 points both scores fall to about 0.98. With 600 they rise to about 0.999 (t-SNE) and 0.997 (UMAP).`, why: `With fewer points each neighbourhood is wider: the 10th neighbour is 6.4 away at 150 points, 3.2 at 600, against a layer gap of 6.3. Once the neighbourhood reaches the next layer, unrolling gets harder.` },
    { do: `Press <i>Re-run with a new seed</i> five times and write down the three scores each time.`, see: `PCA wanders between about 0.87 and 0.94. t-SNE stays within 0.996 to 0.998, UMAP within 0.992 to 0.995.`, why: `PCA's plane depends on which sample you drew, since its three spreads are nearly tied. The neighbour-based methods do not depend on any plane.` }],
  remember: [
    { tag: `Picture`, text: `An <b>ant on the carpet</b>. Neighbours should be the places the ant reaches in a few steps, not what a bird sees across the layers.` },
    { tag: `Rule of thumb`, text: `Straight-line distance is trustworthy only <b>inside a small patch</b>. Keep the neighbourhood smaller than the gap between layers (6.3 here: the 10th neighbour was 4.2 away at 350 points).` },
    { tag: `Sanity check`, text: `Colour the map by something you know (here the position t). Smooth colour change along a strand means it is unrolled. Crossing bands mean it is flattened or glued.` },
    { tag: `Formula in words`, text: `Trustworthiness = 1 minus (a penalty for every false neighbour, bigger the further down the 3-D list it was). It counts <b>intruders</b>, not cuts.` },
    { tag: `Rule of thumb`, text: `In an unrolled map only <b>who is next to whom</b> is real. Flips, turns, gaps and the order of the strands are free choices of the method.` }],
  mistakes: [
    { wrong: `"PCA is just a worse t-SNE."`, right: `PCA answers a different question: which straight directions carry the most spread. For data on a flat or nearly flat surface it is excellent, fast and repeatable, and it can place new points. On a rolled sheet the straight-direction answer is a flat shadow.` },
    { wrong: `"A trustworthiness of 0.99 means the sheet is unrolled correctly."`, right: `It only says that map neighbours were also 3-D neighbours. A map cut into a dozen strands can still score 0.99, and with noisy data it is judged against noisy neighbours. Check the colours as well.` },
    { wrong: `"The distance between two strands in the t-SNE or UMAP map tells me how far apart those parts of the sheet are."`, right: `Strands can be placed, flipped or turned anywhere. Only the neighbours inside a strand are reliable.` },
    { wrong: `"A bigger perplexity or n_neighbors is always safer."`, right: `Past the layer gap a neighbourhood reaches the next turn and colours begin to mix. Perplexity 80 with n_neighbors 60 gave about 0.989 and 0.986 here, against 0.997 and 0.993 at the defaults.` }],
  code: [
    {
      title: `The straight line against the walk along the sheet`,
      py: `import numpy as np

t = np.array([6.0, 6.0 + 2 * np.pi])        # sheet positions: a point, and the same spot one turn further out
xz = np.c_[t * np.cos(t), t * np.sin(t)]    # the roll's x and z coordinates (same height y, so y cancels)

straight = np.linalg.norm(xz[1] - xz[0])    # straight-line distance in 3-D
along = (t[1] ** 2 - t[0] ** 2) / 2         # length of sheet between them: the spiral r = t
print("straight line:", round(straight, 2))
print("along the sheet:", round(along, 1))
print("ratio:", round(along / straight, 1))`,
      out: `straight line: 6.28
along the sheet: 57.4
ratio: 9.1`,
      walk: [
        [`t = np.array([6.0, 6.0 + 2 * np.pi])`, `Two positions along the sheet: a point and the point one full turn further. <code>2 * np.pi</code> is one full circle in radians.`],
        [`np.c_[t * np.cos(t), t * np.sin(t)]`, `The roll's formula x = t·cos t and z = t·sin t. <code>np.c_</code> puts the two columns side by side, giving a 2 by 2 array: one row per point. Height y is left out because both points share it.`],
        [`np.linalg.norm(xz[1] - xz[0])`, `Subtract the two rows to get the difference vector, then <code>norm</code> gives its length: the straight-line distance.`],
        [`(t[1] ** 2 - t[0] ** 2) / 2`, `The length of the spiral between the two points, from ∫ t dt. <code>**</code> means "to the power of". It is a good approximation when t is above 4.`],
        [`round(x, 2)`, `Print only 2 decimals so the output is short and the same on every machine.`]],
      tip: `Whenever a method claims "distance", ask: along what path? Straight lines through empty space are not always allowed.`
    },
    {
      title: `PCA on the roll: how the spread splits, and its trustworthiness`,
      py: `from sklearn.datasets import make_swiss_roll
from sklearn.decomposition import PCA
from sklearn.manifold import trustworthiness

X, t = make_swiss_roll(n_samples=350, noise=0.3, random_state=0)
pca = PCA(n_components=3).fit(X)             # keep all 3 to see every variance share
print("variance shares:", pca.explained_variance_ratio_.round(2))

E = PCA(n_components=2).fit_transform(X)     # the 2-D PCA map
print("PCA map trust:", round(trustworthiness(X, E, n_neighbors=10), 2))`,
      out: `variance shares: [0.42 0.3  0.28]
PCA map trust: 0.89`,
      walk: [
        [`make_swiss_roll(n_samples=350, noise=0.3, random_state=0)`, `scikit-learn's generator, with the same formula as the simulation. It returns <code>X</code> (350 rows, 3 columns) and <code>t</code>, the position along the sheet. We never give <code>t</code> to PCA, t-SNE or UMAP. It is only for colouring. <code>random_state</code> fixes the random draw.`],
        [`PCA(n_components=3).fit(X)`, `Learn all three directions. <code>fit</code> learns from the data and changes the object.`],
        [`pca.explained_variance_ratio_`, `A learned result (names ending in an underscore are filled in by <code>fit</code>). The share of the total spread along each direction. The three add to 1. Here no direction is much bigger than the others, so no 2-D plane is a clear winner.`],
        [`PCA(n_components=2).fit_transform(X)`, `<code>fit_transform</code> is <code>fit</code> followed by <code>transform</code>: learn the plane, then project the points onto it. The result has shape (350, 2).`],
        [`trustworthiness(X, E, n_neighbors=10)`, `Compares each point's 10 nearest neighbours in the map <code>E</code> against the original <code>X</code>. First argument original, second the map.`]],
      tip: `Pass the original data first and the map second. Swapping them gives a different (wrong) score.`
    },
    {
      title: `t-SNE and UMAP on the same roll`,
      py: `from sklearn.datasets import make_swiss_roll
from sklearn.manifold import TSNE, trustworthiness
import umap

X, t = make_swiss_roll(n_samples=350, noise=0.3, random_state=0)
tsne = TSNE(perplexity=30, init="pca", random_state=0).fit_transform(X)
um = umap.UMAP(n_neighbors=15, random_state=0).fit_transform(X)

for name, E in [("t-SNE", tsne), ("UMAP", um)]:
    print(name, "trust above 0.98:", trustworthiness(X, E, n_neighbors=10) > 0.98)
print("map shape:", um.shape)`,
      out: `t-SNE trust above 0.98: True
UMAP trust above 0.98: True
map shape: (350, 2)`,
      walk: [
        [`TSNE(perplexity=30, init="pca", random_state=0)`, `<code>perplexity</code> is the neighbourhood size. <code>init="pca"</code> starts the points at PCA positions, which makes the layout steadier. <code>random_state</code> fixes the remaining randomness.`],
        [`.fit_transform(X)`, `t-SNE learns and returns the map in one go. There is no separate <code>transform</code> for new points (see the <i>New points</i> lesson).`],
        [`umap.UMAP(n_neighbors=15, random_state=0)`, `<code>n_neighbors</code> is UMAP's neighbourhood size. Setting <code>random_state</code> also makes UMAP run on one thread, so the result is repeatable.`],
        [`for name, E in [...]`, `Loop over (label, map) pairs so the same check is written once.`],
        [`trustworthiness(...) > 0.98`, `We print True or False rather than the number, because t-SNE and UMAP outputs differ a little between library versions. The conclusion, both far above PCA's 0.89, does not.`],
        [`um.shape`, `(350, 2): one row per point, two map coordinates per row.`]],
      tip: `Always set <code>random_state</code> for t-SNE and UMAP, or the picture changes every time you run the cell.`
    }],
  check: [
    { q: `Why does PCA fail to unroll a Swiss roll?`, options: [`It is a straight projection, so parts of the sheet that are far apart along it land on top of each other`, `It cannot handle data with 3 features`, `It needs class labels to work`, `It is random, so each run gives a different picture`], answer: 0, why: `PCA projects every point onto one flat plane. Points on different turns of the roll can be above one another along the projection direction, so they land together even though they are far apart on the sheet.` },
    { q: `For the point at t = 6.0, how far is the walk along the sheet to the same spot one full turn further out (t = 6.0 + 2π = 12.28)? Use (t₂² − t₁²)/2.`, options: [`6.3`, `23`, `57`, `150`], answer: 2, why: `(12.28² − 6.0²)/2 = (150.8 − 36)/2 = 57.4. The straight line through the air is only 2π = 6.3, so a method that trusts long straight distances would call these points neighbours.` },
    { q: `You press <i>Re-run with a new seed</i> five times. Which of the three scores will change the most between presses?`, options: [`PCA`, `t-SNE`, `UMAP`, `All change equally`], answer: 0, why: `PCA's best plane depends on the sample because the three variance shares are nearly tied. Its score wandered between about 0.87 and 0.94, while t-SNE stayed within 0.996 to 0.998 and UMAP within 0.992 to 0.995.` }],
  teachback: { prompt: `In two sentences, explain to a friend why PCA cannot unroll a Swiss roll but t-SNE and UMAP can, and what trustworthiness does and does not check.`, model: `PCA is a straight projection, so it has to drop a direction of the roll and layers that are far apart along the sheet end up on top of each other. t-SNE and UMAP only keep each point's nearest neighbours, which are reliable in a small flat patch, so they can lay the sheet out, at the price of cuts. Trustworthiness checks that a point's neighbours in the map were really its neighbours in 3-D, so it catches false neighbours but not a torn sheet.` },
  cheat: `Data on a curved sheet cannot be flattened by a straight projection: PCA drops a direction and piles layers up. t-SNE and UMAP keep only local neighbour relations, which are safe while a neighbourhood is smaller than the gap between layers (6.3 here), so they unroll the sheet but may cut it and place pieces anywhere. Trustworthiness (10 neighbours) catches false neighbours, not cuts.`
};
