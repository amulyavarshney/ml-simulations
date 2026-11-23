// Lesson for decisions/reliability-diagram: does a 70% forecast come true 70% of the time? Bins, ECE, Brier score, log-loss.
module.exports = {
  idea: `A forecast of 70% is honest if, among all applicants given about 70%, about 70% really repay. A <b>reliability diagram</b> checks this: it sorts forecasts into bins and compares each bin's average forecast with what really happened.`,
  why: `Loan decisions multiply a probability by rupees. If a model says 95% but only 85% repay, every approval is worth less than the model claims, and a cut-off tuned on those claims loses money. AUC cannot warn you: it only looks at the order of applicants, never at whether 0.95 means 95%.`,
  analogy: `A weather app says "70% chance of rain". Collect every day it said 70%. If it rained on about 7 of every 10 of those days, the app is honest. If it rained on only 2 of 10, it is over-confident, even if it ranks wetter days above drier days correctly. Days are applicants, rain is repayment, and each group of similar forecasts is a bin.`,
  vocab: [
    [`Calibrated`, `Among the cases given probability p, a share p really happens, for every p. "Honest probabilities."`],
    [`Bin`, `A group of forecasts in one range, such as 0.8 to 0.9. The page uses 5 to 20 equal-width bins. A forecast exactly on an edge goes into the lower bin.`],
    [`Observed share`, `In one bin: the applicants who repaid divided by all applicants in the bin. This is what <i>really</i> happened.`],
    [`Expected calibration error (ECE)`, `The average gap between forecast and observed share over the bins, each bin weighted by its number of cases: <span class="eq">Σ (n<sub>b</sub> / n) · |observed − forecast|</span>. 0 is perfect.`],
    [`Brier score`, `The mean of (forecast − outcome)² over all applicants, with outcome 1 for repaid and 0 for default. 0 is perfect. Saying 0.5 for everyone scores 0.25.`],
    [`Log-loss`, `The mean of −ln(probability given to what happened). It punishes a confident mistake far harder than the Brier score does.`],
    [`Over-confident, under-confident`, `Over: forecasts more extreme than reality (0.97 said, 0.93 happened). Under: forecasts too timid (0.74 said, 0.88 happened). Neither word says anything about accuracy.`]],
  steps: [
    { h: `A probability cannot be checked on one customer`, p: `The model gives a customer 0.93. She repays, or she does not. Neither result proves 0.93 right or wrong. A probability is a promise about a group: of customers like this one, about 93 in 100 repay. So you must check the promise on groups.` },
    { h: `Make the groups: bins`, p: `Cut the range 0 to 1 into equal bins (the page lets you choose 5 to 20). Put each applicant in the bin that holds their forecast, so 0.93 and 0.97 share the bin 0.9 to 1.0. Count the applicants n<sub>b</sub> in each bin. The bars under the diagram show these counts.` },
    { h: `Two numbers per bin, one dot per bin`, p: `For each bin work out the <b>average forecast</b> (what the model promised) and the <b>observed share</b> (repaid divided by n<sub>b</sub>). Plot one dot at (average forecast, observed share). The dot sits at the average forecast of its members, not at the middle of the bin.` },
    { h: `Read the diagonal`, p: `On the dashed diagonal, observed equals promised: honest. Dots that run <b>flatter</b> than the diagonal (above it on the left, below it on the right) mean forecasts that are too extreme: <b>over-confident</b>. Dots steeper than the diagonal mean forecasts that are too timid: <b>under-confident</b>. The slope readout gives this a number: 1 is ideal.` },
    { h: `ECE: all the gaps as one number`, p: `Each bin has a gap, |observed − forecast|. Average the gaps, but weight each bin by its share of the applicants: ECE = Σ (n<sub>b</sub> / n) × gap<sub>b</sub>. A bin with 5 applicants out of 3,000 hardly counts. A bin with 1,200 dominates. The page marks ECE as good below 0.03 and poor above 0.07.` },
    { h: `Brier score and log-loss: score every applicant`, p: `Neither uses bins. Brier is the mean of (forecast − outcome)². Log-loss is the mean of −ln(probability given to the real outcome). Both punish confident mistakes. A 0.97 forecast for an applicant who defaults costs 0.94 in Brier but 3.5 in log-loss, and a forecast of exactly 1 costs about 36, because log-loss clips at about 2×10<sup>−16</sup>.` },
    { h: `Calibration alone is not enough`, p: `Say 0.795 for every applicant (the overall repay rate on the default data). All applicants land in one bin whose forecast equals its observed share, so ECE is about 0. Yet this "model" separates nobody. The Brier score exposes it: 0.163, against 0.124 for logistic regression. Read the diagram and ECE for honesty, and the Brier score for usefulness.` },
    { h: `Bins trade detail for noise`, p: `More bins show finer structure but hold fewer applicants each, and the observed share of a small bin jumps around by chance. A gap is never negative, so that noise never cancels and ECE creeps up as bins multiply: logistic regression scores 0.011 with 5 bins and 0.021 with 20. Brier and log-loss do not use bins, so they do not change.` }],
  example: {
    title: `ten customers, five bins, by hand`,
    setup: `A model gave ten customers these probabilities of repaying. A year later you know who repaid (1) and who defaulted (0). Use 5 bins of width 0.2 so the table stays short. Last column: (forecast − outcome)², used for the Brier score.`,
    table: { head: [`Customer`, `Forecast P(repay)`, `Repaid?`, `Bin`, `(forecast − outcome)²`], rows: [
      [`1`, `0.12`, `0`, `0 to 0.2`, `0.0144`],
      [`2`, `0.35`, `0`, `0.2 to 0.4`, `0.1225`],
      [`3`, `0.48`, `1`, `0.4 to 0.6`, `0.2704`],
      [`4`, `0.66`, `1`, `0.6 to 0.8`, `0.1156`],
      [`5`, `0.74`, `0`, `0.6 to 0.8`, `0.5476`],
      [`6`, `0.86`, `1`, `0.8 to 1.0`, `0.0196`],
      [`7`, `0.91`, `1`, `0.8 to 1.0`, `0.0081`],
      [`8`, `0.93`, `0`, `0.8 to 1.0`, `0.8649`],
      [`9`, `0.95`, `1`, `0.8 to 1.0`, `0.0025`],
      [`10`, `0.97`, `1`, `0.8 to 1.0`, `0.0009`]] },
    walk: [
      `Count per bin: customers 1, 2 and 3 are alone in their bins, customers 4 and 5 share one, and the other five share the top bin. The weights n<sub>b</sub>/n are 0.1, 0.1, 0.1, 0.2 and 0.5.`,
      `Average forecast and observed share per bin: (0.12, 0), (0.35, 0), (0.48, 1), (0.70, 0.50) and (0.924, 0.80). For bin 4: (0.66 + 0.74)/2 = 0.70, and one of two repaid. For bin 5: (0.86 + 0.91 + 0.93 + 0.95 + 0.97)/5 = 4.62/5 = 0.924, and four of five repaid. These five pairs are the five dots.`,
      `Gap = |observed − forecast| per bin: 0.12, 0.35, 0.52, 0.20 and 0.124.`,
      `<b>ECE</b> = 0.1 × 0.12 + 0.1 × 0.35 + 0.1 × 0.52 + 0.2 × 0.20 + 0.5 × 0.124 = 0.012 + 0.035 + 0.052 + 0.040 + 0.062 = <b>0.201</b>.`,
      `<b>Brier</b>: add the last column, 1.9665, and divide by 10: <b>0.197</b>. A lazy forecaster who says 0.6 (the repay rate here) for everyone scores 0.6 × 0.4 = 0.24, so this model beats the lazy one, but not by much.`,
      `<b>Log-loss</b> uses −ln of the probability given to what happened. Customer 8 got 0.93 and defaulted: −ln(0.07) = 2.66 (Brier cost 0.865). Customer 9 got 0.95 and repaid: −ln(0.95) = 0.05. The mean over the ten is 0.604.`,
      `Check the method against the page: 1-nearest neighbour on the default data forecasts only 0 or 1, so there are two bins. 562 applicants got 0 and 59.8% of them repaid. 2,438 got 1 and 84.1% repaid. ECE = (562/3,000) × 0.598 + (2,438/3,000) × 0.159 = 0.112 + 0.129 = 0.241, the page's value.`],
    result: `ECE 0.201, Brier 0.197, log-loss 0.604. The big top-bin dot, (0.924, 0.80), lies below the diagonal: the model promised 92% and four of five repaid. Do not read too much into ten customers: one customer more or less moves a one-person bin by a full 1.0. The page uses 3,000 test applicants for this reason, but the arithmetic is exactly the same.` },
  read: [
    [`A dot`, `One bin. Across: the average forecast of the applicants in it. Up: the share that really repaid. A bigger dot means more applicants.`],
    [`Dashed diagonal`, `Perfect calibration, where observed share equals forecast. The nearer the dots, the more honest the model.`],
    [`Thin line joining the dots`, `Only a guide for the eye. The readout "Slope of the dots" fits one straight line through all dots and lets big bins count more.`],
    [`Bars under the diagram`, `The number of test applicants in each bin. A dot above a tiny bar is noise. The tallest bars decide the ECE.`],
    [`Highlighted column and the sentence under the plot`, `Hover, tap, or click the diagram and press the arrow keys. The sentence names the bin, its cases and the share that repaid, for example "predicted 0.9 to 1.0: 2,438 cases, 84% really repaid".`],
    [`A missing dot`, `A bin with no applicants has no dot. 1-nearest neighbour fills only the first and last bins. The SVM fills nothing above 0.85.`],
    [`Verdict box`, `The page's judgement in words. "Well calibrated" needs a slope within 0.15 of 1 and an ECE below 0.04. "Slightly" over- or under-confident means a slope within 0.3 of 1 and an ECE below 0.06.`],
    [`Readout: Brier score`, `Mean squared gap between forecast and outcome. Lower is better. The lazy forecaster who says the repay rate for everyone scores about 0.163 on the default data.`],
    [`Readout: Log-loss`, `Lower is better. A probability of exactly 0 or 1 is clipped at about 2×10<sup>−16</sup>, so one confident mistake costs about 36.`],
    [`Readout: Expected calibration error`, `The weighted average gap. The page marks it good below 0.03 and poor above 0.07.`],
    [`Readout: Slope of the dots`, `1 is ideal. Below 1 means over-confident, above 1 under-confident. For two dots it is just rise over run: 1-nearest neighbour gives (0.841 − 0.598) / (1 − 0) = 0.24.`],
    [`Controls: Classifier, k, Number of bins, New applicants`, `k appears only for k-nearest neighbours. Number of bins runs from 5 to 20. New applicants draws a fresh made-up data set: 800 to learn from, 3,000 to test on.`]],
  experiments: [
    { do: `Look at the page as it loads: 1-nearest neighbour, 10 bins (answering <i>Predict first</i> brings you back to this view). Hover over the right-hand dot, or click the diagram and press <i>End</i>.`, see: `Only two dots exist. The left one is 562 applicants forecast near 0, and 60% of them repaid. The right one is 2,438 applicants forecast 1, and 84% repaid. ECE 0.241, slope 0.24, log-loss 8.7, verdict "over-confident".`, why: `One neighbour is a single 0/1 vote, so every forecast is exactly 0 or 1. But the nearest past applicant is only a rough guide to this one: 84% repay, not 100%, and "0%" was wrong for 60%. About 724 of the 3,000 forecasts were confidently wrong, and each costs about 36 in log-loss: 724 × 36 / 3,000 = 8.7.` },
    { do: `Choose <i>Logistic regression</i>.`, see: `Ten dots sit on the dashed diagonal. Verdict "well calibrated", ECE 0.018, slope 1.08, Brier 0.124, log-loss 0.390. The top bin holds 1,236 applicants forecast 0.95 and 96% of them repaid.`, why: `Logistic regression is fitted by minimising log-loss, which pays best when probabilities are honest, and these made-up data really do follow a logistic rule. A model whose shape does not match the data has no such guarantee.` },
    { do: `Choose <i>Gaussian naive Bayes</i> and hover over the leftmost and the rightmost dot.`, see: `Left dot: forecast 0.05, but 33% repaid (above the diagonal). Right dot: forecast 0.97, but 93.5% repaid (below it). Slope 0.62, ECE 0.085, verdict "over-confident".`, why: `Income, bank balance and savings are three noisy copies of one hidden strength. Naive Bayes treats them as independent and adds their evidence three times, so its log-odds are too large. Its ranking is almost as good as logistic regression's (AUC 0.81 against 0.82; the page does not show AUC), yet its numbers are not honest.` },
    { do: `Choose <i>k-nearest neighbours</i> and drag <i>k</i> from 1 up to 200.`, see: `On the first data set the verdict runs: over-confident up to k = 5, slightly over-confident from about 6, well calibrated from about 11, slightly under-confident from about 25, under-confident from about 37. At k = 200 the slope is 2.05.`, why: `A small k builds each forecast from a few votes, so it is jumpy and extreme. A large k averages in neighbours that are not similar, which pulls every forecast towards the overall repay rate of about 80%: too timid. In between, the two errors cancel. After <i>New applicants</i> the k limits shift a little.` },
    { do: `Choose <i>SVM score through a plain sigmoid</i> and hover over the biggest dot.`, see: `No dot above 0.85. The biggest dot holds 2,135 of 3,000 applicants forecast 0.7 to 0.8 (average 0.74), and 88% of them repaid. Verdict "under-confident", slope 1.63, ECE 0.112.`, why: `An SVM score is a distance from its boundary. Most test scores sit close to +1 (the median is 1.00; three quarters lie between 0.8 and 1.5), and the sigmoid of +1 is 0.73 whatever the truth. Nothing was fitted to tell 0.73 from 0.88. The next simulation fits exactly that correction.` },
    { do: `Select <i>Logistic regression</i> and move <i>Number of bins</i> to 5, 10 and 20. Then select 1-nearest neighbour and repeat.`, see: `Logistic regression: ECE 0.011, 0.018, 0.021. Brier and log-loss do not change at all. For 1-nearest neighbour the ECE stays 0.241 at every setting.`, why: `More bins mean fewer applicants per bin, so the observed share jitters by chance and the gap, which is never negative, adds up as error. Brier and log-loss use no bins. 1-nearest neighbour only ever fills the bins for 0 and 1, so slicing the range finer changes nothing.` }],
  remember: [
    { tag: `Picture`, text: `Dots on the diagonal are honest. <b>Flatter than the diagonal is over-confident</b>: the model shouts "0.97" and reality says 0.93. Steeper than the diagonal is under-confident: it whispers "0.74" and reality says 0.88.` },
    { tag: `Rule of thumb`, text: `Look at the bars before the dots. A dot with a tiny bar under it is noise. The biggest bar usually decides the ECE, so ask "how many cases?" before "how far from the diagonal?".` },
    { tag: `Sanity check`, text: `The lazy forecaster who says the overall repay rate ȳ for everyone has an ECE of about 0 and a Brier score of ȳ(1 − ȳ), which is 0.163 on the default data. A real model must beat that Brier score, so never judge ECE alone.` },
    { tag: `Formula in words`, text: `<b>ECE</b> = average gap, weighted by how many cases. <b>Brier</b> = average squared miss. <b>Log-loss</b> = average surprise at what really happened.` },
    { tag: `Trick`, text: `AUC hides dishonesty, because it only sees order. Naive Bayes has AUC 0.81 against 0.82 for logistic regression, yet ECE 0.085 against 0.018. Draw the diagram for your own model; never assume.` },
    { tag: `Link to code`, text: `<code>calibration_curve(y_true, y_prob)</code> returns the <i>observed share first</i> and the <i>mean forecast second</i>. Writing <code>mean_pred, frac_pos = ...</code> swaps the axes: a classic slip.` }],
  mistakes: [
    { wrong: `"The model said 90% and the applicant defaulted, so the model was wrong."`, right: `A 90% forecast should fail 1 time in 10. One case proves nothing. Check the whole bin: of the applicants forecast about 90%, did about 90% repay?` },
    { wrong: `"Over-confident means the model is very accurate."`, right: `It means the forecasts are more extreme than what happens. 1-nearest neighbour says 100% for 2,438 applicants and only 84% of them repay.` },
    { wrong: `"A high AUC means the probabilities are good."`, right: `AUC uses only the order of the forecasts. Any increasing change to the numbers leaves it alone but can wreck calibration. Check the diagram as well.` },
    { wrong: `"An ECE of zero means a great model."`, right: `Saying the overall repay rate (0.795) for every applicant gives an ECE of about 0 and no skill at all. Pair ECE with the Brier score.` },
    { wrong: `"More bins give a more accurate ECE."`, right: `More bins leave fewer cases per bin, so chance adds to every gap and ECE drifts upward even for an honest model. Compare ECE only at the same number of bins.` }],
  code: [
    {
      title: `Reliability table, ECE and Brier score by hand (the worked example)`,
      py: `import numpy as np
p = np.array([0.12, 0.35, 0.48, 0.66, 0.74, 0.86, 0.91, 0.93, 0.95, 0.97])  # forecast P(repay)
y = np.array([0, 0, 1, 1, 0, 1, 1, 0, 1, 1])                                # 1 = repaid
b = np.searchsorted([0.2, 0.4, 0.6, 0.8], p)     # bin number 0..4 for each customer
ece = 0
for k in range(5):
    m = b == k                                   # True for the customers in bin k
    if m.any():                                  # skip empty bins
        print(k, m.sum(), round(p[m].mean(), 3), round(y[m].mean(), 3))
        ece += m.mean() * abs(p[m].mean() - y[m].mean())   # m.mean() is n_b / n
print("ECE", round(ece, 3), "Brier", round(np.mean((p - y) ** 2), 3))`,
      out: `0 1 0.12 0.0
1 1 0.35 0.0
2 1 0.48 1.0
3 2 0.7 0.5
4 5 0.924 0.8
ECE 0.201 Brier 0.197`,
      walk: [
        [`np.searchsorted([0.2, 0.4, 0.6, 0.8], p)`, `For each forecast, counts the bin edges below it, which is its bin number 0 to 4. A forecast exactly on an edge stays in the lower bin, as on the page. Four inner edges make five bins.`],
        [`m = b == k`, `A True/False array with one entry per customer: True where the customer is in bin k. Use it as an index, <code>p[m]</code>, to pick that bin's forecasts.`],
        [`m.any()`, `False for an empty bin. Skipping it avoids taking the mean of nothing, which would give NaN.`],
        [`p[m].mean(), y[m].mean()`, `The dot of the bin: average forecast, and observed share. Because y is 0 or 1, its mean is the share that repaid.`],
        [`m.mean()`, `The mean of True/False values is the fraction of customers in the bin, n<sub>b</sub>/n. That is the weight in the ECE formula.`],
        [`np.mean((p - y) ** 2)`, `The Brier score: square each miss, then average. <code>**</code> is the power operator.`]],
      tip: `sklearn.metrics.brier_score_loss(y, p) gives the same Brier score. np.searchsorted and the page both use "lower bin on an edge"; np.digitize would put the edge case in the upper bin.`
    },
    {
      title: `Same ranking, different honesty: logistic regression against naive Bayes`,
      py: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.calibration import calibration_curve
rng = np.random.RandomState(0); s = rng.normal(size=4000)       # hidden "financial strength"
X = s[:, None] + 0.5 * rng.normal(size=(4000, 3))               # three noisy copies of it
y = (rng.uniform(size=4000) < 1 / (1 + np.exp(-(1.4 + 1.2 * s)))).astype(int)   # 1 = repaid
for m in (LogisticRegression(), GaussianNB()):
    p = m.fit(X[:2000], y[:2000]).predict_proba(X[2000:])[:, 1]  # learn on half, score the other half
    f, c = calibration_curve(y[2000:], p, n_bins=10)             # f: observed share, c: mean forecast
    print(type(m).__name__, round(roc_auc_score(y[2000:], p), 3), round(brier_score_loss(y[2000:], p), 3), round(np.abs(f - c).max(), 2))`,
      out: `LogisticRegression 0.775 0.153 0.09
GaussianNB 0.776 0.178 0.32`,
      walk: [
        [`rng = np.random.RandomState(0)`, `A random generator with a fixed seed, so every run makes the same data. <code>s</code> is one hidden strength number per applicant.`],
        [`s[:, None] + 0.5 * rng.normal(size=(4000, 3))`, `<code>s[:, None]</code> turns 4,000 numbers into a column of shape (4000, 1). Adding a (4000, 3) noise table copies that column across 3 columns: three noisy measurements of the same strength, like income, balance and savings.`],
        [`y = (rng.uniform(...) < 1 / (1 + np.exp(...))).astype(int)`, `Each applicant repays with probability sigmoid(1.4 + 1.2 s). The comparison gives True/False, and <code>astype(int)</code> turns it into 1/0.`],
        [`m.fit(X[:2000], y[:2000])`, `Learn from the first 2,000 rows. <code>X[2000:]</code> is held out for scoring.`],
        [`predict_proba(...)[:, 1]`, `Returns two columns, P(class 0) and P(class 1). <code>[:, 1]</code> keeps P(repay) because the classes are sorted 0 then 1.`],
        [`calibration_curve(y_true, p, n_bins=10)`, `Returns the observed share and mean forecast of each non-empty bin, in that order. The last number printed is the biggest gap among the bins.`]],
      tip: `Both models have almost the same AUC (0.775 and 0.776) because they rank applicants alike. The Brier score and the worst bin gap are what separate them.`
    }],
  check: [
    { q: `A model gave 400 applicants a forecast of 0.90. Of them, 300 repaid. What is the verdict for this bin?`, options: [`Over-confident: forecast 0.90, observed 0.75`, `Under-confident: forecast 0.90, observed 0.75`, `Well calibrated: 300 of 400 is a high number`, `Cannot say, because a bin needs 1,000 cases`], answer: 0, why: `Observed share = 300/400 = 0.75, which is below the 0.90 promised. Fewer repaid than promised means the forecast was too extreme: over-confident, by 0.15 in this bin.` },
    { q: `Two bins. Bin A: 200 applicants, average forecast 0.2, observed share 0.3. Bin B: 800 applicants, average forecast 0.8, observed share 0.7. What is the ECE?`, options: [`0.10`, `0.00`, `0.05`, `0.20`], answer: 0, why: `Gaps are 0.1 and 0.1. Weights are 200/1,000 = 0.2 and 800/1,000 = 0.8. ECE = 0.2 × 0.1 + 0.8 × 0.1 = 0.10. The two errors have opposite signs (above and below the diagonal) but the absolute value stops them cancelling.` },
    { q: `You keep a model's forecasts the same and change the page's <i>Number of bins</i> from 10 to 20. What happens?`, options: [`The Brier score stays the same; ECE usually rises a little`, `Both Brier and ECE stay the same`, `Both Brier and ECE halve`, `The Brier score rises; ECE stays the same`], answer: 0, why: `The Brier score is computed per applicant with no bins, so it cannot change. With 20 bins each holds fewer applicants, so chance moves the observed shares more, and the sum of absolute gaps tends to grow.` }],
  teachback: { prompt: `In two sentences, explain to a friend how a reliability diagram tells you whether a model's 70% means 70%.`, model: `Group the applicants by the forecast the model gave (bins), then for each group compare the average forecast with the share that really repaid. If those two numbers match, so the dots sit on the diagonal, the model's percentages can be taken at face value; dots flatter than the diagonal mean it is over-confident.` },
  cheat: `Calibrated: of cases forecast p, a share p happen. Reliability diagram: one dot per bin at (average forecast, observed share); the diagonal is honest, flatter is over-confident. ECE = Σ (n_b/n)|observed − forecast|. Brier = mean (forecast − outcome)²; log-loss punishes confident mistakes harder. Zero ECE alone proves nothing: always check Brier too.`
};
