// Lesson for embeddings/misreading. Widget numbers come from running assets/ml-embed.js on the page's own data (customers: rng seed 3 and the next seeds; noise: 300 x 50 Gaussian).
module.exports = {
  idea: `A 2-D map shows who is near whom. It does not show how spread out a cluster is or how far apart two clusters are, and with a small neighbourhood it will draw clumps in pure noise. Measure sizes and distances in the original features.`,
  why: `A report that says "segment 2 is the most varied" or "these two groups are far apart" from a t-SNE or UMAP picture can be wrong by a factor of 4 or more. Decisions about which customers to target or merge then rest on how the picture was drawn, not on the data.`,
  analogy: `The Delhi Metro map. Stations are drawn at equal spacing and the lines at tidy angles, though the real gaps differ a lot. The map is correct about the order of stations and where you change trains, and useless for how many kilometres you travel. A t-SNE map is the same kind of drawing: neighbour relations are right, sizes and gaps were redrawn to fit the page.`,
  vocab: [
    [`Spread`, `How loose a group is in the original features: the mean distance from its points to their centre. This is the true size of a cluster.`],
    [`Apparent size`, `How wide the same group looks in the 2-D map.`],
    [`Local scale normalisation`, `Both methods rescale each point's neighbourhood by its own distances (σ in t-SNE, ρ and σ in UMAP). A loose cluster and a tight one then look the same to the method.`],
    [`Distance concentration`, `With many features, nearly all pairs of random points are almost equally far apart. With 50 noise features the typical distance is 10.0 give or take 1.0.`],
    [`Structure from nothing`, `Clumps or strands in a map of data that has no clusters. Made by the method, not found in the data.`],
    [`Null test`, `Run the same method with the same settings on data with the structure destroyed (shuffle each column on its own) to see what pure artefacts look like.`],
    [`Perplexity`, `The effective neighbour count of t-SNE. Small values make each point commit to a very few neighbours.`]],
  steps: [
    { h: `The set-up`, p: `Three customer segments, 10 features. Segment 1: 240 customers, spread 0.5 per feature. Segment 2: 40 customers, spread 2.0, so four times looser. Segment 3: 40 customers, spread 0.5. Truly, Segment 2 is the loose one: its customers are on average 6.3 from their centre, against 1.5 for the others.` },
    { h: `The method only sees neighbour weights`, p: `t-SNE and UMAP first turn distances into weights between neighbours, and the map is built from those weights alone. If two clusters give the same weights, the map cannot tell them apart. So the question is: does stretching a cluster change its weights?` },
    { h: `It does not`, p: `A point's weight on a neighbour is exp(−d²/2σ²), and σ is searched so that the neighbour count stays at the perplexity. Stretch the cluster 4 times and d and σ both grow 4 times, so d/σ and every weight stay the same. UMAP's exp(−(d − ρ)/σ) behaves the same way. Loose and tight clusters produce identical weights.` },
    { h: `So who sets the size on the page?`, p: `The head-count. Each point wants a similar amount of room around it, so 240 points need more space than 40. In the page Segment 1 is drawn about 4 times wider than Segment 2 or 3, in both methods. Give all three segments 40 customers and all three are drawn the same size, even though one is 4 times looser.` },
    { h: `Gaps between clusters are also redrawn`, p: `Far-apart clusters have almost no neighbour weight between them, so the data says very little about the gap. It is set by repulsion and the random start. In the page, t-SNE draws three well-separated segments almost equally far apart (0.91 to 1.16 of the average gap) although the true gaps range from 0.65 to 1.38.` },
    { h: `Noise has neighbours too`, p: `Take 300 points with 50 independent noise features. Every pair is about 10.0 ± 1.0 apart, and the nearest neighbour is at 7.5, only 25% closer than a typical point. Perplexity 2 makes every point commit to its two nearest, however weakly related, and tiny clumps and chains appear. Perplexity 30 or 80 averages over many points and gives a featureless disc.` },
    { h: `What to do instead`, p: `Measure sizes and distances in the original features, using the same recipe as the page's "true" columns. Run a null test: shuffle each column and rerun the same settings, and be suspicious of any clump that also appears there. Change the seed and the perplexity, and keep only what survives.` }],
  example: {
    title: `a loose cluster and a tight one give the same weights`,
    setup: `Tight cluster: a point has four neighbours at distances 1, 2, 4, 8, and perplexity 3 needs σ = 3 (see the perplexity lesson). Loose cluster: the same arrangement stretched 4 times, distances 4, 8, 16, 32. What σ does the search find, and what weights come out?`,
    table: { head: [`Cluster`, `Distances d`, `σ for perplexity 3`, `Weights exp(−d²/2σ²)`, `p(j|i)`], rows: [
      [`Tight`, `1, 2, 4, 8`, `3`, `0.946, 0.801, 0.411, 0.029`, `0.433, 0.366, 0.188, 0.013`],
      [`Loose (4 times)`, `4, 8, 16, 32`, `12`, `0.946, 0.801, 0.411, 0.029`, `0.433, 0.366, 0.188, 0.013`]] },
    walk: [
      `Tight cluster, σ = 3: weights exp(−d²/18) = exp(−0.056), exp(−0.222), exp(−0.889), exp(−3.556) = 0.946, 0.801, 0.411, 0.029. They add to 2.186, so p = 0.433, 0.366, 0.188, 0.013 and perplexity 3.01.`,
      `Loose cluster, try σ = 12: weights exp(−d²/288) = exp(−16/288), exp(−64/288), exp(−256/288), exp(−1024/288) = exp(−0.056), exp(−0.222), exp(−0.889), exp(−3.556). The exponents are the same numbers as before.`,
      `Why: d²/(2σ²) becomes (4d)²/(2·(4σ)²) = 16d²/(16·2σ²), and the 16 cancels. Only the ratio d/σ matters. The search for σ finds 4 times the old value, so the weights, the entropy and the perplexity are unchanged.`,
      `In the widget's own t-SNE code, multiplying a whole 40-point dataset by 4 gives exactly the same table of pair weights P (largest difference 0).`,
      `UMAP's memberships exp(−(d − ρ)/σ) scale in the same way: ρ and σ grow 4 times with d, so the ratio (d − ρ)/σ is unchanged.`,
      `So the map built from these weights has no way to know the second cluster was four times looser. What is left to set its size on the page is how many points it has.`],
    result: `Identical weights, identical map. On the page's default data the spread of each segment relative to the average of the three is: true 0.49, 2.03, 0.48; t-SNE map 2.04, 0.48, 0.48; UMAP map about 1.95, 0.52, 0.54. The map shows nearly the true picture with Segments 1 and 2 swapped: the 240-customer tight segment looks widest and the genuinely loose segment looks tight.` },
  read: [
    [`Segmented control: Show`, `<i>Cluster sizes</i>: the customer experiment. <i>Structure from nothing</i>: the noise experiment. The poll belongs to the first one only.`],
    [`Cards: t-SNE (perplexity 30) and UMAP (n_neighbors 15, min_dist 0.1)`, `The same 320 customers, one marker shape and colour per segment. The legend gives the head-count of each segment.`],
    [`Table: Apparent spread against true spread`, `Spread = mean distance of a customer to its segment centre. The "true" column measures it in the 10 features, the other two in the maps. Each column is divided by its own average over the three segments, so 1.00× is average and each column adds to 3.00×.`],
    [`Table: Distance between segment centres`, `The same comparison for the three gaps between segment centres: true distance in 10-D, then in the t-SNE map and the UMAP map, each relative to its own average.`],
    [`Six cards in Structure from nothing`, `Maps of the same 300 noise points: t-SNE with perplexity 2, 5, 30, 80 and UMAP with n_neighbors 5 and 50. Every dot is noise.`],
    [`Button: New seed`, `Draws new customers or new noise and restarts the runs.`],
    [`Progress bar and Animation control`, `The maps are drawn while they settle. Wait for the bar to finish before reading the tables.`]],
  experiments: [
    { do: `Answer the poll before running anything: which of the three segments will look widest?`, see: `Segment 1, the 240-customer tight one, even though Segment 2 is the loose one.`, why: `The maps give a crowd room in proportion to its head-count and cannot see the spread, as the example shows.` },
    { do: `In <i>Cluster sizes</i> compare the three columns of the first table. Then press <i>New seed</i> five times.`, see: `The true column reads about 0.5, 2.0, 0.5 every time. The t-SNE column reads about 2.05, 0.48, 0.47 and the UMAP column about 2.0, 0.5, 0.5, with a little more wobble (up to 0.05) in each.`, why: `The loose segment is the one the map shrinks. It is drawn as tight as the genuinely tight Segment 3 because the weights are the same.` },
    { do: `Read the second table (distance between segment centres) for the default data, then press <i>New seed</i> a few times.`, see: `True gaps vary from seed to seed (from 0.65 to 1.38 of the average over six seeds). t-SNE stays close to 1.00 each time (0.91 to 1.16), whatever the truth. UMAP moves more (about 0.8 to 1.3) but does not follow the true gaps either.`, why: `The data says little about the gap between far clusters, so the method fills in a tidy layout. Do not read "far" or "near" off a map between clusters.` },
    { do: `Switch <i>Show</i> to <i>Structure from nothing</i>. Compare the t-SNE maps at perplexity 2, 5, 30 and 80, then the two UMAP maps.`, see: `Perplexity 2 shows many small clumps and chains. Perplexity 5 hints at some. Perplexity 30 and 80 are featureless discs. UMAP with n_neighbors 5 shows faint short strands, n_neighbors 50 a disc.`, why: `With 50 noise features the nearest neighbour is only 25% closer than a typical point. A tiny neighbourhood has to commit to these accidental neighbours and draws them as groups. A large neighbourhood averages them out.` },
    { do: `Press <i>New seed</i> three or four times in <i>Structure from nothing</i>.`, see: `The clumps in the perplexity-2 map appear in new places each time, while the perplexity-80 map stays a disc.`, why: `Structure that moves when only the random draw changes was never in the data. A finding must survive a new seed.` }],
  remember: [
    { tag: `Rule of thumb`, text: `<b>The map communicates; the original space measures.</b> Compute spreads and distances from the features, then draw the map to show them.` },
    { tag: `Picture`, text: `A <b>metro map</b>: right about order and connections, wrong about kilometres.` },
    { tag: `Trick`, text: `<b>Null test.</b> Shuffle each column independently (this keeps every feature's distribution but kills the structure), rerun with the same settings and compare. Clumps that appear in both are artefacts.` },
    { tag: `Sanity check`, text: `Divide the typical nearest-neighbour distance by the typical distance. With many features, pure noise gives about 0.76 (50 features), the digits about 0.37 and well-separated tight clusters 0.1 or less. A value near 0.76 says "no clusters to find". It is meaningful only with many features.` },
    { tag: `Rule of thumb`, text: `Equal-looking clusters in a map do not mean equal clusters in the data. Head-count shows up as size, loose and tight look the same.` },
    { tag: `Link to code`, text: `True spread of cluster k: <code>np.linalg.norm(X[y==k] - X[y==k].mean(0), axis=1).mean()</code>, computed on X, never on the map.` }],
  mistakes: [
    { wrong: `"The widest cluster on the map is the most spread out group."`, right: `On this page the 240-customer tight segment is drawn widest and the genuinely loose segment narrowest. Apparent size follows head-count.` },
    { wrong: `"Two clusters far apart on the map are more different than two close ones."`, right: `Gaps between far clusters are redrawn. Over six seeds t-SNE drew the three gaps almost equal while the true gaps ranged from 0.65 to 1.38 times the average.` },
    { wrong: `"UMAP keeps global structure, so I can read sizes off a UMAP map."`, right: `UMAP also rescales every neighbourhood by its own distances. Its spread column reads about 1.95, 0.52, 0.54 against the true 0.49, 2.03, 0.48: no better than t-SNE.` },
    { wrong: `"The algorithm found these clumps, so they must be real."`, right: `At perplexity 2 it also finds them in 300 points of pure noise, in a different place each time. Run a null test and change the seed.` }],
  code: [
    {
      title: `Stretching a cluster does not change the weights`,
      py: `import numpy as np

def p_row(d, sigma):                           # conditional probabilities of one point, as in t-SNE
    w = np.exp(-d**2 / (2 * sigma**2))
    return w / w.sum()

tight = np.array([1.0, 2.0, 4.0, 8.0])         # distances to four neighbours in a tight cluster
loose = 4 * tight                              # the same cluster stretched 4 times: a loose cluster
print(np.round(p_row(tight, 3), 3))
print(np.round(p_row(loose, 12), 3))           # the perplexity search finds a sigma 4 times larger
print("identical:", np.allclose(p_row(tight, 3), p_row(loose, 12)))`,
      out: `[0.433 0.366 0.188 0.013]
[0.433 0.366 0.188 0.013]
identical: True`,
      walk: [
        [`def p_row(d, sigma)`, `One point's neighbour probabilities from its distances <code>d</code> and bell width <code>sigma</code>. The same formula as in the perplexity lesson.`],
        [`loose = 4 * tight`, `Multiplying a numpy array by 4 multiplies every entry, so every distance is 4 times larger.`],
        [`p_row(loose, 12)`, `σ is 4 times larger too, which is what the perplexity search would pick. We pass it directly to keep the code short.`],
        [`np.allclose(a, b)`, `True when two arrays agree up to tiny rounding errors. Use it instead of <code>==</code> for decimals.`]],
      tip: `If you ever want a method to respond to cluster size, it must use distances without dividing by a local scale. t-SNE and UMAP do not.`
    },
    {
      title: `Equal head-count: the loose cluster is drawn as tight as the others`,
      py: `import numpy as np
from sklearn.manifold import TSNE

def blobs(sizes, stds):                        # three segments in 10 features, centres far apart
    rng = np.random.RandomState(0)
    y = np.repeat([0, 1, 2], sizes)
    return rng.uniform(-12, 12, (3, 10))[y] + rng.randn(len(y), 10) * np.array(stds)[y][:, None], y
def relative_spread(E, y):                     # mean distance to own centre, divided by the average of the three
    s = [np.linalg.norm(E[y == k] - E[y == k].mean(0), axis=1).mean() for k in range(3)]
    return np.round(np.array(s) / np.mean(s), 1)
for sizes in ([40, 40, 40], [240, 40, 40]):
    X, y = blobs(sizes, [0.5, 2.0, 0.5])
    print(sizes, "true", relative_spread(X, y), "map", relative_spread(TSNE(random_state=0).fit_transform(X), y))`,
      out: `[40, 40, 40] true [0.5 2.  0.5] map [1. 1. 1.]
[240, 40, 40] true [0.5 2.  0.5] map [2.1 0.5 0.5]`,
      walk: [
        [`np.repeat([0, 1, 2], sizes)`, `The label of every customer: <code>sizes</code> says how many copies of 0, 1 and 2. With <code>[240, 40, 40]</code> you get 240 zeros, then 40 ones, then 40 twos.`],
        [`rng.uniform(-12, 12, (3, 10))[y]`, `Three random centres in 10 features. Indexing with <code>[y]</code> gives each customer the centre of its own segment: a 320 by 10 array.`],
        [`rng.randn(len(y), 10) * np.array(stds)[y][:, None]`, `Gaussian noise for every customer, scaled by its segment's spread. <code>[:, None]</code> turns the spreads into a column so they multiply row by row.`],
        [`np.linalg.norm(E[y == k] - E[y == k].mean(0), axis=1).mean()`, `For segment k: subtract its centre from each of its rows, take each row's length (<code>axis=1</code>), then average. That is the spread.`],
        [`s / np.mean(s)`, `Divide by the average of the three so that 1.0 means "average". The map and the original space use different units, so only relative values can be compared.`]],
      tip: `The left output shows the cleanest form of the effect: the loose segment is truly 4 times wider, and the map draws all three the same.`
    },
    {
      title: `A quick check for "is there anything to find?"`,
      py: `import numpy as np
from scipy.spatial.distance import pdist, squareform

def nn_ratio(X):                               # typical nearest-neighbour distance / typical distance
    D = squareform(pdist(X))
    np.fill_diagonal(D, np.inf)
    return round(float(np.median(D.min(axis=1)) / pdist(X).mean()), 2)

rng = np.random.RandomState(0)
noise = rng.randn(300, 50)                                  # 50 independent noise features
centres = rng.uniform(-12, 12, (3, 50))
clusters = centres[rng.randint(0, 3, 300)] + 0.5 * rng.randn(300, 50)    # three tight clusters
print("noise:", nn_ratio(noise), " clusters:", nn_ratio(clusters))`,
      out: `noise: 0.76  clusters: 0.08`,
      walk: [
        [`pdist(X)`, `All pairwise distances as one flat list (300 points give 44,850 pairs). <code>squareform</code> turns that list into a 300 by 300 table.`],
        [`np.fill_diagonal(D, np.inf)`, `Every point is at distance 0 from itself. Setting the diagonal to infinity stops a point counting as its own nearest neighbour.`],
        [`D.min(axis=1)`, `For each row, the smallest entry: that point's nearest-neighbour distance. <code>np.median</code> of these is the typical one.`],
        [`rng.randint(0, 3, 300)`, `A random choice of cluster (0, 1 or 2) for each of 300 points. Indexing <code>centres[...]</code> with it gives each point its cluster's centre.`],
        [`nn_ratio(noise)`, `0.76: the nearest neighbour is nearly as far as a typical point, so nothing is "close". 0.08 for clusters.`]],
      tip: `This number is meaningful only when there are many features. In 2-D, any random cloud gives a small ratio.`
    }],
  check: [
    { q: `A t-SNE map shows one segment about twice as wide as another. What can you conclude about their spread in the original features?`, options: [`Nothing. The wider one may just have more points, and a loose and a tight cluster can look the same. Measure the spread in the features.`, `The wider segment is twice as spread out`, `The wider segment is about half as spread out`, `The two segments must have the same number of points`], answer: 0, why: `Apparent size follows head-count and the method divides out each neighbourhood's own scale. On the page the 240-customer tight segment looks about 4 times wider than the loose one.` },
    { q: `A cluster's distances to four neighbours are 1, 2, 4, 8 and the search found σ = 3. A looser cluster has distances 2, 4, 8, 16. Which σ gives the same weights?`, options: [`6`, `3`, `1.5`, `12`], answer: 0, why: `Weights depend only on d/σ. The distances are doubled, so σ doubles: 6. (The page's loose segment is 4 times looser, which would need σ = 12.)` },
    { q: `You press <i>New seed</i> in <i>Structure from nothing</i>. What do you expect from the perplexity-2 map?`, options: [`Small clumps and chains again, but in different places`, `The same clumps in the same places`, `A featureless disc`, `A clear picture of 3 clusters`], answer: 0, why: `The clumps come from each point committing to its two nearest of 299 almost-equally-far points, which are different for different random draws. Structure that moves with the seed is not in the data.` }],
  teachback: { prompt: `In two sentences, explain to a friend why a t-SNE or UMAP map cannot tell you how spread out a cluster is, and what you should do instead.`, model: `The methods rescale every point's neighbourhood by its own distances, so a loose cluster and a tight one give the same neighbour weights and the map has only the number of points left to set a cluster's size. To judge spread or distance I should compute them from the original features and use the map only to show who is near whom.` },
  cheat: `Maps are built from neighbour weights that are divided by each point's local scale, so loose and tight clusters look alike and apparent size follows head-count (240 against 40 customers looked 4 times wider). Gaps between far clusters are redrawn too. Small perplexity makes clumps in pure noise. Measure size and distance in the features; run a null test and several seeds.`
};
