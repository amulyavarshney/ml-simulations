// Lesson for evaluation/split-lottery: one hold-out score is one draw; K-fold steadies it, but only more rows shrink the sampling error.
module.exports = {
  idea: 'A test accuracy is a measurement, and measurements wobble. With 20 test rows, which 20 you drew can move the score by 40 points. K-fold cross-validation tests every row once and steadies the number, but only more data makes it closer to the truth.',
  why: 'You report one accuracy and someone decides on it: ship the model, or not. If a lucky split gives 100% and an unlucky one 60% for the same model and data, the number says more about the split than about the model. Knowing how big the wobble is tells you how much to trust a score.',
  analogy: 'Judging a student from one 20-question quiz drawn at random from a 100-question bank. A lucky quiz gives her 100%, an unlucky one 60%, with the same knowledge. Five quizzes that together cover all 100 questions, averaged, are far steadier. But if the bank itself is a poor sample of the syllabus, even the average misleads.',
  vocab: [
    ['Hold-out split', 'One random cut of the rows: train on most (here 80%), test on the rest (here 20%). One cut, one score.'],
    ['Test rows (m)', 'The rows a score is measured on. Each one is right or wrong, so the score has a granularity of 100/m points per row.'],
    ['Standard error (SE)', 'The typical wobble of an accuracy measured on m rows when the true accuracy is p: <span class="eq">SE = √(p(1−p)/m)</span>. About 95% of scores fall within ±2 SE of p.'],
    ['K-fold cross-validation', 'Cut the rows into K parts. Each part is the test set once, with the other K−1 parts as training. Average the K scores. Every row is tested exactly once.'],
    ['Repeated K-fold', 'Do the K-fold again with a new shuffle, several times, and average everything. It removes the luck of how the rows were cut.'],
    ['Fresh-data accuracy', 'The accuracy of the model on a very large set of new points (20,000 on the page). It is the target that every estimate tries to hit. Orange dashes mark it.']],
  steps: [
    { h: 'What you want to know', p: 'You will use the model on customers you have not met. The question is its accuracy on them. You cannot ask them yet, so you hold some known rows back, hide their answers from the model, and score it on those rows.' },
    { h: 'One hold-out split', p: 'Shuffle 100 rows, train on 80, test on 20. The score is "number right out of 20". Each row moves it by 5 points. A single hard row is a 5-point swing, and which 20 rows land in the test set is pure luck.' },
    { h: 'How big is the wobble?', p: 'Let the true accuracy be p and the test set have m rows. Then <span class="eq">SE = √(p(1−p)/m)</span>. With p = 0.845 and m = 20, SE = 8.1 points. About 95% of single splits land within ±16 points of the truth. On the page the 200 splits of one model gave scores from 60% to 100%.' },
    { h: 'K-fold: test every row once', p: 'Cut the 100 rows into 5 folds of 20. Train five models, each testing on a different fold, and average the five scores. Now all 100 rows are test rows once. If the five models were identical, SE would be √(p(1−p)/100) = 3.6 points, 2.2 times smaller than 8.1.' },
    { h: 'Repeat it with new shuffles', p: 'The cut itself is a source of luck: a different shuffle gives different folds. Redo the 5-fold with a new shuffle several times and average. On the page the standard deviation of one 5-fold falls from 1.1 points to 0.6 points when each estimate averages five reshuffles. This is a cheap gain, and it needs no new data.' },
    { h: 'Two sources of wobble', p: 'There are two. <b>The cut</b>: how the rows were split, which reshuffling removes. <b>The sample</b>: which 100 customers you happened to be given, which reshuffling cannot touch. The 1.1 and 0.6 above measure only the first. Over 300 fresh samples of 100 rows, 5-fold missed the truth by about 3 points (standard deviation 3.2).' },
    { h: 'Steadier is not the same as true', p: 'Averaging gives a number that does not move when you redraw the splits. It can still be wrong by 3 points or more because all five folds share the same 100 customers. Only more rows shrink the second source. For SE = 2 points you need <span class="eq">n = p(1−p)/0.02² = 327</span> test rows.' },
    { h: 'The test fraction', p: 'A bigger test share steadies a single hold-out but leaves fewer rows to train on. On the page the spread of hold-out scores falls from sd 11.5 points at 10% to 4.2 at 50%. The mean barely moves for this simple 2-feature model, but a flexible model on little data would score worse when trained on 50 rows than on 80.' }],
  example: {
    title: 'how noisy is a test score, for your own numbers',
    setup: 'A model is truly right on <b>p = 0.845</b> of new customers (the value the page measures on its default data). You score it on m test rows. How far from 84.5% can the score land?',
    table: { head: ['Test rows m', 'Points per row', 'SE = √(p(1−p)/m), in points', 'About 95% of scores fall in'], rows: [
      ['10', '10.00', '11.4', '61.6% to 100%'],
      ['20', '5.00', '8.1', '68.3% to 100%'],
      ['50', '2.00', '5.1', '74.3% to 94.7%'],
      ['100', '1.00', '3.6', '77.3% to 91.7%'],
      ['400', '0.25', '1.8', '80.9% to 88.1%'],
      ['1000', '0.10', '1.1', '82.2% to 86.8%']] },
    walk: [
      'Points per row = 100 / m. At m = 20 each row is worth 5 points, so scores come in steps of 5: 60, 65, 70, and so on.',
      'First compute <span class="eq">p(1−p) = 0.845 × 0.155 = 0.131</span>. Then for m = 20: <span class="eq">SE = √(0.131 / 20) = √0.00655 = 0.081</span>, which is 8.1 points.',
      'The band is p ± 2 SE = 84.5 ± 16.2, so 68.3% to 100.7%. A score cannot pass 100%, so cap it: 68.3% to 100%. The page measured the standard deviation of 200 real splits at <b>7.2 points</b>, with a lowest of 60% and a highest of 100%.',
      'Quadrupling the test rows halves the wobble: m = 20 gives 8.1, m = 80 would give 4.0 (the SE has m under a square root). That is why 1,000 test rows are so much steadier than 100.',
      'To reach SE = 2 points: <span class="eq">m = p(1−p) / 0.02² = 0.131 / 0.0004 = 327</span> test rows.',
      'Check against the page: at 10, 20 and 50 test rows (n = 100 with test shares 10%, 20% and 50%) the measured standard deviations were 11.5, 7.2 and 4.2 points. The formula says 11.4, 8.1 and 5.1: close, a little high, because the formula pretends the test rows are fresh.'],
    result: 'With 20 test rows the standard error is 8.1 points, so one hold-out score can sit anywhere from about 68% to 100% for a model that is truly 84.5%. 5-fold cross-validation puts all 100 rows to work (SE near 3.6 points), and reshuffling it removes the luck of the cut. To get below 2 points you need about 327 test rows, which no reshuffle can replace.' },
  read: [
    ['Top plot: the data and the fitted line', 'Two overlapping groups (blue circles and orange triangles). The black line is logistic regression fitted to all points. No line can be perfect, so some points are always on the wrong side.'],
    ['Three histograms', 'Each bar counts how many runs gave an accuracy in that 2-point bin. Top: 200 random hold-out splits. Middle: 100 reshuffled 5-fold runs, one average each. Bottom: 100 runs of 5-fold repeated five times.'],
    ['Black vertical line', 'The mean of the estimates in that histogram.'],
    ['Orange dashed vertical line', 'The accuracy of the line fitted to all the data, measured on 20,000 fresh points. This is what every estimate is trying to hit.'],
    ['Table: mean, sd, lowest, highest, range', 'Summary of each histogram. "sd" is the standard deviation in points, "range" is highest minus lowest.'],
    ['Callout under the table', 'States the fresh-data accuracy and the spread of the hold-out and 5-fold scores for the current data.'],
    ['Slider: Number of points, n', 'Size of the dataset. Moving it redraws the data and reruns everything.'],
    ['Slider: Test fraction', 'Changes only the hold-out split. 5-fold always tests on a fifth.'],
    ['Buttons: New data, Draw the splits again', '<i>New data</i> draws a fresh sample of n points. <i>Draw the splits again</i> keeps the same points and only reshuffles the cuts.']],
  experiments: [
    { do: 'Answer the prediction question, wait for the progress bar to finish, and read the table (default n = 100, 20% test).', see: 'Hold-out: lowest 60.0%, highest 100.0%, sd 7.2 points. 5-fold: sd 1.1, range 6 points. Repeated 5-fold: sd 0.6, range 2.8. The three means are close (82.6%, 83.2%, 83.0%), against 84.5% on fresh data.', why: 'The same model and data give a 40-point spread of scores purely from the choice of 20 test rows. Averaging over folds cuts the spread; it does not move the centre.' },
    { do: 'Slide n from 100 to 40, then to 300. Compare the spreads (try <i>New data</i> a few times at each n).', see: 'Hold-out sd averages about 11.5 points at n = 40, 6.7 at n = 100 and 4.1 at n = 300 over eight datasets. 5-fold sd averages 2.1, 1.1 and 0.5. The hold-out histogram stays the widest by far.', why: 'Fewer rows mean fewer test rows, and SE grows as 1/√m. Small data hurts most, and a single hold-out is the most fragile way to score it.' },
    { do: 'Raise the test fraction to 50%, then lower it to 10%.', see: 'Hold-out sd about 4.2 points at 50% and 11.5 at 10% (range roughly 21 against 40 to 50 points). The mean barely moves (about 82.4% to 82.9%).', why: 'More test rows mean a steadier score. What you pay is training rows (50 instead of 80). A two-feature line is already well fitted with 50 points, so the cost is invisible here. With a flexible model it would not be.' },
    { do: 'Press <i>New data</i> ten times at n = 100. Each time note where the black 5-fold line sits against the orange dashes.', see: 'It does not always land on the dashes. Across 300 fresh samples the 5-fold average was within 2 points of the truth about 44% of the time, within 3 points 66% of the time, and off by up to about 8.', why: 'Each new sample of 100 customers shifts all three histograms together. Reshuffling cannot remove that, because every fold shares the same 100 customers. Only more rows shrink it.' },
    { do: 'Press <i>Draw the splits again</i> a few times, with the data unchanged.', see: 'The hold-out histogram changes shape each time (sd between 7 and 9, lowest between 50% and 60%), while the 5-fold and repeated 5-fold histograms look almost the same (sd stays at 1.1 and 0.6).', why: 'A hold-out score is a fresh draw each time. The two averaged versions have already averaged away the cut, so there is little left that a new shuffle can change.' }],
  remember: [
    { tag: 'Picture', text: 'A <b>20-question quiz</b> from a 100-question bank. One quiz is a draw. Five quizzes covering the whole bank, averaged, are steady. But a poor bank gives a poor average whatever you do.' },
    { tag: 'Formula in words', text: '<b>SE = √(p(1−p)/m).</b> Four times the test rows, half the wobble. At p near 0.85: 20 rows give 8 points, 100 rows 3.6, 1,000 rows 1.1.' },
    { tag: 'Rule of thumb', text: 'Before you trust a score, ask <b>how many rows were behind it?</b> With fewer than about 100 test rows, a difference of 5 points between two models can be luck.' },
    { tag: 'Rule of thumb', text: 'Report 5-fold (or repeated 5-fold) instead of one hold-out for small data. Use <b>repeated</b> K-fold to remove the luck of the cut. Use <b>more rows</b> to remove the luck of the sample.' },
    { tag: 'Sanity check', text: 'If your score changes by more than 1 or 2 points when you only change the random seed of the split, the estimate is not stable enough to compare models with.' },
    { tag: 'Link to code', text: '<code>KFold(5, shuffle=True, random_state=s)</code> and <code>cross_val_score(model, X, y, cv=…)</code>. Changing <code>random_state</code> gives a new cut; the data stay the same.' }],
  mistakes: [
    { wrong: '"My test accuracy is 85%, so the model is 85% accurate."', right: 'It is <b>one draw</b>. With 20 test rows a model that is truly 84.5% can score anything from about 68% to 100%.' },
    { wrong: '"5-fold cross-validation gives the true accuracy."', right: 'It is steadier, not truer. All folds share the same n rows, so a lucky sample moves every fold together. On the page, 5-fold was within 3 points of the truth only about two times in three.' },
    { wrong: '"If I run the split many times and report the best score, I have found the real accuracy."', right: 'Picking the best of 200 splits reports a lucky draw. The best split on the page scores 100% for a model that is 84.5% accurate. Report the mean and the spread.' },
    { wrong: '"Repeating K-fold more times fixes a small dataset."', right: 'It removes the luck of the cut (sd 1.1 down to 0.6) but not the luck of the sample. With 40 points the three estimates on the default page all centre at about 94% while the truth is 84%.' }],
  code: [
    {
      title: 'How noisy is a score measured on m rows?',
      py: 'import numpy as np\n\np = 0.845                                         # the model is right on 84.5% of new customers\nprint("test rows | points per row | SE (points) | 95% band")\nfor m in [10, 20, 50, 100, 400, 1000]:\n    se = 100 * np.sqrt(p * (1 - p) / m)           # standard error of an accuracy measured on m rows\n    lo, hi = 100 * p - 2 * se, min(100, 100 * p + 2 * se)\n    print(f"{m:9d} | {100 / m:14.2f} | {se:11.1f} | {lo:.1f} to {hi:.1f}")\nprint("rows for SE = 2 points:", round(p * (1 - p) / 0.02 ** 2))',
      out: 'test rows | points per row | SE (points) | 95% band\n       10 |          10.00 |        11.4 | 61.6 to 100.0\n       20 |           5.00 |         8.1 | 68.3 to 100.0\n       50 |           2.00 |         5.1 | 74.3 to 94.7\n      100 |           1.00 |         3.6 | 77.3 to 91.7\n      400 |           0.25 |         1.8 | 80.9 to 88.1\n     1000 |           0.10 |         1.1 | 82.2 to 86.8\nrows for SE = 2 points: 327',
      walk: [
        ['np.sqrt(p * (1 - p) / m)', 'The standard error formula. The 100 in front converts a fraction to points.'],
        ['100 * p - 2 * se', 'The low end of the approximate 95% band: two standard errors below the truth.'],
        ['min(100, ...)', 'An accuracy cannot pass 100%, so the upper end is capped.'],
        ['f"{m:9d} | {100 / m:14.2f} | ..."', 'An f-string with column widths. <code>9d</code> is an integer in 9 characters; <code>14.2f</code> is a float with 2 decimals in 14 characters. It keeps the table aligned.'],
        ['p * (1 - p) / 0.02 ** 2', 'Solve SE = 0.02 for m: <code>m = p(1−p)/SE²</code>. Note that <code>**</code> is the power operator and binds tighter than <code>/</code>.']],
      tip: 'The same formula works for any proportion: a conversion rate, a default rate, an error rate. Plug in your own p and m.'
    },
    {
      title: 'The lottery: 200 hold-out splits against 200 reshuffled 5-folds',
      py: 'import numpy as np\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import KFold, cross_val_score, train_test_split\n\nrng = np.random.RandomState(1)\ny = np.repeat([0, 1], 50)\nX = rng.randn(100, 2) + np.outer(2 * y - 1, [0.9, 0.55])        # two overlapping groups\nmodel, hold, k5 = LogisticRegression(), [], []\nfor s in range(200):\n    Xa, Xb, ya, yb = train_test_split(X, y, test_size=0.2, random_state=s)\n    hold.append(model.fit(Xa, ya).score(Xb, yb))                 # one hold-out score\n    k5.append(cross_val_score(model, X, y, cv=KFold(5, shuffle=True, random_state=s)).mean())\nfor name, v in [("hold-out", hold), ("5-fold", k5)]:\n    print(f"{name:8s} mean {np.mean(v):.3f}  sd {np.std(v):.3f}  min {min(v):.2f}  max {max(v):.2f}")',
      out: 'hold-out mean 0.897  sd 0.061  min 0.75  max 1.00\n5-fold   mean 0.896  sd 0.014  min 0.85  max 0.93',
      walk: [
        ['np.outer(2 * y - 1, [0.9, 0.55])', '<code>2*y-1</code> turns labels 0/1 into −1/+1. The outer product shifts each class by ±(0.9, 0.55), so the two groups overlap but are not identical.'],
        ['train_test_split(X, y, test_size=0.2, random_state=s)', 'One random 80/20 cut. The seed <code>s</code> picks the cut, so each of the 200 loops draws a different one. It returns four arrays in the order: train X, test X, train y, test y.'],
        ['model.fit(Xa, ya).score(Xb, yb)', '<code>fit</code> returns the model, so you can chain <code>.score</code>: the accuracy on the test part.'],
        ['KFold(5, shuffle=True, random_state=s)', 'A 5-fold splitter. Without <code>shuffle=True</code> the folds would be contiguous blocks of rows.'],
        ['cross_val_score(model, X, y, cv=...).mean()', 'Trains and scores one model per fold (5 here) and returns the 5 accuracies. <code>.mean()</code> is the 5-fold estimate.'],
        ['np.std(v)', 'The spread of the 200 estimates: the wobble you would get from the cut alone.']],
      tip: 'The mean 0.897 differs from the page (82.6%) because this sample is easier and uses a different random generator. The pattern is the same: the 5-fold spread is about a quarter of the hold-out spread.'
    },
    {
      title: 'What KFold really returns: row numbers, each tested once',
      py: 'import numpy as np\nfrom sklearn.model_selection import KFold\n\nkf = KFold(n_splits=5, shuffle=True, random_state=0)\ntests = [te.tolist() for _, te in kf.split(np.arange(10))]      # test rows of each fold\nprint(tests)\nprint("every row tested once:", sorted(sum(tests, [])) == list(range(10)))',
      out: '[[2, 8], [4, 9], [1, 6], [3, 7], [0, 5]]\nevery row tested once: True',
      walk: [
        ['kf.split(np.arange(10))', 'A generator that yields one <code>(train_indices, test_indices)</code> pair per fold. It needs only the number of rows here, so we pass the numbers 0 to 9.'],
        ['for _, te in ...', 'Unpack each pair. The underscore <code>_</code> is the usual name for a value you do not need (the training rows).'],
        ['te.tolist()', 'Turn the NumPy array of row numbers into a plain list for printing.'],
        ['sum(tests, [])', 'Joins the five lists into one by adding them to an empty list.'],
        ['sorted(...) == list(range(10))', 'If the folds are a proper split, the joined, sorted list is exactly 0 to 9: no row is missing and none is repeated.']],
      tip: 'The same two index arrays are what you use by hand: <code>X[train_idx]</code> and <code>X[test_idx]</code>.'
    }],
  check: [
    { q: 'Which statement about 5-fold cross-validation, compared with one 80/20 hold-out on the same 100 rows, is correct?', options: ['It removes all randomness from the estimate', 'Every row is tested exactly once, so the score rests on 100 test outcomes instead of 20', 'Each model trains on more rows than in the 80/20 split', 'It gives the true accuracy of the model'], answer: 1, why: 'Each fold holds out 20 rows, and across five folds every row is tested once. Each model still trains on 80 rows, and the estimate still carries the sampling error of the 100 rows, so it is not the truth.' },
    { q: 'A model is truly right on 80% of customers. You test on 25 rows. What is the standard error of the measured accuracy?', options: ['0.8 points', '4 points', '8 points', '16 points'], answer: 2, why: 'SE = √(0.8 × 0.2 / 25) = √0.0064 = 0.08, which is 8 points. A 95% band is about ±16 points.' },
    { q: 'You press <i>New data</i>, keeping the same model type and n = 100. What happens to the 5-fold average relative to the orange dashes?', options: ['It lands exactly on the dashes, because 5-fold is stable', 'It shifts by a few points, because it depends on which 100 customers you drew', 'It always rises', 'It does not change, because only the hold-out depends on the data'], answer: 1, why: 'Cross-validation steadies the cut, not the sample. Over 300 fresh samples the 5-fold average differed from the truth with a standard deviation of 3.2 points.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why a single test score is unreliable on small data, and what cross-validation does and does not fix.', model: 'A single hold-out score depends on which few rows were drawn as the test set, so the same model can score 60% or 100% on different draws. K-fold tests every row once and averaging over reshuffles removes the luck of the cut, but all folds still share the same sample of customers, so only more data makes the estimate closer to the truth.' },
  cheat: 'One hold-out score is one draw: SE = √(p(1−p)/m), 8 points for 20 test rows. K-fold tests every row once; repeating it with new shuffles removes the luck of the cut (sd 1.1 down to 0.6 points on the page). Neither removes the luck of the sample: only more rows do (about 327 test rows for SE = 2 points). Steadier is not truer.'
};
