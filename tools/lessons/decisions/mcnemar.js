// Lesson for decisions/mcnemar. Every number was computed with scipy / numpy, or with the widget's own ml-decide.js (seed 3 for the "real classifiers" mode).
module.exports = {
  idea: `When two models are scored on the <b>same</b> test rows, only the rows where they <b>disagree</b> can show which is better. McNemar's test counts those rows (b for A, c for B) and asks whether such a lopsided split could come from a fair coin.`,
  why: `A one-point accuracy gap on one test set can be luck. If you crown model A on luck, you retrain, re-audit and redeploy for no gain, or you throw away a model that was just as good. Looking only at the disagreements gives a sharper answer from the same rows than comparing two accuracies as if they were unrelated.`,
  analogy: `Two students sit the same 200-question exam. Questions both get right, or both get wrong, tell you nothing about who is stronger. Only the questions where exactly one of them is right matter. If the students are equally able, each of those questions is a coin toss for who wins it. Your job: decide whether 12 wins to 3 could be a fair coin.`,
  vocab: [
    ['Paired comparison', `Both models are scored on the same test rows, so every row gives a pair of verdicts (A right or wrong, B right or wrong). The test uses that pairing.`],
    ['b and c', `<b>b</b> = rows where only A is right. <b>c</b> = rows where only B is right. Together they are the <i>disagreements</i> (statisticians call them discordant pairs).`],
    ['Null hypothesis', `The boring assumption you try to refute: the two models are equally good. The test asks how surprising your data would be if that were true.`],
    ['p-value', `If the models were equally good, the chance of a split at least as lopsided as yours, in either direction. Small (below 0.05 by habit) means a fair coin rarely does this. It is <b>not</b> the probability that A is better.`],
    ['Exact binomial test', `Add up fair-coin probabilities for every split at least as lopsided as yours. "Exact" because it uses the real coin-flip counts, not an approximation.`],
    ['Chi-square version', `A shortcut formula, <span class="eq">(|b − c| − 1)² / (b + c)</span>, compared with a chi-square table (1 degree of freedom). The −1 is the continuity correction. It matches the exact answer well once b + c is a few dozen.`],
    ['Bootstrap interval', `Resample the test rows with replacement, recompute A minus B each time, keep the middle 95%. It shows how big the gap could plausibly be, which a p-value does not.`]],
  steps: [
    { h: 'Two models, one test set', p: `Models A and B each predict every test row, and their accuracies differ by, say, 0.8 points. A different test set would give a different gap, sometimes with the sign reversed. So the question is not "which number is bigger?" but "could this gap be luck?". Because both models saw <b>the same rows</b>, we can answer it far more sharply than by comparing two separate accuracies.` },
    { h: 'Sort every row into one of four boxes', p: `Each row has a pair of verdicts, so the test set becomes a 2 × 2 table: <b>both right</b>, <b>only A right (b)</b>, <b>only B right (c)</b>, <b>both wrong</b>. The four counts add up to n, the number of test rows.` },
    { h: 'The gap lives in two boxes', p: `Accuracy of A = (both right + b) / n. Accuracy of B = (both right + c) / n. Subtract: <span class="eq">A − B = (b − c) / n</span>. "Both right" cancels, and "both wrong" is in neither. The whole gap is decided by b and c. The rows where the models agree are bystanders.` },
    { h: 'Assume the models are equally good', p: `This is the null hypothesis. On a row where the models disagree, it is then equally likely that A is the right one or B is. So each disagreement is a fair coin flip, and b, the number A wins, behaves like heads in b + c flips: <span class="eq">b ~ Binomial(b + c, ½)</span>. Agreeing rows involve no coin at all.` },
    { h: 'The exact p-value', p: `If the coin is fair, how often would a split be at least as lopsided as yours? The chance of exactly k heads in n flips is <span class="eq">C(n, k) / 2ⁿ</span>. Add the tail on the small side, then double it, because "B much better" would have been just as surprising: <span class="eq">p = 2 · P(X ≤ min(b, c))</span>. If b = c the answer is 1.` },
    { h: 'The chi-square shortcut', p: `Adding hundreds of binomial terms by hand was painful, so people used a bell-curve approximation: compare <span class="eq">(|b − c| − 1)² / (b + c)</span> with a chi-square table. The −1 repairs the fact that counts move in whole steps. For 31 against 23 both methods give 0.341. For small counts such as 12 against 3 they differ in the third decimal (0.035 and 0.039), so prefer the exact value.` },
    { h: 'Add an interval for the size', p: `A p-value says whether the gap is distinguishable from zero, not how big it is. The paired bootstrap resamples the test rows (each row keeps both verdicts), recomputes A minus B 2,000 times and keeps the middle 95%. If the interval excludes zero, it agrees with p below 0.05. Its width shows which gaps you cannot rule out.` },
    { h: 'What the test can and cannot say', p: `Small p: the gap is probably not luck. Large p: you <i>cannot tell</i>, which is not the same as "equal". The same 55 : 45 split gives p = 0.39 on 110 disagreements and p = 0.037 on 550. The test needs both models scored on the same rows, and it does not apply to cross-validation folds (see the CV t-test page).` }],
  example: {
    title: 'two models, 200 test applicants, solved by hand',
    setup: `Model A (logistic regression) and model B (another classifier) are scored on the same 200 loan applicants in a test set. Right or wrong is judged against what the applicant actually did. The 2 × 2 table:`,
    table: { head: ['', 'B right', 'B wrong', 'Total'], rows: [
      ['A right', '150 (both right)', '12 = b (only A right)', '162'],
      ['A wrong', '3 = c (only B right)', '35 (both wrong)', '38'],
      ['Total', '153', '47', '200']] },
    walk: [
      `Accuracies: A = 162/200 = <b>81.0%</b>, B = 153/200 = <b>76.5%</b>. The gap is 4.5 points, which equals (b − c)/n = 9/200. The 150 and the 35 never entered the subtraction.`,
      `Assume the models are equally good. The b + c = 15 disagreements are 15 fair-coin flips and A won 12 of them. How often does a fair coin win 12 or more out of 15?`,
      `The chance of exactly k wins is C(15, k) / 2¹⁵, and 2¹⁵ = 32,768. By symmetry, "12 or more" has the same chance as "3 or fewer". The counts C(15, 0..3) are 1, 15, 105, 455, which add up to 576.`,
      `One tail: 576 / 32,768 = 0.0176. Either model could have been the lucky one, so double it: <b>p = 0.0352</b>.`,
      `Chi-square check: (|12 − 3| − 1)² / 15 = 64 / 15 = 4.27, and the chi-square table (1 degree of freedom) gives p = 0.039. Close, but with only 15 disagreements the exact 0.035 is the one to quote.`,
      `Why pairing helps: an unpaired test treats 81.0% and 76.5% as results on two different groups of 200 rows. Its standard error is 4.08 points (z = 1.10, p = 0.27). The paired standard error uses only the disagreements: <span class="eq">√(b + c − (b − c)² / n) / n</span> = √(15 − 0.405) / 200 = 1.91 points, about half.`,
      `Bootstrap: resample the 200 rows 2,000 times and keep the middle 95% of A minus B: <b>+1.0 to +8.5 points</b>. It excludes zero, in line with p = 0.035.`,
      `How fragile? Suppose B had also been right on one of the 35 "both wrong" rows. Then b = 12, c = 4 and p = 0.077. A single row separates "significant" from "not", so treat a p-value near 0.05 as borderline, not as a verdict.`],
    result: `Exact p = 0.0352 (chi-square 0.0389). A is 4.5 points better on these rows, with interval +1.0 to +8.5, so luck is an unlikely explanation. But the case rests on 15 rows: with b = 12 and c = 4, p = 0.077.` },
  read: [
    [`The 2 × 2 table, rows "A right" and "A wrong", columns "B right" and "B wrong"`, `Every test row lands in exactly one cell. Top left is both right, bottom right is both wrong.`],
    [`The two highlighted cells, "b: A right, B wrong" and "c: B right, A wrong"`, `The only cells that enter the test. The other two are shown so you can see how many rows are being ignored.`],
    [`Orange bars in "If the models were equally good, each disagreement is a coin flip"`, `Splits at least as lopsided as yours, in either direction. Their heights add up to the exact p-value. Blue bars are less lopsided splits.`],
    [`Solid and dashed vertical lines in that chart`, `The solid line sits at b and the dashed line at c. The further both are from the middle of the bell, the smaller the p-value.`],
    [`Hover text "A wins x of y"`, `The chance, if the models were equally good, of exactly that split. It is one bar, not a tail, so it is much smaller than p.`],
    [`Exact McNemar p-value`, `The two-sided binomial p-value, to 4 decimals. A tiny value reads "below 0.0001": small, but never exactly zero.`],
    [`Chi-square statistic and p from the chi-square`, `The shortcut with continuity correction. Compare it with the exact p-value: they agree to 2 or 3 decimals once b + c is large.`],
    [`A minus B`, `The accuracy gap in points, which equals (b − c) / rows × 100.`],
    [`Bootstrap histogram, with the diamond, the zero line and "95% interval"`, `How A minus B (accuracy points) varies when the test rows are resampled. If the zero line lies inside the interval, the rows cannot separate the models.`],
    [`"Use: What-if table"`, `Type b, c and the number of rows directly. The rows where the models agree are split 88% both right and 12% both wrong, which the test ignores anyway.`]],
  experiments: [
    { do: `Load the page and leave everything alone (Two real classifiers, 1,000 test rows, k = 25). Read the table, then hover over the bar at 31.`,
      see: `The table shows 798 both right, b = 31, c = 23, 148 both wrong. A scores 82.9% and B 82.1%. The exact p-value is 0.3409 and the chi-square p is 0.3408. The hover reads "A wins 31 of 54: chance 6.03%". The bootstrap interval is −0.7 to +2.2.`,
      why: `946 rows agree and appear in no bar. Among 54 fair flips you expect 27 wins with a spread of about ±3.7, so 31 is only 1.1 spreads away: ordinary. The orange bars cover 0 to 23 and 31 to 54 wins and add up to 0.34.` },
    { do: `Drag "k for model B" down to 1, then up to 100.`,
      see: `At k = 1, B falls to 74.2% against A's 82.9%: b = 137, c = 50, the p-value reads "below 0.0001" (it is about 1.5 × 10⁻¹⁰) and the interval is +6.1 to +11.2. At k = 100, B is 81.8%, b = 34, c = 23, p = 0.185 and the interval (−0.3 to +2.6) contains zero.`,
      why: `A 1-neighbour vote copies the single nearest training applicant, noise included, so it loses clearly and the 187 disagreements are lopsided. With 25 or 100 neighbours the vote is smooth and B behaves like A, so wins split almost evenly.` },
    { do: `Put k back at 25 and slide "Test rows" from 200 up to 5,000, noting the p-value as you go.`,
      see: `p wanders instead of falling steadily: about 0.39 at 200 rows, 0.14 at 700, 0.34 at 1,000, 0.56 at 2,000, 0.21 at 3,000. It first drops below 0.05 near 4,000 rows (0.038) and is 0.006 at 5,000.`,
      why: `The true gap is about one point or less. b − c grows slowly while its noise grows like √(b + c), so only thousands of rows lift the gap clear of the noise. The slider adds rows to the same table, so neighbouring stops share most of their rows.` },
    { do: `Press "New data" four times at 1,000 rows and k = 25, reading the p-value each time.`,
      see: `The four new tables give p = 1.000 (19 against 19), 0.087 (36 against 22), 0.880 (23 against 21) and 1.000 (25 against 24). None is below 0.05.`,
      why: `New training rows and new test rows move b and c by a few either way. p = 1 simply means b = c exactly: nothing to see. It does not prove the models are equal.` },
    { do: `Switch "Use" to "What-if table", press "b = 60, c = 50", then press "Same proportions, 5 times the rows".`,
      see: `First: 783 both right, 107 both wrong, A 84.3% against B 83.3%, gap +1.0 point, p = 0.3909, chi-square statistic 0.74, interval −1.1 to +3.0. After the press, b = 300, c = 250 on 5,000 rows: the gap is still +1.0, but p = 0.0366 and the interval is +0.1 to +1.9.`,
      why: `The ratio is unchanged but the number of coin flips went from 110 to 550. The z-score <span class="eq">(|b − c| − 1) / √(b + c)</span> rose from 0.86 to 2.09. Same gap, five times the evidence, because noise shrinks like 1/√n.` },
    { do: `From "b = 60, c = 50" on 1,000 rows, press "Add 1,000 agreeing rows" twice.`,
      see: `p stays exactly 0.3909 and the chi-square statistic stays 0.74. Accuracies rise (86.2% and 85.7% at 2,000 rows, then 86.8% and 86.4% at 3,000), the gap shrinks to +0.5 then +0.3 points, and the interval narrows to −0.5 to +1.6, then −0.4 to +1.0.`,
      why: `Agreeing rows enter neither b nor c, so they carry no information about which model is better. They only dilute the gap and shrink its interval by the same factor, so the verdict does not change.` }],
  remember: [
    { tag: 'Picture', text: `Two tally columns. Make a mark for every row where only A is right and for every row where only B is right. Ignore all other rows. Then ask: is this tally lopsided enough that a fair coin would rarely do it?` },
    { tag: 'Rule of thumb', text: `The square root of the chi-square statistic is a z-score: <span class="eq">(|b − c| − 1) / √(b + c)</span>. Above about 2 means p below about 0.05. Check: 31 v 23 gives 0.95 (p = 0.34); 12 v 3 gives 2.07 (p = 0.039); 300 v 250 gives 2.09 (p = 0.037).` },
    { tag: 'Rule of thumb', text: `The z-score grows like √(b + c). At the same proportions, doubling z needs 4 times the disagreements: b = 60, c = 50 has z = 0.86, and reaching z above 2 took 5 times as many (300 v 250), not a few more rows.` },
    { tag: 'Sanity check', text: `The four cells must add up to the number of test rows, and swapping A and B must leave p unchanged (only the sign of the gap flips). If b + c = 0 there is nothing to test.` },
    { tag: 'Trick', text: `Large p means "cannot tell", not "equal". Read the interval as well: −0.7 to +2.2 on the default data still allows A to be 2 points better.` },
    { tag: 'Link to code', text: `<code>binomtest(b, b + c, 0.5).pvalue</code>: successes, trials, null probability. The whole exact test is that one call.` }],
  mistakes: [
    { wrong: `"p = 0.34 means there is a 34% chance that A is better, or that the models are equal."`, right: `p is worked out <i>assuming</i> the models are equal. It is the chance of a split this lopsided under that assumption. It is not the probability that either claim is true.` },
    { wrong: `"The 946 rows where both models agree are most of my evidence, so I should keep them."`, right: `Keep them for reporting accuracy, but for the test they count for nothing. Add 1,000 more agreeing rows and p does not move.` },
    { wrong: `"p above 0.05 means the two models are equally good."`, right: `It means this test set cannot tell. On the default data the interval still runs from −0.7 to +2.2 points, and on 4,000 rows of the same table the p-value is 0.038.` },
    { wrong: `"I can run McNemar on any two accuracy numbers."`, right: `It needs both models scored on the <b>same</b> rows, so that each row has a pair of verdicts. Two accuracies from different test sets have no b and c.` },
    { wrong: `"A significant p-value means the gap is big enough to matter."`, right: `Significance says the gap is not luck, not that it is large. A 0.3-point gap can be significant on 50,000 rows. Look at the interval, and at the profit it implies.` }],
  code: [
    {
      title: `From b and c to the p-value, exact and chi-square`,
      py: `from scipy.stats import binomtest, chi2
b, c = 12, 3                                    # b: only A right, c: only B right
exact = binomtest(b, n=b + c, p=0.5).pvalue     # A wins b of b + c fair-coin flips, two-sided
stat = (abs(b - c) - 1) ** 2 / (b + c)          # chi-square statistic with continuity correction
print("exact p =", round(exact, 4))
print("chi-square =", round(stat, 3), " p =", round(chi2.sf(stat, df=1), 4))
print("widget what-if 60 v 50:", round(binomtest(60, 110).pvalue, 4), " 300 v 250:", round(binomtest(300, 550).pvalue, 4))`,
      out: `exact p = 0.0352
chi-square = 4.267  p = 0.0389
widget what-if 60 v 50: 0.3909  300 v 250: 0.0366`,
      walk: [
        ['binomtest(b, n=b + c, p=0.5)', `Runs the exact binomial test: <code>b</code> "successes" (A wins) out of <code>n = b + c</code> trials (the disagreements), against a fair coin <code>p = 0.5</code>. It is two-sided by default.`],
        ['.pvalue', `The result object holds several things; <code>.pvalue</code> is the number you want.`],
        ['(abs(b - c) - 1) ** 2 / (b + c)', `The chi-square statistic. <code>abs</code> because the sign does not matter, <code>- 1</code> is the continuity correction, <code>** 2</code> squares it.`],
        ['chi2.sf(stat, df=1)', `<code>sf</code> is the survival function: the chance of a value at least this large, which is the p-value. <code>df=1</code> because there is one comparison (b against c).`],
        ['binomtest(60, 110)', `Leaving out <code>p</code> keeps the default 0.5. 60 + 50 = 110 disagreements.`]],
      tip: `With only 15 disagreements the shortcut is off by 0.004. With 550 it is not: for 300 v 250 the chi-square p is 0.0367 against 0.0366 exact.`
    },
    {
      title: `From two models' predictions to the 2 × 2 table`,
      py: `from sklearn.datasets import make_classification
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from scipy.stats import binomtest
X, y = make_classification(n_samples=1800, n_features=6, n_informative=2, n_redundant=0, flip_y=0.15, weights=[0.2, 0.8], random_state=1)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=1000, random_state=0)
a_ok = LogisticRegression().fit(Xtr, ytr).predict(Xte) == yte   # True where model A is right
b_ok = KNeighborsClassifier(n_neighbors=25).fit(Xtr, ytr).predict(Xte) == yte
b, c = int((a_ok & ~b_ok).sum()), int((~a_ok & b_ok).sum())
print("both right", int((a_ok & b_ok).sum()), "| b", b, "| c", c, "| both wrong", int((~a_ok & ~b_ok).sum()))
print("accuracy A", a_ok.mean(), "B", b_ok.mean(), "| exact p =", round(binomtest(b, b + c).pvalue, 3))`,
      out: `both right 816 | b 32 | c 20 | both wrong 132
accuracy A 0.848 B 0.836 | exact p = 0.126`,
      walk: [
        ['test_size=1000', `Hold out exactly 1,000 rows as the test set; both models are scored on these same rows, which is what makes the comparison paired.`],
        ['.predict(Xte) == yte', `Compares each prediction with the true label and gives an array of True (right) and False (wrong), one entry per test row. That array is all the test needs from a model.`],
        ['a_ok & ~b_ok', `<code>&</code> is element-wise AND, <code>~</code> is NOT. So this is True exactly where A is right and B is wrong: the rows counted by <b>b</b>.`],
        ['~a_ok & b_ok', `True where only B is right: the count <b>c</b>.`],
        ['.sum()', `Adding up True and False counts the Trues (True = 1). <code>int(...)</code> only tidies the printout.`],
        ['a_ok.mean()', `The mean of True/False values is the share of Trues, which is the accuracy.`]],
      tip: `The accuracies differ by 1.2 points, but the exact p-value is 0.126: a gap of that size on 52 disagreements is not unusual for a fair coin.`
    },
    {
      title: `A paired bootstrap interval for the accuracy gap`,
      py: `import numpy as np
d = np.r_[np.ones(12), -np.ones(3), np.zeros(185)]     # +1: only A right, -1: only B right, 0: tie
rng = np.random.RandomState(0)
rows = rng.randint(0, len(d), size=(2000, len(d)))      # 2000 resamples of the 200 row numbers
gaps = d[rows].mean(axis=1) * 100                       # A minus B in accuracy points, per resample
print("observed gap:", round(d.mean() * 100, 1))
print("95% interval:", np.percentile(gaps, [2.5, 97.5]).round(1).tolist())`,
      out: `observed gap: 4.5
95% interval: [1.0, 8.5]`,
      walk: [
        ['np.r_[np.ones(12), -np.ones(3), np.zeros(185)]', `Glues three arrays end to end: one number per test row, equal to A's verdict minus B's (1 − 0, 0 − 1, or a tie). Their mean is the accuracy gap. Storing one number per row keeps both verdicts together, which is what "paired" means.`],
        ['rng.randint(0, len(d), size=(2000, len(d)))', `A 2000 × 200 table of random row numbers drawn <i>with replacement</i>. Each line is one resampled test set of the same size.`],
        ['d[rows]', `Fancy indexing: looks up the verdict of every drawn row, giving a 2000 × 200 table.`],
        ['.mean(axis=1) * 100', `<code>axis=1</code> averages along each line, giving 2000 gaps. Times 100 turns them into points.`],
        ['np.percentile(gaps, [2.5, 97.5])', `The middle 95%: cut off 2.5% at each end.`]],
      tip: `Resample the rows, never b and c separately; otherwise you break the pairing.`
    }],
  check: [
    { q: `Two models are scored on the same 500 test rows. They agree on 460 rows and disagree on 40. Which rows does McNemar's test use?`, options: [`Only the 40 rows where they disagree`, `All 500 rows`, `Only the 460 rows where they agree`, `Only the rows both models get wrong`], answer: 0, why: `The accuracy gap is (b − c) / n, and b + c = 40 are the only rows that can make b and c differ. Rows where both are right or both wrong cancel out.` },
    { q: `b = 8 and c = 2. Using the fair-coin counts C(10, k) / 2¹⁰ for k = 0, 1, 2 (which are 1, 10, 45 over 1,024), what is the exact two-sided p-value?`, options: [`0.109`, `0.055`, `0.022`, `0.80`], answer: 0, why: `One tail is (1 + 10 + 45) / 1,024 = 56 / 1,024 = 0.0547. Either model could have been the lucky one, so double it: 0.109. The value 0.055 is the one-sided mistake of forgetting to double.` },
    { q: `A comparison has b = 60 and c = 50 on 1,000 rows, with p = 0.39. You add 2,000 more rows on which both models agree. What happens to the exact p-value?`, options: [`It stays 0.39`, `It falls below 0.05`, `It rises towards 1`, `It halves`], answer: 0, why: `Agreeing rows add nothing to b or c. The accuracy gap shrinks (from 1.0 to 0.3 points) and so does its interval, but p depends only on b and c.` }],
  teachback: { prompt: `In two sentences, explain to a friend why McNemar's test ignores most of the test set, and what it asks of the rows it keeps.`, model: `Rows where both models are right or both are wrong cannot show which model is better, so the test throws them away and counts only the rows where exactly one is right. If the models were equally good, each such row would be a fair coin flip, so it asks how rarely a fair coin gives a split as lopsided as b to c; if that chance is below 0.05, the gap is probably real.` },
  cheat: `Same test rows for both models. b = only A right, c = only B right. Equal models make each disagreement a fair coin: exact p = 2 · P(X ≤ min(b, c)), X ~ Binomial(b + c, ½); in scipy, binomtest(b, b + c).pvalue. Quick check: (|b − c| − 1) / √(b + c) above 2 means p below 0.05. Agreeing rows add nothing. Large p: "cannot tell".`
};
