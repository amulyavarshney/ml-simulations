// Lesson for svm-kernels/lift: add a computed coordinate so a straight line can separate what no threshold could.
module.exports = {
  idea: `When no threshold or line splits the classes, add a new coordinate computed from the old one, such as z². In the bigger space a straight line may work, and seen from the original data that line becomes a curved boundary.`,
  why: `Real data is rarely split by one straight cut. Here twelve sensor readings have failing ones at both ends and healthy ones in the middle, so the best single threshold gets only 9 of 12 right (25% wrong). Lifting keeps the margin and support-vector machinery you already know and still lets the boundary bend.`,
  analogy: `A ruler with the good readings near the middle mark and the bad ones near both ends. Any single cut leaves bad readings on both pieces. Now bend the ruler into a U. The ends climb the sides and the middle stays at the bottom, so one flat horizontal cut across the U separates them. Straighten the ruler again and that one cut shows up as two cut marks.`,
  vocab: [
    [`Feature map (lift)`, `A rule φ that turns each input into a longer list of numbers. Here <span class="eq">φ(z) = (z, z²)</span>: one number in, two numbers out.`],
    [`Lifted space`, `The plane of the new coordinates. The SVM draws its straight line here, not on the original number line.`],
    [`Separable`, `Some straight cut (a threshold on a line, a line in a plane) puts every point of one class on one side and every point of the other class on the other.`],
    [`Threshold`, `One cut point on the number line. Readings above it get one class, readings below it get the other.`],
    [`Parabola`, `The U-shaped curve <span class="eq">y = x²</span>. Every lifted point (z, z²) lies exactly on it.`],
    [`Half-width (margin)`, `The distance from the boundary line to the nearest lifted point, <span class="eq">1/‖w‖</span>. The whole street is twice that, <span class="eq">2/‖w‖</span>, the "street width" of the max-margin page. This page shows both.`]],
  steps: [
    { h: `One feature, and no threshold works`, p: `Each reading z is one number. Healthy readings (blue) sit near 0. Failing readings (orange) sit at both ends: −2.0, −1.55, −1.25 on the left and 1.2, 1.6, 2.05 on the right. A threshold is one cut that splits the line into a left half and a right half. The best cut still leaves three readings wrong, so the best you can do is 9 of 12.` },
    { h: `The pattern needs two cuts`, p: `Walk along the line: three failing, then six healthy, then three failing. The class changes twice, so you need two cuts. A straight boundary on a one-dimensional line has only one cut. The model has the wrong shape for this data, and no tuning of C will fix a wrong shape.` },
    { h: `Give each reading a second coordinate`, p: `Compute z² for every reading and use the pair (z, z²) as its new address. Healthy readings have z² of at most 0.3025 (the reading −0.55). Failing readings have z² of at least 1.44 (the reading 1.2). The second coordinate now has an empty gap between 0.3025 and 1.44. Nothing was measured again: z² is calculated from z.` },
    { h: `A straight line now works`, p: `Plot the pairs. All lifted points lie on the parabola <span class="eq">y = x²</span>. The middle readings sit at the bottom of the bowl and the end readings climb its sides. A straight line across the bowl puts healthy points below it and failing points above it. Run the ordinary linear SVM of Session 3 on these pairs: same margin, same support vectors, same formulas.` },
    { h: `Read the line back on the number line`, p: `The line is <span class="eq">f(z) = w₁z + w₂z² + b = 0</span>. On the original axis that is a quadratic equation in z, and a quadratic has up to two solutions. So one straight line in the plane becomes two thresholds on the number line. Readings between them are called healthy and readings outside are called failing. A flat boundary in the lifted space is a bent one in the original space.` },
    { h: `The choice of lift is the choice of shape`, p: `Using only z² (a one-dimensional lift) also works here and gives symmetric thresholds, ±0.933. Using (z, z²) adds the freedom to shift them: −0.967 and 0.917. Using z alone is no lift at all, so you are back to one cut. The coordinates you add decide which boundary shapes a straight line can make.` },
    { h: `A lift is not magic`, p: `A line in the (z, z²) plane cuts the parabola in at most two places, so along z it makes at most three blocks: outside, inside, outside. Drag one healthy reading beyond the failing ones on the right and the order becomes failing, healthy, failing, healthy: four blocks, three cuts needed. No line separates that. You would need z³ as well.` },
    { h: `The price, and what comes next`, p: `Here the lift costs one extra number per reading. With 64 pixel values and every product up to degree 3, a lifted point has 47,905 coordinates. The SVM only needs dot products between lifted points, and the next page shows a formula that returns them without building the points. That formula is the kernel.` }],
  example: {
    title: `the twelve readings, solved by hand`,
    setup: `Lift every reading to (z, z²). The SVM leaves four readings exactly on the street edges, where <span class="eq">y·f = 1</span>: z = −1.25 and 1.2 (failing, y = +1) and z = −0.55 and 0.5 (healthy, y = −1). Three of them are enough to find w₁, w₂ and b.`,
    table: { head: [`Reading z`, `Label y`, `Lifted point (z, z²)`, `f(z) = (80z² + 4z − 71) / 49`, `y · f`, `Role`], rows: [
      [`−1.25`, `+1`, `(−1.25, 1.5625)`, `+1.00`, `1.00`, `on an edge`],
      [`1.20`, `+1`, `(1.2, 1.44)`, `+1.00`, `1.00`, `on an edge`],
      [`−0.55`, `−1`, `(−0.55, 0.3025)`, `−1.00`, `1.00`, `on an edge`],
      [`0.50`, `−1`, `(0.5, 0.25)`, `−1.00`, `1.00`, `on an edge`],
      [`0.05`, `−1`, `(0.05, 0.0025)`, `−1.44`, `1.44`, `inside its own side`],
      [`−2.00`, `+1`, `(−2, 4)`, `+4.92`, `4.92`, `far outside`]] },
    walk: [
      `Thresholds first. Sorted along the line the classes read F F F H H H H H H F F F (F = failing, H = healthy). Any single cut leaves at least three readings wrong, so the best is <b>9 of 12</b>.`,
      `Edge equations. Put <span class="eq">f(z) = w₁z + w₂z² + b</span> equal to y on three edge readings:<br>(1) z = −1.25: −1.25·w₁ + 1.5625·w₂ + b = +1<br>(2) z = 1.2: 1.2·w₁ + 1.44·w₂ + b = +1<br>(3) z = 0.5: 0.5·w₁ + 0.25·w₂ + b = −1`,
      `Subtract (2) from (1). The b cancels: −2.45·w₁ + 0.1225·w₂ = 0, so <b>w₁ = 0.05·w₂</b>.`,
      `Subtract (3) from (2): 0.7·w₁ + 1.19·w₂ = 2. Put in w₁ = 0.05·w₂: (0.035 + 1.19)·w₂ = 2, so <b>w₂ = 2 / 1.225 = 1.6327</b> (that is 80/49) and <b>w₁ = 0.0816</b> (4/49).`,
      `Back into (3): b = −1 − 0.5 × 0.0816 − 0.25 × 1.6327 = <b>−1.449</b> (−71/49).`,
      `Check the fourth edge reading, z = −0.55: f = 0.0816 × (−0.55) + 1.6327 × 0.3025 − 1.449 = −1.000. Check a reading that is not on an edge, z = 0.05: f = −1.44, so y·f = 1.44, more than 1, safely outside the street.`,
      `Half-width: ‖w‖ = √(0.0816² + 1.6327²) = 1.6347, so the half-width (the margin) is 1/‖w‖ = <b>0.6117</b> and the whole street is 2/‖w‖ = <b>1.2235</b> wide.`,
      `Thresholds: f = 0 means 80z² + 4z − 71 = 0. The quadratic formula gives z = (−4 ± √22736) / 160 = (−4 ± 150.78) / 160, so <b>z = −0.967 and z = 0.917</b>.`,
      `Use it. z = 0.9 gives f = (64.8 + 3.6 − 71)/49 = −0.053: healthy. z = 1.0 gives f = (80 + 4 − 71)/49 = 0.265: failing. The boundary sits between them, at 0.917.`],
    result: `<span class="eq">w = (4/49, 80/49) ≈ (0.082, 1.633)</span>, <span class="eq">b = −71/49 ≈ −1.449</span>, half-width 0.612, thresholds −0.967 and 0.917, four readings on the street edges. The widget shows the same numbers (half-width 0.6117, street width 1.2235). One straight line in the lifted plane did the work of two thresholds.` },
  read: [
    [`Blue circles and orange triangles on the top number line`, `Healthy and failing readings. Drag one sideways to move it; every number on the page is recomputed.`],
    [`Dotted vertical line (top)`, `The best single threshold. Wherever you put one cut, at least three readings stay wrong.`],
    [`Solid dark-blue vertical lines with numbers (top)`, `The thresholds implied by the SVM in the lifted space: the places where f(z) = 0. With the (z, z²) map there are two.`],
    [`Black rings around readings`, `The readings touching a street edge. Drawn only when the lifted data are separable.`],
    [`Dashed curve in the bottom plot`, `The parabola y = z². Every lifted point sits on it.`],
    [`Black solid line in the bottom plot`, `The SVM boundary f = 0 in the lifted plane. The dashed orange and blue lines are the street edges, f = +1 and f = −1.`],
    [`Slider: Lift amount (picture only)`, `Slides the second coordinate from 0 up to z². The SVM always uses the full lift.`],
    [`Readout: Best single threshold on the line`, `How many of the 12 readings the best one-cut rule gets right.`],
    [`Readout: Separable after the lift?`, `"yes" when every lifted point is on its correct side and outside the street (the page fits with C = 10,000). Otherwise "no: the lifted points overlap, so no line is shown", and the fit readouts and lines are hidden.`],
    [`Readouts: w and b`, `w = (weight on z, weight on z²). The score is f(z) = w₁z + w₂z² + b, as in the worked example.`],
    [`Readouts: Half-width 1/‖w‖ and Street width 2/‖w‖`, `The distance from the line to the nearest lifted point, and the whole street, which is twice that.`],
    [`Readouts: Thresholds on the original line, Support vectors`, `The roots of f(z) = 0 on the number line, and the z values of the readings that touch the street edges.`]],
  experiments: [
    { do: `Press <i>Animate the lift</i> (or drag <i>Lift amount (picture only)</i> from 0 to 1).`, see: `The readings rise from the floor onto the dashed parabola. The six middle readings barely move. The outer ones climb to heights between 1.44 and 4.2. At full lift one straight line splits the two colours.`, why: `The height is z², which is tiny near 0 and grows fast. The slider squashes the whole picture, line included, so separability never changes on the way: the SVM always uses the full lift.` },
    { do: `Set <i>Map</i> to <i>z² only</i>.`, see: `The bottom plot becomes a number line of z² values with a single cut. The readouts show thresholds −0.933 and 0.933, two support vectors (z = −0.55 and 1.20), a half-width of about 0.569 and a street width of about 1.138.`, why: `One coordinate, z², already separates this data. The nearest healthy and failing values are 0.3025 and 1.44. The cut sits halfway, at 0.8713, and z = ±√0.8713 = ±0.933. The margin is half the gap: (1.44 − 0.3025) / 2 = 0.569.` },
    { do: `Set <i>Map</i> to <i>z only (no lift)</i>.`, see: `"Separable after the lift?" says no, every fit readout (w, b, half-width, street width, thresholds, support vectors) shows a dash, the bottom plot draws no line, and the best single threshold is still 9 of 12.`, why: `With the identity map you are back on the number line, and one cut cannot isolate a block in the middle.` },
    { do: `Press <i>Reset readings</i>. Drag the failing reading at −1.25 into the middle of the blue group, to about z = 0.`, see: `"Separable after the lift?" changes to "no: the lifted points overlap", the black rings and the lines vanish, and the fit readouts show dashes.`, why: `The lifted points all lie on a parabola and a line cuts a parabola in at most two places, so the classes can form at most three blocks along z. Now the order is F F H H H F H H H F F F: five blocks.` },
    { do: `Press <i>Reset readings</i>. Drag the healthy reading at 0.5 to the right, to about 0.9.`, see: `The data stay separable, but the half-width falls from 0.612 to about 0.32 and the thresholds move outward to about −1.11 and 1.06. The moved reading becomes a support vector.`, why: `The nearest healthy and failing points set the street. Moving a healthy point from z² = 0.25 up to 0.81 brings it close to the failing group (z² = 1.44), so the street narrows.` }],
  remember: [
    { tag: `Picture`, text: `Bend the ruler into a U. The ends climb, the middle stays down, and one flat cut separates them. Straighten the ruler and the cut becomes two marks: z = −0.967 and 0.917.` },
    { tag: `Rule of thumb`, text: `Count the colour changes along the line. Each change needs one threshold, and a line in the (z, z², …, zᵈ) space gives at most d thresholds. Two changes need d = 2. Four colour blocks (three changes) need d = 3.` },
    { tag: `Sanity check`, text: `After lifting, look for an empty gap in the new coordinate. Healthy z² ≤ 0.3025 and failing z² ≥ 1.44 leave a gap, so a line must exist. For a fitted line, every reading on a street edge must give y·f = 1 exactly.` },
    { tag: `Formula in words`, text: `Score = w₁·z + w₂·z² + b. The sign is the class, the zeros of the score are the thresholds, and |score| = 1 marks the street edges.` },
    { tag: `Link to code`, text: `Whatever you do to the training data you must do to new data. Build <code>np.column_stack([z, z**2])</code> before every <code>predict</code> or <code>decision_function</code>.` }],
  mistakes: [
    { wrong: `"The SVM draws a curve through the readings."`, right: `It draws a <b>straight</b> line in the lifted plane. The curve (here, a pair of thresholds) only appears when you read that line back on the original axis.` },
    { wrong: `"Lifting adds information about the sensor."`, right: `No new measurement is taken: z² is calculated from z. A lift only changes which boundary shapes a straight line can make.` },
    { wrong: `"After a lift, any data become separable."`, right: `Only if the new coordinates can express the shape. The (z, z²) lift allows at most two thresholds, so four colour blocks along z still overlap in the lifted plane.` },
    { wrong: `"The half-width readout is the width of the street."`, right: `Half-width is 1/‖w‖ = 0.612, the distance from the line to the nearest point. The street is twice that, 2/‖w‖ = 1.22, and the page shows it as Street width.` }],
  code: [
    {
      title: `Count what the best single threshold can do`,
      py: `import numpy as np

z = np.array([-0.55, -0.35, -0.15, 0.05, 0.25, 0.5, -2.0, -1.55, -1.25, 1.2, 1.6, 2.05])
y = np.array([0] * 6 + [1] * 6)                # 0 = healthy, 1 = failing

cuts = (np.sort(z)[:-1] + np.sort(z)[1:]) / 2   # one cut halfway between each pair of neighbours
best = 0
for t in cuts:
    says_failing = (z > t).astype(int)          # rule A: "failing if z is above the cut"
    best = max(best, (says_failing == y).sum(), (1 - says_failing == y).sum())   # rule B: the reverse
print("best single threshold:", best, "of", len(z))`,
      out: `best single threshold: 9 of 12`,
      walk: [
        [`y = np.array([0] * 6 + [1] * 6)`, `The labels in the same order as <code>z</code>: six healthy (0) then six failing (1). <code>[0] * 6</code> repeats the list six times and <code>+</code> joins the two lists.`],
        [`(np.sort(z)[:-1] + np.sort(z)[1:]) / 2`, `Sort the readings, then average each neighbouring pair. <code>[:-1]</code> drops the last value and <code>[1:]</code> drops the first, so the two arrays line up as (left neighbour, right neighbour). Cutting halfway between neighbours is enough: any other position gives the same split.`],
        [`(z > t).astype(int)`, `Rule A says "failing" for every reading above the cut. The comparison gives True or False; <code>astype(int)</code> turns that into 1 or 0 so it can be compared with <code>y</code>.`],
        [`(1 - says_failing == y).sum()`, `Rule B is the opposite rule, because <code>1 - says_failing</code> flips every 0 and 1. A threshold can point either way, so try both. <code>(a == y).sum()</code> counts how many readings match their label.`],
        [`best = max(best, ...)`, `Keep the highest count seen over every cut and both rules.`]],
      tip: `No cut and no rule beats 9 of 12. That is the evidence that you need more than a threshold on z.`
    },
    {
      title: `Lift the readings and fit a linear SVM`,
      py: `import numpy as np
from sklearn.svm import SVC

z = np.array([-0.55, -0.35, -0.15, 0.05, 0.25, 0.5, -2.0, -1.55, -1.25, 1.2, 1.6, 2.05])
y = np.array([-1] * 6 + [1] * 6)               # -1 = healthy, +1 = failing

Z = np.column_stack([z, z**2])                 # the lift: each reading z becomes the row (z, z squared)
svm = SVC(kernel="linear", C=1e6, tol=1e-9).fit(Z, y)
(w1, w2), b = svm.coef_[0], svm.intercept_[0]
print("w =", np.round([w1, w2], 4), " b =", round(b, 4), " accuracy:", svm.score(Z, y))
print("half-width:", round(1 / np.hypot(w1, w2), 4), " on the edge:", np.sort(z[np.isclose(y * svm.decision_function(Z), 1, atol=1e-6)]))
print("thresholds on the line:", np.round(np.sort(np.roots([w2, w1, b])), 3))`,
      out: `w = [0.0816 1.6327]  b = -1.449  accuracy: 1.0
half-width: 0.6117  on the edge: [-1.25 -0.55  0.5   1.2 ]
thresholds on the line: [-0.967  0.917]`,
      walk: [
        [`np.column_stack([z, z**2])`, `Builds the lifted table: one row per reading, column 0 is z and column 1 is z². <code>z**2</code> squares every entry at once. The shape is (12, 2), which is what <code>fit</code> expects: rows are samples, columns are features.`],
        [`SVC(kernel="linear", C=1e6, tol=1e-9)`, `The ordinary linear SVM. A huge <code>C</code> allows almost no mistakes, like the hard margin. A tight <code>tol</code> makes the solver stop only when the answer is precise, so the weights match the exact 4/49 and 80/49.`],
        [`(w1, w2), b = svm.coef_[0], svm.intercept_[0]`, `<code>coef_</code> has one row per boundary, hence <code>[0]</code>. Unpacking splits it into the weight on z and the weight on z². Attributes that end in an underscore exist only after <code>fit</code>.`],
        [`y * svm.decision_function(Z)`, `Each reading's score f times its label y. Exactly 1 means the reading touches a street edge, so <code>np.isclose(..., 1, atol=1e-6)</code> picks out the edge readings.`],
        [`np.roots([w2, w1, b])`, `Solves w₂·z² + w₁·z + b = 0: the thresholds on the original line. The list holds the coefficients, highest power first.`]],
      tip: `svm.support_ may list only three of the four edge readings: a reading exactly on an edge can carry weight 0 when three others already fix w₁, w₂ and b. The widget rings all four.`
    },
    {
      title: `Score new readings: lift them the same way`,
      py: `import numpy as np
from sklearn.svm import SVC

z = np.array([-0.55, -0.35, -0.15, 0.05, 0.25, 0.5, -2.0, -1.55, -1.25, 1.2, 1.6, 2.05])
y = np.array([-1] * 6 + [1] * 6)
svm = SVC(kernel="linear", C=1e6, tol=1e-9).fit(np.column_stack([z, z**2]), y)

new = np.array([0.9, 1.0, -1.5])               # three new readings
lifted = np.column_stack([new, new**2])        # the SAME lift as in training
print("score f:", np.round(svm.decision_function(lifted), 3))
print("class  :", svm.predict(lifted))`,
      out: `score f: [-0.053  0.265  2.102]
class  : [-1  1  1]`,
      walk: [
        [`new = np.array([0.9, 1.0, -1.5])`, `Three readings as a flat list. They are still single numbers, one feature each.`],
        [`np.column_stack([new, new**2])`, `The model was trained on two columns, so every new reading needs two columns too. Passing <code>new.reshape(-1, 1)</code> would raise an error about the number of features.`],
        [`svm.decision_function(lifted)`, `The score f for each row. 0.9 gives −0.053 (just healthy) and 1.0 gives 0.265 (just failing): the boundary sits between them, at 0.917.`],
        [`svm.predict(lifted)`, `The sign of f turned back into the labels −1 and +1.`]],
      tip: `The hand calculation f(1.0) = (80 + 4 − 71)/49 = 0.265 matches the code. If your numbers disagree, check that you lifted the new data.`
    }],
  check: [
    { q: `Why does adding the coordinate z² let a <i>straight</i> line separate these readings?`, options: [`Healthy readings have small z² and failing readings have large z², so one flat cut between them splits the classes`, `Squaring moves every reading further from every other reading`, `Squaring turns the failing readings into healthy ones`, `The SVM gets more training points once z² is added`], answer: 0, why: `Healthy readings have z² of at most 0.3025 and failing ones of at least 1.44, so a line at about z² = 0.87 separates them. Squaring adds no points and changes no labels.` },
    { q: `Using f(z) = (80z² + 4z − 71) / 49, what does the fitted SVM say about a new reading z = 1.0?`, options: [`Failing, f ≈ 0.27`, `Healthy, f ≈ −0.27`, `Failing, f ≈ 1.7`, `Healthy, f ≈ −1.45`], answer: 0, why: `f(1.0) = (80 + 4 − 71) / 49 = 13/49 = 0.265. It is positive, so failing, and small, so close to the threshold at 0.917.` },
    { q: `You drag the healthy reading at 0.5 out to z = 2.5, beyond all the failing readings, and keep the (z, z²) map. What does "Separable after the lift?" show?`, options: [`yes, squaring always keeps the classes apart`, `no: along z the classes now form four blocks, and a line in the (z, z²) plane gives at most three`, `yes, if C is made larger`, `no, but only because 2.5 is outside the plotted range`], answer: 1, why: `The order along z is F F F H H H H H F F F H: four blocks need three cuts, and a line cuts the parabola in at most two places. A larger C cannot create a line that does not exist.` }],
  teachback: { prompt: `In two sentences, explain to a friend why adding z² helps when no single threshold separates the readings, and what the straight line looks like back on the number line.`, model: `The failing readings are far from zero at both ends, so their squares are large while the healthy readings have small squares; with that second coordinate a straight line can split them. Back on the original number line, that one line is two thresholds, at about −0.97 and 0.92, with the healthy readings between them.` },
  cheat: `Lift: add computed coordinates, here z → (z, z²), so a straight line in the new space separates what no cut could on the original axis. Fit an ordinary linear SVM there: f = w₁z + w₂z² + b. On the original line f = 0 is a quadratic: two thresholds (−0.967 and 0.917). Half-width (margin) = 1/‖w‖ = 0.612, street = 2/‖w‖. Always lift new data the same way.`
};
