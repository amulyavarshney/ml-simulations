// Lesson for svm-margin/hinge-vs-log: two ways to punish a point, and who gets listened to.
module.exports = {
  idea: 'A loss says how much to punish a point at margin m = y·f(x). The SVM\'s hinge loss is exactly zero once m reaches 1, so safe points are ignored. Logistic regression\'s log-loss never reaches zero, so every point keeps a small pull.',
  why: 'Two models can draw almost the same line and still behave differently. Hinge loss lets only the few points near the street decide, which is why the SVM has support vectors. Log-loss lets every point speak, which is why logistic regression gives probabilities. Mix them up and you will read an SVM score as a probability.',
  analogy: 'A tax office decides how closely to audit returns. One office ignores any return that is clearly in order and spends all its effort on borderline and wrong ones (hinge). Another reads every return, but spends less time the more obviously fine it looks, and never none (log-loss). Both catch the bad returns. Only the second is still nudged by the thousand tidy ones.',
  vocab: [
    ['Margin m = y·f(x)', 'One number per point. Positive: correct side. Negative: wrong side. At m = 1 the point sits exactly on a street edge. Larger m means more confidently correct.'],
    ['Loss', 'The penalty one point adds, as a function of its margin. Training searches for the line with the smallest total penalty plus the ½‖w‖² term.'],
    ['0–1 loss', '1 for a wrong point, 0 for a right one. It is what we care about, but it is flat except for one jump, so it gives an optimiser no direction.'],
    ['Hinge loss', '<span class="eq">max(0, 1 − m)</span>. Zero for m ≥ 1, then rises by 1 for each unit of margin lost. Same as the slack ξ of the soft margin.'],
    ['Log-loss', '<span class="eq">ln(1 + e<sup>−m</sup>)</span>. Smooth and always above zero. It is 0.693 at m = 0 and falls towards 0 as m grows.'],
    ['Pull (slope)', 'The slope of a point\'s loss at its margin. It is the strength with which the point drags the line. Slope 0 means no pull.'],
    ['Sigmoid σ(f)', '<span class="eq">1/(1 + e<sup>−f</sup>)</span>. Logistic regression squeezes the score f into 0 to 1 and calls it a probability. The SVM has no such step.']],
  steps: [
    { h: 'What we want but cannot train', p: 'We would like to minimise the number of mistakes: loss 1 if m &lt; 0, loss 0 otherwise. But that curve is flat everywhere except for one jump at m = 0. Nudging the line a little changes nothing until a point flips, so there is no slope to follow. We need a smooth stand-in that sits above it.' },
    { h: 'Put every point on one axis', p: 'Each point has a margin <span class="eq">m = y·f(x)</span>. Its sign says which side it is on, and its size says how deep it is. Both losses are drawn against m, so a point at m = 2 gets the same loss whichever customer it is. Remember the landmarks: m = 0 on the boundary, m = 1 on a street edge.' },
    { h: 'Hinge loss: a hockey stick', p: '<span class="eq">max(0, 1 − m)</span>. Left of m = 1 it climbs at slope −1. From m = 1 on, it is flat at exactly 0. A point outside the street costs nothing and has no slope, so it cannot pull the line at all. A point at m = 0.5 costs 0.5 and pulls with full strength 1.' },
    { h: 'Log-loss: a slide that never lands', p: '<span class="eq">ln(1 + e<sup>−m</sup>)</span>. At m = 0 it is 0.693, at m = 1 it is 0.313, at m = 3 it is 0.049, and it never touches 0. Its slope is <span class="eq">−1/(1 + e<sup>m</sup>)</span>: −0.269 at m = 1, −0.119 at m = 2, −0.047 at m = 3. Small, shrinking, never zero.' },
    { h: 'Slope is pull', p: 'The total loss is a sum, so its slope with respect to w is a sum of one term per point. Each term is the point\'s slope times its position. With hinge, every point at m ≥ 1 contributes 0: the line is set by the points in or beyond the street, the support vectors. With log-loss, every point contributes a little, the nearest most.' },
    { h: 'Same recipe, different loss', p: 'Both minimise <span class="eq">½‖w‖² + C·Σ loss(mᵢ)</span>, and C means the same in both. So with the same C the two lines are close: 4.4° apart on the overlapping preset. Far on the wrong side, both losses grow like a straight line (slopes −1 and −0.92 at m = −2.5), so one wild point has a bounded pull.' },
    { h: 'What each one gives you', p: 'Hinge: a sparse set of support vectors and a line that ignores the crowd, but no probabilities. An SVM score of 2 does not mean 88%. Log-loss: a probability σ(f) and a line that every point nudges. With C tuned, accuracy is usually within noise. "Easy" means outside the street: at a tiny C the street is huge and even a correct point can still be inside it.' }],
  example: {
    title: 'six applicants, then one easy one',
    setup: 'A trained line gives six applicants these margins <span class="eq">m = y·f(x)</span>: <b>−1.5, 0, 0.5, 1, 2, 3</b>. Compute the hinge loss and the log-loss of each, and the pull each one has on the line.',
    table: { head: ['m', 'Hinge max(0, 1 − m)', 'Log-loss ln(1 + e^−m)', 'Hinge pull', 'Log-loss pull 1/(1 + e^m)'], rows: [
      ['−1.5 (wrong side)', '2.5', '1.7014', '1', '0.8176'],
      ['0 (on the boundary)', '1.0', '0.6931', '1', '0.5000'],
      ['0.5 (inside the street)', '0.5', '0.4741', '1', '0.3775'],
      ['1 (on the edge)', '0', '0.3133', '0', '0.2689'],
      ['2 (outside)', '0', '0.1269', '0', '0.1192'],
      ['3 (outside)', '0', '0.0486', '0', '0.0474'],
      ['<b>Total</b>', '<b>4.0</b>', '<b>3.3574</b>', '<b>3</b>', '<b>2.1307</b>']] },
    walk: [
      'Hinge: <span class="eq">max(0, 1 − m)</span> gives 1 − (−1.5) = 2.5, then 1, then 0.5. At m = 1, 2 and 3 the bracket is zero or negative, so the loss is 0. Total <b>4.0</b>.',
      'Log-loss: for m = 0.5, e<sup>−0.5</sup> = 0.6065, so ln(1.6065) = <b>0.4741</b>. For m = 3, e<sup>−3</sup> = 0.0498, so ln(1.0498) = <b>0.0486</b>. Small, but not zero. Total <b>3.3574</b>.',
      'Pull = size of the slope. Hinge: 1 for the three points with m &lt; 1, and 0 for the others (at m = 1 exactly, the convention is 0). Log-loss: <span class="eq">1/(1 + e<sup>m</sup>)</span>, which gives 0.8176, 0.5, 0.3775, 0.2689, 0.1192, 0.0474.',
      'Now add one <b>easy applicant at m = 4</b>. Hinge: loss 0 and pull 0, so the SVM objective does not change and its line stays put. Log-loss: loss 0.0181 and pull 0.0180, so logistic regression still shifts a little.',
      'One easy point pulls little, but the crowd adds up. A point at m = 0.5 has pull 0.3775. A point at m = 3 has 0.0474. If they sit in similar places, <b>8 points at m = 3</b> (0.3775 ÷ 0.0474) pull as hard as one point inside the street. For the hinge, no number of them would.'],
    result: 'Hinge listens to 3 of the 6 points and ignores the rest, however many join. Log-loss listens to all 6 with weights from 0.82 down to 0.05. The three points with m ≥ 1 are half the points but only 0.4355 of the total log-loss pull of 2.1307.' },
  read: [
    ['Upper plot: black solid curve', 'Hinge loss against the margin m. It reaches exactly 0 at m = 1, labelled "m = 1".'],
    ['Upper plot: dashed curve in a second colour', 'Log-loss. It stays above zero for every m.'],
    ['Upper plot: grey dashed steps', 'The 0–1 loss: 1 on the left of m = 0, 0 on the right.'],
    ['Upper plot: vertical dashed line, round dot and square dot', 'Your slider value. The round dot sits on the hinge curve, the square dot on the log-loss curve.'],
    ['Panel "At this margin"', 'Five numbers for that m. "Pull on the boundary" is the slope: "full (slope −1)" or "none (0)" for the hinge, "slope −…" for the log-loss.'],
    ['Lower plot: solid black line with dashed street and rings', 'The SVM line, its street edges and its support vectors.'],
    ['Lower plot: dashed line in the second colour', 'The logistic regression line, fitted to the same points with the same C.'],
    ['Readout: Angle between the two lines', 'Angle between the two weight vectors. 0° means the same direction.'],
    ['Readout: Points that shape the SVM line', 'The support-vector count, as "35 of 48". Points inside the street and on the wrong side are included.'],
    ['Readouts: Last easy point, SVM line moved and logistic line moved', 'How far each line moved (in the units of a scale-free line description) when you last pressed the button. "–" until you press it. Values below 0.001 are solver tolerance, not real movement.']],
  experiments: [
    { do: 'Drag "Margin m" to −1.00, then 1.00, then 3.00 and read the panel "At this margin".', see: 'At −1.00: hinge 2.000, log-loss 1.313, pulls "full (slope −1)" and "slope −0.731". At 1.00: hinge 0.000, log-loss 0.313, pulls "none (0)" and "slope −0.269". At 3.00: hinge 0.000, log-loss 0.049, pull "slope −0.047".', why: 'The hinge curve is flat from m = 1 onwards, so it has no slope there. The log-loss curve keeps falling and flattening but never reaches zero, so a small pull remains.' },
    { do: 'Drag "Margin m" down to −2.5.', see: 'Hinge loss 3.500 and log-loss 2.579, with pulls "full (slope −1)" and "slope −0.924". The two curves run almost parallel.', why: 'Far on the wrong side both losses are close to straight lines of slope −1. A single wild point cannot pull harder than that, which makes both losses robust to outliers.' },
    { do: 'Reload the page. With <i>Overlapping groups</i> and C = 1, press <i>Add an easy point far away</i> three times, reading "Last easy point" after each press.', see: 'SVM line moved: 0.0001, 0.0001, 0.0001. Logistic line moved: 0.0113, 0.0093, 0.0077. "Points that shape the SVM line" goes 35 of 49, 35 of 50, 35 of 51.', why: 'The new point lands outside the SVM street, where the hinge has slope 0. The SVM numbers are solver tolerance. The log-loss still has slope −1/(1 + e<sup>m</sup>) there, so the logistic line shifts far more (0.0113 against 0.0001).' },
    { do: 'Reload, drag C to the far left (0.01), then press <i>Add an easy point far away</i> once.', see: 'The SVM line moves by 1.2916 and the logistic line by 0.2979. "Points that shape the SVM line" reads "49 of 49": every point is a support vector.', why: 'At C = 0.01 the street is very wide, so the new point, though correct, is still inside it, where the hinge has slope −1. "Easy" means outside the street, not just correctly classified.' },
    { do: 'Reload. At C = 1 read "Angle between the two lines" and "Points that shape the SVM line" on each of the three presets. Then, on <i>Two separated groups</i>, press <i>Add an easy point far away</i>.', see: 'The angle is 4.4° (<i>Overlapping groups</i>, 35 of 48), 9.5° (<i>Two separated groups</i>, 7 of 28) and 9.9° (<i>Separated groups + one odd point</i>, 6 of 27). On the separated groups both lines then barely move (SVM 0.0002, logistic 0.0004).', why: 'On well-separated data the added point is at m ≈ 6 for the logistic fit, where its pull is only 0.002. The pull falls like e<sup>−m</sup>. The two lines stay within 10° of each other. The SVM line is built from few points only when the data are clean: on overlapping data 35 of 48 are support vectors.' }],
  remember: [
    { tag: 'Picture', text: '<b>Hockey stick against a slide.</b> Hinge: flat floor from m = 1, then a straight stick up the left. Log-loss: a smooth slide that flattens towards the floor but never lands.' },
    { tag: 'Formula in words', text: 'Both models minimise <span class="eq">½‖w‖² + C × Σ loss(m)</span>. Swap the loss and you swap the model: hinge gives the SVM, log-loss gives logistic regression.' },
    { tag: 'Rule of thumb', text: '<b>Pull = slope.</b> Hinge slope: 1 below m = 1, then 0. Log-loss slope: <span class="eq">1/(1 + e<sup>m</sup>)</span>, which is roughly e<sup>−m</sup> for large m, so it shrinks about 2.7 times per unit of margin.' },
    { tag: 'Sanity check', text: 'List <span class="eq">y·f</span> for your points. Those with y·f &lt; 1 are the ones an SVM listens to. Their count is the support-vector count.' },
    { tag: 'Trick', text: 'An SVM score is a distance-like number, not a probability. For probabilities use logistic regression, or calibrate the SVM later (Session 6).' },
    { tag: 'Link to code', text: '<code>SVC(kernel="linear")</code> uses the plain hinge, but <code>LinearSVC</code> uses the <b>squared</b> hinge by default. Pass <code>loss="hinge"</code> to make them agree. Both <code>SVC</code> and <code>LogisticRegression</code> take the same <code>C</code>.' }],
  mistakes: [
    { wrong: '"Hinge loss is zero for every correctly classified point."', right: 'Only for points with m ≥ 1, outside the street. A correct point at m = 0.5 still costs 0.5 and still pulls with strength 1.' },
    { wrong: '"Log-loss ignores confident points."', right: 'It shrinks their pull but never makes it zero. At m = 3 the pull is 0.047, which adds up over many easy points.' },
    { wrong: '"An easy point can never move an SVM line."', right: 'Only if it is outside the street. At C = 0.01 the street is so wide that a correct point can still be inside it, and then it moves the line by 1.29 in the widget.' },
    { wrong: '"An SVM score of 2 means about 88% probability."', right: 'The sigmoid of an SVM score is not a calibrated probability. Logistic regression is trained so that σ(f) estimates a probability. The SVM is trained only to get the side right with room to spare.' }],
  code: [
    {
      title: 'Hinge loss, log-loss and pull for six margins',
      py: 'import numpy as np\n\nm = np.array([-1.5, 0, 0.5, 1, 2, 3])          # margins y*f(x) of six points\nhinge = np.maximum(0, 1 - m)                    # SVM loss: exactly 0 once m >= 1\nlogloss = np.log1p(np.exp(-m))                  # logistic loss ln(1 + e^-m): never 0\npull = 1 / (1 + np.exp(m))                      # size of the log-loss slope at each m\nprint("hinge   ", hinge.round(4).tolist(), "total", round(float(hinge.sum()), 4))\nprint("log-loss", logloss.round(4).tolist(), "total", round(float(logloss.sum()), 4))\nprint("log pull", pull.round(4).tolist(), "total", round(float(pull.sum()), 4))\nprint("m = 4: hinge", max(0, 1 - 4), " log-loss", round(float(np.log1p(np.exp(-4))), 4), " log pull", round(float(1 / (1 + np.exp(4))), 4))',
      out: 'hinge    [2.5, 1.0, 0.5, 0.0, 0.0, 0.0] total 4.0\nlog-loss [1.7014, 0.6931, 0.4741, 0.3133, 0.1269, 0.0486] total 3.3574\nlog pull [0.8176, 0.5, 0.3775, 0.2689, 0.1192, 0.0474] total 2.1307\nm = 4: hinge 0  log-loss 0.0181  log pull 0.018',
      walk: [
        ['np.maximum(0, 1 - m)', 'Compares 0 with <code>1 - m</code> for every element and keeps the larger. Negative values become 0, which is the flat part of the hinge.'],
        ['np.log1p(np.exp(-m))', '<code>log1p(z)</code> is <code>log(1 + z)</code> computed accurately for small z. With z = e<sup>−m</sup> it is the log-loss.'],
        ['1 / (1 + np.exp(m))', 'The size of the log-loss slope, the "pull". It equals σ(−m), the probability the model gives to being wrong.'],
        ['hinge.round(4).tolist()', '<code>round(4)</code> keeps 4 decimals; <code>tolist()</code> turns the array into a plain Python list so it prints cleanly.'],
        ['round(float(hinge.sum()), 4)', '<code>sum()</code> adds the six losses. <code>float()</code> strips NumPy\'s type so <code>round</code> prints a plain number.']],
      tip: 'These are the numbers in the worked example: the m = 4 row shows that the hinge pull is exactly 0 while the log pull is 0.018.'
    },
    {
      title: 'Add one easy point: which line moves?',
      py: 'import numpy as np\nfrom sklearn.datasets import make_blobs\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.svm import SVC\n\nX, y = make_blobs(n_samples=60, centers=[[-1, 0], [1, 0.5]], cluster_std=1.0, random_state=0)\nX2, y2 = np.vstack([X, [1.0, 1.0]]), np.append(y, 1)        # one easy class-1 point, just outside the SVM street\nline = lambda m: np.append(m.coef_[0], m.intercept_[0]) / np.linalg.norm(m.coef_[0])   # (w, b) / |w|\nfor model in [SVC(kernel="linear", C=1), LogisticRegression(C=1)]:\n    before = line(model.fit(X, y))\n    after = line(model.fit(X2, y2))\n    print(type(model).__name__, "moved by", round(float(np.linalg.norm(after - before)), 3))',
      out: 'SVC moved by 0.0\nLogisticRegression moved by 0.009',
      walk: [
        ['np.vstack([X, [1.0, 1.0]])', 'Stacks a new row under the 60 rows. <code>np.append(y, 1)</code> adds its label, class 1.'],
        ['line = lambda m: ...', 'A one-line function. It joins <code>coef_[0]</code> (w) and <code>intercept_[0]</code> (b) and divides by ‖w‖, so lines that differ only by scale compare as equal.'],
        ['for model in [SVC(...), LogisticRegression(C=1)]', 'The same loop for both models. Both take <code>C</code> and mean the same by it.'],
        ['model.fit(X, y)', 'Trains on the 60 points and returns the model. <code>line(...)</code> reads w and b straight away, before the next fit overwrites them.'],
        ['np.linalg.norm(after - before)', 'The distance between the two scale-free lines. 0 means they are identical.']],
      tip: 'The point (1.0, 1.0) scores f = 1.38 on the SVM line: just outside the street, so the hinge ignores it. Put it at (0.5, 0.5) instead (f = 0.50, inside the street) and the SVM line moves by 0.047, more than the logistic line (0.026).'
    },
    {
      title: 'A score is not a probability',
      py: 'import numpy as np\nfrom sklearn.datasets import make_blobs\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.svm import SVC\n\nX, y = make_blobs(n_samples=60, centers=[[-1, 0], [1, 0.5]], cluster_std=1.0, random_state=0)\nlr, svm = LogisticRegression(C=1).fit(X, y), SVC(kernel="linear", C=1).fit(X, y)\nx_new = [[2.0, 0.5]]\nf = lr.decision_function(x_new)[0]\nprint("logistic: f =", round(float(f), 3), " sigmoid(f) =", round(float(1 / (1 + np.exp(-f))), 3), " predict_proba =", round(float(lr.predict_proba(x_new)[0, 1]), 3))\nprint("SVM: f =", round(float(svm.decision_function(x_new)[0]), 3), " has predict_proba?", hasattr(svm, "predict_proba"))',
      out: 'logistic: f = 3.017  sigmoid(f) = 0.953  predict_proba = 0.953\nSVM: f = 2.17  has predict_proba? False',
      walk: [
        ['lr.decision_function(x_new)', 'The score f = w·x + b of the logistic model. The double brackets in <code>x_new</code> make it one row of two features.'],
        ['1 / (1 + np.exp(-f))', 'The sigmoid. For logistic regression, this equals <code>predict_proba</code>: the model was trained so that it is a probability.'],
        ['lr.predict_proba(x_new)[0, 1]', 'Row 0 (the only point), column 1 (the probability of class 1).'],
        ['hasattr(svm, "predict_proba")', 'False: a plain <code>SVC</code> has no probability output. <code>SVC(probability=True)</code> adds a separate calibration step on top.']],
      tip: 'The SVM score 2.17 tells you the side and a distance-like confidence. Do not run it through a sigmoid and quote the result as a probability.'
    }],
  check: [
    { q: 'You add a correctly classified point far outside the street. Why does an SVM line stay put while a logistic regression line shifts slightly?', options: ['The hinge slope is exactly 0 beyond m = 1, while the log-loss slope is small but never 0', 'The SVM ignores every correctly classified point', 'Logistic regression does not use a margin', 'The SVM uses a smaller C'], answer: 0, why: 'The hinge is flat from m = 1 on, so the point has no pull. The log-loss slope −1/(1 + e^m) is small but never 0. It is not true that the SVM ignores all correct points: a correct point inside the street (0 < m < 1) still has slope −1.' },
    { q: 'A point has margin m = 0.5. What are its hinge loss and its log-loss (natural log)?', options: ['0.5 and 0.474', '0 and 0.474', '0.5 and 0.5', '1.5 and 0.974'], answer: 0, why: 'Hinge = max(0, 1 − 0.5) = 0.5. Log-loss = ln(1 + e^−0.5) = ln(1.6065) = 0.474. The point is correct but inside the street, so the hinge still charges it.' },
    { q: 'You set C = 0.01 so the street becomes very wide, then add a correct point at f = 0.7, which lies inside this wide street. What happens to the SVM line?', options: ['It moves, because the point is inside the street and has hinge slope −1', 'It stays, because the point is correctly classified', 'It stays, because SVM lines never respond to new points', 'It moves only if C is made large'], answer: 0, why: 'The hinge only forgets points with m ≥ 1. At f = 0.7, m = 0.7, so the point is inside the street and pulls with full strength. In the widget, an "easy" point at C = 0.01 moves the SVM line by 1.29.' }],
  teachback: { prompt: 'In two sentences, explain why an SVM ignores points far from the boundary but logistic regression does not.', model: 'Both punish a point by its margin, but the hinge loss drops to exactly zero once a point is outside the street, so it has no slope and cannot pull the line. The log-loss only falls towards zero and never reaches it, so every point, even a very safe one, still gives the line a small push.' },
  cheat: 'Margin m = y·f(x). Hinge max(0, 1 − m): zero for m ≥ 1, slope −1 below, so only points in or beyond the street pull (support vectors). Log-loss ln(1 + e^−m): slope −1/(1 + e^m), small but never 0, so every point pulls and σ(f) works as a probability. Same recipe ½‖w‖² + C·Σ loss, same C.'
};
