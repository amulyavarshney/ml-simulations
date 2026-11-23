// Lesson for svm-beyond/one-class: the one-class SVM, nu and gamma.
module.exports = {
  idea: 'Learn what normal looks like, with no labels. The one-class SVM puts a bump on each support vector and calls the region where the total is high enough "normal". The knob <b>ν</b> caps the share of training points left outside.',
  why: 'Fraud, faults and attacks are rare and keep changing shape, so you seldom have enough labelled examples to train an ordinary classifier. Normal data is plentiful. If you describe it well, anything that does not fit gets flagged, even a kind of anomaly you have never seen. A boundary that is too loose misses real problems. One that is too tight raises false alarms.',
  analogy: 'A bouncer who has only ever met the regular guests. He cannot describe a troublemaker, but he knows the regulars. Anyone who looks unlike all of them gets a second look. He accepts that a few regulars are a bit odd (that is ν). If he memorises each regular\'s face too exactly (a large γ), he starts stopping the regulars\' own cousins at the door.',
  vocab: [
    ['Anomaly (novelty) detection', 'Finding points that do not fit the training data, when you have no labels for the bad cases.'],
    ['Bump', 'The RBF kernel <span class="eq">K(x, xᵢ) = exp(−γ‖x − xᵢ‖²)</span>. It is 1 at the point xᵢ and falls towards 0 with distance. Its width is about <span class="eq">1/√(2γ)</span>: 1.0 at γ = 0.5, 0.32 at γ = 5.'],
    ['Score f(x)', '<span class="eq">Σ αᵢ·K(xᵢ, x) − ρ</span>. Positive means inside the normal region, 0 is the boundary, negative means unusual.'],
    ['Weight αᵢ', 'A number between 0 and 1 for each training point. Most are 0. The weights add up to <span class="eq">ν·n</span>.'],
    ['Support vector (here)', 'A training point with weight above 0. It is on the boundary (weight between 0 and 1) or outside it (weight exactly 1).'],
    ['ρ (rho)', 'The threshold. The summed bumps must reach ρ for a point to count as normal.'],
    ['ν (nu)', 'A budget between 0 and 1. It is an upper bound on the share of training points outside and a lower bound on the share that are support vectors.'],
    ['γ (gamma)', 'Sets the bump width. Small γ: wide bumps, a smooth blob. Large γ: narrow bumps, a boundary that hugs individual points.']],
  steps: [
    { h: 'The problem: only normal examples', p: 'You have 1,000 ordinary card transactions and no labelled frauds. A classifier needs two classes, so it cannot be trained. What you can do is describe the region of space where normal transactions live, and call everything outside it unusual.' },
    { h: 'Build the region from bumps', p: 'Put a bump on a training point: height 1 at the point, falling to almost 0 a few widths away. Add up bumps from several points to make a landscape of hills. Draw a contour at height ρ. Inside the contour the hills are high: normal. Outside they are low: unusual. That contour is the black line on the page.' },
    { h: 'Which points get a bump, and how tall', p: 'Each point gets a weight α between 0 and 1, and most get 0. The SVM picks the weights that make the combined hill as low as it can overall (it minimises <span class="eq">ΣΣ αᵢαⱼK(xᵢ, xⱼ)</span>). Two close points have K near 1, so weighting both stacks up. Weight placed on points far apart costs less, so it lands on the <b>outskirts</b> of the cloud.' },
    { h: 'ν: a budget of weight', p: 'The weights must add up to <span class="eq">ν·n</span>, and none can exceed 1. With n = 120 and ν = 0.1 the total is 12. Only 12 points can have weight 1, and a point strictly outside always has weight 1, so <b>at most νn points lie outside</b>. Carrying a total of 12 needs at least 12 non-zero weights, so <b>at least νn points are support vectors</b>.' },
    { h: 'ν is a ceiling, not a quota', p: 'The bound says "at most", so the number outside can be far smaller. On the page, ν = 0.05 on the default cloud leaves 0 of 120 points outside. An isolated far point has only its own bump to lift its score, and that bump carries at most weight 1. It is flagged only when ρ is too high for weight 1 to reach. Small ν keeps ρ low (1.04 at ν = 0.05 on the page), so the boundary stretches to touch the far point instead.' },
    { h: 'γ: how closely to follow the points', p: 'Small γ gives wide bumps that merge into one smooth blob. Large γ gives narrow bumps that each stand alone. The boundary then splits into islands, almost every point becomes a support vector, and nothing in the training set is outside. This looks perfect on the training data and fails on new data.' },
    { h: 'What the score is not', p: 'The score is not a probability and not a density. Its size scales with νn, so only its sign and its ordering are meaningful. And ν is not the false-alarm rate on new data: it bounds the <i>training</i> points. On the page with ν = 0.1, 7.5% of the training points are outside, but about 15% of fresh normal points are.' }],
  example: {
    title: 'ten customers, ν = 0.3, by hand',
    setup: 'Ten customers\' normal daily spend, in ₹ thousand: <b>1.0, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.1, 2.4, 4.0</b>. Fit an RBF one-class SVM with <b>γ = 0.5</b> and <b>ν = 0.3</b>. The fit gives ρ = 1.570.',
    table: { head: ['Spend x', 'Weight α', 'Score f(x)', 'Role'], rows: [
      ['1.0', '1.000', '−0.086', 'weight at the cap: outside, flagged'],
      ['1.2', '0.162', '0.000', 'between 0 and 1: on the boundary'],
      ['1.3', '0', '+0.031', 'inside, no weight'],
      ['1.5', '0', '+0.070', 'inside, no weight'],
      ['1.6', '0', '+0.079', 'inside, no weight'],
      ['1.8', '0', '+0.080', 'inside, no weight'],
      ['2.0', '0', '+0.063', 'inside, no weight'],
      ['2.1', '0', '+0.050', 'inside, no weight'],
      ['2.4', '0.838', '0.000', 'between 0 and 1: on the boundary'],
      ['4.0', '1.000', '−0.323', 'weight at the cap: outside, flagged']] },
    walk: [
      'The budget: <span class="eq">νn = 0.3 × 10 = 3</span>. The ten weights must add to 3 and each is at most 1. Check the table: 1.000 + 0.162 + 0.838 + 1.000 = <b>3.000</b>.',
      'Count the points at the cap (weight 1): two (x = 1.0 and 4.0). Both have negative scores, so both are outside. Two outside is at most 3, as the upper bound promises.',
      'Count the support vectors (weight above 0): four (1.0, 1.2, 2.4, 4.0). Four is at least 3, as the lower bound promises. So 2/10 outside ≤ ν = 0.3 ≤ 4/10 support vectors.',
      'The two with weights between 0 and 1 (x = 1.2 and 2.4) have score exactly 0: they sit on the boundary. The six with weight 0 have positive scores: inside.',
      'Score a point by hand with <span class="eq">f(x) = Σ αᵢ·exp(−0.5·(x − xᵢ)²) − 1.570</span>, using only the four support vectors. At x = 1.5 the bumps are 1·0.8825, 0.162·0.9560 = 0.1549, 0.838·0.6670 = 0.5588 and 1·0.0439. They sum to 1.6403, so f = 1.6403 − 1.570 = <b>+0.070</b>. This matches the table.',
      'Now a new customer who spends 3.0: the four bumps are 0.1353, 0.0321, 0.6997 and 0.6065. They sum to 1.4736, so f = <b>−0.096</b>. Negative: flagged unusual, even though 3.0 is nearer the crowd than 4.0.',
      'The six weight-0 customers never appear in the sum. Only the four support vectors define the score.'],
    result: 'Two outside, four support vectors, weights adding to νn = 3, and a score you can compute from four bumps and ρ. A customer at 1.8 scores +0.080 (normal) and one at 3.0 scores −0.096 (unusual). The bounds hold: 20% outside ≤ ν = 30% ≤ 40% support vectors.' },
  read: [
    ['Blue circles', 'Training points inside the boundary or on it (score ≥ −0.001).'],
    ['Orange triangles', 'Training points clearly outside (score below −0.001). These are the ones the model would flag.'],
    ['Black rings', 'Support vectors: points with weight above 0. Some rings sit on blue circles (on the boundary) and some on orange triangles (outside).'],
    ['Solid black line', 'The boundary, where the score is 0.'],
    ['Blue and orange shading', 'Blue where the score is positive (darker means higher), orange where it is negative.'],
    ['Black star', 'The probe you placed in <i>probe</i> mode.'],
    ['Readout: Training points clearly outside', 'How many training points have a negative score, as a count and a share of all points.'],
    ['Readout: Support vectors', 'How many points carry weight, as a count and a share.'],
    ['Readout: outside ≤ ν ≤ support vectors?', 'Checks the two bounds of step 4. It allows a slack of one point (1/n) for the solver.'],
    ['Readout: Probe score', 'f(x) at your star. The sign says normal or unusual. The size depends on νn, so compare only within one setting.'],
    ['Small closed loop near the centre', 'At the defaults (ν = 0.1, γ = 0.5) the score at the very centre is −0.01. The middle gets its height only from bumps of support vectors on the outskirts, and there it is almost exactly ρ. At γ = 0.2 the loop is gone.']],
  experiments: [
    { do: 'Keep <i>One cloud</i>, γ = 0.5. Set ν = 0.05, read the three fractions, then set ν = 0.3.', see: 'At ν = 0.05: 0 of 120 outside (0.0%), 10 support vectors (8.3%). At ν = 0.3: 33 outside (27.5%), 39 support vectors (32.5%). The check reads "yes, both hold" both times.', why: 'The outside share stays below ν and the support-vector share above it. At ν = 0.05 nothing needs to be outside, so the lower bound is the only one that bites.' },
    { do: 'Press <i>Add 3 far outliers</i> with ν = 0.05. Then slide ν up to 0.10.', see: 'At ν = 0.05 the three far points stay blue and ringed, on the boundary (score about 0.000), and 0 of 123 points are outside. At ν = 0.10 they turn orange (scores about −0.76, −0.90, −0.43) and 8 of 123 are outside. The switch happens between ν = 0.05 and 0.07.', why: 'An isolated point is flagged only if its weight reaches the cap of 1. At ν = 0.05 the threshold ρ is about 1.04, so the outliers settle at weights near 0.8 and sit on the boundary. By ν = 0.07 ρ passes 1.5 and they are pushed to weight 1: outside. A small ν is permissive.' },
    { do: 'With ν = 0.1 raise γ to about 5, then 20, then 50 (the log slider shows its value). Read <i>Support vectors</i> and look at the boundary.', see: 'Support vectors rise to 62 (52%), 100 (83%) and 115 (96%) of 120, while <i>Training points clearly outside</i> stays at 0. The boundary breaks into a handful of islands at γ = 5, then into dozens of tiny blobs.', why: 'Narrow bumps do not overlap, so each training point needs its own. The training set looks perfect, but the gaps between points are now "unusual". On 5,000 fresh points from the same crowd, the flagged share is about 39%, 73% and 92% at these three settings.' },
    { do: 'Set ν = 0.1, γ = 0.5. Choose <i>probe</i>, then click near (1, 0) and near (2.5, 0). Repeat with ν = 0.3.', see: 'At ν = 0.1 the scores are about +0.16 and −0.85, and the sign changes near x = 1.7 along that line. At ν = 0.3 the same two spots read about +0.31 and −5.9.', why: 'The sign tells you the side of the boundary. The size grows with νn because the weights add up to νn. So never compare scores across different ν.' },
    { do: 'Choose <i>Two clusters</i> with ν = 0.1. Probe the gap between them (about 0, 0) at γ = 0.1 and then at γ = 2.', see: 'About +0.55 at γ = 0.1 (normal) and about −0.24 at γ = 2 (unusual).', why: 'Wide bumps (small γ) merge the two clusters into one blob that also covers the empty gap. Narrower bumps respect the gap. Choose γ so that the bump width is smaller than the gaps you care about.' }],
  remember: [
    { tag: 'Picture', text: 'A landscape of <b>hills on support vectors</b>. The black line is the contour at height ρ. Raise γ and the hills become narrow spikes; raise ν and the water level ρ rises, leaving more points on dry ground (outside).' },
    { tag: 'Formula in words', text: 'Score = sum of weighted bumps minus ρ. Weights are in [0, 1] and add up to <b>νn</b>.' },
    { tag: 'Rule of thumb', text: '<b>outside ≤ ν ≤ support vectors.</b> Both sides use the same number νn, so the share outside can never exceed ν and the share of support vectors can never fall below it.' },
    { tag: 'Sanity check', text: 'If almost every point is a support vector and none is outside, γ is too large. The model has memorised the training set.' },
    { tag: 'Rule of thumb', text: 'Start with a small γ (0.1 to 1 for standardised features) and raise it only while held-out <i>normal</i> data stays unflagged. Then use ν to set how many training points you accept as odd. Scale the features first, because γ is measured against distance.' },
    { tag: 'Link to code', text: '<code>OneClassSVM(nu=…, gamma=…)</code>. <code>decision_function</code> gives the score f, <code>predict</code> gives +1 (normal) or −1 (unusual), and <code>offset_</code> is ρ.' }],
  mistakes: [
    { wrong: '"ν = 0.05 means 5% of the points will be flagged."', right: 'It means <b>at most</b> 5% of the training points end up outside. On the default cloud it is 0%. It is a ceiling, not a target.' },
    { wrong: '"ν is the false-alarm rate on new data."', right: 'It bounds the share of the <i>training</i> data outside. On fresh normal data the flagged share can be much higher: 14.6% on the page at ν = 0.1 against 7.5% in training, and 39% at γ = 5.' },
    { wrong: '"A one-class SVM needs examples of anomalies to train."', right: 'It trains on normal data only. You do need a few labelled anomalies to <i>check</i> it, which is the subject of Session 10.' },
    { wrong: '"The score is a probability, highest at the densest part."', right: 'It is a sum of bumps from the support vectors, which sit on the outskirts. It need not peak at the centre (the small loop at the defaults), and its size scales with νn. Use its sign.' },
    { wrong: '"Zero training points outside means a perfect detector."', right: 'With a very large γ it only means every training point has its own bump. Check false alarms on held-out normal data.' }],
  code: [
    {
      title: 'The ten-customer example in scikit-learn',
      py: 'import numpy as np\nfrom sklearn.svm import OneClassSVM\n\nX = np.array([1.0, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.1, 2.4, 4.0]).reshape(-1, 1)  # spend, Rs thousand\noc = OneClassSVM(kernel="rbf", gamma=0.5, nu=0.3, tol=1e-10).fit(X)\nalpha = np.zeros(10)\nalpha[oc.support_] = oc.dual_coef_[0]                 # weights of the support vectors, 0 elsewhere\nprint("alpha:", (np.round(alpha, 3) + 0.0).tolist(), " sum:", round(alpha.sum(), 3))\nprint("rho:", round(float(oc.offset_[0]), 3))\nprint("f(x):", (np.round(oc.decision_function(X), 3) + 0.0).tolist())\nnew = np.array([[1.8], [3.0]])\nprint("new:", (np.round(oc.decision_function(new), 3) + 0.0).tolist(), oc.predict(new).tolist())',
      out: 'alpha: [1.0, 0.162, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.838, 1.0]  sum: 3.0\nrho: 1.57\nf(x): [-0.086, 0.0, 0.031, 0.07, 0.079, 0.08, 0.063, 0.05, 0.0, -0.323]\nnew: [0.08, -0.096] [1, -1]',
      walk: [
        ['OneClassSVM(kernel="rbf", gamma=0.5, nu=0.3, tol=1e-10)', 'No labels are passed anywhere. <code>nu</code> is ν. A tight <code>tol</code> makes the solver stop very close to the exact answer, so values on the boundary print as 0.'],
        ['.fit(X)', 'Only X, no y: this is unsupervised. X must be 2-D, hence the <code>.reshape(-1, 1)</code> above.'],
        ['oc.support_ and oc.dual_coef_[0]', '<code>support_</code> lists the row numbers with non-zero weight and <code>dual_coef_</code> the weights. Scatter them into a zero array to see one weight per customer. They add up to νn = 3.'],
        ['oc.offset_', 'The threshold ρ in <code>f(x) = Σ αᵢK(xᵢ, x) − ρ</code>.'],
        ['oc.decision_function(X)', 'The score f for each row. Zero for the boundary points, positive inside, negative outside.'],
        ['oc.predict(new)', '+1 for normal, −1 for unusual: just the sign of the score. Spend 3.0 gets −1.'],
        ['+ 0.0', 'Turns the rare <code>-0.0</code> that rounding can produce into <code>0.0</code>, so the printout is tidy.']],
      tip: 'Check by hand: 1·exp(−0.5·(3−1)²) + 0.162·exp(−0.5·(3−1.2)²) + 0.838·exp(−0.5·(3−2.4)²) + 1·exp(−0.5·(3−4)²) − 1.570 = −0.096.'
    },
    {
      title: 'Check the two ν bounds on a 2-D cloud',
      py: 'import numpy as np\nfrom sklearn.svm import OneClassSVM\n\nrng = np.random.RandomState(6)\nX = rng.randn(120, 2) * [0.8, 0.7]                      # one cloud of normal customers\n\nfor nu in [0.05, 0.1, 0.3]:\n    oc = OneClassSVM(kernel="rbf", gamma=0.5, nu=nu, tol=1e-8).fit(X)\n    out = np.mean(oc.decision_function(X) < -1e-3)       # share outside the boundary\n    sv = len(oc.support_) / len(X)                       # share that are support vectors\n    print(nu, round(out, 3), round(sv, 3), bool(out <= nu <= sv))',
      out: '0.05 0.008 0.092 True\n0.1 0.067 0.142 True\n0.3 0.292 0.325 True',
      walk: [
        ['rng.randn(120, 2) * [0.8, 0.7]', '120 rows of 2 standard-normal numbers, then column 0 is multiplied by 0.8 and column 1 by 0.7: a cloud wider than it is tall.'],
        ['decision_function(X) < -1e-3', 'A True/False array: which points have a score below −0.001. The small margin stops boundary points from counting as outside.'],
        ['np.mean(...)', 'The mean of True/False values is the share of Trues: 0.067 means 6.7% outside.'],
        ['len(oc.support_) / len(X)', 'The share of points that are support vectors.'],
        ['out <= nu <= sv', 'Python allows chained comparisons: both bounds in one line. The result is True each time.']],
      tip: 'The counts differ from the page (which has its own random numbers), but out ≤ ν ≤ sv holds in both.'
    },
    {
      title: 'Large γ memorises: no training flags, many on new data',
      py: 'import numpy as np\nfrom sklearn.svm import OneClassSVM\n\nrng = np.random.RandomState(6)\nX = rng.randn(120, 2) * [0.8, 0.7]                      # training: normal customers only\nfresh = rng.randn(2000, 2) * [0.8, 0.7]                 # new customers from the same crowd\n\nfor gamma in [0.5, 5, 50]:\n    oc = OneClassSVM(gamma=gamma, nu=0.1, tol=1e-8).fit(X)\n    train = np.mean(oc.decision_function(X) < -1e-3)\n    new = np.mean(oc.decision_function(fresh) < -1e-3)\n    print(gamma, len(oc.support_), round(train, 3), round(new, 3))',
      out: '0.5 17 0.067 0.109\n5 61 0.0 0.393\n50 109 0.0 0.882',
      walk: [
        ['fresh = rng.randn(2000, 2) * [0.8, 0.7]', 'More draws from the same distribution. A real detector must not flag these, so the share flagged here is its false-alarm rate.'],
        ['OneClassSVM(gamma=gamma, nu=0.1, tol=1e-8)', 'Same ν every time; only γ changes. Without <code>kernel=</code> the default is already the RBF kernel.'],
        ['len(oc.support_)', 'Support vectors climb from 17 to 109 of 120: nearly every point has its own bump.'],
        ['train and new', 'Columns 3 and 4 of the printout. <code>train</code> falls to 0 while <code>new</code> climbs to 0.882: the more tightly it fits the training set, the more normal customers it flags.']],
      tip: 'This is the trap on the page: the readout "training points clearly outside" can read 0 while the detector is useless. Always test on held-out normal data.'
    }],
  check: [
    { q: 'A one-class SVM is trained on 200 points with ν = 0.1. Which statement is guaranteed to hold?', options: ['Exactly 20 points are flagged as outside', 'At most 20 points lie strictly outside and at least 20 are support vectors', 'At most 20 points are support vectors', 'Exactly 10% of new data will be flagged'], answer: 1, why: 'The weights add up to νn = 20 and none exceeds 1. Outside points carry weight 1, so there are at most 20 of them. Carrying a total of 20 needs at least 20 non-zero weights, so at least 20 support vectors.' },
    { q: 'n = 50 and ν = 0.2. What is the largest number of training points the model can leave strictly outside?', options: ['0.2', '10', '20', '40'], answer: 1, why: 'Total weight νn = 0.2 × 50 = 10. A point strictly outside has weight 1, so at most 10 of them fit in the budget.' },
    { q: 'You raise γ from 0.5 to 50 with ν = 0.1. On the training data 0 points are outside. What do you expect on fresh normal data?', options: ['Also 0 flagged', 'About 10% flagged', 'Many more flagged than before', 'Nothing can be flagged, because ν is fixed'], answer: 2, why: 'At γ = 50 the bumps are very narrow, so the region is a small island around each training point. Fresh normal points land in the gaps and get flagged. In the snippet 88% of fresh points are flagged at γ = 50. ν only bounds the training data.' }],
  teachback: { prompt: 'In two sentences, explain to a friend how a one-class SVM decides that a new point is unusual, and what ν controls.', model: 'It adds up bumps centred on a few support vectors and calls a new point normal if the total is above a threshold ρ, and unusual otherwise, so it never needs labelled anomalies. ν sets a budget: at most that share of the training points can end up outside, and at least that share become support vectors.' },
  cheat: 'One-class SVM = describe the normal data, flag the rest. Score f(x) = Σ αᵢ·exp(−γ‖x − xᵢ‖²) − ρ (positive normal, negative unusual). Weights αᵢ are in [0, 1] and sum to νn, so outside ≤ ν ≤ support vectors. ν is a ceiling, not the false-alarm rate. Large γ memorises: zero flagged in training, many on new data.'
};
