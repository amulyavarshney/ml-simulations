// Lesson for evaluation/learning-curve: diagnose high bias versus high variance, and choose the fix.
module.exports = {
  idea: 'A learning curve plots the training score and the validation score as the training set grows. <b>Both low and close</b> means the model is too simple. <b>Training high, validation far below</b> means it memorises. <b>Both high and close</b> means you are done.',
  why: 'One cross-validation score (82%) does not say what to do next: collect more data (weeks), change the model (hours), or stop. Choosing wrongly wastes time: more rows do nothing for a model that is too simple, and a fancier model does nothing for a score already at the data\'s limit.',
  analogy: 'A student practising for an exam. One who learns past papers by heart scores 99% on them and 80% on a fresh paper: more practice papers help slowly, a better method helps faster. A student who knows only one formula scores 86% on both: more papers change nothing, they need more tools. At 91% on both, with 91% the best possible, stop studying.',
  vocab: [
    ['Learning curve', 'Score against the number of training rows, with the model and the data fixed.'],
    ['Training score and validation score', 'Training: accuracy on the rows the model was fitted on. Validation: accuracy on held-out rows, here the 5-fold cross-validation score.'],
    ['Gap', 'Training score minus validation score. A big gap means the model does much better on rows it has seen.'],
    ['Bias (underfitting)', 'Error from a model too simple to follow the true pattern. It shows as a training score that is itself low.'],
    ['Variance (overfitting)', 'Error from a model that follows the noise of this particular sample. It shows as a big gap.'],
    ['Estimated ceiling', 'A guide to the best score any model could reach on this data, because the classes overlap (noise). The page estimates it with a 25-nearest-neighbour model trained on 3,000 rows. It can be a point or two off.'],
    ['Regularise', 'Make a model simpler on purpose. For an RBF SVM: a smaller C or a smaller γ.']],
  steps: [
    { h: 'One score hides the problem', p: 'Suppose cross-validation says 82%. Is the model too simple, too flexible, or already as good as the data allows? Each case needs a different action. The learning curve answers by plotting two scores against the number of training rows, which separates the causes.' },
    { h: 'The two lines and the ceiling', p: 'For each size s the page fits the model on the first s rows of every training fold, then scores those s rows (training) and the held-out fold (validation). Averaged over 5 folds, that is one point on each line. The dotted line is the estimated ceiling, a guide to the best any model could do: about 91% on moons with noise 0.3.' },
    { h: 'High bias: both lines low and close', p: 'A straight line on moons scores 86.5% on its training rows and 86.3% on held-out rows, and the ceiling is 91.3%. The training score itself is 4.8 points short, so the model cannot even fit what it sees. More rows do not lift it: its validation line goes 85.7% at 100 rows and 86.3% at 480. Fix: a richer model or better features.' },
    { h: 'High variance: training high, validation far below', p: 'The flexible RBF SVM scores 98.9% on training rows and 81.7% on held-out rows: a gap of 17.3 points. It memorises noise. More rows shrink the gap, but slowly: on fresh data this model averages 85% with 480 rows, 89% with 2,000 and 91% with 5,000. A simpler model is a faster cure: the medium one already validates at 90.5% on 480 rows.' },
    { h: 'Both high and close: stop', p: 'The medium model scores 91.1% training and 90.5% validation, the ceiling is 91.3%. The gap is 0.6 points and nothing remains to gain. More data or a bigger model will change very little. Spend the effort elsewhere: the features, the labels, or deployment.' },
    { h: 'The three tests as the page applies them', p: '(1) Training score more than 4 points below the estimated ceiling: <b>high bias</b>. (2) Otherwise, gap of 6 points or more: <b>high variance</b>. Simplify first, then read the <i>trend</i>, the points gained per doubling of the rows: 1.5 or more means more data should also help, under 0.5 nearly flat. (3) Otherwise: <b>done</b>. The 4, 6, 1.5 and 0.5 are rules of thumb.' },
    { h: 'Read the trend, not one step', p: 'Five folds on 600 rows wobble by about 2 points. For the flexible model on moons, 12 new data draws gave a trend from −1.6 to +3.8 points per doubling, so the verdict moved between "nearly flat" (3 times), "rises slowly" (4) and "still rising" (5). A flat curve says that doubling again buys little. It does not say that ten times the data would not help: on fresh data this model gains about 6 points from 480 to 5,000 rows.' },
    { h: 'Choose the cheapest fix first', p: 'High variance: regularise or simplify (minutes), reduce features, then add data (weeks). High bias: richer model, better features, interactions; extra rows are useless. Always <b>re-plot</b> after the change: a new model is a new curve.' }],
  example: {
    title: 'diagnose three models from their numbers',
    setup: 'Moons, noise 0.3, the page\'s default data, read at the largest size (480 rows). The ceiling is estimated at 91.3%. Apply the three tests to each model.',
    table: { head: ['Model', 'Training', 'Validation', 'Gap', 'Ceiling − training', 'Verdict'], rows: [
      ['Simple (straight line)', '86.5%', '86.3%', '0.2', '4.8', 'More than 4 below: high bias'],
      ['Medium (RBF, γ = 1, C = 1)', '91.1%', '90.5%', '0.6', '0.2', 'Not biased, small gap: done'],
      ['Flexible (RBF, γ = 50, C = 100)', '98.9%', '81.7%', '17.3', '−7.6 (above the ceiling)', 'Not biased, gap 6 or more: high variance']] },
    walk: [
      'Test 1, bias: compare the <i>training</i> score with the ceiling. Simple: 91.3 − 86.5 = 4.8, which is more than 4. Medium: 91.3 − 91.1 = 0.2. Flexible: 91.3 − 98.9 is negative, so no bias. (A training score above the ceiling is not good news. It is memorisation.)',
      'Test 2, variance: gap = training − validation. Simple 0.2, medium 0.6, flexible 98.9 − 81.7 = 17.3. Only the flexible model is at or above 6.',
      'For the flexible model, read the trend over the five largest sizes. Validation at 100, 150, 220, 320 and 480 rows: 81.5%, 81.0%, 80.0%, 80.5%, 81.7%. Mean of the two largest: 81.1%. Mean of the two smallest: 81.25%. The difference, −0.15 points, spans (log<sub>2</sub>320 + log<sub>2</sub>480)/2 − (log<sub>2</sub>100 + log<sub>2</sub>150)/2 = 8.614 − 6.936 = 1.678 ≈ 1.68 doublings. Trend = −0.15 / 1.68 ≈ −0.1 points per doubling, below 0.5: nearly flat <i>in this range</i>.',
      'The medium model passes both tests: done. Its validation score, 90.5%, is 0.8 below the ceiling, within the wobble of a 5-fold estimate.',
      'Check the fix by changing the model, not guessing. Flexible to medium: validation 81.7% to 90.5%, +8.8 points. Simple to medium: 86.3% to 90.5%, +4.2 points.',
      'Check the data fix too. The flexible model on fresh data (average of 8 draws) scores 84.9% at 480 rows and 90.6% at 5,000: roughly 10 times the rows for +5.7 points. Simplifying was far cheaper.'],
    result: 'Simple: high bias, richer model needed. Flexible: high variance, regularise first. Medium: done, at 90.5% against a ceiling of about 91%. The same three numbers (training, gap, ceiling) decide every time.' },
  read: [
    ['Dashed line with square dots', 'Training score: accuracy on the s rows each model was fitted on, averaged over 5 folds.'],
    ['Solid line with round dots', 'Validation score: accuracy on the held-out fold (120 rows), averaged over 5 folds.'],
    ['Shaded bands', 'Plus and minus one standard deviation over the 5 folds. Wide bands mean the line is unreliable at that size.'],
    ['Dotted line "estimated ceiling"', 'A guide to the best any model could do: a 25-nearest-neighbour model trained on 3,000 rows and scored on 1,500 fresh ones. It is not a limit: it can be a point or two off, and a model may score slightly above it.'],
    ['x axis "training rows used (log scale)"', 'Sizes 20, 30, 45, 70, 100, 150, 220, 320 and 480. The log scale gives each doubling the same width.'],
    ['Readout "Gap"', 'Training minus validation at 480 rows. It is marked as bad above 6 points.'],
    ['Readout "Estimated ceiling (about the best any model could do)"', 'The same estimate as a number, for the chosen shape and noise.'],
    ['Readout "Validation trend, 100–480 rows (points per doubling)"', 'Points of validation score gained per doubling of the rows, over the five largest sizes: the mean of the two largest minus the mean of the two smallest, divided by the 1.68 doublings between them. The page calls 1.5 or more "still rising" and under 0.5 "nearly flat".'],
    ['Diagnosis box under the readouts', 'The three tests from the lesson in plain words: "Both low", "Big gap", "Both high and close". For a big gap it also hedges what more data would do, using the trend.'],
    ['Controls', 'Model: simple, medium, flexible. Data: moons or rings, noise 0.1 to 0.5, and New data for another random sample.']],
  experiments: [
    { do: 'Choose <i>Flexible</i> on <i>Moons</i> with noise 0.30 (the default) and read the plot, the readouts and the diagnosis.', see: 'Training about 99 to 100% at every size. Validation climbs from about 65% (20 rows) to about 81% (100 rows) and then wiggles between 80% and 82%. Gap about 17 points. The diagnosis says "Big gap", suggests simplifying first, and reports a trend of about 0 points per doubling ("nearly flat", with a reminder that the curve covers only 480 rows).', why: 'With γ = 50 and C = 100 the boundary wraps around every training point, so training accuracy is perfect and says nothing. The validation line is the honest one.' },
    { do: 'Press <i>New data</i> five or six times with the flexible model.', see: 'The gap stays 11 to 19 points. The trend readout swings between about −2 and +4 points per doubling, so the verdict moves between "nearly flat", "rises slowly" and "still rising".', why: 'A 5-fold validation curve wobbles by about 2 points, so the trend is noisy. Trust the large gap, which never changes, more than the small slope. On fresh data the true trend for this model is positive (about +2 points per doubling) but slow.' },
    { do: 'Switch to <i>Simple</i>.', see: 'Training about 87%, validation about 86%, gap near 0. The dotted line at about 91% sits above both. Diagnosis "Both low".', why: 'A straight line cannot follow two moons, so it is wrong in the same way on every sample. It is high bias, and more rows will not lift either line.' },
    { do: 'Switch to <i>Medium</i>.', see: 'Training about 91%, validation about 90.5%, gap under 1 point, diagnosis "Both high and close".', why: 'A moderate γ gives a boundary flexible enough to follow the moons but not enough to chase single points. The curves meet near the ceiling.' },
    { do: 'Raise <i>Noise</i> to 0.50 and compare all three models.', see: 'The ceiling drops to about 82%. Simple (about 82%) sits at the ceiling and medium (about 84%) a little above it, while flexible has training near 99% and validation near 71%, a gap of 28 points.', why: 'More noise lowers what any model can reach, so a model that looked too simple at noise 0.3 is good enough at noise 0.5. A flexible model has more noise to memorise, so its gap grows.' },
    { do: 'Choose <i>Rings</i> with <i>Simple</i>.', see: 'Training near 51% and validation below 50% at 480 rows, far under the ceiling of about 95%.', why: 'Rings are circles inside circles. No straight line separates them, so the model is at chance however many rows you give it. That is bias in its purest form.' }],
  remember: [
    { tag: 'Picture', text: 'Read the <b>two lines</b>. Both low and huddled together: bias. A wide wedge between them: variance. Both high and huddled at the dotted ceiling: done.' },
    { tag: 'Rule of thumb', text: '<b>Bias shows in the training score, variance shows in the gap.</b> Always compare the training score with the ceiling, not with 100%.' },
    { tag: 'Rule of thumb', text: '<b>Fix order.</b> High variance: simplify or regularise first, add data last. High bias: richer model or better features, and more data does nothing.' },
    { tag: 'Sanity check', text: 'A training score of 100% or above the ceiling is a warning, not an achievement. It means the model memorised noise.' },
    { tag: 'Sanity check', text: '<b>Judge the trend over the last doubling.</b> Still rising at the right edge: data helps. Flat over the last doubling: another doubling buys little at this size. One 5-fold step wobbles by about 2 points.' },
    { tag: 'Link to code', text: '<code>learning_curve(model, X, y, train_sizes=[...], cv=5)</code> returns the sizes and two arrays of shape (sizes, folds). Average each with <code>.mean(axis=1)</code> to get the two lines.' }],
  mistakes: [
    { wrong: '"More data always fixes overfitting."', right: 'It helps, slowly. This flexible model needs about 10 times the rows (480 to 5,000) to gain 6 points. Simplifying it (medium model) gains 9 points on the same 480 rows.' },
    { wrong: '"A low score means I need more data."', right: 'If the training score is low too, the model is too simple and more rows will not help. On fresh data the straight line scores about 85% with 100 rows and still about 85% with 3,000.' },
    { wrong: '"Training accuracy of 99% means a great model."', right: 'The training score says how well the model remembers. The flexible model has 98.9% training and 81.7% validation.' },
    { wrong: '"The dotted ceiling is exact, so a model above it is a bug."', right: 'The ceiling is an estimate from 25-nearest-neighbours on 3,000 rows. At noise 0.5 the medium model validates at 83.7%, above the 81.5% line. Treat it as a guide of plus or minus a point or two.' }],
  code: [
    {
      title: 'A learning curve for an overfitting model',
      py: `from sklearn.datasets import make_moons
from sklearn.model_selection import learning_curve
from sklearn.svm import SVC

X, y = make_moons(n_samples=600, noise=0.3, random_state=5)
sizes, train, val = learning_curve(SVC(gamma=50, C=100), X, y, train_sizes=[30, 100, 240, 480],
                                   cv=5, shuffle=True, random_state=0)
for s, t, v in zip(sizes, train.mean(axis=1), val.mean(axis=1)):
    print(f"{s:4d} rows: train {t:.3f}  validation {v:.3f}  gap {t - v:.3f}")`,
      out: '  30 rows: train 1.000  validation 0.628  gap 0.372\n 100 rows: train 0.998  validation 0.808  gap 0.190\n 240 rows: train 0.998  validation 0.845  gap 0.153\n 480 rows: train 0.992  validation 0.860  gap 0.132',
      walk: [
        ['make_moons(n_samples=600, noise=0.3, random_state=5)', 'Two interlocking half-circles with 600 points. <code>noise</code> is the spread of the points around the curves. <code>random_state</code> fixes the sample.'],
        ['SVC(gamma=50, C=100)', 'A very flexible RBF SVM: a large γ makes each point\'s influence very local, and a large C punishes training mistakes heavily.'],
        ['train_sizes=[30, 100, 240, 480]', 'How many training rows to use at each point. Integers are row counts; fractions such as 0.2 would mean a share of the training fold.'],
        ['cv=5, shuffle=True, random_state=0', '5-fold splitting, with the rows shuffled first so the folds are not ordered by class.'],
        ['sizes, train, val = ...', 'Three results. <code>train</code> and <code>val</code> have shape (4 sizes, 5 folds): one score per size per fold.'],
        ['train.mean(axis=1)', 'Averages across the folds (axis 1) and leaves one number per size: a point on each line.']],
      tip: 'Training stays near 1.000 at every size while validation rises 0.628, 0.808, 0.845, 0.860. The gap shrinks but is still 0.13 at 480 rows. On the page you use the same idea with a fixed set of sizes.'
    },
    {
      title: 'Compare three models by their gap and the ceiling',
      py: `from sklearn.datasets import make_moons
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, cross_validate
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
X, y = make_moons(n_samples=600, noise=0.3, random_state=5)
Xb, yb = make_moons(n_samples=5000, noise=0.3, random_state=6)       # a big pool, only to estimate the ceiling
ceiling = cross_val_score(KNeighborsClassifier(25), Xb, yb, cv=5).mean()
for name, model in [("straight line", LogisticRegression()), ("RBF gamma=1", SVC(gamma=1)), ("RBF gamma=50, C=100", SVC(gamma=50, C=100))]:
    r = cross_validate(model, X, y, cv=5, return_train_score=True)
    tr, va = r["train_score"].mean(), r["test_score"].mean()
    print(f"{name:20s} train {tr:.3f}  val {va:.3f}  gap {tr - va:.3f}  (ceiling {ceiling:.3f})")`,
      out: 'straight line        train 0.872  val 0.872  gap 0.000  (ceiling 0.909)\nRBF gamma=1          train 0.914  val 0.908  gap 0.006  (ceiling 0.909)\nRBF gamma=50, C=100  train 0.992  val 0.860  gap 0.132  (ceiling 0.909)',
      walk: [
        ['make_moons(n_samples=5000, ..., random_state=6)', 'A large separate sample from the same generator. A big pool lets a simple model estimate the ceiling.'],
        ['KNeighborsClassifier(25)', 'A k-NN that votes among the 25 nearest points. With thousands of rows it approaches the best possible boundary, so its CV score is a ceiling estimate.'],
        ['cross_validate(model, X, y, cv=5, return_train_score=True)', 'Like <code>cross_val_score</code> but returns a dictionary and, with <code>return_train_score=True</code>, also the training score of each fold.'],
        ['r["train_score"].mean()', 'The mean training score over the 5 folds. Without the flag this key does not exist.'],
        ['tr - va', 'The gap. About 0 for the straight line and for γ = 1. 0.132 for the flexible model.'],
        ['f"{name:20s} ... {tr:.3f}"', '<code>:20s</code> pads the name to 20 characters so the columns line up. <code>:.3f</code> prints three decimals.']],
      tip: 'The straight line has no gap but sits 3.7 points under the ceiling, and the γ = 1 model shows that this room can be used (0.908). The flexible model is at 0.992 training but 0.860 validation: variance. Only the middle one is near the ceiling with no gap.'
    },
    {
      title: 'The three tests as a function',
      py: `def diagnose(train, val, ceiling):
    if train < ceiling - 0.04:                       # the training score itself is far below what the data allows
        return "high bias: both low, use a richer model or better features"
    if train - val >= 0.06:                          # trains well, validates badly
        return "high variance: big gap, simplify or regularise (or add data, slowly)"
    return "both high and close: you are done"
for name, t, v in [("straight line", 0.865, 0.863), ("RBF gamma=1", 0.911, 0.905), ("RBF gamma=50", 0.989, 0.817)]:
    print(f"{name:14s} train {t:.3f}  val {v:.3f} ->", diagnose(t, v, 0.913))`,
      out: 'straight line  train 0.865  val 0.863 -> high bias: both low, use a richer model or better features\nRBF gamma=1    train 0.911  val 0.905 -> both high and close: you are done\nRBF gamma=50   train 0.989  val 0.817 -> high variance: big gap, simplify or regularise (or add data, slowly)',
      walk: [
        ['def diagnose(train, val, ceiling):', 'A function with three inputs: the training score, the validation score and the estimated ceiling.'],
        ['train < ceiling - 0.04', 'Test 1. Bias is checked first, because a model that fits its own rows badly has no gap to read.'],
        ['train - val >= 0.06', 'Test 2. The gap threshold of 6 points. It is only reached if test 1 did not return.'],
        ['return "both high and close..."', 'If neither test fires, the model is as good as the data allows.'],
        ['for name, t, v in [...]', 'Loops over three (name, training, validation) triples: the numbers of the worked example, in the same order.']],
      tip: 'The thresholds 0.04 and 0.06 are the page\'s choices, not theory. Pick values that match how much error your problem can tolerate, and remember that a 5-fold score wobbles by a couple of points.'
    }],
  check: [
    { q: 'A model has training score 99%, validation score 82% and an estimated ceiling of 91%. What is the diagnosis?', options: ['High bias: the model is too simple', 'High variance: the model memorises', 'Both fine: it is at the ceiling', 'The ceiling estimate must be wrong'], answer: 1, why: 'The training score is at the ceiling (so not bias), but the gap of 17 points is big. The model follows noise in the training sample.' },
    { q: 'Training 86.5%, validation 86.3%, ceiling 91.3%. Using the page\'s tests (bias if training is more than 4 points below the ceiling, variance if the gap is 6 or more), what is the verdict?', options: ['High variance', 'High bias', 'Done', 'Cannot tell'], answer: 1, why: 'Ceiling minus training is 91.3 − 86.5 = 4.8, more than 4. The gap is only 0.2, so test 1 fires first: high bias.' },
    { q: 'The straight-line model on moons is at high bias. You double the training set from 480 to 960 rows. What happens to its validation score?', options: ['It rises to about 91%', 'It barely changes (about 86%)', 'It falls sharply', 'The gap grows to 17 points'], answer: 1, why: 'A straight line cannot follow two moons, so it makes the same kind of mistakes on every sample. Its validation score is about 86% at 100 rows and at 480, and stays there. Only a richer model helps.' }],
  teachback: { prompt: 'In two sentences, explain to a friend how a learning curve tells you whether to get more data or change the model.', model: 'If the training and validation curves are both low and close, the model is too simple, so more data will not help and you need a richer model. If training is high but validation is far below it, the model memorises, so simplify or regularise it first, and more data helps only slowly.' },
  cheat: 'Learning curve = training and validation score against the number of training rows. Training low and close to validation: high bias, use a richer model. Training high, big gap: high variance, regularise first, add data slowly. Both near the ceiling: done. Compare training with the ceiling, not 100%, and judge the trend, not one step.'
};
