// Lesson for decisions/test-set-noise: why two equal models differ on a finite test set, the standard error, and the bootstrap.
module.exports = {
  idea: `A test score averages n random rows, so it wobbles around the true accuracy by about <span class="eq">√(p(1 − p) / n)</span>. Two equally good models, scored on their own rows, will differ by chance alone. Only a gap well above that noise means anything.`,
  why: `A 1-point lead on a test set feels like proof that model B is better. At 1,000 rows each it is not: the truly worse model scores higher about 1 time in 4. Shipping the "winner" of such a comparison pays for a change that may do nothing. Know how big the noise is before you read a gap.`,
  analogy: `Two students are equally well prepared: each answers any question right with probability 0.85. They sit different papers of 1,000 questions. Their marks still differ by the luck of the questions, by 1.6 percentage points on a typical pair, and by more than 3 points one pair in 20. A longer paper shrinks that luck, but only slowly.`,
  vocab: [
    [`True accuracy p`, `The accuracy the model would get on all the data there could ever be. You never see it. A test set only estimates it.`],
    [`Test accuracy`, `Right answers divided by n on one test set. It is a random number whose average is p.`],
    [`Standard error (SE)`, `The typical size of the wobble of a test accuracy around p: <span class="eq">√(p(1 − p) / n)</span>. It shrinks as n grows.`],
    [`Gap`, `Test accuracy of B minus test accuracy of A, in percentage points. For separate test sets its SD is <span class="eq">√(SE<sub>A</sub>² + SE<sub>B</sub>²)</span>.`],
    [`Middle 95%`, `The range that holds 95% of the gaps you would see if you repeated the experiment: true gap ± 1.96 SD.`],
    [`Reversal`, `The truly worse model scores higher on the test set. The page counts these as "Truly worse model scores higher".`],
    [`Bootstrap interval`, `Resample the test rows with replacement, recompute the gap, repeat 2,000 times. The middle 95% of those gaps is the interval for the true gap.`]],
  steps: [
    { h: `A test accuracy is an average of coin flips`, p: `Each test row is a trial that the model gets right with probability p, its true accuracy. The test accuracy is the number of right answers divided by n. Score the model on a different batch of n rows and you get a different number. So a test accuracy is random, and its average over many batches is p.` },
    { h: `How big is the wobble?`, p: `One right-or-wrong trial with chance p has variance p(1 − p). Averaging n independent trials divides the variance by n. So <span class="eq">SE = √(p(1 − p) / n)</span>. For p = 0.85 and n = 1,000: √(0.1275 / 1,000) = 0.0113, which is 1.13 points. The wobble is largest at p = 0.5 and shrinks towards 0 and 1.` },
    { h: `The gap wobbles more than either score`, p: `If A and B are scored on different rows, their wobbles are independent and the variances add: <span class="eq">SD(gap) = √(SE<sub>A</sub>² + SE<sub>B</sub>²)</span>. For two equal models that is √2 × SE = 1.60 points. About 95% of gaps lie within 1.96 SD of the true gap, so within ±3.1 points when the models are equal.` },
    { h: `So a small lead can be luck`, p: `Say B is truly 1 point better (86% against 85%). The observed gap is centred on +1 with SD 1.57, so it falls below zero with probability about Φ(−1/1.57) = 26% (25.2% from the exact binomial; a tie adds 2.1%). On one pair of test sets the better model wins about 3 times in 4 and shows up behind about 1 time in 4.` },
    { h: `More rows shrink the noise like 1/√n`, p: `SE has √n under the line. 100 times the rows gives 10 times less noise. Halving the noise needs 4 times the rows. A model 1 point behind still scores higher than the better one 38% of the time with 100 rows, 25% with 1,000, 13% with 3,000, 2.2% with 10,000 and 0.2% with 20,000 (exact binomial values; the page estimates them from 1,000 simulated comparisons).` },
    { h: `One test set: the bootstrap`, p: `In real life you have one test set, not 1,000 comparisons. The bootstrap fakes new test sets by drawing n rows from yours with replacement, recomputing the gap, and repeating 2,000 times. The middle 95% of those gaps is an interval for the true gap. It agrees with the formula: on the default draw −1.2 to +5.1 from the bootstrap, −1.1 to +5.1 from observed score ± 1.96 SE.` },
    { h: `Reading the interval`, p: `If the interval contains 0, this test set cannot say which model is better. That is not the same as "no difference". With a true 1-point gap and 1,000 rows each, the interval excludes zero only about 10 times in 100 (theory 9.8%). If the interval excludes zero, you have evidence of a difference. Still ask how big it is and whether it matters.` }],
  example: {
    title: `two equal models, scored on separate rows, by hand`,
    setup: `Models A and B are both truly 85% accurate, and each is scored on its own n test rows. How far do the two scores drift apart by chance? Work out n = 1,000, then see the table for other sizes.`,
    table: { head: [`Rows n`, `SE of one score = √(0.85 × 0.15 / n)`, `SD of the gap = √2 × SE`, `95% band = ±1.96 × SD`], rows: [
      [`100`, `3.57 points`, `5.05 points`, `±9.90 points`],
      [`1,000`, `1.13 points`, `1.60 points`, `±3.13 points`],
      [`10,000`, `0.36 points`, `0.50 points`, `±0.99 points`],
      [`20,000`, `0.25 points`, `0.36 points`, `±0.70 points`]] },
    walk: [
      `One test row is a right-or-wrong trial with p = 0.85, so its variance is p(1 − p) = 0.85 × 0.15 = 0.1275.`,
      `The accuracy over n = 1,000 rows averages 1,000 trials: variance 0.1275 / 1,000 = 0.0001275. Its square root is the SE, √0.0001275 = 0.01129, which is <b>1.13 points</b>.`,
      `A and B use different rows, so their variances add: 2 × 0.0001275 = 0.000255. The SD of the gap is √0.000255 = 0.01597, which is <b>1.60 points</b> (that is 1.13 × √2).`,
      `About 95% of gaps fall within 1.96 × 1.60 = <b>±3.13 points</b>. Two identical models differ by more than 3.1 points about 1 time in 20.`,
      `Now make B truly 1 point better. SD(gap) = √(0.86 × 0.14 / 1,000 + 0.85 × 0.15 / 1,000) = √(0.0001204 + 0.0001275) = 1.57 points. The gap is centred on +1, so it is below zero when it is 1 / 1.57 = 0.64 SDs under its centre. A normal table gives 26%. The exact binomial gives 25.2% (and 2.1% for an exact tie).`,
      `How many rows make the 95% band only ±1 point for two equal models? Solve 1.96 × √(2 × 0.1275 / n) = 0.01, so n = 2 × 0.1275 × (1.96 / 0.01)² = 9,796. About <b>9,800 rows per model</b>.`],
    result: `At 1,000 rows each, two equal 85% models differ by more than 3.1 points 1 time in 20, and a model that is truly 1 point better is out-scored about 1 time in 4. Reading a 1-point gap needs about 10,000 rows per model just to bring the noise down to ±1 point. A quick rule near 85% accuracy: SD of the gap ≈ 50 / √n points.` },
  read: [
    [`Histogram bars`, `How many of the 1,000 simulated comparisons gave each gap (B minus A, in accuracy points). Each comparison draws two fresh test sets, one per model.`],
    [`Dashed bell curve`, `What theory predicts: a normal curve centred on the true gap with the SD from the formula. The bars should follow it.`],
    [`Line at the true gap`, `The real difference between the models. The bars are centred on it, not on zero.`],
    [`Black line at 0`, `No difference. Bars to the left of it are comparisons where the truly worse model scored higher.`],
    [`Shaded band`, `The middle 95% of the observed gaps.`],
    [`Readouts: True gap, Spread of the observed gap (sd)`, `The real gap and the standard deviation of the 1,000 observed gaps, to compare with the formula.`],
    [`Readouts: Middle 95% of the gap, Theory: true gap ± 1.96 sd`, `The observed band and the one the formula predicts. They should be close.`],
    [`Readouts: Truly worse model scores higher, Exact tie`, `The share of comparisons where the worse model is strictly ahead, and where the scores are exactly equal. If the models are equal, the page shows how often A looks better and how often B does.`],
    [`Panel: One test set, with Draw one test set for each model`, `Draws a single test set for each model and shows the Score of A, Score of B and Observed gap.`],
    [`Bottom plot: bootstrap gaps`, `A histogram of 2,000 resampled gaps. The shaded band is the 95% interval. The diamond is the observed gap. The black line is zero.`],
    [`Readouts: 95% bootstrap interval, Interval includes zero?`, `The two ends of the interval, and a yes or no. Yes means this test set cannot tell the models apart.`],
    [`Sliders and New seed`, `True accuracy of model A and B (50% to 99%), Rows in each test set (100 to 20,000, log scale). New seed repeats the 1,000 comparisons with fresh random draws.`]],
  experiments: [
    { do: `Answer the <i>Predict first</i> question and press a button, or set both accuracies to 85% and the rows to 1,000.`, see: `The histogram is centred on 0. Middle 95%: −3.0 to +3.0, theory −3.1 to +3.1. Spread (sd) 1.58 points. A looks better in 50% of comparisons and B in 47%, with 2.8% exact ties.`, why: `Equal models have no true gap, yet each wins about half the time. The formula √(2 × 0.85 × 0.15 / 1,000) gives an SD of 1.60 points, and 1.96 times that is 3.1: one comparison in 20 is further out.` },
    { do: `Set A to 85% and B to 86% (1,000 rows). Read <i>Truly worse model scores higher</i>.`, see: `26.5% of the 1,000 comparisons, and 2.1% exact ties. True gap +1.0. Middle 95%: −2.1 to +3.9. Theory: −2.1 to +4.1. Spread 1.59 points.`, why: `With an SD of about 1.57 and a true gap of only 1, zero sits just 0.64 SDs below the centre of the bell, so about a quarter of its area lies on the wrong side of zero.` },
    { do: `With B at 86%, move <i>Rows in each test set</i> to 100, 1,000, 3,000, 10,000 and 20,000.`, see: `Spread: 4.80, 1.59, 0.90, 0.51 and 0.35 points. Truly worse model scores higher: 38.4%, 26.5%, 11.4%, 2.8% and 0.3%. The histogram gets about 3 times narrower for every 10 times more rows.`, why: `The SD follows 1/√n, and √10 is about 3.2. When the bell is narrower than the true gap, almost none of it crosses zero.` },
    { do: `Set B to 90% (A at 85%, 1,000 rows).`, see: `True gap +5.0. Middle 95%: +2.2 to +7.8. "Truly worse model scores higher" shows 0.0%.`, why: `The bell is centred 5 points from zero with an SD of 1.5, so zero is more than 3 SDs away. A big true gap is not confused by noise of this size. The trouble is with small gaps, which are the usual ones.` },
    { do: `Back at A 85% and B 86% with 1,000 rows, press <i>Draw one test set for each model</i> nine times, and read <i>Interval includes zero?</i> each time. The draw shown on load counts as the first.`, see: `On load: A 83.8%, B 85.8%, gap +2.0, interval −1.2 to +5.1. Next draws: −0.2 [−3.3, +2.9], −0.8 [−3.9, +2.3], +2.1 [−0.8, +5.1]. Across the first 10 draws the interval includes zero every time, and across the first 40 it does 36 times.`, why: `B really is better, yet 2 of the first 4 draws show it behind, and none of the first 10 draws proves anything. A 1-point gap on 1,000 rows is too small to see: the interval excludes zero in only about 1 draw in 10.` },
    { do: `Press <i>New seed</i> ten times with A 85%, B 86%, 1,000 rows, and watch <i>Truly worse model scores higher</i>.`, see: `Over seeds 1 to 10 it wanders between 24.5% and 27.0%.`, why: `The page's 1,000 comparisons are themselves a random sample, so the share has its own standard error: √(0.25 × 0.75 / 1,000) = 1.4 points. The exact value is 25.2%. The same noise logic that this page teaches applies to the page's own numbers.` }],
  remember: [
    { tag: `Formula in words`, text: `<b>SE = square root of (p times q over n)</b>, where q = 1 − p. For a gap between two models on separate rows, multiply by √2.` },
    { tag: `Rule of thumb`, text: `Quadruple the rows to halve the noise. Near 85% accuracy the SD of the gap between two models is about <b>50 / √n</b> points: 1.6 at n = 1,000, 0.5 at n = 10,000.` },
    { tag: `Sanity check`, text: `Before trusting a gap, compare it with 2 × SD(gap). At 1,000 rows near 85% that is about 3 points. A smaller gap on one test set is not evidence.` },
    { tag: `Picture`, text: `Draw the bell curve of gaps with a mark at the true gap and a line at 0. The area to the left of the line is the chance the worse model wins. Narrower bell (more rows) or bigger true gap means less area.` },
    { tag: `Trick`, text: `"Interval contains 0" means "this test set cannot tell", not "the models are equal". Absence of proof is not proof of absence: with a true 1-point gap, 9 draws in 10 contain 0.` },
    { tag: `Link to code`, text: `<code>rng.binomial(n, p, size)</code> draws "number correct out of n" many times in one call. Divide by n to get test accuracies and you can simulate this page in three lines.` }],
  mistakes: [
    { wrong: `"85.0% against 86.0% on 1,000 rows each: B is better."`, right: `At that size the truly worse model scores higher about 1 time in 4. A 1-point gap is inside the noise.` },
    { wrong: `"A bigger test set removes the noise."`, right: `It only shrinks it like 1/√n. Even with 20,000 rows each, two equal models still differ by up to ±0.7 points in 95% of comparisons.` },
    { wrong: `"The interval contains zero, so the models are equal."`, right: `It means this test set cannot tell them apart. A real 1-point difference leaves zero inside the interval in about 9 draws out of 10 at 1,000 rows.` },
    { wrong: `"√(2p(1 − p)/n) is the noise for any two models."`, right: `It holds when each model has its own test rows, as on this page. If both models are scored on the same rows the gap is usually less noisy, because the rows that are hard for one are hard for the other. See the McNemar simulation.` },
    { wrong: `"The standard error tells me how far my model is from the truth."`, right: `It only describes the random wobble from using n rows. A test set that does not look like future data adds a separate error that no formula here measures.` }],
  code: [
    {
      title: `Standard error of one score and of the gap, for four test sizes`,
      py: `import numpy as np
p = 0.85                                    # true accuracy of both models
for n in (100, 1000, 10000, 20000):
    se = np.sqrt(p * (1 - p) / n)           # sd of ONE model's test accuracy
    gap = np.sqrt(2) * se                   # sd of the gap between two equal models on separate test sets
    print(n, f"{100 * se:.2f} {100 * gap:.2f} {196 * gap:.2f}")   # in points; 196 = 100 x 1.96 gives the 95% band`,
      out: `100 3.57 5.05 9.90
1000 1.13 1.60 3.13
10000 0.36 0.50 0.99
20000 0.25 0.36 0.70`,
      walk: [
        [`np.sqrt(p * (1 - p) / n)`, `The standard error: the square root of p(1 − p) divided by n. Note the division by n sits <i>inside</i> the root, which is where 1/√n comes from.`],
        [`np.sqrt(2) * se`, `Two independent scores: variances add, so the SD is √2 times larger. This is the "different test sets" case.`],
        [`100 * se`, `Converts a fraction (0.0113) to percentage points (1.13), the unit the page uses.`],
        [`f"{100 * se:.2f}"`, `An f-string: the expression inside the braces is computed and shown with 2 decimals (<code>:.2f</code>).`],
        [`196 * gap`, `100 × 1.96 × gap: the half-width of the 95% band in points.`]],
      tip: `Each time n is 10 times bigger, the numbers shrink by about 3.16 (the square root of 10). Compare rows 1,000 and 10,000.`
    },
    {
      title: `Simulate 100,000 comparisons of a truly better model`,
      py: `import numpy as np
rng = np.random.RandomState(0)
n, reps = 1000, 100000
a = rng.binomial(n, 0.85, reps) / n        # accuracy A scores on each of reps separate test sets
b = rng.binomial(n, 0.86, reps) / n        # model B is truly 1 point better, on its own test sets
gap = 100 * (b - a)                        # observed gap in points
print("sd", gap.std().round(2), "middle 95%", np.percentile(gap, [2.5, 97.5]).round(1).tolist())
print("worse model ahead", (gap < 0).mean().round(3), "tie", (gap == 0).mean().round(3))`,
      out: `sd 1.57 middle 95% [-2.1, 4.1]
worse model ahead 0.256 tie 0.021`,
      walk: [
        [`np.random.RandomState(0)`, `A random generator with a fixed seed, so you get the same numbers every run.`],
        [`rng.binomial(n, 0.85, reps)`, `Draws <code>reps</code> random counts, each the number of right answers out of n = 1,000 when each is right with chance 0.85. That is one whole test set per count.`],
        [`/ n`, `Turns each count into an accuracy between 0 and 1.`],
        [`np.percentile(gap, [2.5, 97.5])`, `The values below which 2.5% and 97.5% of the gaps fall: the ends of the middle 95%.`],
        [`(gap < 0).mean()`, `<code>gap &lt; 0</code> is a True/False array; its mean is the fraction of True: the share of comparisons where the worse model scored higher.`]],
      tip: `The exact binomial answer is 0.2524. This run gives 0.256 and other seeds give 0.251 to 0.256: a simulation has its own noise, as the page does.`
    },
    {
      title: `Bootstrap interval for one pair of test sets`,
      py: `import numpy as np
rng = np.random.RandomState(7)
a = (rng.rand(1000) < 0.85).astype(int)         # 1 = model A is right on this row; A has its own 1,000 rows
b = (rng.rand(1000) < 0.86).astype(int)         # model B has its own 1,000 rows
gaps = [100 * (b[rng.randint(0, 1000, 1000)].mean() - a[rng.randint(0, 1000, 1000)].mean()) for _ in range(2000)]
g = 100 * (b.mean() - a.mean())
se = 100 * np.sqrt(a.mean() * (1 - a.mean()) / 1000 + b.mean() * (1 - b.mean()) / 1000)
print("observed gap", round(g, 1), "bootstrap interval", np.percentile(gaps, [2.5, 97.5]).round(1).tolist())
print("formula interval", round(g - 1.96 * se, 1), round(g + 1.96 * se, 1))`,
      out: `observed gap 1.0 bootstrap interval [-2.1, 3.9]
formula interval -2.0 4.0`,
      walk: [
        [`(rng.rand(1000) < 0.85).astype(int)`, `1,000 random numbers in [0, 1), compared with 0.85. Each is below it with probability 0.85, so True means "model right on this row". <code>astype(int)</code> turns True/False into 1/0.`],
        [`rng.randint(0, 1000, 1000)`, `1,000 random row numbers drawn <i>with replacement</i>: some rows appear twice, some not at all. This is the resample.`],
        [`b[rng.randint(...)].mean()`, `Indexing by a list of row numbers picks those rows. The mean of the 1/0 values is the accuracy on the resample.`],
        [`for _ in range(2000)`, `Repeat 2,000 times. The underscore means "I do not need the loop counter".`],
        [`np.percentile(gaps, [2.5, 97.5])`, `The middle 95% of the 2,000 resampled gaps: the bootstrap interval.`]],
      tip: `The bootstrap and the formula (observed gap ± 1.96 SE) agree here, as they did on the page. The bootstrap earns its keep for statistics with no simple formula, such as AUC or profit.`
    }],
  check: [
    { q: `Model B has a true accuracy of 86% and model A 85%. Each is scored on its own 1,000 rows. Why can A score higher than B?`, options: [`Each test accuracy wobbles by about 1.1 points around the true value, which is as large as the 1-point difference`, `Model A must have been trained on more data`, `Accuracy is not a reliable metric`, `The test sets must have overlapped`], answer: 0, why: `A test accuracy is an average over a random sample of rows, so it differs from the true accuracy by an amount of the order of √(p(1 − p)/n) = 1.1 points. The gap between two such scores has SD about 1.6, easily larger than 1 point.` },
    { q: `A model has true accuracy 0.80 and is scored on 400 test rows. What is the standard error of its test accuracy?`, options: [`2 points`, `0.1 points`, `4 points`, `8 points`], answer: 0, why: `SE = √(0.8 × 0.2 / 400) = √(0.16 / 400) = √0.0004 = 0.02, which is 2 points.` },
    { q: `You want to halve the width of the 95% band for the gap between two equal models, currently ±3 points at 1,000 rows each. What do you do?`, options: [`Use 4 times as many rows (4,000 each)`, `Use 2 times as many rows (2,000 each)`, `Use 10 times as many rows (10,000 each)`, `It cannot be changed: the band depends only on the accuracy`], answer: 0, why: `The band is proportional to 1/√n, so halving it needs √n twice as big, which means n four times as big: 4,000 rows each gives about ±1.6 points.` }],
  teachback: { prompt: `In two sentences, explain why an 86% model can lose to an 85% model on a test set, and what makes the problem smaller.`, model: `A test accuracy is an average over a finite random set of rows, so it wobbles around the true accuracy by about √(p(1−p)/n), and the gap between two models wobbles by about 1.4 times that, which at 1,000 rows (1.6 points) is bigger than a 1-point true difference. More rows shrink the wobble like 1/√n, so you need about four times the rows to halve it.` },
  cheat: `Test accuracy has SE = √(p(1−p)/n). The gap between two models on separate rows has SD √(SE_A² + SE_B²), about √2 × SE for equals; 95% of gaps lie within ±1.96 SD (±3.1 points at 85%, n = 1,000). Quadruple n to halve it. A true 1-point gap is reversed about 1 time in 4 at 1,000 rows. One test set: bootstrap interval; containing 0 means "cannot tell".`
};
