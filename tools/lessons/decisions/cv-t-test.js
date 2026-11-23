// Lesson for decisions/cv-t-test. Page numbers come from ML.aaComparison (n = 300 rows, C = 1 against C = 0.1), page-load seed 1; the SE and correlation checks were measured with the same generator.
module.exports = {
  idea: `Cross-validation gives J accuracy differences between two models, but they come from the same few rows, so they are not J independent looks. A plain paired t-test pretends they are and finds winners that do not exist. Nadeau and Bengio's correction fixes the standard error.`,
  why: `Repeating K-fold feels like more evidence, so the plain t-test grows more confident with every repeat, even for two models that are equally good. On this page, 5 folds repeated 5 times name a winner in 21.7% of comparisons instead of 5%. You would ship or reject models on noise.`,
  analogy: `A pollster asks 300 voters a question, then asks the same 300 again with the questions shuffled, five times over. She now holds 1,500 answers but only 300 opinions, and the same few swing voters sway every round. Quoting the margin of error for 1,500 people would be dishonest. Repeated K-fold on 300 rows is the same: many scores, one sample of 300 applicants.`,
  vocab: [
    ['K-fold, repeats R', `Split the rows into K folds, train on K − 1 of them, test on the one left out, and rotate. Repeat with a fresh shuffle R times. Each model gets J = K × R test scores.`],
    ['Fold difference d', `Accuracy of A minus accuracy of B on one test fold. The t-test works on the list d₁ … d_J.`],
    ['Naive paired t-test', `<span class="eq">t = mean(d) / (s / √J)</span>, where s is the standard deviation of the d's, looked up with J − 1 degrees of freedom. It is valid only if the d's are independent.`],
    ['Standard error (SE)', `How much the average difference would wobble if you repeated the whole experiment on fresh data. A t-test divides the average by its SE.`],
    ['n_test / n_train', `Rows in one test fold divided by rows in one training set. In K-fold it equals <span class="eq">1 / (K − 1)</span>: 0.25 for K = 5, 0.11 for K = 10.`],
    ['False alarm', `The test says "different" (p below 0.05) when the models are equally good. An honest test does this 5% of the time.`],
    ['Corrected resampled t-test', `Nadeau and Bengio's version: the same t-test, but the variance of the average is <span class="eq">s² (1/J + n_test/n_train)</span> instead of <span class="eq">s² / J</span>.`],
    ['A/A test', `Compare two equally good models on fresh data many times. A sound procedure flags about 5%. The page does exactly this, 300 times.`]],
  steps: [
    { h: 'The question', p: `You have models A and B and n = 300 applicants. K-fold cross-validation scores both models on every row, one fold at a time, giving K differences d = acc<sub>A</sub> − acc<sub>B</sub>. Repeating the whole K-fold R times with fresh shuffles gives J = K × R differences. Is their average really different from zero?` },
    { h: 'The paired t-test', p: `Compute the average d̄ and the standard deviation s of the d's. Averaging J independent numbers shrinks the wobble by √J, so the standard error is s / √J. Then <span class="eq">t = d̄ / (s / √J)</span>, read in a t-table with J − 1 degrees of freedom. A large |t| gives a small p.` },
    { h: 'The hidden assumption: independence', p: `The √J is right only if the J numbers are independent looks. Inside one K-fold pass they nearly are for these two models (fold-to-fold correlation about 0; the naive test flags only 3.7% at R = 1). Repeats break it. Every repeat re-scores the same 300 rows with models that share 75% of their training rows. On the first comparison (K = 5, R = 5) the models disagree 40 times, but on only 19 different rows, and each row always favours the same model.` },
    { h: 'What goes wrong', p: `Each extra repeat raises J, so the naive SE keeps shrinking, but no new rows arrived, so the true wobble stalls and t inflates. Measured over 300 fresh data sets (K = 5): the real spread of d̄ is 0.98 points at R = 1, 0.70 at R = 5, 0.64 at R = 10. The naive SE claims 0.95, 0.43, 0.30. False alarms: 3.7%, 21.7%, 38.7%.` },
    { h: 'The correction', p: `Nadeau and Bengio (2003): <span class="eq">Var(d̄) ≈ s² (1/J + n_test/n_train)</span>. The first term is the usual one. The second is a <b>floor</b> that more repeats cannot shrink: it stands for having only n rows. Same J − 1 degrees of freedom. Equivalent shortcut: <span class="eq">t<sub>corr</sub> = t<sub>naive</sub> / √(1 + J · n_test/n_train)</span>.` },
    { h: 'How big is the correction?', p: `With K = 5, n_test/n_train = 0.25, so the naive t is divided by √(1 + J/4): 1.5 at J = 5, 1.87 at J = 10, 2.69 at J = 25, 3.67 at J = 50. More repeats mean a bigger divisor, which cancels the inflation that the repeats caused. With K = 10 the ratio is 0.11 and J = 100 gives 3.48.` },
    { h: 'What the page shows, and what it does not', p: `On equal models the corrected test flagged 0 to 2 of 300 comparisons in every setting tried, against a 5% target. That is on the safe side. It also means the test may miss real differences, and this page does not measure that: it only counts false alarms. The correction is an approximation, not an exact result.` },
    { h: 'Which test when', p: `One test set, both models fitted once: McNemar or a paired bootstrap on the predictions (previous lesson). Only cross-validation scores available: the corrected resampled t-test. Plain paired t-test on repeated CV folds: avoid, because it looks rigorous and misleads. Choose the test that counts each row once, or that pays for re-using rows.` }],
  example: {
    title: 'five folds, one comparison, by hand',
    setup: `Two logistic regressions (regularisation C = 1 and C = 0.1) are compared by 5-fold cross-validation on 300 made-up applicants: each fold tests on 60 rows and trains on 240. The models are equal by design, so any "winner" is a false alarm. In fold j, A got d<sub>j</sub> more of the 60 test rows right than B: <b>2, 1, 0, 1, 1</b>. (On a freshly loaded page set K = 5 and R = 1, then press "Next comparison" 19 times to reach comparison 20.)`,
    table: { head: ['Fold j', 'A minus B (rows right)', 'A minus B (points)', 'd − mean (rows)', '(d − mean)²'], rows: [
      ['1', '+2', '+3.33', '+1', '1'],
      ['2', '+1', '+1.67', '0', '0'],
      ['3', '0', '0.00', '−1', '1'],
      ['4', '+1', '+1.67', '0', '0'],
      ['5', '+1', '+1.67', '0', '0'],
      ['mean, sum', '1.0', '+1.67', '0', '2']] },
    walk: [
      `Average: d̄ = (2 + 1 + 0 + 1 + 1) / 5 = 1.0 row, which is 1/60 = +1.67 points.`,
      `Spread: s² = Σ(d − d̄)² / (J − 1) = 2 / 4 = 0.5, so s = 0.707 rows (1.18 points).`,
      `Naive: SE = s / √J = 0.707 / 2.236 = 0.316. Then t = 1.0 / 0.316 = <b>3.16</b> with 4 degrees of freedom, and p = <b>0.034</b>. The page's callout reads "t = 3.16, p = 0.034 (significant)". A false alarm.`,
      `Corrected: n_test / n_train = 60 / 240 = 0.25. The variance factor is 1/J + 0.25 = 0.2 + 0.25 = 0.45 instead of 0.2. SE = 0.707 × √0.45 = 0.474, so t = 1.0 / 0.474 = <b>2.11</b> and p = <b>0.103</b>.`,
      `The shortcut gives the same: t<sub>corr</sub> = 3.16 / √(1 + 5 × 0.25) = 3.16 / 1.5 = 2.11.`,
      `A third opinion: pool the 300 rows. The two models disagreed on 7 of them and A won 6 (b + c = 7, b − c = 5, matching the 5 extra rows A got right). McNemar exact: p = 2 × (1 + 7) / 128 = <b>0.125</b>.`,
      `Corrected (0.103) and McNemar (0.125) both say "not enough evidence". Only the naive test says "winner": it counts five folds as five independent looks at what is really a 7-row disagreement.`],
    result: `From the same five numbers: naive p = 0.034 (a false alarm), corrected p = 0.103, McNemar on the pooled rows p = 0.125. The only change between the first two is that the variance factor 1/J = 0.2 becomes 1/J + n_test/n_train = 0.45.` },
  read: [
    [`Blue dots in "One comparison, fold by fold"`, `One dot per fold: A minus B in accuracy points. With K = 5 a fold has 60 rows, so one row is 1.67 points and the dots sit on a grid. The first K dots are repeat 1, the next K repeat 2, and so on.`],
    [`Orange line and dark zero line`, `Orange is the average of all the dots, dark is "no difference". The naive t-test measures the distance between them in units of s / √J.`],
    [`Callout "Naive t-test: t = …, p = …" and "Corrected: …"`, `The two verdicts on this one comparison. "(significant)" appears when p is below 0.05. Since the models are equal, either is a false alarm.`],
    [`Buttons "← Earlier comparison" and "Next comparison →"`, `Step through the 300 comparisons. The card heading shows which one you are on.`],
    [`Readout "Fold differences per test, J = K × R"`, `How many numbers go into each t-test.`],
    [`Readouts "Naive t-test: p < 0.05" and "Corrected t-test: p < 0.05"`, `How many comparisons were flagged. For equal models about 5% is honest. The page colours a rate above 10% as bad.`],
    [`Readout "Average of A minus B"`, `Close to zero by design (for example −0.05 ± 0.04 points), confirming that the models really are equal on average.`],
    [`Readout "Rows where A and B differ"`, `About 3%. A handful of rows decide every comparison, which is why repeats add so little.`],
    [`The two p-value histograms and the dashed line`, `Each bar counts comparisons with p in a slice of width 0.05. The dashed line, at 300 / 20 = 15, is what an honest test gives: flat. The highlighted first bar is p below 0.05, the false alarms.`],
    [`Table "False alarms"`, `Count and rate of p below 0.05 for each test, next to the "about 5%" an honest test gives. The class notes quote 44% and 2% from a different experiment (fair-coin labels on 200 rows). The page's first run gives 21.7% and 0.0% at K = 5, R = 5, and 45.3% and 0.7% at K = 10, R = 10.`]],
  experiments: [
    { do: `Load the page and leave K = 5, R = 5. Read the table "False alarms".`,
      see: `Naive t-test: 65 of 300 (21.7%). Corrected t-test: 0 of 300 (0.0%). The average of A minus B is −0.05 ± 0.04 points and A and B differ on 3.1% of rows.`,
      why: `The models are equal by design, so every flag is wrong. The naive test errs 4.3 times as often as its 5% promise (21.7 / 5).` },
    { do: `Set K = 5 and R = 1, then raise R to 2, 5 and 10.`,
      see: `Naive flags: 11 of 300 (3.7%), 19 (6.3%), 65 (21.7%), 116 (38.7%). Corrected: 2, 1, 0, 1.`,
      why: `Repeats add numbers but no rows. The naive SE shrinks like 1/√J while the real wobble of the average levels off near 0.65 points (measured: 0.98, 0.81, 0.70, 0.64 for R = 1, 2, 5, 10; naive SE 0.95, 0.66, 0.43, 0.30). A shrinking denominator pumps t up.` },
    { do: `Set R = 5 and move K from 2 to 10.`,
      see: `Naive false alarms climb: 46 of 300 at K = 2 (15.3%), 65 at K = 5 (21.7%), 87 at K = 10 (29.0%). Corrected stays at 0, 0 and 2.`,
      why: `J = K × R grows with K, so the naive SE shrinks further. The correction divides t by √(1 + J/(K − 1)): 3.32 at K = 2, 2.69 at K = 5, 2.56 at K = 10, so it follows the problem.` },
    { do: `Look at the two histograms at K = 5, R = 5.`,
      see: `Naive: the first bar (p below 0.05) holds 65 comparisons against the dashed line at 15, then 30, 25, 17. Corrected: the first five bars hold 0, 4, 2, 1, 3 and the bars on the right are full (35 in the 0.85 to 0.90 bar).`,
      why: `An honest test gives p-values spread evenly, a flat histogram at 15. The naive test piles them at the left (false alarms). The corrected test tilts the other way: it is cautious, which protects against false alarms and may also hide real gaps.` },
    { do: `Press "Next comparison →" three times to reach comparison 4, then once more. Compare with comparison 1.`,
      see: `Comparison 1: average −0.27 points, naive p = 0.603, corrected 0.847. Comparison 4: average +1.20 points, naive p = 0.013 (significant), corrected 0.328. Comparison 5: average −1.53, naive p = 0.000, corrected 0.139. In comparison 5, 15 of the 25 dots are below zero and only 2 above.`,
      why: `The dots look like a consistent signal, but each repeat re-scores the same rows with almost the same models, so the same few rows push every repeat the same way. The naive test counts them 5 times.` },
    { do: `Press "Run 300 comparisons again" three times.`,
      see: `At K = 5, R = 5 the naive counts are 59, 68 and 56 of 300 (the first run was 65) and the corrected counts are 0, 1 and 0.`,
      why: `Each run uses 300 fresh data sets, so a count moves by about ±7 by chance. But the naive count stays near 4 times the 15 an honest test gives, and the corrected one never comes close to it.` }],
  remember: [
    { tag: 'Formula in words', text: `<b>Corrected t = naive t ÷ √(1 + J × n_test/n_train).</b> For K = 5 and J = 25 the divisor is 2.69. Use it to check any CV t-test you read.` },
    { tag: 'Rule of thumb', text: `In K-fold, n_test/n_train = 1/(K − 1): 1 for K = 2, 0.25 for K = 5, 0.11 for K = 10. For huge J the corrected variance floors at s² × n_test/n_train, so with K = 5 repeats can never push the SE below 0.5 s.` },
    { tag: 'Picture', text: `Under the 25 dots there are only 300 rows, and about 21 of them ever disagree (page default, first 100 comparisons). That is the real sample, whatever J is. Count rows, not folds.` },
    { tag: 'Rule of thumb', text: `Repeats polish the estimate, not the evidence. They smooth out the luck of one random split, so d̄ is steadier, but they cannot remove the uncertainty of having only n rows.` },
    { tag: 'Sanity check', text: `To audit any comparison procedure, run it on a model against an equal twin, many times. Honest means about 5% flagged and a flat p-value histogram.` },
    { tag: 'Link to code', text: `<code>stats.ttest_1samp(d, 0)</code> is the naive test. Divide its <code>.statistic</code> by <code>√(1 + J · n_test/n_train)</code> and recompute p with J − 1 degrees of freedom.` }],
  mistakes: [
    { wrong: `"25 fold differences give 24 degrees of freedom of evidence."`, right: `The degrees of freedom assume independent numbers. These 25 rest on 300 rows, about 21 of which ever disagree. Far less independent information than 25.` },
    { wrong: `"More repeats of K-fold make the comparison more trustworthy."`, right: `They make the average difference steadier, not more certain: the rows are the same. Naive false alarms go 3.7%, 6.3%, 21.7%, 38.7% for R = 1, 2, 5, 10.` },
    { wrong: `"Test folds do not overlap, so the fold differences are independent."`, right: `Within one pass the dependence can be small. On this page, two folds of one 5-fold pass had a correlation near 0 (average −0.01 over 300 data sets), and the naive test flagged 3.7%. The dependence arrives with repeats: the average differences of two repeats on one data set correlate at 0.42. The correction covers both.` },
    { wrong: `"The corrected test flagged 0 of 300, so it is perfect."`, right: `It is conservative here: 0 to 2 of 300 against a 5% target of about 15. A test that rarely says "different" may miss real differences, and the page does not measure that.` }],
  code: [
    {
      title: `Naive and corrected t from five fold differences`,
      py: `import numpy as np
from scipy import stats
d = np.array([2, 1, 0, 1, 1]) / 60              # A minus B accuracy in each fold (60 test rows per fold)
J, ratio = len(d), 60 / 240                     # number of differences, n_test / n_train
t_naive = d.mean() / np.sqrt(d.var(ddof=1) / J)
t_corr = d.mean() / np.sqrt(d.var(ddof=1) * (1 / J + ratio))
for name, t in [("naive", t_naive), ("corrected", t_corr)]:
    print(name, "t =", round(t, 2), "p =", round(2 * stats.t.sf(abs(t), df=J - 1), 3))
print("one-line shortcut:", round(t_naive / np.sqrt(1 + J * ratio), 2))`,
      out: `naive t = 3.16 p = 0.034
corrected t = 2.11 p = 0.103
one-line shortcut: 2.11`,
      walk: [
        ['np.array([2, 1, 0, 1, 1]) / 60', `The five fold differences in rows, divided by the 60 test rows of a fold so they become accuracy differences.`],
        ['d.var(ddof=1)', `The sample variance s². <code>ddof=1</code> divides by J − 1 instead of J, the usual choice for a sample.`],
        ['d.var(ddof=1) / J', `The naive variance of the average, s² / J. Its square root is the standard error.`],
        ['(1 / J + ratio)', `The only change in the corrected version: the factor <code>1 / J</code> becomes <code>1 / J + n_test/n_train</code>.`],
        ['stats.t.sf(abs(t), df=J - 1)', `Upper-tail probability of the t-distribution with J − 1 degrees of freedom. Doubled because a large negative t is just as surprising as a large positive one.`]],
      tip: `With ten folds of the same 300 rows, ratio = 30 / 270 = 0.11 instead of 0.25, so the extra term and the correction are smaller.`
    },
    {
      title: `Count the false alarms: 100 comparisons of two equal models`,
      py: `import numpy as np
from scipy import stats
from sklearn.linear_model import LogisticRegression as LR
from sklearn.model_selection import RepeatedStratifiedKFold as RSKF, cross_val_score as cvs
hits = np.zeros(2)                                                  # false alarms: [naive, corrected]
for seed in range(100):                                             # 100 fresh data sets
    r = np.random.RandomState(seed); Z = r.randn(300, 3)            # Z[:, 0] = hidden strength, Z[:, 1:] = noise
    X, y = Z[:, :1] + .6 * Z[:, 1:], r.binomial(1, 1 / (1 + np.exp(-1.5 - 1.2 * Z[:, 0])))
    a, b = [cvs(LR(), X[:, [j]], y, cv=RSKF(n_splits=5, n_repeats=5, random_state=seed)) for j in (0, 1)]
    t = stats.ttest_1samp(a - b, 0).statistic                       # naive t on 25 differences
    hits += [abs(t) > 2.064, abs(t) / np.sqrt(1 + 25 / 4) > 2.064]  # 2.064 = 97.5th percentile of t, 24 df
print("false alarms out of 100: naive", int(hits[0]), "corrected", int(hits[1]))`,
      out: `false alarms out of 100: naive 35 corrected 7`,
      walk: [
        ['Z[:, :1] + .6 * Z[:, 1:]', `Two columns that are noisy copies of the same hidden strength (income and salary slip). They are exchangeable, so a model using column 0 and a model using column 1 are equally good by symmetry: an A/A test.`],
        ['X[:, [j]]', `Double brackets keep a 2-D table with one column, which scikit-learn requires. A is column 0, B is column 1.`],
        ['RSKF(n_splits=5, n_repeats=5, random_state=seed)', `Repeated stratified 5-fold, giving 25 test scores per model. The fixed <code>random_state</code> makes both models see exactly the same 25 splits, so the scores are paired.`],
        ['cvs(LR(), ..., cv=...)', `<code>cross_val_score</code> returns one accuracy per split. Subtracting the two arrays gives the 25 fold differences d.`],
        ['stats.ttest_1samp(a - b, 0).statistic', `The naive t of the differences against 0.`],
        ['abs(t) / np.sqrt(1 + 25 / 4) > 2.064', `Corrected t, using t<sub>corr</sub> = t / √(1 + J · n_test/n_train) with J = 25 and ratio 1/4. 2.064 is the 5% cut-off for 24 degrees of freedom.`]],
      tip: `Over 500 data sets the same code gives about 37% naive and 3% corrected; 100 is noisy (the corrected 7 is within chance of 5).`
    },
    {
      title: `How much does the correction divide t by?`,
      py: `import numpy as np
print("K R J n_test/n_train divide_t_by")
for K, R in [(5, 1), (5, 5), (5, 10), (10, 10)]:
    J, ratio = K * R, 1 / (K - 1)               # in K-fold, n_test / n_train = 1 / (K - 1)
    print(K, R, J, round(ratio, 3), round(float(np.sqrt(1 + J * ratio)), 2))`,
      out: `K R J n_test/n_train divide_t_by
5 1 5 0.25 1.5
5 5 25 0.25 2.69
5 10 50 0.25 3.67
10 10 100 0.111 3.48`,
      walk: [
        ['1 / (K - 1)', `In K-fold one fold is tested and K − 1 are used for training, so n_test / n_train = (n/K) / (n(K − 1)/K) = 1/(K − 1).`],
        ['J = K * R', `Total fold differences: K per pass, R passes.`],
        ['np.sqrt(1 + J * ratio)', `The divisor from t<sub>corr</sub> = t<sub>naive</sub> / √(1 + J · ratio). It grows with J, which is what cancels the inflation caused by repeats.`],
        ['round(float(...), 2)', `<code>float</code> turns the NumPy number into a plain number so it prints as 1.5, not np.float64(1.5).`]],
      tip: `Compare with the page: at K = 5 the naive false alarms were 3.7%, 21.7% and 38.7% for R = 1, 5 and 10, the same order as the divisors 1.5, 2.69 and 3.67 grow.`
    }],
  check: [
    { q: `Why does the plain paired t-test flag too many equally good models when K-fold is repeated?`, options: [`It treats the K × R differences as independent, but they re-use the same rows, so its standard error is too small`, `The t-distribution cannot be used with accuracy numbers`, `The folds have different sizes, which biases the average`, `Repeating K-fold changes the models, so they are no longer equally good`], answer: 0, why: `The naive standard error s/√J assumes J independent looks. Repeats re-score the same rows with almost the same models, so the true wobble stays put while s/√J keeps shrinking and t inflates.` },
    { q: `You use K = 10 folds repeated R = 3 times (J = 30). By what number does the corrected test divide the naive t?`, options: [`About 2.08`, `About 2.92`, `About 4.33`, `1, no change`], answer: 0, why: `n_test/n_train = 1/9 = 0.111. Then 1 + 30 × 0.111 = 4.33, and the divisor is its square root, 2.08. 2.92 is what K = 5 would give; 4.33 forgets the square root.` },
    { q: `Same two equal models, same 300 rows, K = 5. You raise the repeats from R = 5 to R = 10. What happens to the naive test's false-alarm rate?`, options: [`It rises, from 21.7% to 38.7% on this page`, `It falls towards 5%`, `It stays near 21.7%`, `It drops to 0%`], answer: 0, why: `J doubles from 25 to 50, so the naive SE shrinks by about 1.4 times, but no new rows were added. The false alarms grow.` }],
  teachback: { prompt: `In two sentences, explain why a paired t-test over repeated K-fold differences gives false alarms, and what the Nadeau and Bengio correction adds.`, model: `The fold differences all come from the same rows and from models trained on mostly the same rows, so they hold far less independent information than J numbers, yet the plain t-test divides by √J as if they were independent. The correction adds n_test/n_train to the variance, a floor that repeating cannot shrink, so the standard error stays honest.` },
  cheat: `Repeated K-fold gives J = K × R differences d that re-use the same rows. The naive paired t uses SE² = s²/J and cries wolf (21.7% with K = 5, R = 5 on equal models). Nadeau and Bengio: SE² = s²(1/J + n_test/n_train), with n_test/n_train = 1/(K − 1); same as t_naive ÷ √(1 + J · n_test/n_train). With one test set, use McNemar instead.`
};
