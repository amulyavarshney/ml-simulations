// Lesson for embeddings/tsne-perplexity. Widget numbers come from running assets/ml-embed.js on the page's own data (blobs seed 11; digits subset 30 per class, seed 5, PCA start).
module.exports = {
  idea: `t-SNE gives every point its own bell curve of neighbours. Perplexity is the dial that sets how wide each curve is: it means "about this many neighbours count". The 2-D map is then arranged to copy those neighbour weights.`,
  why: `Points in dense regions have close neighbours, points in sparse regions have far ones. One fixed bell width would give dense points dozens of neighbours and sparse points almost none. Perplexity adapts the width per point. Set it badly and real groups split into fragments (too low) or different groups get glued together (too high).`,
  analogy: `Ask each student for "your 5 closest friends". In a crowded hostel they live within a few metres. In a village they live kilometres away. "Friends within 100 m" would give a hostel student 200 friends and a villager none. "About 5 friends, however far" gives everyone a comparable circle. The count is perplexity. The radius it forces on each person is sigma (σ).`,
  vocab: [
    [`Perplexity`, `The effective number of neighbours of a point: e<sup>H</sup>, where H is the entropy of its neighbour weights. If 5 neighbours share the weight equally it is exactly 5.`],
    [`σ (sigma)`, `The width of a point's bell curve. Neighbour j gets weight exp(−d²/2σ²), where d is its distance. Each point gets its own σ.`],
    [`p(j|i)`, `The weight of point j in point i's neighbourhood, divided by the total, so the weights of one point add up to 1.`],
    [`Joint P`, `The symmetric version, P<sub>ij</sub> = (p(j|i) + p(i|j)) / 2n. Over all pairs it adds up to 1. This is the target the map must copy.`],
    [`Q (Student-t)`, `The same idea in the map: similarity 1/(1 + distance²), divided by the total over all pairs. The slow fall-off lets far-apart clusters sit apart without being crushed.`],
    [`KL divergence`, `Σ P<sub>ij</sub> log(P<sub>ij</sub>/Q<sub>ij</sub>): how badly the map's Q matches the target P. 0 is a perfect match. t-SNE moves the points to lower it.`],
    [`Neighbour purity`, `Of a point's 10 nearest neighbours in the map, the fraction that carry the same digit label. 1 means every neighbour is the same digit.`]],
  steps: [
    { h: `The goal`, p: `You have 300 digit images, each 64 numbers. You want to place each one on a 2-D page so that images that look alike stay close. First you need an exact score of "looks alike" for every pair of images. t-SNE builds that score from distances.` },
    { h: `A bell curve per point`, p: `For point i, give every other point j the weight exp(−d²/2σ²), where d is the distance between i and j. A near point gets a weight close to 1, a far point close to 0. Divide by the total so the weights add to 1. These are the p(j|i). σ says how far the bell reaches.` },
    { h: `One σ for everyone fails`, p: `On the left of the simulation there are three blobs: tight, medium and loose. With σ = 0.25, right for the tight blob, a typical point of the loose blob has an effective 2 neighbours, so only its nearest counts. With σ = 1.43, right for the loose blob, a tight-blob point sees about 64 neighbours, more than its whole blob.` },
    { h: `Perplexity: tune σ per point`, p: `Entropy H = −Σ p log p measures how spread out a point's weights are. e<sup>H</sup> is the effective number of neighbours, called perplexity. t-SNE searches a separate σ for each point, by halving a bracket, until e<sup>H</sup> equals the number you chose. Dense points end with a narrow bell, sparse points with a wide one.` },
    { h: `Make it symmetric`, p: `p(j|i) and p(i|j) differ: a point in a sparse region may list a dense-region point as a neighbour, but not the other way round. t-SNE averages the two, P<sub>ij</sub> = (p(j|i) + p(i|j))/2n. Now every point has a total pair weight of at least 1/2n, so even an outlier is pulled into the map.` },
    { h: `The map side`, p: `In 2-D each point gets coordinates. Their similarity is Q<sub>ij</sub> ∝ 1/(1 + distance²). This curve falls slowly (a heavy tail). A cluster of 30 points needs room, and the heavy tail lets far clusters sit well apart without pushing the near ones together.` },
    { h: `Fit by KL`, p: `Move the points downhill on KL(P‖Q). Two neighbours (big P) drawn far apart (small Q) cost a lot. Two non-neighbours (tiny P) drawn close cost little. So t-SNE guards neighbourhoods well and says little about where far clusters sit, which is the point of the <i>seeds</i> lesson.` },
    { h: `Why KL cannot choose the perplexity`, p: `Each perplexity makes a different P, so each run is graded against a different target. KL usually falls as perplexity grows because a smoother target is easier to match, yet the map is not better. Use a yardstick that does not depend on P: trustworthiness, neighbour purity, and your eyes on several settings.` }],
  example: {
    title: `one point's neighbourhood, with σ found by hand`,
    setup: `A point i has four neighbours at distances <b>1, 2, 4 and 8</b>. You want perplexity 3, "about three neighbours count". Which σ does that need? Weight of a neighbour at distance d is exp(−d²/(2σ²)).`,
    table: { head: [`σ`, `Weights for d = 1, 2, 4, 8`, `p(j|i)`, `Perplexity e<sup>H</sup>`], rows: [
      [`1`, `0.607, 0.135, 0.000, 0.000`, `0.817, 0.182, 0.000, 0.000`, `1.61 (too narrow)`],
      [`2`, `0.883, 0.607, 0.135, 0.000`, `0.543, 0.373, 0.083, 0.000`, `2.48`],
      [`3`, `0.946, 0.801, 0.411, 0.029`, `0.433, 0.366, 0.188, 0.013`, `3.01 (on target)`],
      [`4`, `0.969, 0.883, 0.607, 0.135`, `0.374, 0.340, 0.234, 0.052`, `3.42 (too wide)`]] },
    walk: [
      `Start with σ = 1. Weights: exp(−1/2) = 0.607, exp(−4/2) = 0.135, exp(−16/2) = 0.0003, and about 0 for d = 8. They add to 0.742, so p = (0.817, 0.182, 0.000, 0.000). Almost everything sits on the nearest neighbour, and e<sup>H</sup> = 1.61. Too small: widen the bell.`,
      `Try σ = 4. Weights exp(−d²/32): 0.969, 0.883, 0.607, 0.135. Sum 2.594, so p = (0.374, 0.340, 0.234, 0.052), e<sup>H</sup> = 3.42. Too big. The most you can get from four neighbours is 4 (all weights equal), so 3.42 is already wide.`,
      `The right σ lies between 1 and 4. Halve the bracket: σ = 2.5 gives 2.77 (too small), σ = 3.25 gives 3.12 (too big), σ = 3 gives 3.008. This is the binary search the code runs, per point, until the entropy matches to 5 decimals.`,
      `Check σ = 3 by hand. Weights exp(−d²/18): 0.946, 0.801, 0.411, 0.029. Sum 2.186, so p = (0.433, 0.366, 0.188, 0.013).`,
      `Entropy H = −Σ p ln p = 0.433·0.838 + 0.366·1.004 + 0.188·1.671 + 0.013·4.338 = 0.363 + 0.368 + 0.314 + 0.057 = 1.10.`,
      `Perplexity = e<sup>1.10</sup> = 3.0. Done: σ ≈ 3 for this point. Stretch all four distances by 4 (a looser region) and the same recipe returns σ = 12 and the same p. Only the ratio d/σ matters.`],
    result: `σ = 3 gives perplexity 3.01: the nearest neighbour carries 43% of the weight, the farthest 1.3%. In the simulation at perplexity 30 a typical point of the tight blob has σ ≈ 0.24, of the medium blob 0.72 and of the loose blob 1.43, yet each one reads "Perplexity achieved 30".` },
  read: [
    [`Left plot: blue dots`, `140 points in three blobs of different spread (60 tight, 45 medium, 35 loose). Click a dot to choose the point whose neighbourhood you want to see (drawn as a star).`],
    [`Dot size and fading`, `Size and opacity show the weight of each dot in the chosen point's neighbourhood. A big solid dot is a heavy neighbour, a tiny faint dot barely counts.`],
    [`Solid ring and dashed ring`, `The distance σ and 2σ from the chosen point. The label above the star prints σ.`],
    [`Readout: Gaussian width σ`, `The σ found for the chosen point at the current perplexity.`],
    [`Readout: Perplexity achieved`, `e<sup>H</sup> of the weights the search ended with. It should equal the target in brackets. The left panel stops at (140 − 1)/3 = 46, so for slider values above 46 it reads "target 46".`],
    [`Readout: Points with ≥ 10% of the top weight`, `A head-count of dots that matter at least a tenth as much as the heaviest one. A rough, visible stand-in for perplexity.`],
    [`Right plot: t-SNE map of the digits`, `300 digit images (30 per class, 64 pixels each), written as their digit and coloured by class. Hover shows the class. The slider drives both plots.`],
    [`Readouts: KL divergence, Trustworthiness, Neighbour purity`, `Filled in when the run finishes (the bar shows progress). KL depends on the perplexity chosen. The other two are comparable across settings.`],
    [`Table: Runs so far`, `One row per perplexity you have run, sorted, newest run replacing an older one at the same perplexity. <i>Clear table</i> empties it.`]],
  experiments: [
    { do: `Leave perplexity at 30. Click a dot in the left (tight) blob, read σ, then click a dot in the right (loose) blob.`, see: `σ is about 0.25 for the tight blob and about 1.4 for the loose one (the medium blob gives about 0.7). Both read "Perplexity achieved 30.0 (target 30)", and 26 to 31 dots pass the 10% test in each case.`, why: `The search widens the bell where points are far apart and narrows it where they are close, so every point ends with the same effective neighbour count. σ absorbs the difference in density.` },
    { do: `Drag perplexity down to 2 and look at the rings and at "Points with ≥ 10% of the top weight".`, see: `The rings shrink to about the distance of the nearest neighbour (σ ≈ 0.05 for a tight-blob point, 0.3 for a loose-blob point) and only about 2 dots stay visible.`, why: `Perplexity 2 means "two neighbours count". Each point pairs up with its nearest one or two, so the graph is nearly a set of tiny pairs.` },
    { do: `Drag perplexity up to 80 and watch the left readout.`, see: `The left panel stops changing at 46 and the readout says "target 46" (a note on the page explains the limit). The digits map on the right does change.`, why: `The left set has 140 points and the page caps perplexity at (n − 1)/3. The digits set has 300 points, so its cap is about 99.` },
    { do: `Run the digits at perplexity 2, 5, 15, 30 and 80 (wait for each run to finish) and compare the table.`, see: `KL falls from about 0.45 at perplexity 2 to between 0.30 and 0.34 at 80. It usually falls step by step, but a single step can tick up (15 to 30 did in one of our runs), because t-SNE is chaotic. Trustworthiness is 0.94 at perplexity 2 and 0.97 to 0.98 from 5 on. Neighbour purity peaks at 5 to 15 (0.92 to 0.94) and falls to 0.87 or 0.88 at 80.`, why: `KL is graded against a different P at every perplexity. Purity shows the real trade-off: a large perplexity starts to merge neighbouring digits.` },
    { do: `Compare the digit map at perplexity 2 with perplexity 15.`, see: `At 2 each digit breaks into many tiny clumps. At 15 most digits are one clump, with a few still split in two.`, why: `This is the answer to the quiz: when t-SNE splits one real cluster into fragments, <b>raise</b> the perplexity so the fragments see each other and rejoin.` }],
  remember: [
    { tag: `Picture`, text: `Perplexity is the number of <b>friends who count</b>. σ is how far you must look to find them: short in a hostel, long in a village.` },
    { tag: `Formula in words`, text: `Perplexity = e<sup>entropy of the weights</sup>. If the weight is shared equally among k points, it is exactly k. That is why it reads as a neighbour count.` },
    { tag: `Rule of thumb`, text: `Pick a perplexity below the size of the smallest group you care about and well below n. Typical range 5 to 50. Run three values and trust only what survives all three.` },
    { tag: `Sanity check`, text: `After the search, "Perplexity achieved" must equal the target. If it does not, the value was capped or the search failed, and the map answers a different question than you asked.` },
    { tag: `Rule of thumb`, text: `Never rank settings by KL. Compare trustworthiness and purity, and look at the maps.` },
    { tag: `Link to code`, text: `<code>TSNE(perplexity=30)</code> sets the target. After <code>fit_transform</code>, <code>tsne.kl_divergence_</code> holds the final KL.` }],
  mistakes: [
    { wrong: `"Perplexity is the number of neighbours, like k in k-NN."`, right: `It is a soft, effective count. Every point gets some weight; far ones get almost none. 30 means "about 30 points matter".` },
    { wrong: `"σ is one number for the whole dataset."`, right: `σ is found separately for every point. In the simulation it ranges from 0.24 to 1.43 at the same perplexity because density differs.` },
    { wrong: `"The run with the lowest KL is the best map."`, right: `KL fell from about 0.45 at perplexity 2 to about 0.3 at 80, while purity dropped from 0.93 (at 5) to 0.88. Different perplexities give different targets, so their KL values cannot be compared.` },
    { wrong: `"Perplexity 30 is the right setting."`, right: `30 is only the default. A group smaller than the perplexity gets blended into its surroundings, and a perplexity of 2 shatters real groups.` }],
  code: [
    {
      title: `Perplexity of one point, from its distances`,
      py: `import numpy as np

d = np.array([1.0, 2.0, 4.0, 8.0])            # distances from point i to its four neighbours

def perplexity(sigma):
    w = np.exp(-d**2 / (2 * sigma**2))         # Gaussian weight of each neighbour
    p = w / w.sum()                            # conditional probabilities p(j|i): they add to 1
    H = -(p * np.log(p)).sum()                 # entropy of that distribution, in nats
    return np.exp(H), p                        # perplexity = e^H = "effective number of neighbours"

for s in (1, 2, 3, 4):
    print("sigma", s, "-> perplexity", round(perplexity(s)[0], 2))
print("p at sigma 3:", np.round(perplexity(3)[1], 3))`,
      out: `sigma 1 -> perplexity 1.61
sigma 2 -> perplexity 2.48
sigma 3 -> perplexity 3.01
sigma 4 -> perplexity 3.42
p at sigma 3: [0.433 0.366 0.188 0.013]`,
      walk: [
        [`np.exp(-d**2 / (2 * sigma**2))`, `The bell-curve weight. <code>d**2</code> squares every distance at once (numpy works on whole arrays), and the division is also elementwise. Result: one weight per neighbour.`],
        [`p = w / w.sum()`, `Divide by the total so the numbers behave like probabilities. <code>w.sum()</code> adds the four weights.`],
        [`H = -(p * np.log(p)).sum()`, `Entropy in nats (natural log). It is large when p is spread out and small when one neighbour takes everything. The minus sign makes it positive because log p is negative.`],
        [`return np.exp(H), p`, `Perplexity is e<sup>H</sup>. A function may return two values; the caller picks one with <code>[0]</code> or <code>[1]</code>.`],
        [`for s in (1, 2, 3, 4)`, `Try four widths. Perplexity rises with σ, from 1 towards the number of neighbours (4). t-SNE does the opposite: given a target perplexity it searches for σ.`]],
      tip: `Check the code against the table above: σ = 3 must give 3.01. If it does not, you have a typo in the formula.`
    },
    {
      title: `KL changes with perplexity, trustworthiness hardly does`,
      py: `from sklearn.datasets import load_digits
from sklearn.manifold import TSNE, trustworthiness

X, y = load_digits(return_X_y=True)
X = X[:300]                                    # 300 images, 64 pixel features each

res = {}
for perp in (5, 30):
    tsne = TSNE(perplexity=perp, init="pca", random_state=0)
    E = tsne.fit_transform(X)                  # E has shape (300, 2)
    res[perp] = (tsne.kl_divergence_, trustworthiness(X, E, n_neighbors=10))

print("KL fell from perplexity 5 to 30:", res[30][0] < res[5][0])
print("trust moved by less than 0.02:", abs(res[30][1] - res[5][1]) < 0.02)`,
      out: `KL fell from perplexity 5 to 30: True
trust moved by less than 0.02: True`,
      walk: [
        [`load_digits(return_X_y=True)`, `Loads 1,797 handwritten digits as <code>X</code> (pixels, 64 columns) and <code>y</code> (the digit). <code>return_X_y=True</code> gives the two arrays directly instead of a bundle.`],
        [`X[:300]`, `Keep the first 300 rows to keep t-SNE quick. The colon-slice takes rows 0 to 299.`],
        [`TSNE(perplexity=perp, init="pca", random_state=0)`, `Build the model. <code>perplexity</code> is the target from this lesson. <code>init="pca"</code> and <code>random_state</code> make the run repeatable.`],
        [`tsne.kl_divergence_`, `The final KL, stored after fitting (trailing underscore: a learned value). It is graded against this run's own P.`],
        [`res[perp] = (kl, trust)`, `A dictionary keyed by perplexity, each value a pair. Later <code>res[30][0]</code> is the KL at perplexity 30.`],
        [`abs(a - b) < 0.02`, `True when the two trust scores are within 0.02. We print True/False because the exact values differ a little between scikit-learn versions.`]],
      tip: `The first print says KL changed a lot, the second says the map's local quality hardly did. That gap is the reason not to use KL to pick perplexity.`
    }],
  check: [
    { q: `Which description of perplexity is correct?`, options: [`The effective number of neighbours of a point, reached by choosing σ separately for every point`, `The number of iterations t-SNE runs`, `The largest distance at which two points still count as neighbours`, `The learning rate of the optimiser`], answer: 0, why: `Perplexity = e<sup>H</sup> of a point's neighbour weights. The search tunes each point's σ until this equals the number you set, which is why dense and sparse regions get different σ.` },
    { q: `A point has four neighbours with weights 0.25, 0.25, 0.25 and 0.25. What is its perplexity?`, options: [`4`, `2`, `1`, `0.25`], answer: 0, why: `H = −4 × 0.25 × ln 0.25 = ln 4, so e<sup>H</sup> = 4. Equal weights on k neighbours always give perplexity k.` },
    { q: `You run t-SNE on the digits at perplexity 5 (KL 0.42) and at perplexity 50 (KL 0.35). A friend says "50 is better, its KL is lower." What is the problem with that argument?`, options: [`Each perplexity defines a different target P, so the two KL values cannot be compared`, `KL can never be lower at a higher perplexity`, `KL is only valid below perplexity 30`, `Nothing, lower KL is always better`], answer: 0, why: `KL measures the match to P, and P changes with perplexity. Compare maps with something independent of P, such as trustworthiness or neighbour purity. Purity here was higher at perplexity 5 than at 50.` }],
  teachback: { prompt: `In two sentences, explain to a friend what perplexity does in t-SNE and why you cannot choose it by looking at KL.`, model: `Perplexity tells t-SNE how many neighbours should matter to each point: it widens or narrows every point's bell curve until its weights are spread over about that many points, so dense and sparse regions get the same effective neighbourhood size. KL measures the match to a target that itself depends on the perplexity, so values from different perplexities are not comparable and you must judge maps with trustworthiness, purity and your eyes.` },
  cheat: `t-SNE gives each point a Gaussian over its neighbours and tunes the width σ per point until the perplexity e<sup>H</sup> equals the setting, i.e. about that many neighbours count. The map copies these weights (symmetrised, with a Student-t in 2-D) by minimising KL. KL depends on the perplexity, so compare settings with trustworthiness and purity. Too low fragments clusters, too high merges them.`
};
