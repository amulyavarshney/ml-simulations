// Lesson for embeddings/umap-settings. Widget numbers come from running assets/ml-embed.js on the page's own data (digits: 40 per class, subset seed 8, UMAP seed 2, 300 epochs).
module.exports = {
  idea: `UMAP first joins every point to its nearest neighbours with a strength between 0 and 1, then arranges the points in 2-D so that joined points stay close. n_neighbors decides who is joined. min_dist decides how tightly the map may pack points.`,
  why: `The two settings answer different questions. n_neighbors decides what UMAP believes about your data: how local the structure is. min_dist decides only how the picture looks. Mix them up and you tune the drawing when you meant to change the structure, or the other way round.`,
  analogy: `Each student in a class lists their closest friends. The number on the list is n_neighbors, and a friend who also lists you makes a stronger tie. Now you draw this network on a poster. min_dist is how close two dots may be drawn: nearly touching, or politely spaced. Changing the spacing on the poster never changes who is friends with whom.`,
  vocab: [
    [`n_neighbors`, `How many nearest points (counting the point itself) define a point's neighbourhood. 15 means the point plus 14 others.`],
    [`Membership`, `A number from 0 to 1 on a link: how strongly a point is tied to a neighbour. The nearest neighbour always gets 1, farther ones fade.`],
    [`ρ (rho)`, `The distance to a point's nearest neighbour. UMAP subtracts it, so every point has at least one full-strength tie and nobody is isolated.`],
    [`σ (sigma)`, `A per-point scale found by search so that the memberships of that point add up to log₂(n_neighbors).`],
    [`Fuzzy union`, `Merging the two directions of a link, a (i about j) and b (j about i), into one weight w = a + b − ab.`],
    [`Neighbour graph`, `Points are nodes and the memberships are weighted links. n_neighbors alone decides it. UMAP then lays this graph out in 2-D.`],
    [`min_dist`, `The distance in the map below which two points are treated as already close, so they stop attracting each other. 0 allows tight clumps, large values spread points out.`],
    [`a, b`, `Two numbers fitted from min_dist so that the smooth curve 1/(1 + a·d<sup>2b</sup>) follows the target similarity (1 up to min_dist, then falling away).`]],
  steps: [
    { h: `Neighbours of one point`, p: `For point i, find the n_neighbors nearest points. The first is i itself at distance 0. With n_neighbors = 5 that leaves four real neighbours, at distances d₁ ≤ d₂ ≤ d₃ ≤ d₄. This is the only place n_neighbors is used.` },
    { h: `Fuzzy strengths`, p: `Subtract ρ = d₁ so the nearest neighbour gets strength 1. The others get exp(−(d − ρ)/σ). Search σ for this point until the strengths add up to log₂(n_neighbors). As in t-SNE, this equalises dense and sparse regions: a point in a sparse region just gets a wider σ.` },
    { h: `Merge the two directions`, p: `i may list j as a neighbour with strength a, while j lists i with strength b. UMAP combines them as w = a + b − ab. This is "at least one of the two ties holds". It is at least max(a, b), and exactly 1 if either is 1.` },
    { h: `The graph is finished before the map exists`, p: `Everything so far depends only on the original data and n_neighbors. The 400 digits at n_neighbors = 15 give 3,592 links, about 18 per point, however you set min_dist. Links weaker than 1/300 of the strongest are dropped.` },
    { h: `A target curve in the map`, p: `In the map, two points closer than min_dist should have similarity 1, and beyond that the similarity should fall as exp(−(d − min_dist)). That curve has a kink, so UMAP fits the smooth 1/(1 + a·d<sup>2b</sup>) to it. min_dist 0.1 gives a = 1.58, b = 0.90. min_dist 0.9 gives a = 0.16, b = 1.80.` },
    { h: `Pull and push`, p: `Start from a rough layout of the graph (the spectral start). Then for 300 rounds: each link pulls its two ends together, strong links more often; and for each pull, five random points are pushed away. The step size falls from 1 to 0 over the run, so the picture freezes at the end.` },
    { h: `What n_neighbors changes`, p: `Small: only the closest ties, so fine detail but fragile. With n_neighbors = 2 each point is tied only to its nearest neighbour, the graph shatters into about 97 islands and the map is dust. Large: many weak ties across class boundaries, so groups blur together and sit closer.` },
    { h: `What min_dist changes`, p: `Nothing in the graph. It changes only the pull and push in the last step. At 0 points are free to pile up into tight clumps, useful when the map feeds a clustering step. At 0.9 they must keep apart, which shows structure inside a group and makes a better picture.` }],
  example: {
    title: `strengths of one point's links, found by hand`,
    setup: `A point P has n_neighbors = 5, so four neighbours besides itself, at distances <b>1.0, 1.2, 1.5 and 2.5</b>. The target is that its strengths add up to log₂ 5 = 2.32.`,
    table: { head: [`Neighbour`, `Distance d`, `d − ρ (ρ = 1.0)`, `Strength exp(−(d − ρ)/0.67)`], rows: [
      [`1st`, `1.0`, `0.0`, `1.00`],
      [`2nd`, `1.2`, `0.2`, `0.74`],
      [`3rd`, `1.5`, `0.5`, `0.47`],
      [`4th`, `2.5`, `1.5`, `0.11`]] },
    walk: [
      `ρ is the nearest distance, 1.0. Subtract it: d − ρ = 0, 0.2, 0.5, 1.5. The first strength is exp(0) = 1 whatever σ is.`,
      `Try σ = 0.5: strengths 1, exp(−0.4) = 0.67, exp(−1.0) = 0.37, exp(−3.0) = 0.05. They add up to 2.09. Too small, so widen σ.`,
      `Try σ = 1.0: 1, 0.82, 0.61, 0.22. Sum 2.65. Too big.`,
      `Try σ = 0.7: 1, 0.75, 0.49, 0.12. Sum 2.36, a little high. At σ = 0.67 the sum is 2.32, the target. (UMAP finds this by halving a bracket, as t-SNE does.)`,
      `Strengths at σ = 0.67: <b>1.00, 0.74, 0.47, 0.11</b>. The farthest neighbour is tied at only 11% strength.`,
      `Now merge directions. Say P's 3rd neighbour Q gives P a strength of 0.30 in its own list. Then w = 0.47 + 0.30 − 0.47 × 0.30 = 0.47 + 0.30 − 0.14 = <b>0.63</b>, stronger than either direction alone.`],
    result: `Four links from P with strengths 1.00, 0.74, 0.47, 0.11 that add up to log₂ 5. In the simulation, links are drawn fainter the weaker they are, so the 0.11 link is nearly invisible and also pulls only about once in nine rounds. With n_neighbors = 15 the same recipe runs over 14 neighbours.` },
  read: [
    [`Dropdown: Dataset`, `Digits (400 images, 10 classes), Swiss roll (400 points, colour is position along the sheet) or Customers (3 segments in 10 features).`],
    [`UMAP map`, `The 2-D result, drawn as digit numbers, colour gradient or markers, depending on the dataset. Hover over a digit to see its class.`],
    [`Checkbox: Show the neighbour graph`, `Draws the links behind the points. Stronger links are darker, weak ones are almost invisible.`],
    [`Curve plot`, `Solid line: the smooth curve 1/(1 + a·dist<sup>2b</sup>) that UMAP uses. Dashed line: the target it approximates, 1 until min_dist, then exp(−(dist − min_dist)). The dotted vertical line marks min_dist.`],
    [`Readout: Curve parameters a, b`, `The two fitted numbers. They depend on min_dist only.`],
    [`Readout: Edges in the graph`, `Number of links, and links per point. This depends on n_neighbors only.`],
    [`Readouts: Trustworthiness and Neighbour purity`, `Quality of the finished map. Purity is the share of a point's 10 nearest map neighbours with the same class (digit or segment). It reads n/a for the Swiss roll, which has no classes.`],
    [`Readout: Edges between different classes (share of edges · share of strength)`, `Two shares for links joining points of different classes (digits or segments): first the share of all edges by number, with the count, then the share of the total edge strength. n/a for the Swiss roll.`],
    [`Readout: Fit time`, `Includes the animation, so it is not a speed benchmark.`]],
  experiments: [
    { do: `Choose Digits and n_neighbors 15. Set <i>min_dist</i> to 0, note the readouts, then set it to 0.9.`, see: `Curve parameters go from 1.933, 0.790 to 0.165, 1.803. <i>Edges in the graph</i> stays 3592 (18.0 per point), and trustworthiness stays at about 0.975 in both. The map changes from tight dots to spread-out blobs: a point's nearest other point is about 5 times closer, relative to the map width, at min_dist 0 than at 0.9.`, why: `min_dist enters only in the layout step. For a clustering step later, use 0, so groups become dense and separate. For a picture people will read, use a larger value so dots do not pile up.` },
    { do: `Set <i>n_neighbors</i> to 3, note the readouts and the map, then set it to 60.`, see: `At 3: 580 links (2.9 per point), 4.7% of them by number and 4.3% by strength between different digits, trustworthiness about 0.96, and many small clumps (each digit in several pieces). At 60: 14,247 links (71 per point), 59.7% by number and 27.6% by strength between different digits, trustworthiness about 0.97, bigger groups that sit closer together and partly overlap. Purity is about 0.88 to 0.89 in both, so it hardly differs.`, why: `More neighbours means longer, weaker links that cross class boundaries. UMAP sees a broader picture and loses fine detail. Neither trustworthiness nor purity tells you which is right. They stay within 0.96 to 0.98 from 3 to 80.` },
    { do: `Set <i>n_neighbors</i> to 2.`, see: `Edges fall to 303 (1.5 per point), trustworthiness collapses to about 0.7 and the map is a dust of tiny islands.`, why: `With n_neighbors = 2 each point links only to its single nearest neighbour. The graph then breaks into about 97 separate pieces, and the layout step has nothing to hold the pieces in relation to each other.` },
    { do: `Back to n_neighbors 15. Tick <i>Show the neighbour graph</i> and read <i>Edges between different classes</i>.`, see: `22.0% of the edges (791 of 3592) join different digits, but only 12.9% of the total strength, and they are drawn faint.`, why: `Cross-class links are the weak ones, so counting them by number overstates their effect. Counting by strength is the fairer measure.` },
    { do: `Choose the Swiss roll and compare <i>n_neighbors</i> 5 with 40.`, see: `At 5 the roll breaks into about a dozen short strands (trustworthiness about 0.99). At 40 the strands join into one long ribbon (also about 0.99).`, why: `5 neighbours reach only about 2.8 away, too short to tie the pieces together. At 40 the links reach 7.7, past the 6.3 gap between layers. But strength fades with distance: 22% of the links then reach another turn, yet they carry only 5% of the total strength. The strong links stay on the sheet and the extra weaker ones join the strands.` }],
  remember: [
    { tag: `Picture`, text: `<b>Friends list and poster.</b> n_neighbors = how many friends each student lists. min_dist = how close the dots may be drawn on the poster.` },
    { tag: `Rule of thumb`, text: `<b>n_neighbors is what you believe about the data. min_dist is how you draw it.</b> If the graph readouts (edges, cross-class share) did not move, you changed only the drawing.` },
    { tag: `Rule of thumb`, text: `Start at n_neighbors = 15 and min_dist = 0.1. Try 5 and 50 and keep what both show. For a clustering step use min_dist 0, for a picture 0.5 or more.` },
    { tag: `Formula in words`, text: `Nearest neighbour = strength 1. Others = exp(−(extra distance)/σ). Two directions merge as a + b − ab.` },
    { tag: `Sanity check`, text: `Links per point should be about n_neighbors to 1.2 times n_neighbors. If it is far below, or trustworthiness collapses (about 0.7 at n_neighbors = 2), the graph has shattered. Raise n_neighbors.` },
    { tag: `Link to code`, text: `<code>UMAP(n_neighbors=15, min_dist=0.1, random_state=0)</code>. After <code>fit</code>, <code>.graph_</code> holds the links and <code>.embedding_</code> the map.` }],
  mistakes: [
    { wrong: `"min_dist changes which points count as neighbours."`, right: `The graph is identical for min_dist 0 and 0.9 (same 3592 links). It changes only how tightly the layout packs points.` },
    { wrong: `"A bigger n_neighbors is always safer."`, right: `At 60 neighbours 59.7% of the links by number, and 27.6% by strength, join different digits (4.7% and 4.3% at 3 neighbours). Groups blur and sit closer. Bigger gives a broader view, not a better one.` },
    { wrong: `"Pick the n_neighbors with the highest trustworthiness."`, right: `For the digits it sits at 0.96 to 0.98 for every value from 3 to 80, so it cannot choose. Decide from what you need: fine detail or the big picture.` },
    { wrong: `"The distance between dots in the map is the similarity UMAP found."`, right: `Only the neighbour relations are used. How tightly points are packed was set by min_dist, not by the data.` }],
  code: [
    {
      title: `Strengths of one point's links`,
      py: `import numpy as np
from scipy.optimize import brentq

d = np.array([1.0, 1.2, 1.5, 2.5])            # distances to the 4 neighbours (n_neighbors = 5 counts the point itself)
rho = d.min()                                  # nearest neighbour is always fully connected: strength 1
target = np.log2(5)                            # strengths must add up to log2(n_neighbors) = 2.32
member = lambda s: np.exp(-(d - rho) / s)      # strength of each neighbour for a given sigma
sigma = brentq(lambda s: member(s).sum() - target, 0.01, 100)    # find the sigma that hits the target
print("rho", rho, " sigma", round(sigma, 2))
print("memberships", np.round(member(sigma), 2), " sum", round(member(sigma).sum(), 2))
a, b = member(sigma)[2], 0.30                  # P's view of Q is 0.47; Q's view of P is 0.30
print("edge weight a + b - ab =", round(a + b - a * b, 2))`,
      out: `rho 1.0  sigma 0.67
memberships [1.   0.74 0.47 0.11]  sum 2.32
edge weight a + b - ab = 0.63`,
      walk: [
        [`rho = d.min()`, `The smallest distance, 1.0. Every strength uses <code>d - rho</code>, so the nearest neighbour gets exp(0) = 1.`],
        [`np.log2(5)`, `The target total, 2.32. Using log₂ of n_neighbors makes the total grow slowly with the neighbourhood size.`],
        [`member = lambda s: ...`, `A one-line function. Give it a σ and it returns the four strengths. The whole array is computed at once.`],
        [`brentq(f, 0.01, 100)`, `Finds the σ between 0.01 and 100 where <code>f</code> crosses zero, here where the sum of strengths equals the target. It does the halving search for us.`],
        [`member(sigma)[2]`, `Index 2 is the third neighbour (counting from 0): strength 0.47.`],
        [`a + b - a * b`, `The fuzzy union. It equals 1 − (1 − a)(1 − b): the chance that at least one of the two directions holds.`]],
      tip: `The same code with distances 2.0, 2.4, 3.0, 5.0 (everything doubled) gives the same strengths, because σ doubles too.`
    },
    {
      title: `min_dist changes the curve, not the graph`,
      py: `import numpy as np
from umap.umap_ import find_ab_params

dist = np.array([0.2, 1.0, 2.0])               # three distances between two points in the map
for md in (0.1, 0.9):
    a, b = find_ab_params(spread=1.0, min_dist=md)      # fit 1 / (1 + a * d^(2b)) to the target curve
    print("min_dist", md, "-> a =", round(a, 2), "b =", round(b, 2), "similarity:", np.round(1 / (1 + a * dist ** (2 * b)), 2))`,
      out: `min_dist 0.1 -> a = 1.58 b = 0.9 similarity: [0.92 0.39 0.15]
min_dist 0.9 -> a = 0.16 b = 1.8 similarity: [1.   0.86 0.33]`,
      walk: [
        [`from umap.umap_ import find_ab_params`, `The helper UMAP itself uses to turn min_dist into <code>a</code> and <code>b</code>. It is in the package's inner module, hence the doubled name.`],
        [`find_ab_params(spread=1.0, min_dist=md)`, `Fits the smooth curve to the target. <code>spread=1.0</code> is the default width of the fall-off.`],
        [`dist ** (2 * b)`, `Each distance raised to the power 2b, elementwise. This is the d<sup>2b</sup> in the formula.`],
        [`1 / (1 + a * ...)`, `The similarity the layout aims for between two points a given distance apart: near 1 means "attract", near 0 means "free to separate".`]],
      tip: `Read the second row: with min_dist 0.9 points at distance 1.0 still have similarity 0.86, so they are barely pulled together and the map stays spread out.`
    },
    {
      title: `Same graph, tighter packing`,
      py: `import numpy as np, umap
from sklearn.datasets import load_digits
from sklearn.neighbors import NearestNeighbors

X = load_digits().data[:400]
fits = {md: umap.UMAP(n_neighbors=15, min_dist=md, random_state=0).fit(X) for md in (0.0, 0.9)}
print("same neighbour graph:", (fits[0.0].graph_ != fits[0.9].graph_).nnz == 0)

def packing(E):                                # typical gap to the nearest other point, relative to map width
    gap = NearestNeighbors(n_neighbors=2).fit(E).kneighbors(E)[0][:, 1]
    return np.median(gap) / np.ptp(E, axis=0).max()
print("points packed tighter at min_dist 0:", packing(fits[0.0].embedding_) < packing(fits[0.9].embedding_))`,
      out: `same neighbour graph: True
points packed tighter at min_dist 0: True`,
      walk: [
        [`{md: umap.UMAP(...).fit(X) for md in (0.0, 0.9)}`, `A dictionary comprehension: one fitted UMAP per min_dist, stored under that value as its key. Everything else is identical, including <code>random_state</code>.`],
        [`fits[0.0].graph_`, `The neighbour graph as a sparse matrix of link strengths (the trailing underscore marks a result of <code>fit</code>).`],
        [`(g1 != g2).nnz == 0`, `Compare the two sparse matrices. <code>nnz</code> counts the entries that differ. Zero means the graphs are identical.`],
        [`NearestNeighbors(n_neighbors=2)`, `Asks for each point's two nearest points in the map: itself and the nearest other point. Column <code>[:, 1]</code> keeps the distance to the nearest other one.`],
        [`np.ptp(E, axis=0).max()`, `The map's width: <code>ptp</code> is "peak to peak" (max minus min) in each coordinate, and <code>.max()</code> takes the wider one. Dividing by it makes maps of different size comparable.`]],
      tip: `The first line is the point of this lesson: the two maps differ, the graph behind them does not.`
    }],
  check: [
    { q: `Which setting changes the neighbour graph that UMAP builds?`, options: [`n_neighbors only`, `min_dist only`, `Both of them`, `Neither, the graph depends only on the data`], answer: 0, why: `The graph is built from the original data and n_neighbors before any map exists. min_dist enters later, in the layout step, so graphs for min_dist 0 and 0.9 are identical.` },
    { q: `Point P lists neighbour Q with strength 0.47, and Q lists P with strength 0.30. What is the merged link weight a + b − ab?`, options: [`0.63`, `0.77`, `0.14`, `0.38`], answer: 0, why: `0.47 + 0.30 − 0.47 × 0.30 = 0.77 − 0.141 = 0.63. The merged weight is larger than either direction alone.` },
    { q: `You set n_neighbors = 2 on the 400 digits. What do you expect to see?`, options: [`A dust of tiny islands, and trustworthiness collapsing to about 0.7`, `A cleaner map with sharper clusters`, `The same map as for n_neighbors = 15`, `One big blob of all digits`], answer: 0, why: `With 2 neighbours (the point itself and one more) each point links only to its nearest neighbour, so the graph falls into about 97 pieces. The layout cannot place the pieces sensibly and neighbours are wrong (trustworthiness about 0.7).` }],
  teachback: { prompt: `In two sentences, explain to a friend what n_neighbors and min_dist each control in UMAP.`, model: `n_neighbors decides how many nearest points each point is linked to when UMAP builds its neighbour graph, so small values keep fine local detail and large values give a broader, blurrier view. min_dist does not touch the graph at all: it only sets how tightly the layout may pack points, so 0 gives dense clumps and a large value gives a spread-out picture.` },
  cheat: `UMAP builds a graph: each point links to its n_neighbors nearest, nearest = strength 1, others exp(−(d − ρ)/σ) with σ chosen so strengths add to log₂(n_neighbors), two directions merged as a + b − ab. n_neighbors alone sets this graph. min_dist only sets how tightly the layout packs points (curve parameters a and b). Small n_neighbors: detail, fragments. Large: broad, blurred.`
};
