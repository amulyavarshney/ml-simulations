// Lesson for svm-margin/scaling: why the margin and the penalty depend on units, and what standardising fixes.
module.exports = {
  idea: 'An SVM measures the street as a distance and charges for the size of w, and both change with units. Put a useful feature in tiny numbers and the raw SVM stops using it. Standardise each feature, inside each training fold, and units stop mattering.',
  why: 'Nobody agrees on units: rupees or lakh, metres or millimetres. If the model\'s answer changes when someone changes a unit, it is learning your spreadsheet\'s formatting, not your customers. In the simulation the same 60 points score 58% in tiny units and 87% after standardising.',
  analogy: 'Two judges score a talent show. One marks out of 10, the other out of 1000, and you add the marks. The second judge decides every ranking, however poor their taste. Convert each judge\'s marks to "how many standard deviations above that judge\'s average" and both now count equally. That conversion is standardising.',
  vocab: [
    ['Units of a feature', 'The scale you happened to record it in: ₹ or lakh, m or mm. They change the numbers, not the customers.'],
    ['Euclidean distance', 'The square root of the sum of squared differences, one term per feature. A feature with big numbers supplies most of the sum.'],
    ['Penalty ½‖w‖²', 'The cost the SVM charges for large weights. A weight needs to be larger when its feature has smaller numbers, so the penalty depends on units.'],
    ['Standardising (z-score)', '<span class="eq">z = (x − mean) / sd</span>, per column. The new column has mean 0 and standard deviation 1, in no unit at all.'],
    ['StandardScaler', 'The scikit-learn tool for it. <code>fit</code> learns each column\'s mean and sd, <code>transform</code> applies them. It divides by the population sd (n, not n − 1).'],
    ['Pipeline', 'Steps chained into one model, <code>make_pipeline(StandardScaler(), SVC())</code>. Inside cross-validation it refits every step on each training fold.'],
    ['Leakage', 'Test rows influencing the training in any way. Computing the mean and sd on all rows before splitting lets the test rows leak into the scaler.']],
  steps: [
    { h: 'Units are arbitrary', p: 'Income in rupees, in lakh or in dollars describes the same customers. A good model should give the same answers whichever you use. Unpenalised least squares and unpenalised logistic regression do: a change of unit only rescales the weight. The SVM does not, for two separate reasons.' },
    { h: 'Reason 1: the margin is a distance', p: 'The street width 2/‖w‖ is measured in the geometry of the features, and a squared distance is a sum <span class="eq">(Δage)² + (Δincome)²</span>. Two customers 24 years and ₹53,000 apart are 99.99998% "income" in rupees. Express income in lakh and the same pair is 99.95% "age". Same customers, new unit, opposite dominant feature.' },
    { h: 'Reason 2: the penalty is not unit-free', p: 'The SVM minimises <span class="eq">½‖w‖² + C·Σξ</span>. If you divide a feature by s, the same rule needs a weight s times larger, and the penalty grows by s². From rupees to lakh, s = 100,000: the weight grows 10⁵ times and the charge grows 10¹⁰ times. In rupees, income is nearly free to use. In lakh it is very dear.' },
    { h: 'What the raw SVM does', p: 'In the simulation at × 0.03, feature 1 has a spread of 0.0438. The standardised line, written in raw units, needs weight 42.4 on it and costs ½·42.4² = 899 to save only 34 of hinge loss (52.3 down to 18.0). The raw SVM refuses and keeps weight 1.75 (cost 1.7), leaning on the weak feature 2. Accuracy 58%, against 87%.' },
    { h: 'The fix: standardise', p: 'Replace each column by <span class="eq">z = (x − mean)/sd</span>. Every feature now has spread 1, so no feature is cheap or dear because of its unit, and typical weights are near 1. Rupees and lakh give identical z-scores. That is why the standardised curve in the simulation is flat: it does not care about the multiplier.' },
    { h: 'Fit the scaler on training rows only', p: 'The mean and sd are learned from the rows you train on, then applied to everything. If you scale the whole dataset first and then cross-validate, the test rows helped to set the mean and sd: leakage. Put <code>StandardScaler</code> as the first step of a Pipeline and each fold refits it for itself. The simulation does exactly that.' },
    { h: 'Limits to remember', p: 'The damage is one-sided: with the informative feature in big units (× 100) the raw SVM is still fine, at 85% against 87%. On real data a linear SVM gains modestly, about 0.7 to 2.4 points on wine and breast cancer (repeated 5-fold cross-validation). The RBF kernel of Session 4 has no way to compensate, so it needs scaling more. TF-IDF rows have unit length already: do not centre sparse data.' }],
  example: {
    title: 'four customers, two units',
    setup: 'Age in years and income in rupees for four customers. The same incomes are also written in lakh rupees (1 lakh = 100,000 ₹). Standardise with the population sd (divide by n = 4).',
    table: { head: ['Customer', 'Age', 'Income (₹)', 'Income (lakh)', 'z of age', 'z of income (₹ or lakh)'], rows: [
      ['1', '28', '32,000', '0.32', '−1.250', '−1.197'],
      ['2', '35', '48,000', '0.48', '−0.454', '−0.364'],
      ['3', '41', '55,000', '0.55', '0.227', '0.000'],
      ['4', '52', '85,000', '0.85', '1.477', '1.561'],
      ['<b>mean, sd</b>', '39, 8.80', '55,000, 19,222', '0.55, 0.1922', '0, 1', '0, 1']] },
    walk: [
      'Squared distance between customers 1 and 4, income in rupees: age gives 24² = 576, income gives 53,000² = 2,809,000,000. Income share = 2,809,000,000 / 2,809,000,576 = <b>99.99998%</b>. Age is invisible.',
      'The same pair with income in lakh: age gives 576, income gives 0.53² = 0.2809. Age share = 576 / 576.2809 = <b>99.95%</b>. Now income is invisible. Only the unit changed.',
      'Penalty. Suppose a rule scores one point per ₹20,000 of income, so w = 1/20,000 = 0.00005 per rupee. The cost ½w² = 1.25 × 10⁻⁹: free. In lakh the weight is 0.00005 × 100,000 = 5, and ½ × 5² = <b>12.5</b>. The same rule now costs ten billion times more.',
      'Standardise income. Mean = 55,000. Deviations are −23,000, −7,000, 0, 30,000, squares sum to 1,478,000,000 and divide by 4 to give 369,500,000, so sd = <b>19,222</b>. Customer 1: (32,000 − 55,000)/19,222 = <b>−1.197</b>.',
      'In lakh: mean 0.55, sd 0.19222, and (0.32 − 0.55)/0.19222 = <b>−1.197</b> again. The z-column is the same in either unit, so distances and weights built on it no longer depend on the unit.'],
    result: 'Changing rupees to lakh swapped the dominant feature in the distance (income 99.99998% to age 99.95%) and multiplied the price of using income by 10¹⁰. After standardising, both units give the identical column −1.197, −0.364, 0, 1.561.' },
  read: [
    ['Slider "Multiply feature 1 by"', 'Changes the units of feature 1 only. × 0.03 makes its numbers 33 times smaller (a bigger unit: metres instead of millimetres). It starts at × 0.03. Feature 2 never changes.'],
    ['Left plot "Raw units: what the unscaled SVM sees"', 'The 60 points in raw numbers with the raw SVM\'s line. Look at the tick labels on the horizontal axis: they get tiny as the multiplier falls.'],
    ['Right plot "After standardising"', 'The same points with both features rescaled to mean 0 and sd 1, and the standardised SVM\'s line.'],
    ['Blue circles and orange triangles', 'Class A and class B. Feature 1 (horizontal) separates them well. Feature 2 (vertical) barely does.'],
    ['Bottom plot: solid and dashed curves', 'Cross-validated accuracy against the multiplier (log scale). Solid is standardised, dashed is raw. The vertical dashed line is your multiplier.'],
    ['Readout: Raw SVM, cross-validated accuracy', '5-fold accuracy of an SVM on the raw numbers, C = 1.'],
    ['Readout: Standardised SVM, cross-validated accuracy', 'The same, but the scaler is refitted on each training fold.'],
    ['Readouts: share of the score from feature 1', '<span class="eq">|w₁|·sd₁ / (|w₁|·sd₁ + |w₂|·sd₂)</span>: how much of the spread of the score comes from feature 1. Near 100% means feature 2 is ignored.'],
    ['Button "New data"', 'Draws a fresh sample of 60 points. The pattern should repeat on each.']],
  experiments: [
    { do: 'Look at the starting state (× 0.03), including the left plot.', see: 'Raw 58% against standardised 87%. Raw share of the score from feature 1 is 11%, standardised 90%. In the left plot the black line is nearly flat (under 10° from horizontal) and cuts through both clouds, though the blue points sit mostly on the left and the orange ones mostly on the right.', why: 'The raw SVM found it too costly to put weight on a feature with tiny numbers, so it separates mostly with feature 2, which is only weakly informative.' },
    { do: 'Drag the multiplier to the far left (× 0.01).', see: 'Raw falls to 53%, close to a coin toss, and its share from feature 1 to 1%. Standardised stays at 87%.', why: 'Feature 1 now has a spread of only 0.015, so the weight that would use it costs even more. Standardising removes the multiplier completely, so its row never moves.' },
    { do: 'Drag the multiplier up to about × 0.3.', see: 'Raw reaches 87%, equal to the standardised value, and its share from feature 1 is 91%. The black line in the left plot is now nearly vertical.', why: 'At × 0.3 feature 1 has spread 0.44, close to feature 2\'s 0.96, so the raw SVM can afford a good weight on it. The raw and standardised models become almost the same model.' },
    { do: 'Drag the multiplier to the far right (× 100). Then look at the bottom plot.', see: 'Raw is 85% and standardised 87%: the raw SVM does not collapse. In the curve, raw is far below standardised only for multipliers below about 0.06, and within 4 points of it from about 0.1 upwards.', why: 'Large numbers on the <i>informative</i> feature make it nearly free to use, so the SVM leans on it, which happens to be right. The harm is one-sided: it comes when the useful feature is in small numbers (or a useless one in big ones).' },
    { do: 'Press <i>New data</i> four times, reading both accuracies at × 0.03 each time.', see: 'Raw is 67%, 60%, 62% and 60%, standardised 85%, 85%, 78% and 83%. At about × 0.3 raw is within 1 to 4 points of standardised on each sample.', why: 'It is the scale, not luck in one sample. With 60 points, one point is 1.7% accuracy, so 1 or 2 points of difference is noise but 20 or more is not.' }],
  remember: [
    { tag: 'Picture', text: '<b>Same customers, different ruler.</b> Rupees and lakh are two rulers. The SVM measures the street with whichever ruler you hand it. Standardising hands every feature the same ruler: one standard deviation per tick.' },
    { tag: 'Rule of thumb', text: 'Any method that uses distances or a penalty on weights (SVM, k-NN, PCA, ridge, logistic with a penalty) needs standardised features. Trees do not.' },
    { tag: 'Formula in words', text: 'Divide a feature by s and its weight multiplies by s while its penalty multiplies by <b>s²</b>. Units enter the cost <i>squared</i>.' },
    { tag: 'Sanity check', text: 'Print <code>X.std(axis=0)</code>. If the largest spread is more than about 10 times the smallest, scale. After scaling, the training columns should show mean 0 and sd 1.' },
    { tag: 'Trick', text: 'If rescaling does not change the accuracy, do not conclude "scaling is useless". For a linear SVM the gain is modest, but the best C moves with the scale and the RBF kernel (Session 4) does need it.' },
    { tag: 'Link to code', text: '<code>make_pipeline(StandardScaler(), SVC(...))</code>. <code>fit</code> learns mean and sd from the rows it is given, <code>transform</code> applies them. In cross-validation, the Pipeline refits the scaler inside each training fold.' }],
  mistakes: [
    { wrong: '"SVMs are scale-invariant, like decision trees."', right: 'Trees only compare one feature with a cut point, so units do not matter. An SVM adds squared differences and penalises ‖w‖², so units matter twice.' },
    { wrong: '"Scale the whole dataset first, then cross-validate."', right: 'The test rows then help set the mean and sd: leakage. Fit the scaler on training rows only, which a Pipeline does for you in every fold.' },
    { wrong: '"Big numbers always hurt and small numbers are always safe."', right: 'The feature in big numbers <i>dominates</i>. That hurts only if it is not the useful one. In the simulation, × 100 on the informative feature costs just 2 points (85% against 87%), while × 0.03 on it costs 28.' },
    { wrong: '"Standardise TF-IDF text features as well."', right: 'TF-IDF rows already have length 1, so features are comparable. Centring sparse data makes it dense. If you must rescale, use <code>StandardScaler(with_mean=False)</code> or <code>MaxAbsScaler</code>.' }],
  code: [
    {
      title: 'Raw against scaled SVM as the unit of feature 1 changes',
      py: 'import numpy as np\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.svm import SVC\n\nrng, y = np.random.RandomState(0), np.array([-1, 1] * 30)\nX = np.column_stack([0.9 * y + 0.9 * rng.randn(60), 0.3 * y + rng.randn(60)])   # feature 1 strong, 2 weak\nscaled = make_pipeline(StandardScaler(), SVC(kernel="linear"))\nfor k in [0.01, 0.03, 0.3, 1, 100]:                    # k = new units for feature 1 only\n    a, b = (cross_val_score(m, X * [k, 1], y, cv=5).mean() for m in (SVC(kernel="linear"), scaled))\n    print(f"x{k:<5} raw={a:.3f} scaled={b:.3f}")',
      out: 'x0.01  raw=0.667 scaled=0.850\nx0.03  raw=0.700 scaled=0.850\nx0.3   raw=0.850 scaled=0.850\nx1     raw=0.867 scaled=0.850\nx100   raw=0.850 scaled=0.850',
      walk: [
        ['np.array([-1, 1] * 30)', 'Sixty alternating labels. <code>0.9 * y</code> pushes the two classes to −0.9 and +0.9 on feature 1, so it carries the signal. Feature 2 gets only 0.3 * y, so it is weak.'],
        ['rng.randn(60)', 'Sixty draws from a standard normal. <code>RandomState(0)</code> fixes the seed so every run prints the same numbers.'],
        ['X * [k, 1]', 'NumPy broadcasting: column 0 is multiplied by k and column 1 by 1. It changes the unit of feature 1 only, which is what the slider does.'],
        ['make_pipeline(StandardScaler(), SVC(...))', 'Two steps in one model: scale, then SVM. <code>cross_val_score</code> clones it for each fold, so the scaler sees training rows only.'],
        ['cross_val_score(m, X * [k, 1], y, cv=5).mean()', 'Five fits, each tested on the fold it did not see. <code>.mean()</code> is the cross-validated accuracy.']],
      tip: 'The scaled column is the same in every row (0.850) because standardising cancels the multiplier exactly. The raw column moves.'
    },
    {
      title: 'Why the raw SVM refuses: the same line costs far more in raw units',
      py: 'import numpy as np\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.svm import SVC\n\nrng, y = np.random.RandomState(0), np.array([-1, 1] * 30)\nX = np.column_stack([0.9 * y + 0.9 * rng.randn(60), 0.3 * y + rng.randn(60)]) * [0.03, 1]   # feature 1 in tiny units\nscaler = StandardScaler().fit(X)\nw_std = SVC(kernel="linear", C=1).fit(scaler.transform(X), y).coef_[0]\nw_raw = w_std / scaler.scale_                          # the same line, written in raw units\nprint("column spreads:", scaler.scale_.round(4))\nprint("w in z-units:", w_std.round(2), " penalty 0.5*|w|^2 =", round(float(0.5 * w_std @ w_std), 2))\nprint("same line in raw units:", w_raw.round(1), " penalty =", round(float(0.5 * w_raw @ w_raw), 1))',
      out: 'column spreads: [0.0393 1.1066]\nw in z-units: [1.52 0.8 ]  penalty 0.5*|w|^2 = 1.48\nsame line in raw units: [38.7  0.7]  penalty = 747.8',
      walk: [
        ['StandardScaler().fit(X)', 'Learns one mean and one standard deviation per column. <code>scale_</code> holds the standard deviations: here 0.0393 for feature 1 and 1.1066 for feature 2.'],
        ['scaler.transform(X)', 'Applies <span class="eq">(x − mean) / sd</span> to every entry. This is the data the SVM was trained on.'],
        ['.coef_[0]', 'The learned weights, in z-units: the first row of the 2-D array <code>coef_</code>.'],
        ['w_std / scaler.scale_', 'A weight on a z-score is a weight divided by the sd on the raw number, because <code>z = (x − mean) / sd</code>. So the same line has raw weights 38.7 and 0.7.'],
        ['0.5 * w_std @ w_std', '½‖w‖²: <code>@</code> is the dot product of a vector with itself, the sum of squares.']],
      tip: 'The identical line costs 1.48 in z-units and 747.8 in raw units. A raw SVM weighing 747.8 against a hinge-loss saving of a few dozen will choose the cheap, wrong line.'
    },
    {
      title: 'Standardising by hand, and the same answer in rupees and lakh',
      py: 'import numpy as np\nfrom sklearn.preprocessing import StandardScaler\n\nage = np.array([28, 35, 41, 52.0])\nincome = np.array([32000, 48000, 55000, 85000.0])               # rupees\nX = np.column_stack([age, income])\nz_rupee = StandardScaler().fit_transform(X)\nz_lakh = StandardScaler().fit_transform(X * [1, 1e-5])          # income in lakh rupees instead\nprint("z of income, rupees:", z_rupee[:, 1].round(3))\nprint("z of income, lakh:  ", z_lakh[:, 1].round(3))\nprint("by hand (x - mean)/std:", ((income - income.mean()) / income.std()).round(3))',
      out: 'z of income, rupees: [-1.197 -0.364  0.     1.561]\nz of income, lakh:   [-1.197 -0.364  0.     1.561]\nby hand (x - mean)/std: [-1.197 -0.364  0.     1.561]',
      walk: [
        ['np.column_stack([age, income])', 'Joins two 1-D arrays as the two columns of a 4 × 2 table: rows are customers, columns are features.'],
        ['fit_transform(X)', '<code>fit</code> learns mean and sd per column, then <code>transform</code> applies them, in one call. Use it on training data only; for new data call <code>transform</code> alone.'],
        ['X * [1, 1e-5]', 'Multiplies the age column by 1 and the income column by 0.00001, which converts rupees to lakh.'],
        ['z_rupee[:, 1]', 'All rows (<code>:</code>) of column 1, the income column.'],
        ['income.std()', 'NumPy\'s <code>std</code> divides by n (population sd), which is what <code>StandardScaler</code> uses. Pandas\' <code>.std()</code> divides by n − 1 and would give slightly different z-scores.']],
      tip: 'Identical z-columns for rupees and lakh: this is the whole reason standardising makes the SVM unit-free.'
    }],
  check: [
    { q: 'Why does a raw linear SVM under-use a feature that is measured in very small numbers?', options: ['Using it needs a large weight, and the ‖w‖² penalty makes large weights expensive', 'SVMs delete features whose values are small', 'Small numbers cannot lie on the street edge', 'The hinge loss is zero for small numbers'], answer: 0, why: 'To turn small numbers into a decisive score the weight must be big. The SVM pays ½‖w‖² for it, so it often prefers to lean on features with larger numbers.' },
    { q: 'A rule needs weight w = 0.00004 per rupee of income. You switch the income column to lakh rupees (1 lakh = 100,000 ₹). What weight does the same rule need now, and what does ½w² become?', options: ['w = 4 and ½w² = 8', 'w = 0.00004 and ½w² = 8 × 10⁻¹⁰', 'w = 4 and ½w² = 16', 'w = 0.4 and ½w² = 0.08'], answer: 0, why: 'One lakh is 100,000 times as many rupees, so the weight per lakh is 0.00004 × 100,000 = 4. The penalty ½ × 4² = 8. In rupees it was ½ × 0.00004² = 8 × 10⁻¹⁰.' },
    { q: 'You standardise the whole dataset with StandardScaler and only then run 5-fold cross-validation, instead of putting the scaler in a Pipeline. What is wrong?', options: ['The test rows helped set the mean and sd, so the cross-validated score can be optimistic', 'Nothing: scaling is not learned from the data', 'The SVM will refuse to train on scaled data', 'The mean will be 0 but the sd will not be 1'], answer: 0, why: 'The scaler learns a mean and sd from data. If that data includes the test fold, the test rows have leaked into training. A Pipeline refits the scaler inside each training fold.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why an SVM needs scaled features and how you add the scaling safely.', model: 'An SVM measures the street as a distance and pays for the size of w, and both depend on the units of each feature, so a feature in tiny numbers needs a huge, expensive weight and gets ignored. I standardise every feature to mean 0 and sd 1, and I do it inside a Pipeline so the mean and sd come from the training fold only.' },
  cheat: 'The SVM margin is a Euclidean distance and the penalty is ½‖w‖², and neither is unit-free: divide a feature by s and its weight cost grows by s². A useful feature in tiny numbers gets ignored (58% against 87%). Fix: z = (x − mean)/sd on each column, fitted on training rows only, with make_pipeline(StandardScaler(), SVC(...)).'
};
