// Lesson for decisions/calibration-fix: Platt scaling and isotonic regression, fitted on a separate calibration set.
module.exports = {
  idea: `A calibrator is a small correction, learned on spare rows, that turns a model's raw score into an honest probability. <b>Platt scaling</b> fits an S-curve with two numbers. <b>Isotonic regression</b> fits a staircase that never goes down. Neither swaps two applicants.`,
  why: `Some models rank well but report dishonest numbers: an SVM score has no probability meaning, and naive Bayes is too extreme. Cost decisions need honest probabilities (next simulation). Retraining rarely fixes it. A calibrator repairs the output with a few hundred spare rows and leaves the model untouched.`,
  analogy: `An over-excited weather app. Take last season's forecasts and what actually happened, and write a correction rule: "when the app says 90%, say 78%". A formula with two numbers that bends every forecast the same way is Platt scaling. A table of corrections by forecast range, never letting a higher forecast get a lower value, is isotonic regression. Write the rule on one season, check it on another.`,
  vocab: [
    [`Score`, `The raw number a model produces before any correction: log-odds for logistic regression and naive Bayes, a distance from the boundary for an SVM.`],
    [`Calibration set`, `Spare rows with known outcomes that the model was <i>not</i> trained on. Used only to learn the correction.`],
    [`Platt scaling`, `<span class="eq">p = 1 / (1 + e<sup>−(a·score + b)</sup>)</span>. Logistic regression whose only input is the score. Two numbers, a and b.`],
    [`Isotonic regression`, `A non-decreasing step function fitted to the calibration rows: a higher score never gets a lower probability. No other shape is assumed.`],
    [`Pool adjacent violators`, `The algorithm behind isotonic regression: when a block's average is above the next block's, merge the two into their weighted average. Repeat until the averages never go down.`],
    [`Flat step`, `One level of the isotonic staircase. The readout "Isotonic: flat steps" counts them. More steps means more freedom and more risk with few rows.`],
    [`Increasing map`, `A correction that never reverses the order of two scores, so it cannot swap two applicants.`]],
  steps: [
    { h: `The score is not yet a probability`, p: `Each model gives a raw score. Pushing it through <span class="eq">1 / (1 + e<sup>−score</sup>)</span> gives a number between 0 and 1 that <i>looks</i> like a probability, but nothing has checked it. For the SVM on the default data, about three quarters of the test scores lie between 0.8 and 1.5, which the sigmoid turns into 0.69 to 0.82. Most applicants get nearly the same "probability".` },
    { h: `Learn the correction from examples`, p: `Take rows the model has not seen, with known outcomes. For each, record the model's score and whether the applicant repaid. Then fit a function g that maps a score to the repay rate among rows with that score. If g only goes up, the order of applicants is kept. Only the numbers change.` },
    { h: `Platt scaling: an S-curve with two knobs`, p: `<span class="eq">p = 1 / (1 + e<sup>−(a·score + b)</sup>)</span>. This is logistic regression with the score as its only feature, so it is quick and stable. The slope a stretches or shrinks the score: a below 1 shrinks over-confident log-odds (naive Bayes gets a = 0.33 on the default data), a above 1 stretches timid ones (the SVM gets 1.72). The intercept b slides the curve. a = 1 and b = 0 means no correction was needed.` },
    { h: `Isotonic regression: only "higher score, not lower probability"`, p: `Sort the calibration rows by score. Start with each row as its own block, with value 1 (repaid) or 0 (defaulted). Whenever a block's average is above the next block's, pool the two into their weighted average. Repeat until the averages never decrease. The result is a staircase. scikit-learn joins neighbouring steps with straight ramps, as the page does.` },
    { h: `Few knobs against many knobs`, p: `Platt has 2 numbers, so 50 rows are enough, but it can only draw an S. Isotonic has as many steps as the data support, so it can follow any rising shape, but with 100 rows each step rests on a handful of customers and the ends reach exactly 0 or 1. SVM, 30 datasets: isotonic had the worse Brier score on 22 datasets with 50 rows, 19 with 100, 15 with 200, 8 with 500, 2 with 1,000 and none with 2,000.` },
    { h: `Fit on rows the model has not seen`, p: `On its own training rows a model looks better than it will on new customers, because it was tuned to those rows. A calibrator fitted there learns a flattering picture and corrects too little (isotonic simply memorises the rows). Use a separate calibration set, or cross-fit as <code>CalibratedClassifierCV</code> does. Keep the test rows out too: they are for the final check only.` },
    { h: `Calibration repairs honesty, not ranking`, p: `Platt's curve rises, so no two applicants swap and the AUC is exactly unchanged. Isotonic merges neighbours into ties, and a tie counts half a point, so its AUC can move a little in either direction. A calibrator cannot turn a poor ranker into a good one. With 50 rows Platt's slope a even came out zero or negative on 2 of 30 SVM datasets, which reverses the ranking.` }],
  example: {
    title: `ten calibration rows, pooled by hand`,
    setup: `An SVM gave ten calibration customers these scores s, and you know who repaid (1) and who defaulted (0). They are already sorted by score. Fit an isotonic staircase by hand, then compare it with Platt scaling (a and b come from the computer: Newton's method is not a hand job).`,
    table: { head: [`Row`, `Score s`, `Repaid y`, `Raw sigmoid(s)`, `Isotonic`, `Platt p`], rows: [
      [`1`, `−1.2`, `0`, `0.231`, `0`, `0.058`],
      [`2`, `−0.8`, `0`, `0.310`, `0`, `0.124`],
      [`3`, `−0.5`, `1`, `0.378`, `0.333`, `0.207`],
      [`4`, `−0.2`, `0`, `0.450`, `0.333`, `0.326`],
      [`5`, `0.1`, `0`, `0.525`, `0.333`, `0.472`],
      [`6`, `0.3`, `1`, `0.574`, `0.5`, `0.574`],
      [`7`, `0.5`, `0`, `0.622`, `0.5`, `0.670`],
      [`8`, `0.8`, `1`, `0.690`, `1`, `0.790`],
      [`9`, `1.0`, `1`, `0.731`, `1`, `0.850`],
      [`10`, `1.4`, `1`, `0.802`, `1`, `0.928`]] },
    walk: [
      `Start with every row as its own block, values 0, 0, 1, 0, 0, 1, 0, 1, 1, 1. Scan left to right and look for a block that is higher than the one on its right.`,
      `Row 3 (value 1) is followed by row 4 (value 0): the averages go down, which isotonic forbids. Pool them: (1 + 0)/2 = 0.5, a block of two rows.`,
      `That 0.5 is now above row 5 (value 0). Pool again: (1 + 0 + 0)/3 = 0.333, a block of three rows (rows 3 to 5).`,
      `Row 6 (value 1) is followed by row 7 (value 0). Pool: 0.5 for rows 6 and 7. Since 0.333 is below 0.5, there is no further violation. Rows 8 to 10 are all 1.`,
      `Result: 0, 0, 0.333, 0.333, 0.333, 0.5, 0.5, 1, 1, 1. That is <b>4 flat steps</b> (levels 0, 0.333, 0.5 and 1), as the readout "Isotonic: flat steps" would say.`,
      `Platt on the same rows gives a = 2.054 and b = −0.317. For a new customer with s = 0.2: a·s + b = 0.411 − 0.317 = 0.094, and <span class="eq">1 / (1 + e<sup>−0.094</sup>)</span> = <b>0.523</b>. The raw sigmoid of 0.2 gives 0.550.`,
      `Isotonic at s = 0.2: the nearest step ends are (0.1, 0.333) and (0.3, 0.5). A straight ramp joins them, and 0.2 is halfway, so <b>0.417</b>.`],
    result: `One customer, three answers: raw 0.55, Platt 0.52, isotonic 0.42. With 10 rows the staircase fits these very rows best (Brier 0.117 on them, against 0.168 for Platt and 0.179 for the raw sigmoid), and it says exactly 1 for any score above 0.8 because three customers repaid. That is memory, not knowledge. Judge a calibrator only on rows it did not learn from: on the page with 100 rows, isotonic scores 0.1454 against Platt's 0.1382 on 3,000 fresh test applicants.` },
  read: [
    [`Table "Scores on the test applicants"`, `Brier, Log-loss, Calib. error and AUC for the Raw model, after Platt and after Isotonic, measured on 3,000 held-out applicants. Lower is better in the first three columns. The best value in each column is highlighted.`],
    [`Reliability chart: triangles, circles, diamonds`, `Triangles on a dashed line: "raw model". Circles: "after Platt scaling". Diamonds: "after isotonic regression". The nearer to the dashed diagonal, the more honest. The bars count the raw forecasts per bin.`],
    [`Maps plot: dashed curve`, `"plain sigmoid of the score": what the raw model does. Horizontal axis: model score. Vertical axis: probability.`],
    [`Maps plot: smooth S-curve`, `"Platt scaling": <span class="eq">sigmoid(a·score + b)</span>, fitted to the calibration rows.`],
    [`Maps plot: staircase`, `"isotonic regression": it only rises, and climbs where repayers outnumber defaulters among neighbouring scores.`],
    [`Short ticks on the top and bottom edges of the maps plot`, `Calibration rows (the first 700 are drawn). Top edge: repaid. Bottom edge: defaulted. Where both edges have ticks, the score cannot tell the two apart.`],
    [`Readouts: Platt: slope a, Platt: intercept b`, `The two fitted numbers. Slope a above 1 stretches the score, below 1 shrinks it.`],
    [`Readout: Isotonic: flat steps`, `The number of distinct levels in the staircase.`],
    [`Slider: Rows in the calibration set`, `50 to 2,000 fresh applicants. Both calibrators learn from these rows only, and are scored on the same 3,000 test applicants.`],
    [`Checkbox: Calibrate on the same rows the model was trained on`, `Uses up to 800 training rows instead of fresh ones. This is the mistake the lesson warns about.`],
    [`Plot: Repeat on 30 new datasets`, `Average test score against calibration rows over 30 datasets. The Score control switches between Brier score, Calibration error and Log-loss. The dashed horizontal line is the raw model. The sentence below counts datasets where isotonic did worse than Platt.`],
    [`Controls: Classifier, New data`, `Three models to fix: the SVM score, Gaussian naive Bayes and 5-nearest neighbours. New data redraws everything.`]],
  experiments: [
    { do: `Read the table at the defaults (SVM score, 100 calibration rows).`, see: `Calib. error: raw 0.107, Platt 0.054, isotonic 0.085. Brier: 0.1501, 0.1382, 0.1454. Platt slope a = 1.72, intercept b = −0.25.`, why: `The plain sigmoid squeezes the SVM's scores into a narrow band around 0.73. Platt's a = 1.72 stretches them back out, so the forecasts spread over 0.1 to 0.9 and match what happens. Isotonic has to discover the same shape from only 100 rows and ends up noisier.` },
    { do: `Drag <i>Rows in the calibration set</i> from 50 up to 2,000.`, see: `Brier (Platt, isotonic): 0.1383 and 0.1487 at 50 rows, 0.1367 and 0.1346 at 2,000. Calibration error: Platt 0.058 to 0.049, isotonic 0.095 to 0.021. Flat steps: 5 at 50 rows, 8 at 100, 17 at 2,000.`, why: `Platt has two numbers, so it settles quickly, but an S-curve is not exactly the SVM's shape and it stops improving near 0.05. Isotonic starts worse because few rows give a jumpy staircase, but its steps are free, so with enough rows it follows the true shape.` },
    { do: `Read the <i>Log-loss</i> column at 50, 100 and 2,000 rows, and watch the ends of the isotonic staircase in the maps plot.`, see: `Isotonic log-loss: 1.243, 0.958 and 0.531. The raw model is 0.480 and Platt stays near 0.44. At every size the staircase starts at exactly 0 and ends at exactly 1.`, why: `The lowest scores are all defaulters and the highest all repayers, so the pooled blocks at the two ends are pure 0 or 1. A forecast of exactly 0 or 1 that is wrong costs about 36 in log-loss, so a few misses ruin the average. On this data isotonic never beats the raw log-loss.` },
    { do: `Compare the <i>AUC</i> column across the three rows, at 100 rows and at 2,000 rows.`, see: `Raw and Platt show the same AUC, 0.7215, at every size. Isotonic shows 0.7122 at 100 rows and 0.7323 at 2,000.`, why: `Platt is an increasing curve, so it keeps every pair in order. Isotonic turns neighbouring scores into ties, and a tie counts half a point. A tie can lower the AUC (a correctly ordered pair becomes a tie) or raise it (a wrongly ordered pair becomes a tie), so it can drift either way.` },
    { do: `Drag <i>Rows in the calibration set</i> to 1,000 (only 800 training rows exist, so the page uses 800), then tick <i>Calibrate on the same rows the model was trained on</i>. Then switch the classifier to naive Bayes.`, see: `SVM: Platt's calibration error rises to 0.083 and isotonic's to 0.156, worse than the uncorrected 0.107. Platt's slope jumps to 4.08. Naive Bayes: Platt 0.019 and isotonic 0.018 on the training rows, against 0.020 and 0.011 on 1,000 fresh rows.`, why: `The SVM has been fitted to those 800 rows, so its scores separate them much better than they separate new customers. Platt therefore learns "scores are very informative" (a = 4.08) and over-corrects. Naive Bayes has only about a dozen numbers to fit, so it cannot memorise its training rows.` },
    { do: `With the SVM selected, press <i>Repeat on 30 new datasets</i> (it also runs once by itself when the page first loads; switching classifier clears it), and use the <i>Score</i> control to switch between Brier score, Calibration error and Log-loss.`, see: `Brier: the two lines meet near 200 rows (0.137 each) and isotonic is lower from 500 rows. Calibration error: isotonic is lower from 200 rows (0.044 against 0.045). Log-loss: Platt stays lower at every size (0.435 against 0.457 at 2,000 rows).`, why: `Averaging over 30 datasets removes the luck of a single draw. Isotonic wins on how close it follows reality once rows are plentiful, but its exact 0 and 1 keep its log-loss behind. The sentence under the plot counts the datasets where isotonic did worse: 19 of 30 at 100 rows, 0 of 30 at 2,000.` }],
  remember: [
    { tag: `Picture`, text: `Platt is a <b>dial</b>: two knobs, a (stretch) and b (shift), one smooth S. Isotonic is a <b>staircase</b>: as many steps as the data support, never down. Few rows, use the dial. Many rows, the staircase.` },
    { tag: `Rule of thumb`, text: `Under about 200 calibration rows, or when the model is naive Bayes, start with Platt. From about 1,000 rows, isotonic usually wins on Brier and calibration error. Between, try both and compare on rows neither has seen.` },
    { tag: `Trick`, text: `Read Platt's a as a verdict. <b>a below 1</b>: the model shouted, shrink it (naive Bayes 0.33). <b>a above 1</b>: it whispered, stretch it (SVM 1.72). a near 1 and b near 0: leave it alone.` },
    { tag: `Sanity check`, text: `After calibrating, the AUC must not fall for Platt (it is a rising curve). If Platt's AUC changed, the fitted a was zero or negative, which usually means too few calibration rows.` },
    { tag: `Rule of thumb`, text: `Never score a calibrator on the rows it learned from. Isotonic looks best there because it can memorise them: 0.117 against 0.168 for Platt on the ten example rows.` },
    { tag: `Link to code`, text: `<code>CalibratedClassifierCV(model, method="sigmoid", cv=5)</code>. "sigmoid" is scikit-learn's name for Platt scaling. <code>cv=5</code> cross-fits so every calibration row is unseen by the copy of the model that scores it.` }],
  mistakes: [
    { wrong: `"Calibration makes the model more accurate."`, right: `It changes the probabilities, not the ranking. Platt scaling leaves the AUC exactly where it was (0.7215 before and after on the default data).` },
    { wrong: `"Fit the calibrator on the training rows: they are the data we have."`, right: `The model has already learned those rows. For the SVM, isotonic on the 800 training rows gave an average calibration error of 0.165 over 30 datasets, against 0.032 with 500 fresh rows.` },
    { wrong: `"Isotonic is more flexible, so it is always better."`, right: `Flexibility needs rows. With 100 rows isotonic had the worse Brier score on 19 of 30 SVM datasets, and for naive Bayes Platt won on at least 27 of 30 at every size from 50 to 2,000 rows.` },
    { wrong: `"Platt scaling is only for SVMs."`, right: `It was invented for SVM scores but works on any score. For naive Bayes with 100 rows it took the average Brier score from 0.146 to 0.127.` },
    { wrong: `"I can fit the calibrator on the test rows too."`, right: `Then no rows are left to measure honestly whether the correction works. Keep three sets apart: train the model, fit the calibrator, test the result.` }],
  code: [
    {
      title: `Fit both calibrators on ten rows (the worked example)`,
      py: `import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
s = np.array([-1.2, -0.8, -0.5, -0.2, 0.1, 0.3, 0.5, 0.8, 1.0, 1.4])   # model scores of 10 calibration rows
y = np.array([0, 0, 1, 0, 0, 1, 0, 1, 1, 1])                           # 1 = repaid
iso = IsotonicRegression(out_of_bounds="clip").fit(s, y)               # the staircase
print("isotonic:", iso.predict(s).round(3).tolist(), "at 0.2:", round(float(iso.predict([0.2])[0]), 3))
platt = LogisticRegression(C=1e10).fit(s.reshape(-1, 1), y)            # the S-curve; huge C switches off shrinkage
a, b = platt.coef_[0, 0], platt.intercept_[0]
print("Platt: a =", round(a, 3), "b =", round(b, 3), "at 0.2:", round(1 / (1 + np.exp(-(a * 0.2 + b))), 3))`,
      out: `isotonic: [0.0, 0.0, 0.333, 0.333, 0.333, 0.5, 0.5, 1.0, 1.0, 1.0] at 0.2: 0.417
Platt: a = 2.054 b = -0.317 at 0.2: 0.523`,
      walk: [
        [`IsotonicRegression(out_of_bounds="clip")`, `The staircase fitter. <code>out_of_bounds="clip"</code> means a score beyond the training range gets the nearest end value instead of an error.`],
        [`.fit(s, y)`, `Learns from scores first, outcomes second. s is a plain 1-D array because isotonic regression has one input.`],
        [`iso.predict(s)`, `The fitted staircase values at the calibration scores: the "Isotonic" column of the table. Between steps it interpolates, which is why 0.2 gives 0.417.`],
        [`LogisticRegression(C=1e10)`, `Platt scaling is logistic regression. <code>C</code> is the inverse of the shrinkage strength; a huge C removes shrinkage, so you get the plain maximum-likelihood a and b that the page fits.`],
        [`s.reshape(-1, 1)`, `scikit-learn models want a 2-D table (rows by features). <code>-1</code> means "work out the number of rows"; <code>1</code> means one feature, the score.`],
        [`platt.coef_[0, 0], platt.intercept_[0]`, `Fitted attributes end in an underscore. <code>coef_</code> is a table with one row per class boundary and one column per feature, so [0, 0] is a. <code>intercept_</code> holds b.`]],
      tip: `The Platt value is computed by hand from a and b so you see there is no magic: it is just 1 / (1 + exp(−(a·s + b))).`
    },
    {
      title: `Calibrate naive Bayes the practical way, with cross-fitting`,
      py: `import numpy as np
from sklearn.naive_bayes import GaussianNB
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import brier_score_loss
rng = np.random.RandomState(0); s = rng.normal(size=4000)          # hidden strength
X = s[:, None] + 0.5 * rng.normal(size=(4000, 3))                  # three noisy copies: naive Bayes counts it 3 times
y = (rng.uniform(size=4000) < 1 / (1 + np.exp(-(1.4 + 1.2 * s)))).astype(int)
for method in (None, "sigmoid", "isotonic"):                       # scikit-learn calls Platt scaling "sigmoid"
    m = GaussianNB() if method is None else CalibratedClassifierCV(GaussianNB(), method=method, cv=5)
    p = m.fit(X[:2000], y[:2000]).predict_proba(X[2000:])[:, 1]    # fit on rows 0-1999, score rows 2000-3999
    print(method, round(brier_score_loss(y[2000:], p), 3))`,
      out: `None 0.178
sigmoid 0.155
isotonic 0.154`,
      walk: [
        [`GaussianNB()`, `The uncalibrated model. Its probabilities are too extreme because the three columns repeat the same evidence.`],
        [`CalibratedClassifierCV(GaussianNB(), method=..., cv=5)`, `A wrapper that does the whole job. With <code>cv=5</code> it splits the training rows in 5 folds. For each fold it trains the model on 4/5 of the rows and fits the calibrator on the remaining 1/5, so calibration rows are always unseen.`],
        [`method="sigmoid"`, `Platt scaling. <code>method="isotonic"</code> gives the staircase.`],
        [`.fit(X[:2000], y[:2000])`, `Everything here uses only the first 2,000 rows. The wrapper handles the splitting inside them.`],
        [`.predict_proba(X[2000:])[:, 1]`, `Probabilities for the held-out rows, averaged over the 5 calibrated copies. <code>[:, 1]</code> keeps P(repay).`],
        [`brier_score_loss(y_true, p)`, `The Brier score: lower is better. Calibration cut it from 0.178 to about 0.155, while the AUC (not printed) stays 0.776.`]],
      tip: `With cv=5 you never have to choose a separate calibration set yourself, which is why this is the usual way to do it in practice.`
    },
    {
      title: `Why the calibration rows must be fresh`,
      py: `from sklearn.datasets import make_classification
from sklearn.ensemble import RandomForestClassifier as RF
from sklearn.isotonic import IsotonicRegression as Iso
from sklearn.metrics import brier_score_loss as brier
X, y = make_classification(n_samples=6000, n_features=10, n_informative=4, flip_y=0.15, class_sep=0.8, random_state=0)
tr, cal, te = slice(0, 1500), slice(1500, 3000), slice(3000, 6000)    # three disjoint blocks of rows
rf = RF(n_estimators=100, random_state=0).fit(X[tr], y[tr])
p = rf.predict_proba(X)[:, 1]                                          # the forest's raw P(class 1) for every row
for name, rows in [("same rows", tr), ("fresh rows", cal)]:
    iso = Iso(out_of_bounds="clip").fit(p[rows], y[rows])
    print(name, round(brier(y[te], iso.predict(p[te])), 3))
print("no calibration", round(brier(y[te], p[te]), 3))`,
      out: `same rows 0.184
fresh rows 0.144
no calibration 0.145`,
      walk: [
        [`slice(0, 1500)`, `A reusable "rows 0 to 1,499". <code>X[tr]</code> then picks those rows. Three slices give three disjoint blocks: train, calibration, test.`],
        [`RF(n_estimators=100, ...)`, `A random forest, which fits its training rows almost perfectly. That is what makes its training-row forecasts misleading.`],
        [`p = rf.predict_proba(X)[:, 1]`, `The forest's raw probability for every row, computed once. On the <code>tr</code> rows these are over-sure because the forest has seen those rows.`],
        [`Iso(...).fit(p[rows], y[rows])`, `Learn the staircase from forecasts and outcomes of the chosen rows: first the training rows, then the fresh ones.`],
        [`iso.predict(p[te])`, `Apply the staircase to the test forecasts, and score it with the Brier score against the real outcomes <code>y[te]</code>.`]],
      tip: `On the same rows the staircase learns "the forest is nearly perfect" and corrects almost nothing useful (0.184); on fresh rows it learns the truth (0.144, slightly better than the raw 0.145).`
    }],
  check: [
    { q: `Why must a calibrator be fitted on rows the model was <i>not</i> trained on?`, options: [`On its own training rows the model looks better than it will on new customers, so the calibrator learns a flattering picture`, `scikit-learn refuses to run otherwise`, `Platt scaling needs rows without labels`, `Training rows change the order of the applicants`], answer: 0, why: `The model has been tuned to its training rows, so its scores there separate repayers from defaulters better than they will for new applicants. A calibrator fitted on them corrects too little (or memorises them, for isotonic).` },
    { q: `Naive Bayes gives a customer a raw log-odds score of 2.0, so the plain sigmoid says 0.88. Platt scaling fits a = 0.5 and b = 0. What probability does the calibrated model give?`, options: [`0.73`, `0.88`, `0.62`, `0.50`], answer: 0, why: `a·score + b = 0.5 × 2.0 + 0 = 1.0, and 1 / (1 + e^−1) = 0.73. Because a is below 1, the over-confident 0.88 is pulled back towards 0.5.` },
    { q: `You have only 60 calibration rows and can use either calibrator. What do you expect?`, options: [`Platt is usually safer: isotonic would build steps on a few customers each and may hit exactly 0 or 1`, `Isotonic is safer because it makes no assumptions`, `They give identical results below 100 rows`, `Neither works below 100 rows`], answer: 0, why: `With so few rows isotonic's steps rest on tiny groups, so it follows noise and reaches exactly 0 or 1, which hurts log-loss badly. Platt's two numbers can be estimated stably from 60 rows. On the SVM data isotonic had the worse Brier score on 22 of 30 datasets with 50 rows.` }],
  teachback: { prompt: `In two sentences, explain what a calibrator learns and why it must be fitted on rows the model has not seen.`, model: `A calibrator learns a map from the model's raw score to the share of applicants who really repay at that score, using rows with known outcomes; Platt scaling fits an S-curve with two numbers and isotonic regression a rising staircase. It must use rows the model has not seen, because on its training rows the model looks better than it will on new customers and the calibrator would learn that flattering picture.` },
  cheat: `Calibrator = map from raw score to honest probability, learned on unseen rows. Platt: p = 1/(1+e^−(a·score+b)), two numbers, best with few rows or S-shaped error. Isotonic: rising staircase by pooling adjacent violators, best with 1,000+ rows. Platt keeps AUC exactly; isotonic may create ties. Never fit or score on the rows the model learned from.`
};
