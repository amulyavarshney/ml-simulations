// Lesson for evaluation/nested-cv: the winner's curse of tuning, and the two loops of nested cross-validation.
module.exports = {
  idea: 'The best of m settings is partly luck, so its cross-validation score is too high. <b>Nested cross-validation</b> repeats the whole choosing process inside each training set and scores the winner on rows that took no part in the choice.',
  why: 'Try 50 settings, report the best score (87.9%), and the model you ship delivers about 83.6% on new data. The 4-point gap is paid for in the real world: a forecast, a loan limit or a promise to a client that the model cannot keep. Nested CV tells you the honest number before you ship.',
  analogy: 'A cricket selector watches 50 net bowlers for one over each and picks the one who took the most wickets. That bowler\'s over was partly luck, so in the match he will do worse than the over suggested. To judge the selector\'s <i>method</i>, you must test the chosen bowler in a match that was not part of the selection.',
  vocab: [
    ['Winner\'s curse', 'The best of many noisy scores sits above its true value, because choosing the maximum also chooses the luck.'],
    ['Outer loop', 'Splits the data into outer folds. Each fold is held out once as a test set that <i>judges</i>.'],
    ['Inner loop', 'Cross-validation run <i>inside</i> the outer training rows. It <i>chooses</i> the setting and never sees the outer test fold.'],
    ['best_score_', 'The highest mean CV score GridSearchCV found. It is the maximum of m scores, not an estimate of future accuracy.'],
    ['Refit', 'Training the winning setting once more on all rows available at that level (the outer training rows, inside nested CV).'],
    ['Fit', 'One training of one model on one set of rows. Counting fits tells you the cost.'],
    ['Truth on fresh data', 'In the simulation, the chosen model\'s accuracy on 1,500 new rows from the same generator: the number you wish you knew.']],
  steps: [
    { h: 'The reported score is the maximum of many', p: 'Tuning picks the setting with the highest CV score. Each CV score is the setting\'s true quality plus luck (which rows landed in which fold). Taking the maximum picks the setting whose luck happened to be good, so the reported number sits above what the chosen model will deliver.' },
    { h: 'How big is the luck? A calculation', p: 'Suppose every one of m settings is truly 70% accurate and each CV score is measured on 100 rows, so it has a standard error of √(0.7 × 0.3 / 100) = 0.046. For independent scores the expected best is 70% plus 0.046 times 0, 1.16, 1.54 or 2.25 (m = 1, 5, 10, 50): 70.0%, 75.3%, 77.1%, 80.3%. Nothing was learned. Real scores share rows, so the true inflation is somewhat smaller.' },
    { h: 'Re-scoring on the same rows repeats the luck', p: 'Running the winner through the same folds again gives the same flattering number, because those rows chose it. You need rows that played <b>no part</b> in the choice. A separate hold-out set does this, but with 80 rows a 16-row test set has a standard error of about 9 points and wastes training data.' },
    { h: 'Nested CV: two loops, two jobs', p: 'The <b>outer loop</b> judges, the <b>inner loop</b> chooses. For each outer fold: (1) take its training rows, (2) run an inner cross-validation on them to choose the best setting, (3) refit that setting on all of those training rows, (4) score it once on the outer test fold. Average the outer scores.' },
    { h: 'Count the models', p: 'With K<sub>out</sub> outer folds, K<sub>in</sub> inner folds and m settings, each outer fold costs m × K<sub>in</sub> inner fits plus 1 refit. In total <span class="eq">fits = K<sub>out</sub> × (m × K<sub>in</sub> + 1)</span>. With 5 outer folds, 3 inner folds and 50 settings that is 5 × (150 + 1) = 755 models. A plain GridSearchCV with 5 folds is 5 × 50 + 1 = 251.' },
    { h: 'What the nested number means', p: 'It scores the <i>procedure</i> "tune, then refit", not one particular k. In the simulation, averaged over 40 datasets of 80 rows, nested CV is within 0.3 points of the truth (83.9% against 83.6%). For a single dataset it still wobbles: the nested numbers have a standard deviation of 4.2 points across datasets.' },
    { h: 'Small data is the hardest case', p: 'With 40 rows the best-of-50 score is 5.4 points above the truth, and nested CV is 2 points <i>below</i> it (80.4% against 82.4%), because each outer fold trains on only 32 rows. With 200 rows the best-of-50 is only 2.2 points too high, and nested CV is spot on (84.6% against 84.4%).' },
    { h: 'What you deploy', p: 'Nested CV gives you a number, not a model. To get the model, run the search once on all your training data and keep <code>best_estimator_</code>. Report the nested score as the performance you expect from it.' }],
  example: {
    title: 'counting the models in a tuning plan',
    setup: 'You tune a k-NN classifier on 80 rows over m = 10 settings (k = 1, 3, 5, ..., 19). Count how many models get trained under three plans. Use 5 outer folds and 3 inner folds.',
    table: { head: ['Plan', 'What runs', 'Fits for m = 10', 'Fits for m = 50'], rows: [
      ['One setting, 5-fold CV', '5 folds × 1 setting', '5', '5'],
      ['GridSearchCV, 5 folds, with refit', '5 folds × m settings, then 1 refit', '5 × 10 + 1 = 51', '5 × 50 + 1 = 251'],
      ['Nested: 5 outer, 3 inner', 'per outer fold: 3 inner folds × m settings + 1 refit', '5 × (3 × 10 + 1) = 155', '5 × (3 × 50 + 1) = 755']] },
    walk: [
      'Outer loop: split the 80 rows into 5 outer folds of 16. Take outer fold 1: 64 rows to train and tune on, 16 held out.',
      'Inner loop, on the 64 rows only: 3 inner folds. Each of the 10 settings is fitted 3 times, so 10 × 3 = <b>30 fits</b>. Average each setting\'s 3 scores and pick the highest.',
      'Refit the winner on all 64 rows: <b>1 more fit</b>, total 31. Then score it on the 16 held-out rows. That scoring is only prediction, not a fit. This number took no part in the choice.',
      'Repeat for outer folds 2 to 5: 5 × 31 = <b>155 fits</b>.',
      'The nested estimate is the mean of the 5 outer scores. It estimates the performance of "pick the best k by 3-fold CV, then refit".',
      'Plain GridSearchCV used 51 fits and its <code>best_score_</code> is the maximum of 10 scores, so it carries the luck from step 1 of the lesson.'],
    result: 'Nested CV costs 155 fits against 51, about three times as much. On the simulation\'s default data (m = 50) that buys an estimate of 83.9% against 87.9% for the best-of-50 score, and the truth on fresh data is 83.6%.' },
  read: [
    ['Diagram "Nested cross-validation in one picture"', 'Top: the outer loop, 5 folds, the last one is the test. Below: the inner loop, 3 folds, run on the outer training part only to choose the setting.'],
    ['Slider "Settings tried, m"', 'Uses the first m of 60 k-NN settings (k from 1 to 29, vote weighting, distance type) in a fixed random order. Moving it does not recompute anything, it only reads off the results.'],
    ['Sliders "Rows in each dataset, n" and "Signal strength"', 'Dataset size, and how far apart the two classes sit along two of the four features. "none" means the labels are coin flips. These do recompute (40 datasets each).'],
    ['Readout "Best CV score (what people report)"', 'The best 5-fold score among the m settings, averaged over the 40 datasets.'],
    ['Readout "Nested CV estimate"', 'The nested score (5 outer, 3 inner folds), averaged over the datasets.'],
    ['Readout "Truth on fresh data"', 'The chosen model\'s accuracy on 1,500 new rows. In real life you never have this.'],
    ['Readouts "Best CV minus truth" and "Nested minus truth"', 'How far each estimate is from the truth, in points. The first turns red above 2 points.'],
    ['Line chart "Average score against the number of settings tried"', 'Solid upper line: best CV score. Dashed line: nested estimate. Solid lower line: truth. The vertical dashed line is your m.'],
    ['Plot "One dot per dataset"', 'The three numbers at your m for each of the 40 datasets, with a black bar at the mean. The spread shows that nested CV is right on average, not for each dataset.']],
  experiments: [
    { do: 'Answer "Predict first", then leave the sliders at their defaults (m = 50, n = 80, signal 1.50) and read the readouts.', see: 'Best CV about 87.9%, nested about 83.9%, truth about 83.6%. "Best CV minus truth" is 4.3 points and shows in red.', why: 'The best CV score is the maximum of 50 noisy scores. Nested CV re-chooses inside each training part and is scored on rows that did not choose, so it lands on the truth.' },
    { do: 'Slide <i>Settings tried, m</i> from 1 up to 60 and watch the readouts and the line chart.', see: 'The best CV score climbs from 84.8% at m = 1 to 86.9% at 10, 87.7% at 30 and 88.0% at 60. The truth line stays flat between 83.6% and 83.9%.', why: 'Trying more settings does not improve the model you get, it only adds more chances for luck. At m = 1 nothing was chosen, so there is no flattery (best CV equals nested).' },
    { do: 'Set <i>Signal strength</i> to 0 (none) and slide m from 1 to 60.', see: 'Best CV climbs from about 53% to 61%. Nested stays between 51% and 53%, and the truth at about 50%.', why: 'The labels are coin flips, so no setting can beat 50%. The 11 points of "skill" in the best score are pure selection luck, and nested CV correctly reports none.' },
    { do: 'With m = 50 and strong signal, set <i>Rows, n</i> to 40, then to 200.', see: 'At n = 40: best CV about 87.8% against truth 82.4%, gap 5.4, and nested (80.4%) below the truth. At n = 200: gap 2.2 points and nested within 0.2 of the truth.', why: 'Fewer rows mean noisier fold scores and so bigger luck to pick up. Nested CV also trains each outer fold on fewer rows, so with very little data it errs on the pessimistic side.' },
    { do: 'Press <i>New datasets</i> three times and look at the lower plot "One dot per dataset" each time.', see: 'The averages stay put: best CV minus truth is 3 to 4 points each time and nested minus truth within about 1 point. Individual nested dots spread from roughly 70% to 94%.', why: 'Nested CV is unbiased on average, but one dataset of 80 rows gives one noisy number (standard deviation about 4 points). Report it as an estimate with that uncertainty.' }],
  remember: [
    { tag: 'Picture', text: '<b>Two loops, two jobs.</b> The outer loop judges, the inner loop chooses. The outer test fold never takes part in a choice.' },
    { tag: 'Formula in words', text: '<span class="eq">fits = K<sub>out</sub> × (m × K<sub>in</sub> + 1)</span>. Outer folds times (settings times inner folds, plus one refit). 5 × (50 × 3 + 1) = 755.' },
    { tag: 'Rule of thumb', text: '<b>The reported best rises with m, the truth does not.</b> 84.8% to 88.0% against 83.7% to 83.6% in the simulation. A bigger search buys luck, not quality.' },
    { tag: 'Sanity check', text: '<b>Coin-flip test.</b> Replace your labels with coin flips and run your tuning procedure. Nested CV should say about 50%. A plain <code>best_score_</code> says about 61% for 60 settings on 80 rows.' },
    { tag: 'Rule of thumb', text: '<b>Plan the cost before you press run.</b> 5 × (12 × 3 + 1) = 185 fits for 12 random trials, but 5 × (60 × 3 + 1) = 905 for a 60-setting grid. Cut settings or inner folds if the model is slow.' },
    { tag: 'Link to code', text: 'The whole nested CV is one line, because a search object is itself an estimator: <code>cross_val_score(GridSearchCV(model, grid, cv=3), X, y, cv=5)</code>.' }],
  mistakes: [
    { wrong: '"best_score_ is my test score."', right: 'It is the maximum over m settings, so it is biased upwards: 87.9% reported against 83.6% truth at m = 50.' },
    { wrong: '"Nested CV gives me a model."', right: 'It scores the procedure. Afterwards you fit the search once on all your training data and deploy <code>best_estimator_</code>.' },
    { wrong: '"Nested CV is right every time."', right: 'It is right on average (within 0.3 points over 40 datasets). For one dataset of 80 rows it swings by about ±4 points, so quote it as an estimate.' },
    { wrong: '"Trying more settings always gets me a better model."', right: 'The reported score climbs as m grows but the model you get does not (truth 83.7% at m = 1, 83.6% at m = 60). More settings mostly means more luck.' }],
  code: [
    {
      title: 'Count the models: a k-NN that counts its own fits',
      py: `from sklearn.datasets import make_classification
from sklearn.model_selection import GridSearchCV, cross_val_score
from sklearn.neighbors import KNeighborsClassifier
class Counting(KNeighborsClassifier):          # an ordinary k-NN that counts its own fit() calls
    calls = 0
    def fit(self, X, y):
        Counting.calls += 1
        return super().fit(X, y)
X, y = make_classification(n_samples=80, n_features=4, random_state=0)
grid = {"n_neighbors": list(range(1, 20, 2))}      # m = 10 settings
GridSearchCV(Counting(), grid, cv=5).fit(X, y)
print("one GridSearchCV, 5 folds:", Counting.calls); Counting.calls = 0
cross_val_score(GridSearchCV(Counting(), grid, cv=3), X, y, cv=5)
print("nested, 5 outer x 3 inner:", Counting.calls)`,
      out: 'one GridSearchCV, 5 folds: 51\nnested, 5 outer x 3 inner: 155',
      walk: [
        ['class Counting(KNeighborsClassifier)', 'A new class that inherits everything from k-NN. We only change <code>fit</code>, so the model behaves normally.'],
        ['calls = 0 ... Counting.calls += 1', 'A counter stored on the class, shared by all copies. The search clones the model for every fit, so a counter on one object would not work.'],
        ['super().fit(X, y)', 'Runs the original k-NN training and returns the model, as sklearn expects.'],
        ['list(range(1, 20, 2))', 'The odd numbers 1, 3, ..., 19: ten values of k, so m = 10.'],
        ['GridSearchCV(Counting(), grid, cv=5).fit(X, y)', '10 settings × 5 folds = 50 fits, plus 1 refit of the winner on all rows (<code>refit=True</code> by default) = 51.'],
        ['cross_val_score(GridSearchCV(..., cv=3), X, y, cv=5)', 'The search is the estimator being cross-validated. Each of the 5 outer folds runs a search with 3 inner folds: 10 × 3 + 1 = 31 fits, and 5 × 31 = 155.']],
      tip: 'Change the grid to 50 values and the counts become 251 and 755. Do this arithmetic before starting a long run, not after.'
    },
    {
      title: 'The reported best versus the nested score, on data with no signal',
      py: `import numpy as np
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score
from sklearn.neighbors import KNeighborsClassifier

grid = {"n_neighbors": list(range(1, 30, 2)), "weights": ["uniform", "distance"]}   # m = 30 settings
best, nested = [], []
for seed in range(30):
    rng = np.random.RandomState(seed)
    X, y = rng.normal(size=(80, 4)), rng.randint(0, 2, 80)               # no signal: honest accuracy is 50%
    inner = StratifiedKFold(3, shuffle=True, random_state=seed)
    search = GridSearchCV(KNeighborsClassifier(), grid, cv=inner).fit(X, y)
    best.append(search.best_score_)                                     # what people report
    nested.append(cross_val_score(search, X, y, cv=StratifiedKFold(5, shuffle=True, random_state=seed)).mean())
print(f"mean best_score_: {np.mean(best):.2f}   mean nested score: {np.mean(nested):.2f}")`,
      out: 'mean best_score_: 0.60   mean nested score: 0.52',
      walk: [
        ['rng.randint(0, 2, 80)', 'Coin-flip labels. Whatever the model, its true accuracy is 50%.'],
        ['StratifiedKFold(3, shuffle=True, random_state=seed)', 'An explicit inner splitter: 3 folds, shuffled, each keeping the class balance. Fixing <code>random_state</code> makes the run repeatable.'],
        ['GridSearchCV(..., cv=inner).fit(X, y)', 'Tries all 30 settings with the inner folds on all 80 rows and remembers the best.'],
        ['search.best_score_', 'The highest mean inner score: the number people usually report. It averages about 0.60 on pure noise.'],
        ['cross_val_score(search, X, y, cv=StratifiedKFold(5, ...))', 'Nested CV: the search is cloned for each of 5 outer folds, tunes on that fold\'s training rows, and is scored on the held-out rows.'],
        ['np.mean(best) and np.mean(nested)', 'Averages over 30 random datasets, because one dataset gives one noisy number.']],
      tip: 'The 8-point gap is the winner\'s curse in numbers: the best of 30 settings looks 10 points above chance, the honest estimate only about 2 points. Different seeds shift both by a point or two.'
    }],
  check: [
    { q: 'Why is <code>best_score_</code> from a GridSearchCV too optimistic as an estimate of future accuracy?', options: ['It is computed on the training rows only', 'It is the maximum of m noisy scores, so the choice also picks up luck', 'GridSearchCV uses too few folds', 'It ignores the refit'], answer: 1, why: 'Each CV score is true quality plus luck. The setting with the highest score is likely to have had good luck, so its score overstates what the model will do on new data.' },
    { q: 'Nested CV uses 5 outer folds and 3 inner folds, tries 20 settings, and refits the winner inside each outer fold. How many models are trained?', options: ['100', '105', '300', '305'], answer: 3, why: 'Per outer fold: 20 × 3 = 60 inner fits plus 1 refit = 61. Five outer folds: 5 × 61 = 305.' },
    { q: 'The labels are coin flips and you try 60 settings on 80 rows. What do the best CV score and the nested CV estimate roughly show?', options: ['Both about 50%', 'Best CV about 61%, nested about 51%', 'Both about 61%', 'Best CV about 50%, nested about 61%'], answer: 1, why: 'The best of 60 scores rises well above 50% by luck, which is the winner\'s curse. Nested CV scores the chosen model on rows that did not choose it, so it reports chance.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why the best CV score after tuning is too high, and how nested cross-validation fixes it.', model: 'The best of many cross-validation scores is partly luck, so it overstates how well the chosen model will do on new data. Nested cross-validation runs the whole tuning inside each training part and scores the winner on outer test rows that took no part in the choice, so the luck is not counted.' },
  cheat: 'The best of m CV scores is flattered (winner\'s curse): it rises with m, the truth does not. Nested CV: the outer loop judges, the inner loop chooses on the outer training rows; refit the winner, score once on the outer test fold, average. Fits = K_out × (m × K_in + 1), e.g. 5 × (50 × 3 + 1) = 755. It scores the procedure.'
};
