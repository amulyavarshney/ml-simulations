// Lesson for evaluation/validation-curve: sweep one knob (RBF gamma), find where the validation score turns, diagnose each side.
module.exports = {
  idea: 'A validation curve sweeps one complexity knob and plots the training score and the cross-validation score. Too little complexity: both are low and close (<b>underfit</b>). Too much: training soars while validation falls (<b>overfit</b>). Choose the top of the validation curve.',
  why: 'The right setting of a knob like γ is not obvious and not the same for every dataset. Choose by training accuracy and you always pick the most flexible model: at γ = 316 training is 100% and validation only 68%. Choose by guess and you can leave 6 points on the table at the stiff end.',
  analogy: 'Tuning the sharpness of a photo filter. Too little smoothing leaves grain: the picture follows every speck of noise. Too much smoothing blurs the faces. Somewhere between, the face is clear and the grain is gone. The validation curve is a test of how well the filtered picture matches faces you did not use to set the filter.',
  vocab: [
    ['Validation curve', 'Training score and cross-validation score plotted against the value of one hyperparameter, everything else fixed.'],
    ['γ (gamma)', 'For an RBF SVM, how local each training point\'s influence is. Influence fades over a distance of about 1/√(2γ). Small γ: smooth, stiff boundary. Large γ: boundary wraps single points.'],
    ['C (penalty)', 'The price of a training mistake. Large C pushes the boundary to classify every training point correctly.'],
    ['Underfit (high bias)', 'The model is too stiff: training and validation scores are both low and close.'],
    ['Overfit (high variance)', 'The model follows noise: training stays high while validation falls, so the gap grows.'],
    ['Standard error (SE)', 'Standard deviation of the five fold scores divided by √5. It says how uncertain a CV average is.'],
    ['One-standard-error rule', 'Among settings whose CV score is within one SE of the best, prefer the simplest. The page shades these as "about right".']],
  steps: [
    { h: 'One knob, two ways to fail', p: 'γ sets how far a training point\'s influence reaches. With the moons about 3 units across, γ = 0.01 gives each point an influence radius of about 7 units: the whole plane. γ = 316 gives about 0.04 units: each point only claims its own neighbourhood. The best γ is somewhere in between.' },
    { h: 'Too small: the boundary is too smooth', p: 'At γ = 0.01 training scores 84.0% and cross-validation 84.7%. The two are close and both are low: the model is too stiff to follow two curved moons, so the boundary is nearly straight. More careful fitting cannot help, because the model class is the limit. This is <b>high bias</b>, and the training score itself is the clue.' },
    { h: 'Too large: the boundary chases single points', p: 'At γ = 316 training scores 100% and cross-validation 68.0%, a gap of 32 points. 148 of the 150 points become support vectors, and the boundary breaks into small islands around individual points. It has memorised the noise of this sample. This is <b>high variance</b>, and the gap is the clue.' },
    { h: 'The top of the CV curve', p: 'Between the two failures the cross-validation score peaks: 90.7% at γ = 1.78, with training at 93.7% (gap 3.0). Always choose from the cross-validation line. The training line rises without limit to 100%, so it would pick the most overfit model.' },
    { h: 'Reading the gap correctly', p: 'Gap = training − CV. A gap near 0 with a low score means bias (γ = 0.01: gap −0.7, CV 84.7%). A gap that grows while CV falls means variance (γ = 23.7: gap 12.5). A small gap does not mean a good model: it only says the model is not overfitting.' },
    { h: 'The curve is noisy: use one standard error', p: 'The five fold scores at the best γ have a standard deviation of 3.9 points, so SE = 3.9 / √5 = 1.74. Settings within 1.74 points of the best (CV of 88.96% or more) cannot be reliably told apart from it. On the page they form the "about right" zone, γ from 1.06 to 2.99. Among them prefer the simplest.' },
    { h: 'The best γ depends on the other knobs and on the data', p: 'A larger C moves the peak left: C = 1000 peaks at γ = 0.63 (92.0%), and overfitting starts earlier. More noise lowers the peak: 100% at noise 0.05, 90.7% at 0.30, 83.3% at 0.50. More rows narrow the gap: at γ = 3 it is 11.7 points with 60 rows and 2.2 with 300. Re-check γ whenever C or the data changes.' },
    { h: 'The peak is still a maximum of noisy scores', p: 'The CV score at the chosen γ is the best of 21 noisy values, so it is slightly flattered (the winner\'s curse again). Use the curve to pick γ, then report performance on data the curve never saw, or with nested cross-validation.' }],
  example: {
    title: 'reading the curve at nine values of γ',
    setup: 'The page\'s default data: 150 moons, noise 0.3, C = 10, 5-fold cross-validation. "SD" is the standard deviation of the five fold scores at that γ. The page marks the best γ and shades the run of γ values around it whose CV score is within one SE of the best.',
    table: { head: ['γ', 'Training', '5-fold CV', 'SD of folds', 'Gap', 'Page\'s zone'], rows: [
      ['0.01', '84.0%', '84.7%', '7.8', '−0.7', 'too smooth: underfits'],
      ['0.133', '87.8%', '87.3%', '6.8', '0.5', 'too smooth: underfits'],
      ['0.631', '92.8%', '88.7%', '4.5', '4.2', 'too smooth, mild (just outside the zone)'],
      ['1.06', '93.3%', '89.3%', '2.5', '4.0', 'about right'],
      ['1.78', '93.7%', '90.7%', '3.9', '3.0', 'best γ'],
      ['2.99', '93.5%', '90.0%', '4.2', '3.5', 'about right'],
      ['5.01', '93.8%', '87.3%', '5.3', '6.5', 'too wiggly: overfits'],
      ['23.7', '96.5%', '84.0%', '2.5', '12.5', 'too wiggly: overfits'],
      ['316', '100.0%', '68.0%', '4.5', '32.0', 'too wiggly: overfits']] },
    walk: [
      'Find the best CV score: 90.7% at γ = 1.78.',
      'Standard error at the best γ: SE = 3.9 / √5 = 3.9 / 2.236 = <b>1.74</b> points.',
      'Threshold: 90.7 − 1.74 = <b>88.96%</b>. Every γ with CV at or above this is tied with the best.',
      'Check the rows: γ = 1.06 gives 89.3%, γ = 1.78 gives 90.7%, γ = 2.99 gives 90.0%. These form the "about right" zone. γ = 0.631 gives 88.7%, just under the threshold, and γ = 5.01 gives 87.3%. Both are outside the zone.',
      'Read the gaps and the training score, because the zones come from CV only. Far left (γ = 0.01 and 0.133) the gap is small and both scores are below the best 90.7%: bias. At γ = 0.631 training (92.8%) is already above 90.7%, so the page says only "a little too smooth". Right of the zone the gap is 6.5, then 12.5, then 32.0 while CV falls to 68%: variance.',
      'Apply the one-SE rule: the simplest (smoothest, smallest γ) inside the zone is γ = 1.06 (CV 89.3%). It is 1.4 points below the best, less than one SE, so it is statistically tied and gives a smoother boundary.'],
    result: 'Choose γ between about 1 and 3. At γ = 1.78 the CV score peaks at 90.7% (SE 1.7). The two ends are not symmetric: going too smooth (γ = 0.01) loses 6 points, going too wiggly (γ = 316) loses 22.7 points. When in doubt, err towards smoother.' },
  read: [
    ['Dashed line (training) and solid line with round dots (5-fold CV)', 'Accuracy on the rows the model was fitted on, and on the held-out fold, both averaged over 5 folds, for 21 values of γ from 0.01 to 316 on a log axis.'],
    ['Shaded band around the CV line', 'Plus and minus one standard deviation over the five folds. It is wide: about ±4 points at the best γ.'],
    ['Green diamond', 'The γ with the highest CV score ("Best γ on the curve").'],
    ['Shaded zones "too smooth", "about right", "too wiggly"', 'The middle zone is the run of γ values around the best whose CV score is within one SE of it. Everything to its left is labelled too smooth, everything to its right too wiggly. The zones come from the CV line only. Whether that is underfitting or overfitting you read from the training line and the gap.'],
    ['Vertical dashed line with a round and a square dot', 'The γ you chose. Click or drag on the curve, use the γ slider, or press the arrow keys with the plot focused. The two dots mark its CV and training score.'],
    ['Readouts "Training score", "5-fold CV score", "Gap (training − CV)"', 'The numbers at your γ. CV is shown with its standard deviation. The gap is flagged as bad above 7 points.'],
    ['Diagnosis box', '"Underfits (high bias)" (only when training is below the best CV score too), "A little too smooth", "About right" or "Overfits (high variance)" for your γ, with the numbers quoted.'],
    ['Lower plot "The boundary at this γ"', 'The SVM fitted to all the points at your γ. Black line: decision boundary. Tint: which class wins, stronger where the model is more sure. Circles class A, triangles class B.'],
    ['Sliders "Noise in the moons", "Number of points, n", "Penalty C"', 'Noise 0.05 to 0.6, n from 60 to 300, C from 0.1 to 1,000 (log). Changing them recomputes the whole curve. "New data" draws another sample.']],
  experiments: [
    { do: 'Drag γ from the far left to the far right and watch the lower plot.', see: 'At γ = 0.01 the boundary is smooth and nearly straight. Near γ = 1.8 it follows the moons. At γ = 316 it breaks into many small islands around single points.', why: 'γ sets how far each point\'s influence reaches. A tiny γ lets distant points shape one smooth surface. A huge γ lets each point claim only its own neighbourhood, so the boundary wraps individual points.' },
    { do: 'Compare the readouts at γ = 0.01 and at γ = 316.', see: 'Training 84.0% and 100.0%. CV 84.7% and 68.0%. Gap −0.7 and 32.0 points.', why: 'The training score rises as the model gets more flexible, so it cannot tell the good end from the bad end. The CV score and the gap can: a low CV with a tiny gap means bias, a falling CV with a huge gap means variance.' },
    { do: 'Set <i>Penalty C</i> to 1000, then to 0.1.', see: 'C = 1000: the peak moves left to γ about 0.6 and rises to about 92%; at γ = 3 the gap is 16.8 points. C = 0.1: the peak is at γ about 3 (90.0%) and the gap at γ = 3 is 0.5 points.', why: 'A big C punishes every training mistake, so the model bends sooner and overfits at a smaller γ. A small C forgives mistakes and keeps the boundary smooth even at a large γ. C and γ both control flexibility, so their best values depend on each other.' },
    { do: 'Set <i>Number of points, n</i> to 60, then to 300 (C back to 10), and compare the readouts at γ = 3.', see: 'The gap is 11.7 points with 60 rows and 2.2 with 300. The "about right" zone is much wider with 300 rows.', why: 'With few rows a flexible model has little to pin it down, so it chases noise. More rows give the data more weight against any one point, so overfitting shrinks.' },
    { do: 'Set <i>Noise in the moons</i> to 0.05, then to 0.50.', see: 'At 0.05 the best CV is 100% and the "about right" zone stretches from γ about 0.6 to 67. At 0.50 the best CV is about 83% and the zone shrinks to γ 0.4 to 1.', why: 'Clean classes tolerate almost any reasonable γ. With noisy classes, a flexible boundary overfits the noise and a stiff one misses the shape, so only a narrow band works.' },
    { do: 'Press <i>New data</i> twice and note "Best γ on the curve" each time.', see: 'The best γ moves between about 0.4 and 1.8 (default 1.78; the next two samples gave about 1.8 and 0.4).', why: 'Each sample of 150 points has its own luck. The best γ is an estimate with error, which is why the page shades a zone and why you should prefer the middle of the plateau to the exact peak.' }],
  remember: [
    { tag: 'Picture', text: 'A <b>hill</b>. The CV line rises, has a flat top, then falls. The training line is a staircase that only goes up. The gap is the widening mouth on the right.' },
    { tag: 'Rule of thumb', text: '<b>Left side: both lines low and together (bias). Right side: training high, CV falling (variance).</b> Bias lives in the level, variance lives in the gap.' },
    { tag: 'Formula in words', text: 'A point\'s influence radius is about <span class="eq">1 / √(2γ)</span>. γ = 0.01 gives about 7, γ = 1.78 about 0.5 and γ = 316 about 0.04, against moons about 3 units across. Compare it with the size of your data.' },
    { tag: 'Sanity check', text: '<b>Support vectors close to n</b> means overfitting. 148 of 150 at γ = 316 against 44 at γ = 1.78.' },
    { tag: 'Rule of thumb', text: '<b>One-standard-error rule.</b> Take the simplest setting whose CV is within one SE of the best. It trades under 1 SE of score for a smoother, more stable model.' },
    { tag: 'Link to code', text: '<code>validation_curve(model, X, y, param_name="gamma", param_range=gammas, cv=5)</code> returns two arrays of shape (values, folds): training scores and validation scores. Use a <code>np.logspace</code> range.' }],
  mistakes: [
    { wrong: '"Pick the γ with the best training score."', right: 'Training keeps rising to 100% as γ grows. It picks the most overfit model. Choose from the CV line.' },
    { wrong: '"A small gap means a good model."', right: 'At γ = 0.01 the gap is −0.7 points and the model is poor (84.7% against 90.7% at the best). The gap measures overfitting, not quality. Read the level of the CV score too.' },
    { wrong: '"The peak of the CV curve is exactly the best γ."', right: 'Neighbouring γ values are within one SE (1.74) of it. The peak is one noisy maximum. Use the middle of the plateau, or the simplest setting inside the zone.' },
    { wrong: '"I can tune γ first, then C, each on its own."', right: 'They interact. The best γ is 1.78 at C = 10 and about 0.63 at C = 1000. Tune them together (a random search) or revisit the first after the second.' }],
  code: [
    {
      title: 'A validation curve for γ with scikit-learn',
      py: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import validation_curve
from sklearn.svm import SVC

X, y = make_moons(n_samples=150, noise=0.3, random_state=3)
gammas = np.logspace(-2, 2, 5)                                      # 0.01, 0.1, 1, 10, 100
train, val = validation_curve(SVC(C=10), X, y, param_name="gamma", param_range=gammas, cv=5)
for g, t, v in zip(gammas, train.mean(axis=1), val.mean(axis=1)):
    print(f"gamma {g:6.2f}: train {t:.3f}  CV {v:.3f}  gap {t - v:+.3f}")`,
      out: 'gamma   0.01: train 0.838  CV 0.847  gap -0.008\ngamma   0.10: train 0.870  CV 0.873  gap -0.003\ngamma   1.00: train 0.913  CV 0.887  gap +0.027\ngamma  10.00: train 0.973  CV 0.887  gap +0.087\ngamma 100.00: train 1.000  CV 0.847  gap +0.153',
      walk: [
        ['np.logspace(-2, 2, 5)', 'Five numbers spaced evenly on a log scale from 10<sup>−2</sup> to 10<sup>2</sup>: 0.01, 0.1, 1, 10, 100. For γ, C and learning rates always sweep on a log scale.'],
        ['SVC(C=10)', 'The model with everything fixed except the swept knob. <code>validation_curve</code> will set <code>gamma</code> itself.'],
        ['param_name="gamma", param_range=gammas', 'Which hyperparameter to vary and the values to try. The name must match the model\'s argument exactly.'],
        ['train, val = validation_curve(...)', 'Two arrays of shape (5 values, 5 folds): one training and one validation score per value per fold.'],
        ['train.mean(axis=1)', 'Averages over the folds (axis 1), giving one number per γ: a point on each line.'],
        ['{t - v:+.3f}', 'Prints the gap with three decimals and a plus or minus sign, so negative gaps are easy to spot.']],
      tip: 'Same story as the page, on a different sample of moons: the CV score is 0.847 at both ends and peaks around 0.887, while the gap grows from about 0 to +0.153.'
    },
    {
      title: 'Choose γ with the one-standard-error rule',
      py: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import validation_curve
from sklearn.svm import SVC

X, y = make_moons(n_samples=150, noise=0.3, random_state=3)
gammas = np.logspace(-2, 2, 9)
_, val = validation_curve(SVC(C=10), X, y, param_name="gamma", param_range=gammas, cv=5)
mean, se = val.mean(axis=1), val.std(axis=1) / np.sqrt(5)           # one standard error of the fold scores
best = mean.argmax()
ok = np.flatnonzero(mean >= mean[best] - se[best])                  # every gamma within one SE of the best
print("best gamma:", round(gammas[best], 2), " CV:", round(mean[best], 3), " one SE:", round(se[best], 3))
print("simplest gamma within one SE:", round(gammas[ok.min()], 2), " CV:", round(mean[ok.min()], 3))`,
      out: 'best gamma: 0.32  CV: 0.887  one SE: 0.031\nsimplest gamma within one SE: 0.1  CV: 0.873',
      walk: [
        ['_, val = validation_curve(...)', 'The underscore means "I do not need the training scores here"; only the validation scores are kept.'],
        ['val.std(axis=1) / np.sqrt(5)', 'Standard deviation of the 5 fold scores for each γ, divided by √5: the standard error of the CV mean.'],
        ['mean.argmax()', 'The position of the highest CV mean. Positions are into <code>gammas</code>, so <code>gammas[best]</code> is the best γ.'],
        ['np.flatnonzero(mean >= mean[best] - se[best])', 'Positions of every γ whose CV mean is within one SE of the best. <code>flatnonzero</code> turns a True/False array into the list of positions that are True.'],
        ['ok.min()', 'The smallest position, i.e. the smallest γ: the smoothest, simplest model in the zone.']],
      tip: 'Here the rule picks γ = 0.1 (CV 0.873) instead of 0.32 (0.887). The 1.4-point loss is less than one SE of 3.1 points, so the choice is statistically tied and the boundary is smoother.'
    },
    {
      title: 'Overfitting leaves a fingerprint: count the support vectors',
      py: `from sklearn.datasets import make_moons
from sklearn.svm import SVC

X, y = make_moons(n_samples=150, noise=0.3, random_state=3)
for g in (0.01, 1.8, 316):
    m = SVC(gamma=g, C=10).fit(X, y)
    print(f"gamma {g:6.2f}: support vectors {m.n_support_.sum():3d} of 150, training accuracy {m.score(X, y):.3f}")`,
      out: 'gamma   0.01: support vectors  70 of 150, training accuracy 0.847\ngamma   1.80: support vectors  46 of 150, training accuracy 0.913\ngamma 316.00: support vectors 149 of 150, training accuracy 1.000',
      walk: [
        ['SVC(gamma=g, C=10).fit(X, y)', 'Fits one SVM on all 150 points at this γ. The fit needs no validation data.'],
        ['m.n_support_', 'An array with the number of support vectors for each class. <code>.sum()</code> adds them.'],
        ['m.score(X, y)', 'Accuracy on the rows the model was fitted on: the training accuracy.'],
        ['{...:3d} and {g:6.2f}', 'Format codes: a whole number padded to 3 characters, and a decimal padded to 6 with 2 places.']],
      tip: 'At the best γ the model leans on only a third of the points (46). At γ = 316 nearly every point is a support vector (149 of 150) and training accuracy is 1.000: it has memorised the sample.'
    }],
  check: [
    { q: 'At γ = 0.01 the training score is 84.0% and the CV score is 84.7%. At the best γ the CV score is 90.7%. What does γ = 0.01 show?', options: ['Overfitting, because training is high', 'Underfitting: both scores are low and close, so the model is too smooth', 'A perfect model, because the gap is below zero', 'A bug, because CV cannot exceed training'], answer: 1, why: 'Both scores are low and nearly equal, and a more flexible γ does 6 points better. That is bias. A CV score slightly above the training score happens by chance, since the folds differ.' },
    { q: 'At the best γ the five fold scores have a standard deviation of 3.9 points and the best CV score is 90.7%. What is the one-standard-error threshold?', options: ['About 86.8%', 'About 88.96%', 'About 90.0%', 'About 94.6%'], answer: 1, why: 'SE = 3.9 / √5 = 1.74. The threshold is 90.7 − 1.74 = 88.96%. Every γ with a CV score at or above it counts as tied with the best.' },
    { q: 'You raise C from 10 to 1000 and look at the curve again. Where does the peak go, and what happens to the overfitting zone?', options: ['The peak moves right and the overfitting zone starts later', 'The peak stays and nothing else changes', 'The peak moves left and the overfitting zone starts earlier', 'The curve becomes flat'], answer: 2, why: 'A large C punishes training mistakes heavily, so the boundary bends more at any γ. The best γ falls (about 0.63 at C = 1000 against 1.78 at C = 10) and overfitting starts at a smaller γ.' }],
  teachback: { prompt: 'In two sentences, explain to a friend how you recognise underfitting and overfitting on a validation curve and which γ you pick.', model: 'Where both the training and the validation scores are low and close together, the model is too smooth and underfits. Where training stays high but validation falls and the gap grows, it overfits. I pick the γ at the top of the validation line, or the simplest one within one standard error of it, never the one with the best training score.' },
  cheat: 'Validation curve: training and CV score against one knob. Both low and close: underfit (bias). Training high, CV falling, big gap: overfit (variance). Pick the top of the CV curve, or the simplest setting within one SE of it (SE = sd / √5). For the RBF SVM, γ is the reach of a point (about 1/√(2γ)); a bigger C moves the best γ left.'
};
