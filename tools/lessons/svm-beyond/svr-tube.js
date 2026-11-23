// Lesson for svm-beyond/svr-tube: support vector regression and the epsilon-tube.
module.exports = {
  idea: 'Regression with a tolerance. SVR fits a curve and draws a tube of half-width <b>ε</b> around it. A point inside the tube costs nothing, a point outside costs its distance beyond the edge, and only points on or outside the tube shape the curve.',
  why: 'Least squares makes every point pull on the fit, and a miss of 4 pulls 16 times as hard as a miss of 1, so one wild value can drag the whole curve. When small errors do not matter, chasing them is wasted effort and makes the curve jumpy. SVR spends its effort only on the points that really miss.',
  analogy: 'A courier promises delivery at 3 pm, give or take 30 minutes. Arriving inside that window costs nothing. Arriving outside costs one rupee for each extra minute, not for each minute squared. When you re-plan routes, only the parcels on the edge of the window or outside it teach you anything. The window is the tube, and its half-width ε is in minutes, the same unit as what you predict.',
  vocab: [
    ['Residual', '<span class="eq">r = y − f(x)</span>: the true value minus the curve\'s value at that point. Positive means the point is above the curve.'],
    ['ε-tube', 'The band <span class="eq">f(x) ± ε</span> around the fitted curve. ε is in the same units as y (rupees, degrees, minutes).'],
    ['ε-insensitive loss', '<span class="eq">max(0, |r| − ε)</span>: zero when the point is inside the tube, otherwise the distance from the point to the nearest tube edge.'],
    ['Support vector (SVR)', 'A training point on the tube edge or outside it. A point strictly inside has weight 0, so deleting it changes nothing.'],
    ['C', 'The exchange rate between flatness and misses. It also caps how hard any single point may pull on the curve.'],
    ['γ (RBF)', 'How narrow each RBF bump is. A large γ lets the curve bend sharply between neighbouring points.'],
    ['Flat function', 'One with a small <span class="eq">‖w‖</span>: it changes slowly with x. SVR prefers the flattest curve that fits, just as the classifier prefers the widest street.']],
  steps: [
    { h: 'Start from the habit: squared error', p: 'The usual way to fit a curve is to minimise <span class="eq">Σ ½ r²</span>. A miss of 1 costs 0.5, a miss of 4 costs 8, a miss of 10 costs 50. Every single point has a say, and the largest misses shout loudest. That is why one outlier drags a least-squares line.' },
    { h: 'New idea: close enough is free', p: 'Draw a band of half-width ε around the curve. If a point lies inside the band, its error is "close enough" and costs exactly 0. The band is the ε-tube. You choose ε as the size of error you do not care about, in the units of y.' },
    { h: 'The loss outside the tube', p: 'Take ε = 0.5. A residual of 0.1 or 0.5 costs 0. A residual of 1.2 costs <span class="eq">1.2 − 0.5 = 0.7</span>. A residual of −4 costs 3.5 and a residual of 10 costs 9.5, while squared error would charge 8 and 50. So the loss is zero inside, then grows in a straight line, like the hinge loss of the SVM.' },
    { h: 'The full objective', p: 'SVR minimises <span class="eq">½‖w‖² + C · Σ max(0, |rᵢ| − ε)</span>. There are two wishes. Be flat (small ‖w‖, a smooth curve), and have small total loss outside the tube. C is the exchange rate. It is the soft-margin SVM again, with "distance beyond the tube" in place of "distance inside the street".' },
    { h: 'Flatness breaks ties', p: 'Inside the tube the loss is 0, so many curves score a perfect 0 on the data term. The ½‖w‖² term then picks the flattest one. This means the SVR curve is <b>not</b> the curve through your points. It is the smoothest curve that stays within ε of them. The worked example shows this with four points.' },
    { h: 'Who becomes a support vector', p: 'There are three kinds of point. Strictly inside the tube: weight 0, no influence. Exactly on the tube edge: weight between 0 and C. Outside the tube: weight exactly C (in absolute value). Support vectors are the last two kinds. Because a weight can never exceed C, one wild point can pull only so hard.' },
    { h: 'Three dials, two of them in the units of y', p: 'ε sets the tolerance: wider means fewer support vectors and a flatter curve. C caps the pull of each point. γ (for the RBF kernel) sets how sharply the curve can bend. ε and C are measured against y, so if y is in thousands of rupees an ε of 0.1 means nothing. Scale y first.' }],
  example: {
    title: 'four points, one tube, solved by hand',
    setup: 'Four points lie exactly on the line y = x: <b>(0, 0), (1, 1), (2, 2), (3, 3)</b>. Fit a straight line <span class="eq">f(x) = w·x + b</span> with tube half-width <b>ε = 0.5</b> and a huge C, so that no point is allowed outside the tube.',
    table: { head: ['x', 'y', 'f(x) = ⅔x + ½', 'residual y − f', '|residual| against ε = 0.5', 'Role'], rows: [
      ['0', '0', '0.500', '−0.500', 'on the edge', 'support vector'],
      ['1', '1', '1.167', '−0.167', 'inside', 'not a support vector'],
      ['2', '2', '1.833', '+0.167', 'inside', 'not a support vector'],
      ['3', '3', '2.500', '+0.500', 'on the edge', 'support vector']] },
    walk: [
      'The line y = x has residual 0 at every point, so its loss is 0. But so does any line that stays within 0.5 of all four points. The data term cannot choose between them.',
      'The flatness term can. The penalty is <span class="eq">½w²</span>. For y = x it is ½ · 1² = 0.5. We want the smallest slope w that keeps every point inside the tube.',
      'Only the two end points limit the slope. At x = 0 we need <span class="eq">|0 − b| ≤ 0.5</span>, so b ≤ 0.5. At x = 3 we need <span class="eq">3w + b ≥ 3 − 0.5 = 2.5</span>.',
      'Take b as large as allowed, 0.5. Then <span class="eq">3w ≥ 2</span>, so the smallest slope is <b>w = 2/3</b>. The penalty falls from 0.5 to <span class="eq">½ · (2/3)² = 0.222</span>.',
      'Check the middle points. f(1) = 0.667 + 0.5 = 1.167 and f(2) = 1.833. Their residuals are −0.167 and +0.167, inside ±0.5. A straight line between two valid ends is valid in between.',
      'The weights of the two end points are β = −2/9 and +2/9, and <span class="eq">w = Σ βᵢ xᵢ = (2/9) · 3 = 2/3</span>, which agrees. The middle points have β = 0: delete them and the same line comes back.',
      'General rule for this example: <span class="eq">w = 1 − 2ε/3</span>. At ε = 1.0 the slope is 1/3 and b = 1. At ε = 1.5 it is 0, a flat line at height 1.5 and no support vectors at all.'],
    result: 'The SVR line is <span class="eq">f(x) = ⅔x + ½</span>, not y = x. It is the flattest line that keeps every point within ε. Two support vectors (the end points) hold it in place; the two inside points have weight 0. A wider tube gives a flatter line: this is the "bigger ε, smoother fit" that you see on the page, in four points.' },
  read: [
    ['Solid black curve', 'The fitted function f(x).'],
    ['Shaded band with dashed edges', 'The tube <span class="eq">f(x) ± ε</span>. Its width follows the ε slider.'],
    ['Blue circles', 'Points strictly inside the tube. Zero loss, zero weight, no influence on the curve.'],
    ['Orange triangles with a black ring', 'The support vectors: points on the tube edge or outside it. They alone define the curve.'],
    ['Short orange segments', 'For a point outside the tube, the vertical gap between the point and the tube edge. Its length is the point\'s loss.'],
    ['Readout: Support vectors', 'How many ringed points, out of all points.'],
    ['Readout: Points inside the tube (zero loss)', 'Points with |residual| ≤ ε. Points exactly on the edge count here and are also support vectors, so the two counts can add to more than the total.'],
    ['Readout: Σ ε-insensitive loss', 'The total length of the orange segments: the data-fit part of what SVR minimises.'],
    ['Readout: Mean squared error', 'The average of r² over the training points. It is only a report: SVR does not minimise it, and it falls when the curve chases noise.'],
    ['Lower left: Support vectors against ε', 'The same data, C and kernel, with only ε changing. The black dot is your current ε. Hover to read exact counts.'],
    ['Lower right: Loss against residual', 'Blue: the ε-insensitive loss, flat on the shaded tube. Dashed grey: ½r². At ε = 0.2, ½r² is below the blue line for residuals between about 0.23 and 1.77 and above it beyond that, so the gain from the linear loss shows up only for large misses.']],
  experiments: [
    { do: 'Keep <i>Noisy sine curve</i> with RBF, C = 10, γ = 1. Set ε to 0.02, read <i>Support vectors</i>, then set ε to 0.5.', see: 'Support vectors go from 43 of 45 to 6 of 45. The curve gets smoother and Σ ε-insensitive loss drops to 0, while Mean squared error rises from about 0.033 to 0.077.', why: 'With a thin tube almost every point sits outside it and pulls. With a wide tube only the few points touching the edge pull. The curve is then free to be smooth, but it also follows the data less closely.' },
    { do: 'Press <i>Add an outlier</i> (a point at 0.6, 1.9, about 1.2 above the curve). Set C to about 1 (the log slider shows its value), note the curve under the point, then set C to about 100.', see: 'At C = 1 the curve under the outlier rises by about 0.16 (from 0.62 to 0.78). At C = 100 it rises by about 0.42 (from 0.59 to 1.01).', why: 'The outlier sits outside the tube, so its weight is C. A small C means each point can pull only a little. A big C lets the curve pay a lot of flatness to get closer to it.' },
    { do: 'Switch <i>Kernel</i> to Linear on the sine data (ε = 0.2).', see: 'The line is almost flat (slope about 0.05). 37 of 45 points are support vectors, Σ ε-insensitive loss is about 17.0 against 0.94 with RBF, and Mean squared error is about 0.43 against 0.035.', why: 'A straight line cannot follow a wave, so most points land outside the tube. The tube does not rescue a model that cannot bend: when most points are ringed, the model class is wrong.' },
    { do: 'Set ε = 0.05 and raise γ from about 1 to about 30, then to about 100.', see: 'The curve starts to zig-zag between neighbouring points. Mean squared error falls (about 0.034, 0.021, 0.015) even though the curve stops looking like a sine.', why: 'A large γ gives each point its own narrow bump, so the curve can pass near every point, noise included. On this data the distance to the true sine rises from about 0.09 at γ = 1 to 0.38 at γ = 100. The error readout only sees training points, so it cannot warn you.' },
    { do: 'Look at the lower-left plot, and hover at ε = 0, 0.2 and 1.0.', see: 'About 45, 16 and 2 support vectors.', why: 'At ε = 0 every point is outside the tube (almost none lies exactly on the curve), so all are support vectors. By ε = 1.0 only the two extreme points touch the edge. The count never rises as ε grows.' }],
  remember: [
    { tag: 'Picture', text: 'A <b>hosepipe</b> laid along the curve. Points inside the pipe are invisible to the model. Only the points touching the pipe wall or outside it hold it in place.' },
    { tag: 'Formula in words', text: 'Loss = how far outside the tube you are, never below 0: <span class="eq">max(0, |r| − ε)</span>. Inside is free; outside you pay by the unit.' },
    { tag: 'Rule of thumb', text: 'Pick ε from the noise you accept. On this page\'s sine data (noise standard deviation 0.22) an ε between 0.1 and 0.2 gave the best fit to the true curve on average over 40 samples; ε = 0.5 doubled the error.' },
    { tag: 'Sanity check', text: 'After fitting, every point <b>without</b> a ring must lie inside the tube, and every point outside the tube must have a ring. If not, the solver has not converged.' },
    { tag: 'Trick', text: '<b>ε and C live in the units of y.</b> If y is in rupees, ε = 0.1 is zero and C = 1 is tiny. Standardise y (the code below does this with <code>TransformedTargetRegressor</code>) before tuning.' },
    { tag: 'Link to code', text: '<code>SVR(epsilon=…, C=…, gamma=…)</code>. After fitting, <code>support_</code> lists the ringed rows and <code>dual_coef_</code> holds their weights β (signed, between −C and C).' }],
  mistakes: [
    { wrong: '"SVR fits the curve through the points, like least squares."', right: 'It fits the <b>flattest</b> curve that keeps points within ε (or pays C for each unit outside). Four points exactly on y = x give a line of slope 2/3 at ε = 0.5.' },
    { wrong: '"A bigger ε means a more accurate model."', right: 'A bigger ε means more <b>tolerance</b>: fewer support vectors, a flatter curve and, past the noise level, a worse fit. On this page, MSE goes from 0.035 at ε = 0.2 to 0.30 at ε = 1.' },
    { wrong: '"ε works like C in the classifier, bigger just means stronger."', right: 'ε is a width in the units of y and C is a price. ε decides <i>which</i> points matter; C decides <i>how hard</i> those points may pull.' },
    { wrong: '"Mean squared error getting smaller means the SVR is getting better."', right: 'MSE is measured on the training points. A large γ drives it down by chasing noise. Judge a fit by cross-validation or by held-out points.' },
    { wrong: '"SVR does not need y to be scaled, only X."', right: 'Both. ε and C are compared with y. In the snippet below, standardising y lifts R² from 0.11 to 0.97 with the same default settings.' }],
  code: [
    {
      title: 'The four-point example in scikit-learn',
      py: 'import numpy as np\nfrom sklearn.svm import SVR\n\nX = np.array([[0], [1], [2], [3]])      # 2-D: one row per point, one column\ny = np.array([0, 1, 2, 3])               # y = x exactly\n\nsvr = SVR(kernel="linear", C=1e6, epsilon=0.5).fit(X, y)\nprint("w =", round(float(svr.coef_[0][0]), 3), " b =", round(float(svr.intercept_[0]), 3))\nprint("support rows:", svr.support_.tolist())\nprint("weights beta:", np.round(svr.dual_coef_[0], 3).tolist())\nprint("fitted:", np.round(svr.predict(X), 3).tolist())',
      out: 'w = 0.667  b = 0.5\nsupport rows: [0, 3]\nweights beta: [-0.222, 0.222]\nfitted: [0.5, 1.167, 1.833, 2.5]',
      walk: [
        ['SVR(kernel="linear", C=1e6, epsilon=0.5)', 'The regression twin of <code>SVC</code>. <code>epsilon</code> is the tube half-width, in the units of y. A huge <code>C</code> forbids any point from leaving the tube, which matches the hand calculation.'],
        ['.fit(X, y)', 'X must be 2-D (rows by columns), y is 1-D. Returns the model, so the call can be chained.'],
        ['svr.coef_[0][0]', 'The slope w. <code>coef_</code> exists only for the linear kernel and has shape (1, number of features), hence two <code>[0]</code>s.'],
        ['svr.support_', 'Row numbers of the support vectors: rows 0 and 3, the two ends. The middle rows are strictly inside the tube.'],
        ['svr.dual_coef_[0]', 'The signed weights β, one per support vector. Their sum is 0 and <code>w = Σ β x</code> = 0.222 · 3 = 0.667.'],
        ['svr.predict(X)', 'f(x) at each row. Compare with y: the residuals are −0.5, −0.167, +0.167, +0.5, inside ±ε.']],
      tip: 'Change epsilon to 1.0 and the slope becomes 0.333; to 1.5 and the line is flat at 1.5 with no support vectors.'
    },
    {
      title: 'Count support vectors as ε grows, and check the tube rule',
      py: 'import numpy as np\nfrom sklearn.svm import SVR\n\nrng = np.random.RandomState(4)\nX = np.sort(rng.uniform(-3, 3, 45)).reshape(-1, 1)         # 45 inputs, one column\ny = np.sin(1.3 * X[:, 0]) + 0.22 * rng.randn(45)            # noisy sine\n\nfor eps in [0, 0.1, 0.2, 0.5, 1.0]:\n    svr = SVR(kernel="rbf", C=10, gamma=1, epsilon=eps).fit(X, y)\n    miss = np.abs(y - svr.predict(X))                        # |residual| of each point\n    loss = np.maximum(0, miss - eps).sum()                   # total eps-insensitive loss\n    rest = np.setdiff1d(np.arange(45), svr.support_)         # rows that are not support vectors\n    print(eps, len(svr.support_), round(loss, 2), bool(np.all(miss[rest] <= eps + 1e-6)))',
      out: '0 45 7.04 True\n0.1 33 3.72 True\n0.2 22 1.4 True\n0.5 6 0.0 True\n1.0 2 0.0 True',
      walk: [
        ['rng.randn(45)', 'Standard normal noise; the 0.22 multiplier makes its standard deviation 0.22. The fixed <code>RandomState(4)</code> makes the data, and so the output, repeatable.'],
        ['.reshape(-1, 1)', 'Turn a flat list of 45 numbers into a 45-by-1 table. <code>-1</code> means "work out this length yourself".'],
        ['np.abs(y - svr.predict(X))', 'Distance of every point from the curve: the size of its residual.'],
        ['np.maximum(0, miss - eps)', 'The ε-insensitive loss for all points at once: negative values (inside the tube) are lifted to 0. <code>.sum()</code> adds them up, the widget\'s "Σ ε-insensitive loss".'],
        ['np.setdiff1d(np.arange(45), svr.support_)', 'All row numbers except the support rows: the non-support points.'],
        ['miss[rest] <= eps + 1e-6', 'True means every non-support point is inside the tube. The tiny <code>1e-6</code> allows for solver rounding.']],
      tip: 'The counts differ a little from the widget (45, 31, 16, 6, 2) because this page draws its sample with a different random generator. The shape is the same: a steady fall.'
    },
    {
      title: 'Why you scale y: ε and C are measured in the units of y',
      py: 'import numpy as np\nfrom sklearn.svm import SVR\nfrom sklearn.compose import TransformedTargetRegressor\nfrom sklearn.preprocessing import StandardScaler\n\nrng = np.random.RandomState(0)\nX = rng.uniform(0, 10, (200, 1))\ny = 50000 + 8000 * X[:, 0] + 4000 * rng.randn(200)          # a salary in rupees\nraw = SVR(kernel="linear").fit(X, y)                         # defaults: C=1, epsilon=0.1\ntt = TransformedTargetRegressor(SVR(kernel="linear"), transformer=StandardScaler()).fit(X, y)\nprint("R2, y in rupees :", round(raw.score(X, y), 3))\nprint("R2, y scaled    :", round(tt.score(X, y), 3))',
      out: 'R2, y in rupees : 0.108\nR2, y scaled    : 0.971',
      walk: [
        ['y = 50000 + 8000 * X[:, 0] + ...', 'A made-up salary: 50,000 plus 8,000 per year of experience, plus noise of 4,000. y is in the tens of thousands.'],
        ['SVR(kernel="linear")', 'Defaults: <code>C=1</code> and <code>epsilon=0.1</code>. Those are tiny next to errors of thousands of rupees, so the fitted slope is about 490 instead of the true 8,000.'],
        ['TransformedTargetRegressor(...)', 'A wrapper that standardises y before fitting and converts predictions back to rupees afterwards. Same SVR, same defaults, but y now has mean 0 and standard deviation 1.'],
        ['transformer=StandardScaler()', 'Learns the mean and standard deviation of y during <code>fit</code>, and undoes them in <code>predict</code>.'],
        ['.score(X, y)', 'For regressors this is R², the share of the variance of y explained. 1 is perfect; 0.108 means the raw model explains almost nothing.']],
      tip: 'Scale the target only for SVR-style models whose ε and C depend on its units. Tree models do not care.'
    }],
  check: [
    { q: 'In an SVR fit, one training point lies strictly inside the tube. You delete it and refit. What happens to the curve?', options: ['It does not change', 'It moves slightly towards where the point was', 'The tube gets narrower', 'The point turns into a support vector'], answer: 0, why: 'A point strictly inside the tube has loss 0 and weight 0, so it is not a support vector. The same curve is still the best one without it.' },
    { q: 'ε = 0.5 and a point has residual y − f(x) = −1.3. What is its ε-insensitive loss?', options: ['0', '0.8', '1.3', '1.8'], answer: 1, why: 'Loss = max(0, |r| − ε) = 1.3 − 0.5 = 0.8. Option 1.3 forgets the free band of 0.5.' },
    { q: 'You raise ε from 0.1 to 0.5 and keep C and γ fixed. What do you expect?', options: ['More support vectors and a more detailed curve', 'Fewer support vectors and a smoother, flatter curve', 'The same support vectors with a wider band', 'Every point becomes a support vector'], answer: 1, why: 'A wider tube puts more points inside it, and points inside have weight 0. On the page\'s sine data the count falls from 31 to 6. Fewer pulling points also means a smoother curve.' }],
  teachback: { prompt: 'In two sentences, explain to a friend how SVR decides which points matter and why that helps against outliers.', model: 'SVR draws a tube of half-width ε around its curve: points inside cost nothing and have no say, and points on or outside it are the support vectors that hold the curve in place. Outside the tube the cost grows only in a straight line and each point\'s pull is capped by C, so one wild point cannot dominate the way it does when squared error is used.' },
  cheat: 'SVR = regression with a tolerance. Loss = max(0, |y − f(x)| − ε): zero inside the tube of half-width ε, linear outside. Minimise ½‖w‖² + C·Σ loss: stay flat, pay C per unit outside. Support vectors are points on or outside the tube; the rest have weight 0. Wider ε: fewer support vectors, flatter curve. ε and C use the units of y, so scale y.'
};
