// Lesson for svm-margin/soft-margin: slack, the price C, and choosing C by cross-validation.
module.exports = {
  idea: 'The soft margin lets points sit inside the street, or even on the wrong side, at a price of C per unit of violation. Small C: wide street, mistakes tolerated. Large C: narrow street that bends to individual points.',
  why: 'Real classes overlap, and one odd customer can make a hard margin impossible or squeeze it to almost nothing: in the odd-point preset the street shrinks from 1.602 to 0.286 as C rises. C is the dial between trusting every training point and trusting the overall shape. Set it badly and the model either ignores structure or memorises noise.',
  analogy: 'A school wants an empty buffer strip between two playgrounds, as wide as possible. Footballs keep landing in it. Each ball inside the strip, or on the wrong playground, is fined C rupees per metre of intrusion. At ₹0.01 the school keeps a huge strip and pays for many intrusions. At ₹1000 it squeezes the strip until almost no ball lands inside, even if that means a thin strip tilted to dodge one stray ball.',
  vocab: [
    ['Slack ξ (xi)', 'How far a point falls short of the street rule: <span class="eq">ξ = max(0, 1 − y·f(x))</span>. It is 0 for a point on or outside its street edge.'],
    ['C', 'The price of one unit of slack. Not a count of allowed mistakes. The cost to minimise is <span class="eq">½‖w‖² + C·Σξ</span>.'],
    ['Soft margin', 'The SVM that allows slack, so it always has an answer, even when the classes overlap. The hard margin is the limit of very large C.'],
    ['Support vector (soft margin)', 'Any point with <span class="eq">y·f ≤ 1</span>: on a street edge, inside the street, or on the wrong side. Only points outside the street are not support vectors.'],
    ['Training error', 'A training point on the wrong side of the line, <span class="eq">y·f &lt; 0</span>. It has slack above 1.'],
    ['Cross-validated accuracy', 'Split the data into 5 folds. Train on 4, test on the 5th, rotate, and average. It estimates accuracy on points the model did not see.'],
    ['Plateau', 'Past some C, nothing changes any more. On overlapping data, raising C further cannot buy fewer violations.']],
  steps: [
    { h: 'The hard margin cracks', p: 'The hard margin needs every point outside the street on its own side. With overlapping classes no line can do that, so there is no answer. With one odd point, the answer exists but can be terrible: in the "Separated groups + one odd point" preset the street is 0.286 wide at C = 1000, against 1.602 at C = 1.' },
    { h: 'Let a point break the rule, and measure it', p: 'Give each point a slack ξ ≥ 0 and relax its rule to <span class="eq">y·f(x) ≥ 1 − ξ</span>. If ξ = 0 the point obeys. If 0 &lt; ξ &lt; 1 it is inside the street but still on its side. If ξ ≥ 1 it is on the boundary or the wrong side: a training error. Every dataset now has an answer: pick big enough slacks.' },
    { h: 'Charge for slack', p: 'Two wishes now fight: a wide street (small ‖w‖) and little slack. Combine them: minimise <span class="eq">½‖w‖² + C·Σξᵢ</span>. A unit of ½‖w‖² costs 1 and a unit of slack costs C. So C is an exchange rate. Cheap slack (small C) gives in to the wish for width. Expensive slack (large C) gives in to the points.' },
    { h: 'Slack is the hinge loss', p: 'For fixed w and b, the cheapest slack that satisfies both ξ ≥ 0 and ξ ≥ 1 − y·f is <span class="eq">ξ = max(0, 1 − y·f)</span>. That is the <b>hinge loss</b>: zero beyond the street, rising by 1 for every unit you go inside. So the soft margin is "½‖w‖² plus C times total hinge loss". The next simulation compares it with log-loss.' },
    { h: 'What the extremes look like', p: 'As C shrinks, slack is free, w shrinks, the street balloons and every point ends up a support vector (48 of 48 at C = 0.01 in the overlapping preset). As C grows on separable data, the answer approaches the hard margin. On overlapping data it stops changing at about C = 15: some violations cannot be avoided.' },
    { h: 'Who is a support vector now', p: 'In <span class="eq">w = Σ αᵢ yᵢ xᵢ</span> each point has a weight α between 0 and C. Points outside the street have α = 0. Points exactly on an edge have 0 &lt; α &lt; C. Points inside the street or on the wrong side sit at the cap α = C. A point cannot pull harder than C, however far wrong it is.' },
    { h: 'Choose C by cross-validation', p: 'Training accuracy is a poor guide: it is not what the SVM minimises, so it can even fall as C grows. Try C on a log grid (0.01, 0.1, 1, 10, 100), score each with cross-validation, and take a C from the broad best region. It is the bias-variance dial: small C is stable but stiff, large C is flexible but jumpy.' }],
  example: {
    title: 'thirteen applicants: two lines, two prices',
    setup: 'Card utilisation (%). Repaid, label −1: <b>12, 18, 22, 27, 33, 38, 55</b> (the one at 55 is odd). Defaulted, label +1: <b>58, 64, 70, 77, 83, 90</b>. Compare two lines. <b>Soft line:</b> threshold 51, <span class="eq">w = 1/13</span>, so <span class="eq">f(x) = (x − 51)/13</span>. <b>Hard line:</b> threshold 56.5, <span class="eq">w = 1/1.5</span>.',
    table: { head: ['Applicant', 'y', 'f(x) on the soft line', 'y · f', 'Slack ξ = max(0, 1 − y·f)', 'Where it is'], rows: [
      ['38', '−1', '−1.0000', '1.0000', '0', 'on its street edge'],
      ['55', '−1', '0.3077', '−0.3077', '1.3077', 'wrong side: ξ > 1'],
      ['58', '+1', '0.5385', '0.5385', '0.4615', 'inside the street, right side'],
      ['64', '+1', '1.0000', '1.0000', '0', 'on its street edge'],
      ['other 9', '', 'beyond ±1', '> 1', '0', 'outside the street']] },
    walk: [
      'Score every applicant on the soft line, <span class="eq">f = (x − 51)/13</span>. For 55 (repaid, so y = −1): f = 4/13 = 0.3077, so y·f = −0.3077. Slack = 1 − (−0.3077) = <b>1.3077</b>. It is on the wrong side.',
      'For 58 (defaulted, y = +1): f = 7/13 = 0.5385, y·f = 0.5385, slack = 1 − 0.5385 = <b>0.4615</b>. Inside the street, but on the right side. The other nine have y·f ≥ 1, so zero slack. Total <b>Σξ = 1.7692</b>.',
      'Cost of the soft line at C = 0.01: <span class="eq">½(1/13)² + 0.01 × 1.7692 = 0.00296 + 0.01769 = <b>0.02065</b></span>.',
      'Cost of the hard line: every applicant is outside its street (55 and 58 sit exactly on the edges), so Σξ = 0 and the cost is just <span class="eq">½(1/1.5)² = <b>0.2222</b></span>, for every C.',
      'At C = 0.01 the soft line costs 0.02065 against 0.2222, ten times less, so it wins. At C = 1 the soft line costs 0.00296 + 1.7692 = 1.7722, the hard line still 0.2222, so the hard line wins. These two lines tie at <span class="eq">C = (0.2222 − 0.00296)/1.7692 = 0.124</span>.',
      'The prediction flips with the winner. Applicant 52: soft line f = 1/13 = 0.077, positive, so <b>defaulted</b> (barely). Hard line f = (52 − 56.5)/1.5 = −3, so <b>repaid</b>.'],
    result: 'The same data and the same two lines, but C decides the winner. SVC at C = 0.01 returns exactly the soft line (threshold 51, 4 support vectors: 38, 55, 58, 64) and at C = 1 exactly the hard line. At C = 0.1 a third compromise line (threshold 56.5, half-width 3.33, cost 0.155) is cheaper than both. C is a price, not a count of mistakes.' },
  read: [
    ['Blue circles and orange triangles', 'Class A and class B. Use "Click on the plot to…" to add blue, add orange or remove a point. Dragging a point always moves it.'],
    ['Tinted regions', 'Predicted class at each place: blue side and orange side. The tint deepens with the distance from the line.'],
    ['Solid black line, two dashed lines', 'The boundary <span class="eq">f = 0</span> and the street edges <span class="eq">f = ±1</span>, the orange dashes on the orange side and the blue dashes on the blue side.'],
    ['Black rings', 'Support vectors. Unlike the hard-margin page, rings now include points inside the street and on the wrong side.'],
    ['Short black segments', 'The slack of a rule-breaking point: a segment from the point to its own class\'s dashed edge. Its length is ξ/‖w‖. A point on the wrong side gets a segment that crosses the whole street.'],
    ['Readouts: Street width, Support vectors, Training errors, Training accuracy', 'Street width is 2/‖w‖. "Support vectors" reads like "21 of 48". Errors are points on the wrong side.'],
    ['Readout: 5-fold cross-validated accuracy', 'Stratified 5-fold with a fixed shuffle, so the same data and C always give the same number.'],
    ['Readouts: ½‖w‖² and C · Σξ', 'The two parts of the cost. Divide C · Σξ by C to get Σξ, the raw violation total.'],
    ['Left plot: dashed and solid curves', 'Dashed is training accuracy, solid is cross-validated accuracy, against C on a log scale. The vertical dashed line is your C. The diamond marks the best cross-validated accuracy.'],
    ['Right plot: street width against C', 'The width at every C. It falls as C rises and then goes flat.']],
  experiments: [
    { do: 'On <i>Overlapping groups</i>, drag C from the far left (0.01) to the far right (1.0e+3) and compare the readouts at the two ends.', see: 'Street width falls from 5.462 to 1.218. Support vectors fall from "48 of 48" to "18 of 48". ½‖w‖² grows from 0.07 to 1.35. Cross-validated accuracy moves only from 81.3% to 83.3%.', why: 'At small C slack is almost free, so the SVM prefers a tiny w, a huge street, and every point inside or on it. At large C slack is dear, so the street must shrink to keep most points outside it.' },
    { do: 'Drag C from about 20 up to the far right and watch the readouts.', see: 'Street width stays 1.218 and support vectors stay "18 of 48". Only C · Σξ keeps growing, from about 350 to about 17,690, because C multiplies it.', why: 'This is the plateau. The classes overlap, so some violations stay however much you charge. Σξ is stuck near 17.69, and the same line is optimal at every larger C.' },
    { do: 'On <i>Overlapping groups</i>, read Training accuracy with C at 1 and then with C at the far right.', see: 'It is 88% (6 errors) at C = 1 and 83% (8 errors) at C = 1.0e+3. It went down while C went up.', why: 'The SVM does not minimise the number of errors. It minimises hinge loss, which also counts how far inside the street the correct points are. A line with the lower hinge total can have more errors.' },
    { do: 'Choose <i>Separated groups + one odd point</i> (before pressing New sample). Compare C about 1 with C at the far right.', see: 'At C ≈ 1: width 1.602, "4 of 27" support vectors, 1 training error, cross-validated 96.3%. At the far right: width 0.286, "3 of 27", 0 errors, but cross-validated 92.6%. The boundary has twisted to put the odd orange point on its own side.', why: 'At large C the odd point is too expensive to ignore, so the line bends round it and the street shrinks. Training accuracy reaches 100%, but the line is now fitted to one unusual point, which costs accuracy on unseen points.' },
    { do: 'Choose <i>Two separated groups</i>, press <i>Add an outlier</i> (a blue point inside the orange group), and compare C about 1 with C at the far right.', see: 'The new point is on the wrong side at every C. At C ≈ 1 there is 1 training error and a street of 1.555. At the far right there are 2 errors and a street of 1.312.', why: 'A point deep in the other class can never be fitted by a straight line. Its pull is capped at C, so it cannot drag the line far, but the line tilts and gives up one more point.' },
    { do: 'On <i>Overlapping groups</i>, press <i>New sample</i> several times and read the diamond label "best CV at C ≈".', see: 'The label jumps around: about 0.0316, 0.178, 0.316, 0.0562, 0.0562 over the first five presses. It is never at the far right. The gain over C = 1.0e+3 is between 0 and 4 points.', why: 'With 48 points one point is 2.1% accuracy, so the exact peak is noise. Trust the broad region (small to middle C), not the tip of the curve.' }],
  remember: [
    { tag: 'Picture', text: '<b>Fines for trespass.</b> C is the fine per metre. Cheap fines: wide strip, many trespassers (many support vectors). Dear fines: thin strip, few trespassers.' },
    { tag: 'Formula in words', text: 'Cost = (a wish for a wide street) + C × (total rule-breaking). <span class="eq">½‖w‖² + C·Σξ</span>, with <span class="eq">ξ = max(0, 1 − y·f)</span>.' },
    { tag: 'Sanity check', text: 'Compute <span class="eq">y·f</span> first. Above 1: slack 0. Between 0 and 1: slack is 1 − y·f, inside the street. Below 0: wrong side, slack above 1. A negative y·f (not a negative f) is the error sign.' },
    { tag: 'Rule of thumb', text: 'Search C on a <b>log grid</b> (×10 or ×3 steps), because C acts as a multiplier. If training accuracy is far above cross-validated accuracy, lower C.' },
    { tag: 'Trick', text: '<b>Small C means small w.</b> At C = 0.01 the street is 5.46 wide, wider than the whole cloud of points (4.6 across), so no point reaches an edge. A street that wide is a warning that C is too low.' },
    { tag: 'Link to code', text: '<code>SVC(C=1.0)</code> is the default. <code>len(svm.support_)</code> counts support vectors. <code>GridSearchCV(SVC(kernel="linear"), {"C": [...]})</code> picks C by cross-validation.' }],
  mistakes: [
    { wrong: '"C is the number of mistakes the SVM may make."', right: 'C is a <b>price per unit of slack</b>. At C = 0.01 the overlapping preset still makes 9 training errors, and at C = 1000 it makes 8: nearly the same count, a very different street.' },
    { wrong: '"A bigger C always gives higher training accuracy."', right: 'Not even that. In the overlapping preset it is 88% at C = 1 and 83% at C = 1000. The SVM minimises hinge loss, not the error count.' },
    { wrong: '"Support vectors are the misclassified points."', right: 'They are every point with <span class="eq">y·f ≤ 1</span>: misclassified, inside the street, and exactly on an edge. At C = 0.01 all 48 points are support vectors.' },
    { wrong: '"The soft margin is only for overlapping data."', right: 'On separable data too. In the <i>Two separated groups</i> preset a small C gives a wide street with every point a support vector (28 of 28 at C = 0.01) and a larger C gives the 0.640-wide hard margin.' }],
  code: [
    {
      title: 'Compute slack and the cost by hand on thirteen applicants',
      py: 'import numpy as np\nfrom sklearn.svm import SVC\n\nx = np.array([12, 18, 22, 27, 33, 38, 55, 58, 64, 70, 77, 83, 90])   # card utilisation, %\ny = np.array([-1] * 7 + [1] * 6)       # -1 repaid (55 is the odd one), +1 defaulted\nC, X = 0.01, x.reshape(-1, 1)\nsvm = SVC(kernel="linear", C=C).fit(X, y)\nw = svm.coef_[0, 0]\nslack = np.maximum(0, 1 - y * svm.decision_function(X))   # 0 if outside the street\nprint("threshold", round(float(-svm.intercept_[0] / w), 2), " half-width", round(float(1 / w), 2))\nprint("slack:", {int(a): round(float(s), 4) for a, s in zip(x, slack) if s > 0.001})\nprint("objective:", round(float(0.5 * w**2 + C * slack.sum()), 5))',
      out: 'threshold 51.0  half-width 13.0\nslack: {55: 1.3077, 58: 0.4615}\nobjective: 0.02065',
      walk: [
        ['y * svm.decision_function(X)', 'The score <span class="eq">f = w·x + b</span> of every applicant, times the label, gives <span class="eq">y·f</span>. Positive means correct side; at least 1 means outside the street.'],
        ['np.maximum(0, 1 - y * f)', 'Slack: <code>np.maximum</code> compares element by element, so negative values (points safely outside) become 0. This is the hinge loss.'],
        ['zip(x, slack)', 'Pairs each applicant with its slack so the dictionary comprehension can keep only the rule breakers (<code>s &gt; 0.001</code> ignores rounding dust).'],
        ['0.5 * w**2 + C * slack.sum()', 'The soft-margin cost: ½w² (the wide-street wish) plus C times the total slack. <code>w**2</code> is "w squared".'],
        ['float(...)', 'Turns a one-element NumPy value into an ordinary Python number so <code>round</code> prints cleanly.']],
      tip: 'The printed objective 0.02065 is the number you computed by hand in the worked example.'
    },
    {
      title: 'Sweep C: width, support vectors, training and cross-validated accuracy',
      py: 'from sklearn.datasets import make_classification\nfrom sklearn.model_selection import cross_val_score\nfrom sklearn.svm import SVC\nimport numpy as np\n\nX, y = make_classification(n_samples=80, n_features=30, n_informative=4, n_redundant=0, random_state=3)\nfor C in [0.001, 0.01, 0.1, 1, 100]:\n    svm = SVC(kernel="linear", C=C).fit(X, y)\n    width = 2 / np.linalg.norm(svm.coef_[0])          # street width 2/||w||\n    cv = cross_val_score(SVC(kernel="linear", C=C), X, y, cv=5).mean()\n    print(f"C={C:<6} width={width:6.2f} support={len(svm.support_):2d} train={svm.score(X, y):.3f} cv={cv:.3f}")',
      out: 'C=0.001  width= 22.28 support=80 train=0.863 cv=0.738\nC=0.01   width=  3.53 support=71 train=0.863 cv=0.812\nC=0.1    width=  1.53 support=46 train=0.963 cv=0.775\nC=1      width=  0.64 support=27 train=0.988 cv=0.787\nC=100    width=  0.49 support=26 train=1.000 cv=0.762',
      walk: [
        ['make_classification(..., random_state=3)', 'Builds a made-up dataset: 80 rows, 30 features of which only 4 carry signal. Many noisy features are what makes a large C overfit. <code>random_state</code> fixes the draw.'],
        ['np.linalg.norm(svm.coef_[0])', '‖w‖, the length of the weight vector. The street width is 2 divided by it.'],
        ['cross_val_score(SVC(...), X, y, cv=5).mean()', 'Five fits, each tested on the part it did not see. It builds a <i>new</i> unfitted model each time, so the earlier <code>fit</code> is not reused. The mean is the cross-validated accuracy.'],
        ['svm.score(X, y)', 'Accuracy on the same rows it trained on: training accuracy. It can only flatter the model.'],
        ['f"{width:6.2f}"', 'An f-string format: 6 characters wide, 2 decimals, so the columns line up.']],
      tip: 'Read down the columns: width and support vectors fall steadily, training accuracy climbs to 1.000, but the cross-validated accuracy is highest at C = 0.01 and never beats that again.'
    },
    {
      title: 'Let GridSearchCV pick C',
      py: 'from sklearn.datasets import make_classification\nfrom sklearn.model_selection import GridSearchCV\nfrom sklearn.svm import SVC\n\nX, y = make_classification(n_samples=80, n_features=30, n_informative=4, n_redundant=0, random_state=3)\ngrid = {"C": [0.001, 0.01, 0.1, 1, 100]}           # log-spaced: each step is x10\nsearch = GridSearchCV(SVC(kernel="linear"), grid, cv=5).fit(X, y)\nprint("best:", search.best_params_, round(search.best_score_, 3))\nprint("model refit on all data:", search.best_estimator_.C)',
      out: 'best: {\'C\': 0.01} 0.812\nmodel refit on all data: 0.01',
      walk: [
        ['grid = {"C": [...]}', 'A dictionary: the key is the name of the parameter to vary and the value is the list of settings to try.'],
        ['GridSearchCV(SVC(kernel="linear"), grid, cv=5)', 'Tries every setting with 5-fold cross-validation and records the mean score of each.'],
        ['.fit(X, y)', 'Runs the search, then refits the best setting on <i>all</i> of the data.'],
        ['search.best_params_ and best_score_', 'The winning C and its cross-validated accuracy, the same 0.812 as in the sweep above.'],
        ['search.best_estimator_', 'The refitted model, ready for <code>predict</code>.']],
      tip: 'Do not report best_score_ as your final accuracy: you chose C because it scored best on these folds. Keep a separate test set for the honest number.'
    }],
  check: [
    { q: 'You raise C from 0.1 to 100 on overlapping classes. What happens to the street and to the points inside it?', options: ['The street narrows and fewer points sit inside it', 'The street widens so more points fit inside it', 'The street does not change, because C only matters for separable data', 'C sets the number of points allowed inside, so exactly 100 are allowed'], answer: 0, why: 'A larger C makes each unit of slack dearer, so the SVM shrinks the street and pushes more points outside it. On overlapping data this stops changing once C is large enough (the plateau).' },
    { q: 'A point has label y = −1 and the model scores it f(x) = +0.3. What is its slack ξ?', options: ['1.3', '0.7', '0', '0.3'], answer: 0, why: 'y·f = (−1)(0.3) = −0.3, which is negative: wrong side. ξ = max(0, 1 − (−0.3)) = 1.3. Using f alone instead of y·f gives the tempting but wrong 0.7.' },
    { q: 'A linear SVM at C = 100 scores 100% training and 81% five-fold cross-validated accuracy, with scaled features. What do you try first?', options: ['Lower C, for example 1 or 0.1, and compare cross-validated accuracy', 'Raise C to 10000 to remove the last errors', 'Pick the C with the best training accuracy', 'Remove the scaling'], answer: 0, why: 'A large gap between training and validation accuracy means the line is fitted to individual points. A smaller C widens the street and shrinks w. Choose the new C by cross-validation, never by training accuracy.' }],
  teachback: { prompt: 'In two sentences, explain what C does in a soft-margin SVM and how you would choose it.', model: 'C is the price the SVM pays per unit a point breaks the street rule: a small C lets many points inside a wide street, a large C forces a narrow street that bends to individual points. I do not guess it: I try C on a log grid and pick from the broad best region of the cross-validated accuracy.' },
  cheat: 'Soft margin: minimise ½‖w‖² + C·Σξ with slack ξ = max(0, 1 − y·f), the hinge loss. C is a price per unit of violation, not a count. Small C: wide street, many support vectors, tolerates errors. Large C: narrow street, fits single points. On overlapping data it plateaus. Choose C on a log grid by cross-validation.'
};
