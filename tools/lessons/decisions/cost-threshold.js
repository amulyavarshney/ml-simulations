// Lesson for decisions/cost-threshold: the approval cut-off from the money at stake, threshold = loss / (gain + loss).
module.exports = {
  idea: `Approve a loan when its expected profit is above zero: <span class="eq">p·G − (1 − p)·L &gt; 0</span>. Solving for p gives the cut-off <b>L / (G + L)</b>. With +1,000 and −9,000 that is 0.90, not 0.5, provided p is honest.`,
  why: `Accuracy treats all mistakes alike, but here one default wipes out nine repaid loans. On 3,000 made-up applicants a cut-off of 0.5 approves 94% of them and loses 1,642,000. The cut-off from the costs, 0.90, earns 797,000 with the same model. The cut-off is a money decision, not a default setting.`,
  analogy: `A shopkeeper sells on credit. A customer who pays earns him 1,000. A customer who does not pay costs him 9,000 of goods. Nine good customers only just pay for one bad one. So he should give credit only when he is more than 9 times out of 10 sure the customer will pay. "Probably pays" is not enough.`,
  vocab: [
    [`Gain G, loss L`, `G is the money earned when you approve a loan that is repaid (1,000). L is the money lost when you approve a loan that defaults (9,000). Rejecting earns 0.`],
    [`Expected profit`, `The average result if you could make the same decision many times. For approving an applicant with repay chance p: <span class="eq">p·G − (1 − p)·L</span>.`],
    [`Cut-off (threshold)`, `Approve when P(repay) is at least this number. The page calls it "Approve if P(repay) is at least".`],
    [`Break-even probability`, `The p where expected profit is exactly 0. Solving gives <span class="eq">L / (G + L)</span>. It is the right cut-off.`],
    [`Calibrated probability`, `A P(repay) that is honest: of applicants given 0.90, about 90% repay. The formula assumes it.`],
    [`Profit curve`, `Total profit on a set of applicants if you approve everyone at or above each cut-off in turn. Its peak is the best cut-off <i>for that set</i>.`],
    [`Cost matrix`, `The 2 × 2 table of money: approve or reject, against repaid or defaulted. Here +1,000, −9,000, 0 and 0.`]],
  steps: [
    { h: `Accuracy is the wrong score`, p: `At a cut-off of 0.5 the model on the page is right for 83.4% of the 3,000 applicants and still loses 1,642,000. Counting right answers treats "approved a default" and "rejected a good customer" as equal. They are not: one costs 9,000 and the other costs only the 1,000 you did not earn. What you need is money per decision.` },
    { h: `Write the money for every decision`, p: `Four cells. Approve and the loan is repaid: +G. Approve and it defaults: −L. Reject: 0, whatever would have happened. The page shows this as the "Decisions against outcomes" table, with the money in each cell and the total at the bottom.` },
    { h: `Expected profit of approving one applicant`, p: `The model says the chance of repayment is p. Over many applicants like this one, a share p repay and earn G, and a share 1 − p default and lose L. Average money per approval: <span class="eq">p·G − (1 − p)·L</span>. Rejecting gives 0, so approving only wins when this is above 0.` },
    { h: `Solve for p`, p: `<span class="eq">p·G − (1 − p)·L &gt; 0</span>. Open the bracket: <span class="eq">p·G − L + p·L &gt; 0</span>. Move L across: <span class="eq">p·(G + L) &gt; L</span>. Divide by G + L, which is positive, so the inequality keeps its direction: <b>p &gt; L / (G + L)</b>. With G = 1,000 and L = 9,000 that is 9,000 / 10,000 = 0.90.` },
    { h: `Read the formula`, p: `The cut-off follows the loss-to-gain ratio. Equal costs: 0.50. Loss 3 times the gain: 0.75. 9 times: 0.90. 19 times: 0.95. In odds form: approve only when the odds of repayment beat L : G, which is 9 to 1 here. A bigger loss means you need more certainty before saying yes.` },
    { h: `The formula trusts the probability`, p: `It assumes p is the true chance. If the model says 0.92 but those applicants really repay 85% of the time, the true expected profit is 10,000 × 0.85 − 9,000 = −500 per loan, not the +200 the model implies. An over-confident model therefore needs a higher raw cut-off. Calibrate first (previous simulation), then apply the formula.` },
    { h: `On real rows the best cut-off is noisy`, p: `On 3,000 applicants the profit curve is jagged, because each loan moves it by +1,000 or −9,000, so its peak sits where luck put it. Over 20 datasets the best cut-off for logistic regression ranged from 0.84 to 0.95 (mean 0.90) and the formula's 0.90 earned 95% of the best profit on average. Use the formula, and use the curve only to check you are not on a cliff.` }],
  example: {
    title: `the cut-off from the money, then seven applicants`,
    setup: `Gain G = 1,000 per repaid loan, loss L = 9,000 per default, rejecting earns 0. A calibrated model gives seven applicants the probabilities of repaying in the first column. For each, work out the expected profit of approving.`,
    table: { head: [`Applicant P(repay)`, `Expected profit = 1,000·p − 9,000·(1 − p)`, `Approve?`], rows: [
      [`0.97`, `+700`, `yes`],
      [`0.94`, `+400`, `yes`],
      [`0.91`, `+100`, `yes`],
      [`0.90`, `0`, `indifferent: the break-even`],
      [`0.88`, `−200`, `no`],
      [`0.75`, `−1,500`, `no`],
      [`0.40`, `−5,000`, `no`]] },
    walk: [
      `Take p = 0.80. Over 100 such applicants, 80 repay (+80,000) and 20 default (−180,000). Net −100,000, so −1,000 per applicant: <span class="eq">0.80 × 1,000 − 0.20 × 9,000 = 800 − 1,800 = −1,000</span>. Reject.`,
      `Take p = 0.95. Over 100 applicants, 95 repay (+95,000) and 5 default (−45,000). Net +50,000, so +500 each: <span class="eq">950 − 450 = +500</span>. Approve.`,
      `Simplify for any p: <span class="eq">1,000·p − 9,000·(1 − p) = 1,000·p − 9,000 + 9,000·p = 10,000·p − 9,000</span>. That is a straight line in p, and it crosses zero where 10,000·p = 9,000, so at p = 0.90.`,
      `At p = 0.90, out of 100 applicants 90 repay (+90,000) and 10 default (−90,000). Zero. This is the break-even: nine good loans pay for exactly one bad one.`,
      `Fill the table with 10,000·p − 9,000: for 0.97 it is 9,700 − 9,000 = +700, for 0.88 it is 8,800 − 9,000 = −200. Every applicant at or above 0.90 is non-negative, every one below is negative.`,
      `Other costs, same algebra, <span class="eq">L / (G + L)</span>: loss 1,000 gives 0.50, loss 3,000 gives 0.75, loss 19,000 gives 0.95.`,
      `Now break the assumption. The model says 0.92 for a group that really repays 85%. The model's expected profit is 10,000 × 0.92 − 9,000 = +200 per loan, the true one is 10,000 × 0.85 − 9,000 = <b>−500</b>. Approving them loses money.`],
    result: `Cut-off 0.90. Approve the first three applicants (expected +700, +400 and +100) and reject the rest. The line 10,000·p − 9,000 is the whole decision rule: the sign of the expected profit. If the probabilities are not honest, the line is drawn at the wrong place and the rule fails.` },
  read: [
    [`Sliders: Profit per repaid loan, Loss per default`, `The G (100 to 5,000) and L (500 to 20,000) of the formula. Rejecting always earns 0. Moving them does not move your cut-off by itself.`],
    [`Slider: Approve if P(repay) is at least`, `Your cut-off. Starts at 0.5. Click the profit plot, or focus it and press the arrow keys, to move it by 0.01.`],
    [`Buttons: Use the formula, Use the best found`, `The first sets the cut-off to L / (G + L), rounded to 0.01. The second sets it to the best step the slider can show (steps of 0.01) on these 3,000 rows.`],
    [`Checkbox: Use an uncalibrated model (naive Bayes)`, `Same applicants, but the probabilities come from naive Bayes, which is over-confident, instead of logistic regression.`],
    [`Table: Decisions against outcomes`, `Rows: Approve, Reject, All applicants. Columns: Repaid, Defaulted, Money. Approve and repaid earns money, approve and defaulted loses money, reject is 0. The Money column adds up to the total profit.`],
    [`Readouts: Total profit, Approval rate, Defaults let through`, `The result at your cut-off. "Defaults let through" also shows them as a share of the approved loans.`],
    [`Readouts: Formula, Best cut-off on these rows, Profit at the best cut-off, Best step of the slider (0.01)`, `The formula's cut-off. The exact peak of the profit curve for these particular applicants (three decimals) and what it earns. And the best step the slider can reach, with its profit.`],
    [`Profit curve`, `Total profit if you approve everyone at or above each cut-off. The zero line is break-even. The grey dashed vertical line is cut-off 0.5, the green line is the formula, the diamond is the exact peak on these rows, the black dot is your cut-off.`],
    [`Strip plot: best cut-off found on 20 other datasets`, `One dot per dataset for logistic regression and for naive Bayes. The black bar is the average and the green line is the formula.`],
    [`Button: New applicants`, `A fresh made-up data set (800 to learn from, 3,000 to test on, about 20% default). The numbers in this lesson are for the data set shown when the page first loads.`]],
  experiments: [
    { do: `Before touching anything, read the readouts and the table at the starting cut-off of 0.5.`, see: `Approval rate 93.6%. Defaults let through 445 (15.8% of approved). Total profit −1,642,000. In the table, Approve and Repaid is 2,363 loans (+2,363,000) and Approve and Defaulted is 445 loans (−4,005,000).`, why: `At 0.5 you approve everyone whose repay chance is only 50% to 90%. Each is worth a negative amount on average (a 0.80 applicant is −1,000), and each default costs nine times what a repaid loan earns. The model is 83.4% accurate here and still loses money.` },
    { do: `Answer the <i>Predict first</i> question, or press <i>Use the formula</i>.`, see: `Cut-off 0.90. Total profit +797,000. Approval rate 42.2% (1,267 loans). Defaults let through 47 (3.7% of approved).`, why: `Of the 1,267 approved, 1,220 repay (+1,220,000) and 47 default (−423,000). Approving everybody would lose 2,830,000, and the 0.5 cut-off loses 1,642,000. Being choosy is worth millions.` },
    { do: `Press <i>Use the best found</i>. Then move the slider one step right, to 0.91.`, see: `Use the best found puts the cut-off at 0.90, the same as the formula: Total profit +797,000. "Best cut-off on these rows" reads 0.905 with "Profit at the best cut-off" +818,000, and "Best step of the slider (0.01)" reads 0.90 (+797,000). At 0.91 the profit is +790,000.`, why: `The exact peak at 0.905 lies between two slider steps, and the curve is jagged: with 3,000 rows each loan moves it by +1,000 or −9,000. From 0.90 to 0.905, 59 loans leave (51 repaid, 8 defaulted) for a gain of 21,000. From 0.905 to 0.91, another 48 leave (46 repaid, 2 defaulted) for a loss of 28,000. This is why you should not hunt for the exact peak: differences of 3% are noise.` },
    { do: `Set <i>Loss per default</i> to 1,000, press <i>Use the formula</i>, and read the table. Repeat for 3,000 and 19,000.`, see: `The formula gives 0.50, 0.75 and 0.95. Profit at the formula: +1,918,000 (exact peak 0.545 earns +1,925,000), +1,388,000 (peak 0.769 earns +1,398,000) and +415,000 (peak 0.931 earns +499,000).`, why: `The cut-off tracks L / (G + L). For small losses the curve is flat near its top and the formula earns 99.6% and 99.3% of the best profit. At a loss of 19,000 only 655 applicants are approved, so luck matters more and the formula reaches 83% of the best.` },
    { do: `Set the loss back to 9,000, tick <i>Use an uncalibrated model (naive Bayes)</i> and press <i>Use the formula</i>.`, see: `The profit peak moves right, to 0.953 (+783,000), but at the green formula line, 0.90, profit is only +601,000, which is 77% of the peak. 105 defaults get through (6.4% of the 1,651 approved).`, why: `Naive Bayes counts income, balance and savings three times, so its probabilities are too extreme. The 214 applicants it scored between 0.88 and 0.92 actually repaid 86% of the time, so each approval had an expected profit of 10,000 × 0.86 − 9,000 = −400. A higher raw cut-off compensates.` },
    { do: `Look at the strip plot at the bottom.`, see: `Logistic regression: 20 dots from 0.84 to 0.95 with average 0.90, centred on the green line. Naive Bayes: 20 dots from 0.91 to 0.98, average 0.96, every one to the right of the line.`, why: `For honest probabilities the formula is the target, and the data scatter around it by about ±0.03 from sampling noise alone. For an over-confident model the whole cloud shifts right: the formula is no longer the right cut-off for the raw numbers.` }],
  remember: [
    { tag: `Picture`, text: `Draw the straight line <b>expected profit = (G + L)·p − L</b>. It starts at −L when p = 0 and reaches +G when p = 1. The cut-off is where it crosses zero.` },
    { tag: `Rule of thumb`, text: `Approve when the odds of repayment beat L : G. Loss 9 times the gain means odds above 9 to 1, which is 90%. Loss 3 times the gain means 3 to 1, which is 75%.` },
    { tag: `Sanity check`, text: `Raise the loss and the cut-off must rise. If your formula gives 0.10 for gain 1,000 and loss 9,000, you have gain and loss swapped: it would approve almost everyone.` },
    { tag: `Formula in words`, text: `Cut-off = <b>what you lose</b> divided by <b>what you win plus what you lose</b>. At equal stakes, half. As the loss grows the cut-off creeps towards 1 but never reaches it.` },
    { tag: `Trick`, text: `Always check calibration before using the formula. If the probabilities are over-confident, the best raw cut-off sits above L / (G + L): naive Bayes averaged 0.96 over 20 datasets instead of 0.90.` },
    { tag: `Link to code`, text: `<code>model.predict(X)</code> uses a hidden cut-off of 0.5. For a money decision, take <code>predict_proba(X)[:, 1]</code> and compare it with your own number.` }],
  mistakes: [
    { wrong: `"A yes/no model should use 0.5 as the cut-off."`, right: `0.5 is right only when the two mistakes cost the same. Otherwise the cut-off is L / (G + L). With a loss 9 times the gain, 0.5 loses 1,642,000 on the page's applicants.` },
    { wrong: `"Approve when p is above gain / (gain + loss)."`, right: `That is the formula upside down. It gives 0.10 here and would approve almost everybody. The loss goes on top: the more you can lose, the closer to 1 the cut-off moves.` },
    { wrong: `"The formula works on any model's raw probabilities."`, right: `Only on calibrated ones. With raw naive Bayes the formula's 0.90 earned an average of 83% of the best profit over 20 datasets, and 66% on the worst, against 95% for logistic regression.` },
    { wrong: `"The best cut-off found on my data is the true best, so ignore the formula."`, right: `On 3,000 rows the peak is noise: over 20 datasets the best cut-off for the same model ranged from 0.84 to 0.95. The formula, with calibrated probabilities, earned 95% of that on average.` },
    { wrong: `"Rejected customers cost nothing, so only defaults matter."`, right: `A rejected good customer costs the profit you did not make. That opportunity cost is the G in L / (G + L): when G is large the cut-off falls.` }],
  code: [
    {
      title: `Expected profit and the break-even probability`,
      py: `G, L = 1000, 9000                          # profit per repaid loan, loss per default
for p in (0.80, 0.90, 0.95):
    print(p, round(p * G - (1 - p) * L))   # expected profit of approving one applicant with repay chance p
print("break-even p:", L / (G + L))
for loss in (1000, 3000, 9000, 19000):
    print(loss, round(loss / (G + loss), 2))`,
      out: `0.8 -1000
0.9 0
0.95 500
break-even p: 0.9
1000 0.5
3000 0.75
9000 0.9
19000 0.95`,
      walk: [
        [`G, L = 1000, 9000`, `Assigns two variables in one line. Keeping G and L as names lets you try other costs by changing only this line.`],
        [`p * G - (1 - p) * L`, `The expected profit: probability of repaying times the gain, minus probability of defaulting times the loss. <code>(1 - p)</code> is the default chance.`],
        [`round(...)`, `Rounds to a whole rupee. Without it, floating-point arithmetic would print something like -999.9999999999995.`],
        [`L / (G + L)`, `The break-even probability: the p where the expected profit is exactly zero.`],
        [`for loss in (1000, 3000, ...)`, `Loops over four loss sizes with the same gain, to show how the cut-off follows the ratio.`]],
      tip: `The expected profit is a straight line in p, so there is exactly one crossing point. That is why a single number works as a rule.`
    },
    {
      title: `Profit against cut-off for a calibrated and an over-confident model`,
      py: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
rng = np.random.RandomState(0); s = rng.normal(size=6000)
X = s[:, None] + 0.5 * rng.normal(size=(6000, 3))                          # three noisy copies of one signal
y = (rng.uniform(size=6000) < 1 / (1 + np.exp(-(1.6 + 1.2 * s)))).astype(int)   # 1 = repaid, about 78%
def earn(p, t): a = p >= t; return 1000 * np.sum(a & (y[3000:] == 1)) - 9000 * np.sum(a & (y[3000:] == 0))
for m in (LogisticRegression(), GaussianNB()):
    p = m.fit(X[:3000], y[:3000]).predict_proba(X[3000:])[:, 1]
    ts = np.arange(0.5, 1.0, 0.01); best = ts[np.argmax([earn(p, t) for t in ts])]
    print(type(m).__name__, "best cut-off", round(best, 2), "profit at 0.90:", earn(p, 0.90), "at best:", earn(p, best))`,
      out: `LogisticRegression best cut-off 0.91 profit at 0.90: 413000 at best: 414000
GaussianNB best cut-off 0.98 profit at 0.90: 230000 at best: 422000`,
      walk: [
        [`def earn(p, t): ...`, `Total profit on the held-out rows if you approve everyone with probability at least t. <code>a = p &gt;= t</code> is a True/False array: who is approved.`],
        [`a & (y[3000:] == 1)`, `<code>&amp;</code> means "and", element by element: approved <i>and</i> repaid. <code>np.sum</code> counts the True values. Brackets are required because <code>&amp;</code> binds tighter than <code>==</code>.`],
        [`1000 * ... - 9000 * ...`, `Gain times approved-and-repaid minus loss times approved-and-defaulted. This is the Money column of the page's table.`],
        [`np.arange(0.5, 1.0, 0.01)`, `Candidate cut-offs 0.50, 0.51, ... 0.99.`],
        [`ts[np.argmax([...])]`, `<code>np.argmax</code> gives the position of the largest profit, and <code>ts[...]</code> turns the position back into a cut-off: the profit-curve peak.`]],
      tip: `The calibrated model peaks at 0.91, right next to the formula's 0.90 (profit 413,000 against 414,000). Over-confident naive Bayes peaks at 0.98, and the formula's 0.90 leaves nearly half the profit on the table.`
    },
    {
      title: `Apply the cut-off yourself: predict_proba, not predict`,
      py: `import numpy as np
from sklearn.linear_model import LogisticRegression
rng = np.random.RandomState(0); s = rng.normal(size=6000)
X = s[:, None] + 0.5 * rng.normal(size=(6000, 3))
y = (rng.uniform(size=6000) < 1 / (1 + np.exp(-(1.6 + 1.2 * s)))).astype(int)
m = LogisticRegression().fit(X[:3000], y[:3000])
p = m.predict_proba(X[3000:])[:, 1]                          # P(repay) for each held-out applicant
for name, approve in [("predict() = cut-off 0.5", m.predict(X[3000:]) == 1), ("p >= 0.90", p >= 0.90)]:
    rep, dft = np.sum(approve & (y[3000:] == 1)), np.sum(approve & (y[3000:] == 0))
    print(name, "approved", approve.sum(), "defaults", dft, "profit", 1000 * rep - 9000 * dft)`,
      out: `predict() = cut-off 0.5 approved 2779 defaults 505 profit -2271000
p >= 0.90 approved 853 defaults 44 profit 413000`,
      walk: [
        [`m.predict_proba(X)[:, 1]`, `Probability of class 1 (repaid) for each applicant. This is the number you compare with your cut-off.`],
        [`m.predict(X) == 1`, `The model's own hard yes/no. It secretly uses the rule "probability above 0.5", so it ignores your costs.`],
        [`for name, approve in [(..., ...), (..., ...)]`, `Loops over two (label, True/False array) pairs, so the same profit code scores both decision rules.`],
        [`rep, dft = ...`, `Assigns two counts at once: loans approved that repaid, and loans approved that defaulted.`],
        [`approve.sum()`, `The number of True values: how many applicants were approved.`]],
      tip: `The same model, with the same probabilities, goes from a loss of 2,271,000 to a profit of 413,000 just by changing the cut-off from 0.5 to the one the costs ask for.`
    }],
  check: [
    { q: `A repaid loan earns 1,000 and a default loses 9,000. Why should you not approve an applicant whose repay chance is 0.80?`, options: [`The expected profit is 0.80 × 1,000 − 0.20 × 9,000 = −1,000, a loss on average`, `0.80 is below 0.85, the standard minimum`, `The model's accuracy is below 80%`, `Because 0.80 is closer to 0.5 than to 1`], answer: 0, why: `Expected profit decides, not the size of the probability. At 0.80, 20 defaults per 100 loans cost 180,000 while 80 repaid loans earn only 80,000.` },
    { q: `A repaid loan earns 600 and a default loses 1,400. What is the cut-off for P(repay)?`, options: [`0.70`, `0.30`, `0.43`, `0.50`], answer: 0, why: `L / (G + L) = 1,400 / (600 + 1,400) = 0.70. The answer 0.30 is the formula upside down, and 0.43 is G divided by L.` },
    { q: `Your model says 0.92 for a group of applicants who really repay 85% of the time. You use the formula's cut-off 0.90 (G = 1,000, L = 9,000). What happens to this group?`, options: [`You lose about 500 per loan, although the model predicted a gain of about 200`, `You earn about 200 per loan, as the model predicts`, `You lose about 9,000 per loan`, `You break even`], answer: 0, why: `The true expected profit is 10,000 × 0.85 − 9,000 = −500. The model thinks it is 10,000 × 0.92 − 9,000 = +200, but its probability is not honest. Calibrate first, or raise the raw cut-off.` }],
  teachback: { prompt: `In two sentences, explain why the loan cut-off is 0.90 and not 0.5, and what must be true of the probabilities for that to work.`, model: `Approving an applicant earns 1,000 with chance p and loses 9,000 with chance 1 − p, which is above zero only when p is above 9,000/10,000 = 0.90, so 0.5 would approve many loans that lose money on average. The rule only works if the probabilities are calibrated, because it treats the model's p as the true chance of repayment.` },
  cheat: `Approve if expected profit p·G − (1 − p)·L is above 0, that is p above L / (G + L). With G = 1,000 and L = 9,000: 0.90 (odds 9 to 1). Cost ratios 1:1, 3:1, 9:1, 19:1 give 0.50, 0.75, 0.90, 0.95. It needs calibrated p: an over-confident model needs a higher raw cut-off. The profit peak on finite data is noisy; the formula is the target.`
};
