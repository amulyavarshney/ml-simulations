// Lesson for embeddings/tsne-seeds. Widget numbers come from running assets/ml-embed.js on the page's own data (30 digits per class, subset seed 21, perplexity 30, seeds 1 2 3).
module.exports = {
  idea: `Run t-SNE twice with different random seeds and each point keeps almost the same neighbours, but where whole clusters sit on the page, how far apart they are and which way up the picture is all change. Local structure repeats, global layout does not.`,
  why: `People read a t-SNE picture like a map: "cluster A is next to B, so they are related". If another seed puts A next to C, that story was an accident of the seed. Knowing what repeats lets you report only findings that survive a re-run.`,
  analogy: `Seating 300 guests at a wedding with one rule: families sit together. Two planners can both keep every family together, so the local structure is the same, yet they put the families at different tables in a different order. Turning the hall's floor plan by 90 degrees changes nothing at all. Only the first kind of structure is a fact about the guests.`,
  vocab: [
    [`Seed (random_state)`, `A number that fixes the random choices. Same data, same settings and same seed give the same picture. A different seed gives a different random start.`],
    [`Initialisation`, `The starting positions of the 2-D points. <b>Random</b>: all points in a tiny random blob. <b>PCA</b>: the first two PCA coordinates, scaled very small. The start is the only thing the seed changes.`],
    [`Local minimum`, `A layout where no small move lowers the cost, though a better layout exists elsewhere. Different starts end in different ones, all about equally good.`],
    [`Between-cluster distance`, `The distance between the centres of two digit clusters in the map. With 10 digits there are 45 such pairs.`],
    [`Agreement (r)`, `The correlation between the 45 between-cluster distances of two runs. 1 means identical relative spacing, near 0 means unrelated.`],
    [`Procrustes alignment`, `Rotating, flipping and shifting one map to lie as close as possible to another. It removes accidental turns and nothing else.`],
    [`Trustworthiness`, `0 to 1: the share of each point's map neighbours that were real neighbours in the 64 pixels. High means local structure is right.`]],
  steps: [
    { h: `A random start`, p: `t-SNE begins with all 300 points in a tiny random blob, about 0.0001 wide, and lets forces pull neighbours together and push everything else apart. A different seed means a different blob and so a different path downhill.` },
    { h: `Clusters form, then drift`, p: `In the first 250 steps (early exaggeration) the neighbour attraction is boosted 12 times. Groups of similar digits snap together as clumps. After that the clumps are pushed apart by the repulsion between all pairs and slide until nothing moves.` },
    { h: `Many layouts are equally good`, p: `Rotating or flipping a map leaves every distance, and so the cost, unchanged. Swapping where two far clusters sit costs almost nothing either: far pairs have P near 0, so they add almost nothing to KL. The objective does not pin down the arrangement of clusters.` },
    { h: `What the data does pin down`, p: `Each point's near neighbours have large P, so every run must keep them together. That is why trustworthiness hardly changes between seeds: 0.980, 0.975 and 0.974 in one run of the page, all within 0.01.` },
    { h: `What the seed decides`, p: `Where each cluster lands and how far from the others. To measure it, take the centre of each digit's points in the map, compute the 45 centre-to-centre distances, and correlate them between two runs. That is agreement r. In one run of the page r was 0.55, 0.59 and 0.23 for the three pairs, mean 0.45. Another batch gave a mean of 0.74.` },
    { h: `Alignment helps only a little`, p: `Rotation and flips do not change distances, so aligning cannot change r. It only makes the pictures easier to compare by eye. The clusters that stay in different places after aligning are a real difference between the runs, not a trick of rotation.` },
    { h: `PCA start: the randomness is removed, not the sensitivity`, p: `With init PCA, every run starts at the same point, so the three runs here are identical (r = 1.00). That is steady, not trustworthy: you see one of many equally good layouts. Change the perplexity or add some points and the arrangement can still change.` },
    { h: `A working rule`, p: `Run at least three seeds. Report only what repeats: which digits sit next to which, which clumps stay whole. Do not report the distance between clusters, their order, or the orientation. If you need one fixed layout, use PCA start and say it is one of many.` }],
  example: {
    title: `agreement r for four digits, by hand`,
    setup: `Take digits 0, 1, 2 and 3 from two runs of the simulation. The centres of their clumps are 6 pairs apart. Here are those 6 distances in run 1 and in run 2 (1 decimal). These come from one machine: yours will differ, because t-SNE is chaotic and browsers round slightly differently. The arithmetic is the same. Does run 2 keep the same spacing?`,
    table: { head: [`Pair`, `Run 1`, `Run 2`, `Run 1 − 23.37`, `Run 2 − 23.32`, `Product`], rows: [
      [`0 and 1`, `31.5`, `25.8`, `8.1`, `2.5`, `20.2`],
      [`0 and 2`, `41.0`, `29.9`, `17.6`, `6.6`, `116.1`],
      [`0 and 3`, `31.5`, `18.9`, `8.1`, `−4.4`, `−35.9`],
      [`1 and 2`, `11.4`, `27.3`, `−12.0`, `4.0`, `−47.7`],
      [`1 and 3`, `12.4`, `26.1`, `−11.0`, `2.8`, `−30.5`],
      [`2 and 3`, `12.4`, `11.9`, `−11.0`, `−11.4`, `125.2`]] },
    walk: [
      `Means: run 1 gives (31.5 + 41.0 + 31.5 + 11.4 + 12.4 + 12.4)/6 = 140.2/6 = 23.37. Run 2 gives 139.9/6 = 23.32.`,
      `Subtract each mean from its column (columns 4 and 5). Multiply the two deviations in each row (last column).`,
      `Sum of products: 20.2 + 116.1 − 35.9 − 47.7 − 30.5 + 125.2 = <b>147.4</b>.`,
      `Sum of squared deviations for run 1: 8.1² + 17.6² + 8.1² + 12.0² + 11.0² + 11.0² = <b>827.0</b>. For run 2: 2.5² + 6.6² + 4.4² + 4.0² + 2.8² + 11.4² = <b>223.0</b>.`,
      `r = 147.4 / √(827.0 × 223.0) = 147.4 / 429.4 = <b>0.34</b>.`,
      `Read it: in run 1 digits 1, 2 and 3 are close together (11 to 12 apart) while 0 is far from all. In run 2 digit 1 has moved away from 2 and 3 (27.3 and 26.1) while 2 and 3 stay together (11.9). The spacing is quite different, although each digit is the same tight clump in both.`],
    result: `With 10 digits and 45 distances the page reports the mean of three such r values. One run gave 0.55, 0.59 and 0.23, mean 0.45. Compare that with trustworthiness at 0.97 to 0.98. Neighbourhoods repeat, spacing between clusters does not. A bigger r would need the spacing to match: r = 1 even if one map is 10 times bigger, because r ignores scale.` },
  read: [
    [`Three map cards: Run 1 · seed 1, Run 2 · seed 2, Run 3 · seed 3`, `The same 300 digits (30 per class) drawn as their digit, coloured by class, from three different random starts. With PCA start the titles read "PCA start".`],
    [`Readout: Trustworthiness of runs 1, 2, 3`, `Local quality of each map. Near-equal values mean the runs agree on neighbourhoods.`],
    [`Readout: Agreement of between-cluster distances (mean r)`, `The mean of the three pairwise correlations. It turns green above 0.9 and amber below.`],
    [`Readout: Run 1 vs 2 / 1 vs 3 / 2 vs 3`, `The three correlations one by one.`],
    [`Segmented control: Initial positions`, `<i>Random</i>: tiny random blob (the seed matters). <i>PCA</i>: start from PCA coordinates (the seed has no effect).`],
    [`Checkbox: Align maps to run 1 (rotate / flip)`, `Redraws maps 2 and 3 turned or flipped to lie as near as possible to map 1. It changes only the drawing; the readouts stay the same.`],
    [`Slider: Perplexity (5 to 60)`, `The t-SNE neighbourhood size, same as in the perplexity lesson.`],
    [`Button: Run again`, `Adds 3 to each seed (so 4, 5, 6 after the first press) and reruns all three maps.`]],
  experiments: [
    { do: `Answer the poll, then look at the three maps. In each map find the clump of digit 3 and the clump of digit 9, and then name the clump nearest to digit 2.`, see: `The 3 and 9 clumps are neighbours in nearly every run (over 12 seeds each was the other's nearest clump 11 or 12 times). Digit 2's nearest clump changes: over the same 12 seeds it was 1, 3, 5, 9, 7 or 8, and none of them more than 3 times.`, why: `Two very similar groups (3 and 9) have large P between them and must stay together. A group with several moderately similar neighbours is free to settle next to any of them.` },
    { do: `Read <i>Trustworthiness of runs 1, 2, 3</i> and the agreement. Then press <i>Run again</i> four or five times.`, see: `Trustworthiness stays between 0.97 and 0.98 every time. Mean r wanders from batch to batch, roughly between 0.45 and 0.75 (0.45, 0.46, 0.74, 0.65, 0.54 in one of our sessions), and single pairs run from about 0.2 to 0.8.`, why: `The neighbourhoods are fixed by the data, the arrangement is decided by the random start, so one batch of three runs is a noisy sample of how arbitrary the layout is.` },
    { do: `Switch <i>Initial positions</i> to <i>PCA</i>.`, see: `A note on the page says so: the three maps are identical, trustworthiness is the same three times (about 0.98), mean r reads 1.00 and the pairwise line ends with "(identical runs)".`, why: `PCA gives every run the same start and nothing else is random, so the three runs follow the same path. This hides the arbitrariness, it does not remove it.` },
    { do: `Switch back to <i>Random</i> and tick <i>Align maps to run 1</i>.`, see: `Maps 2 and 3 are turned or flipped to match map 1 as closely as possible. Every clump keeps its shape. The pictures look more alike, yet clusters still sit in different places, and the agreement readout does not change.`, why: `Rotations and flips leave every distance unchanged, so r cannot change. What remains after alignment is the real difference in arrangement.` },
    { do: `Back on <i>Random</i>, press <i>Run again</i> four or five times at perplexity 30 and write down each batch's mean r. Repeat at perplexity 5.`, see: `Mean r runs from about 0.45 to 0.75 over five batches at perplexity 30 and from about 0.4 to 0.6 at perplexity 5. The ranges overlap. Trustworthiness is a little lower at 5 (about 0.97 against 0.98).`, why: `The batch-to-batch noise in r (0.4 to 0.9) is bigger than any effect of perplexity. At every setting we tried, r stayed far below 1.` }],
  remember: [
    { tag: `Picture`, text: `<b>Wedding seating</b>: families together (reliable), tables in a different order each time (arbitrary).` },
    { tag: `Rule of thumb`, text: `Trust <b>who is next to whom</b> inside and between near clumps. Do not trust the distance between far clusters, their order or the orientation.` },
    { tag: `Trick`, text: `Rerun with 3 seeds. A statement that appears in all three is a finding. A statement that appears in one is decoration.` },
    { tag: `Sanity check`, text: `Before writing "A is closer to B than to C", change the seed. If the claim flips, it came from the seed, not from the data.` },
    { tag: `Formula in words`, text: `Agreement r = correlation of the 45 centre-to-centre distances of two maps. It ignores scale and is unchanged by rotation, flips and shifts.` },
    { tag: `Link to code`, text: `<code>TSNE(random_state=s)</code> sets the seed. <code>init="pca"</code> makes the start (and so the result) the same for every seed.` }],
  mistakes: [
    { wrong: `"Different pictures from different seeds mean the algorithm is broken, or one of them is wrong."`, right: `Both are valid. They have the same neighbourhoods (trustworthiness within about 0.01) and differ only in what the cost function barely constrains: the arrangement of clusters.` },
    { wrong: `"With PCA initialisation the layout is now reliable."`, right: `It is repeatable, not reliable. All three runs are identical because their start is identical. One arrangement out of many equally good ones is still arbitrary.` },
    { wrong: `"Procrustes alignment makes two maps agree."`, right: `It removes rotation, flips and shifts only, which never changed the distances in the first place. It cannot move one cluster relative to another.` },
    { wrong: `"Setting random_state=42 makes my picture the true layout."`, right: `A fixed seed makes the picture repeatable. It does not make the arrangement mean anything.` }],
  code: [
    {
      title: `Same neighbours, different spacing`,
      py: `import numpy as np
from itertools import combinations
from sklearn.datasets import load_digits
from sklearn.manifold import TSNE, trustworthiness

X, y = load_digits(return_X_y=True)
pick = np.random.RandomState(0).choice(len(y), 300, replace=False)   # 300 random images
X, y = X[pick], y[pick]
centres = lambda E: np.array([E[y == k].mean(axis=0) for k in range(10)])        # one centre per digit
gaps = lambda E: [np.linalg.norm(a - b) for a, b in combinations(centres(E), 2)]  # the 45 centre gaps
runs = [TSNE(init="random", method="exact", random_state=s).fit_transform(X) for s in range(3)]
print("every run trusted (> 0.95):", all(trustworthiness(X, E, n_neighbors=10) > 0.95 for E in runs))
r = [np.corrcoef(gaps(runs[i]), gaps(runs[j]))[0, 1] for i, j in combinations(range(3), 2)]
print("mean agreement of centre gaps below 0.8:", np.mean(r) < 0.8)`,
      out: `every run trusted (> 0.95): True
mean agreement of centre gaps below 0.8: True`,
      walk: [
        [`np.random.RandomState(0).choice(len(y), 300, replace=False)`, `Pick 300 different row numbers at random. <code>RandomState(0)</code> fixes the draw. <code>replace=False</code> means no image is picked twice.`],
        [`X, y = X[pick], y[pick]`, `Index with the list of row numbers to keep the chosen images and their digit labels in step.`],
        [`E[y == k].mean(axis=0)`, `<code>y == k</code> is a True/False mask of the images of digit k. <code>E[mask]</code> keeps their map rows, and <code>.mean(axis=0)</code> averages down the rows to give the cluster centre (x, y). <code>centres</code> stacks the ten centres into a 10 by 2 array.`],
        [`combinations(centres(E), 2)`, `Every unordered pair of rows, that is every pair of digit centres: (0,1), (0,2) ... (8,9). That is 45 pairs. <code>gaps</code> turns each pair into one distance with <code>np.linalg.norm(a - b)</code>.`],
        [`TSNE(init="random", method="exact", random_state=s)`, `Random start, so the seed changes the result. <code>method="exact"</code> computes all pairs (fine for 300 points) and matches the simulation.`],
        [`np.corrcoef(a, b)[0, 1]`, `Returns a 2 by 2 matrix of correlations; entry [0, 1] is the correlation between the two lists. That is agreement r.`]],
      tip: `Same trust, low r: that pair of lines is the whole lesson in code.`
    },
    {
      title: `PCA start removes the randomness`,
      py: `import numpy as np
from sklearn.datasets import load_digits
from sklearn.manifold import TSNE

X = load_digits().data
X = X[np.random.RandomState(0).choice(len(X), 300, replace=False)]

def same_map(init):                            # fit twice with different seeds and compare the coordinates
    a = TSNE(init=init, random_state=0).fit_transform(X)
    b = TSNE(init=init, random_state=1).fit_transform(X)
    return bool(np.allclose(a, b, atol=1e-2))

print("PCA start gives the same map:", same_map("pca"))
print("random start gives the same map:", same_map("random"))`,
      out: `PCA start gives the same map: True
random start gives the same map: False`,
      walk: [
        [`load_digits().data`, `The 64-pixel images as a 1,797 by 64 array, without the labels (we do not need them here).`],
        [`def same_map(init):`, `A function so the same test runs twice with different <code>init</code> choices.`],
        [`TSNE(init=init, random_state=0)`, `Seed 0 for the first fit and seed 1 for the second. Only the seed differs.`],
        [`np.allclose(a, b, atol=1e-2)`, `True when every coordinate of the two maps agrees to within 0.01. Maps are around 50 wide, so this is a very strict test.`],
        [`bool(...)`, `Turns numpy's True into Python's, so the output prints as plain <code>True</code>.`]],
      tip: `If you need the same picture tomorrow, set both <code>init="pca"</code> and <code>random_state</code>.`
    },
    {
      title: `What alignment can and cannot fix`,
      py: `import numpy as np
from scipy.linalg import orthogonal_procrustes

rng = np.random.RandomState(0)
A = rng.randn(200, 2)                          # a pretend 2-D map
turned = A @ np.array([[0, -1], [1, 0]])       # the same map turned by 90 degrees
other = rng.randn(200, 2)                      # a genuinely different layout

def gap_after_aligning(P, Q):                  # leftover distance after the best rotation or flip
    R, _ = orthogonal_procrustes(P, Q)         # R is a 2x2 rotation/reflection matrix
    return round(float(np.linalg.norm(P @ R - Q)), 1)

print("turned copy:", gap_after_aligning(turned, A))
print("different layout:", gap_after_aligning(other, A))`,
      out: `turned copy: 0.0
different layout: 26.4`,
      walk: [
        [`rng.randn(200, 2)`, `200 random points with 2 coordinates each: a stand-in for a map.`],
        [`A @ np.array([[0, -1], [1, 0]])`, `<code>@</code> is matrix multiplication. This particular matrix rotates every point by 90 degrees.`],
        [`orthogonal_procrustes(P, Q)`, `Finds the rotation or flip matrix <code>R</code> that brings P as close as possible to Q. It returns a pair (R, scale); we keep only R and write <code>_</code> for the part we ignore.`],
        [`P @ R - Q`, `Apply the best rotation to P, subtract Q, and measure what is left with <code>np.linalg.norm</code>.`],
        [`round(float(...), 1)`, `Convert to a plain number and keep one decimal so the output is short.`]],
      tip: `A turned copy aligns to 0.0. Two different layouts keep a large gap. This is exactly what you see when you tick <i>Align maps to run 1</i>.`
    }],
  check: [
    { q: `Two t-SNE runs on the same data use different seeds. Which of these is most likely to differ?`, options: [`The distance between two far-apart clusters`, `Which points are among each point's 10 nearest neighbours`, `The trustworthiness score to within 0.01`, `The number of points`], answer: 0, why: `Near neighbours are fixed by large P, so trustworthiness and neighbour lists repeat. The spacing of far clusters is barely constrained by the cost and depends on the random start.` },
    { q: `Run A gives centre distances (2, 4, 6) for three pairs of digits. Run B, drawn on a map ten times larger, gives (20, 40, 60). What is the agreement r?`, options: [`1.0`, `0.1`, `10`, `0.5`], answer: 0, why: `B is exactly 10 times A, a perfectly straight-line relation, so the correlation is 1. Correlation ignores scale, which is what you want when two maps use different units.` },
    { q: `You tick <i>Align maps to run 1 (rotate / flip)</i>. What happens to the readout <i>Agreement of between-cluster distances</i>?`, options: [`It does not change, since rotations and flips do not change distances`, `It rises to 1.00`, `It drops towards 0`, `It becomes undefined`], answer: 0, why: `The centre-to-centre distances are the same before and after a rotation or flip, so r is identical. Alignment is only for comparing the drawings by eye.` }],
  teachback: { prompt: `In two sentences, explain to a friend what stays the same and what changes when you run t-SNE with different seeds, and why.`, model: `Each point keeps nearly the same neighbours, so trustworthiness hardly changes, because the data fixes which points must be close. Where whole clusters sit, how far apart they are and which way the picture is turned depend on the random start, because the cost barely cares about the position of far-apart clusters, so I should only trust neighbours and not distances between clusters.` },
  cheat: `Different seeds give different random starts and so different t-SNE layouts of equal quality. Neighbourhoods repeat (trustworthiness within about 0.01), but the spacing between clusters does not (mean agreement r about 0.4 to 0.75). Rotation or flip alignment cannot fix that. PCA start makes runs identical without making the layout meaningful. Report only what survives three seeds.`
};
