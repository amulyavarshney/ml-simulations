// Lesson for decisions/group-metrics. Page numbers come from ML.loanGroups / ML.groupMetrics / ML.matchThreshold (page-load seed 1; New applicants gives seeds 2, 3, ...); proxy AUCs measured on the same table.
module.exports = {
  idea: `One model and one cut-off can treat two groups of applicants very differently. Compute approval rate, share of good applicants approved, share of defaulters approved, precision and accuracy for each group: equal accuracy can hide unequal errors, and equalising one figure moves the others.`,
  why: `An overall accuracy of 71.4% hides that group A scores 74.8% and group B 66.1%, and that A is approved 65.5% of the time but B only 41.9%. The model never saw the group, yet outcomes differ. You find out only by measuring each group. Which rates to equalise is a policy choice, and every choice costs something elsewhere.`,
  analogy: `One pass mark for two exam halls. Hall A passes 65% of its students, hall B 42%. Four separate questions: how many capable students passed? how many weak ones slipped through? of everyone who passed, how many are capable? how many passed in all? Lowering the mark in hall B lifts the first two answers and drops the third, all at once.`,
  vocab: [
    ['Positive, approve', `Here the positive class is "repays". Approving an applicant means predicting positive: the model's P(repay) is at least the cut-off.`],
    ['tp, fp, fn, tn', `Counts within one group. <b>tp</b>: approved and repaid. <b>fp</b>: approved and defaulted. <b>fn</b>: rejected but would have repaid. <b>tn</b>: rejected and would have defaulted.`],
    ['Approval rate', `<span class="eq">(tp + fp) / n</span>. The share of the group that gets a yes. Bottom of the fraction: everyone in the group.`],
    ['TPR, "good approved"', `<span class="eq">tp / (tp + fn)</span>. Of the applicants who would repay, the share we approved. Bottom: the good applicants.`],
    ['FPR, "defaulters approved"', `<span class="eq">fp / (fp + tn)</span>. Of the applicants who would default, the share we approved. Bottom: the defaulters.`],
    ['Precision', `<span class="eq">tp / (tp + fp)</span>. Of the applicants we approved, the share who repay. Bottom: the approved.`],
    ['Base rate', `The share of a group that would repay (the "Would repay" row: 80.2% for A, 68.0% for B). Different base rates are why not everything can be made equal.`],
    ['Proxy', `A column that is not the sensitive attribute but carries information about it. Dropping the sensitive column does not remove its information while proxies remain.`]],
  steps: [
    { h: 'One score, one cut-off, two groups', p: `The model gives each applicant a score, P(repay). The rule: approve if the score is at least a cut-off t. One t for everybody looks equal in form. The group label is not one of the six columns the model uses (income, balance, savings, debt, history, loan size), so the model never sees it.` },
    { h: 'Four cells per group', p: `Split the test applicants by group and fill a confusion table for each: tp, fp, fn, tn. Everything on the page is a ratio of these four counts. The "All" column is just the groups' cells added together, so it can look healthy while one group is not.` },
    { h: 'Five ratios, five denominators', p: `Approval rate (tp + fp) / n. TPR tp / (tp + fn). FPR fp / (fp + tn). Precision tp / (tp + fp). Accuracy (tp + tn) / n. Before computing any, ask "out of whom?". Most mix-ups, such as taking FPR for 1 − precision (26.4% against 8.0% for group A), are a wrong denominator.` },
    { h: 'Why one cut-off gives different rates', p: `The groups have different score histograms and different base rates (80.2% and 68.0% would repay). B's scores sit lower, so the same vertical line removes more of B's histogram. B is approved less often although the rule is identical.` },
    { h: 'Accuracy mixes two kinds of error', p: `Accuracy = 1 − (fp + fn) / n. A false positive (approving a defaulter) costs 9,000 here, a false negative (rejecting a good applicant) loses a 1,000 gain. Two groups can share an accuracy with very different mixes: with B's cut-off at 0.63, B scores 74.7% and A 74.8%, yet 9.9% of B's applicants are approved defaulters against 5.2% of A's.` },
    { h: 'You cannot equalise everything', p: `Precision = <span class="eq">TPR·π / (TPR·π + FPR·(1 − π))</span>, where π is the base rate. Give B the same TPR and FPR as A and keep B's base rate, and B's precision is 85.8%, not A's 92.0%. So moving B's cut-off to match one figure moves the others. Chouldechova (2017) and Kleinberg et al. (2016) prove versions of this.` },
    { h: 'Dropping the group column is not enough', p: `The group label never enters the model, yet scores differ, because the columns differ by group. On this table a logistic regression guesses the group from the six columns with AUC 0.67 (0.5 is a coin flip). Dropping any single column leaves 0.66 to 0.67. Dropping income, balance and savings together, three noisy copies of one hidden strength, still leaves 0.60. The information is spread over correlated columns.` },
    { h: 'Measure, then decide', p: `The page measures. It does not say which figure to equalise: that is a policy and legal choice. Matching approval rates keeps both groups at about 65%, but B's defaulters approved rise from 12.3% to 33.7% and overall profit falls from +535,000 to −552,000. Rules on group-specific cut-offs in real lending differ by country and are outside this page.` }],
  example: {
    title: 'two groups, one cut-off, by hand',
    setup: `The page as loaded: 6,000 made-up test applicants, 3,609 in group A and 2,391 in group B, scored by a logistic regression that does not see the group. Approve if P(repay) is at least 0.80. Positive = repays. Profit is +1,000 for each repaid loan approved and −9,000 for each default approved. The confusion counts (the last row is group B after moving its cut-off to 0.63):`,
    table: { head: ['Group, cut-off', 'tp', 'fp', 'fn', 'tn', 'n'], rows: [
      ['A, 0.80', '2,174', '189', '719', '527', '3,609'],
      ['B, 0.80', '908', '94', '717', '672', '2,391'],
      ['B, 0.63', '1,255', '236', '370', '530', '2,391']] },
    walk: [
      `<b>Approval rate</b> = (tp + fp) / n. A: (2,174 + 189) / 3,609 = 2,363 / 3,609 = <b>65.5%</b>. B: (908 + 94) / 2,391 = 1,002 / 2,391 = <b>41.9%</b>.`,
      `<b>Good approved (TPR)</b> = tp / (tp + fn). A: 2,174 / 2,893 = <b>75.1%</b>. B: 908 / 1,625 = <b>55.9%</b>. The bottom is the applicants who would repay.`,
      `<b>Defaulters approved (FPR)</b> = fp / (fp + tn). A: 189 / 716 = <b>26.4%</b>. B: 94 / 766 = <b>12.3%</b>. The bottom is the applicants who would default.`,
      `<b>Precision</b> = tp / (tp + fp). A: 2,174 / 2,363 = <b>92.0%</b>. B: 908 / 1,002 = <b>90.6%</b>. Nearly equal, although B is approved 24 points less often: precision cannot see who was turned away.`,
      `<b>Accuracy</b> = (tp + tn) / n. A: 2,701 / 3,609 = <b>74.8%</b>. B: 1,580 / 2,391 = <b>66.1%</b>. All together: 4,281 / 6,000 = 71.35%, which the page shows as 71.4%.`,
      `<b>Profit</b> = 1,000 · tp − 9,000 · fp. A: 2,174,000 − 1,701,000 = +473,000. B: 908,000 − 846,000 = +62,000. Total +535,000. A group earns money exactly when its precision beats 9,000 / (1,000 + 9,000) = 0.90, so B's 90.6% only just clears it.`,
      `Now press "Accuracy": B's cut-off moves to 0.63 (third row). Accuracy = (1,255 + 530) / 2,391 = <b>74.7%</b>, level with A's 74.8%. (The page's note adds that 0.30 also matches, at 74.8%.) But the mix differs. Approved defaulters: 236 / 2,391 = 9.9% of B's applicants against 189 / 3,609 = 5.2% of A's. Rejected good applicants: 15.5% against 19.9%. FPR 30.8% against 26.4%, precision 84.2% against 92.0%.`],
    result: `At one cut-off of 0.80, A is approved 65.5% of the time and B 41.9%, yet precision is nearly equal (92.0% and 90.6%). Equal accuracy (74.8% and 74.7%, with B at 0.63) hides 9.9% of B's applicants being approved defaulters against 5.2% of A's. The overall 71.4% describes neither group.` },
  read: [
    [`Histograms "Group A: predicted P(repay)" and "Group B: predicted P(repay)"`, `Each bar counts applicants whose predicted P(repay) falls in a slice of width 0.05, with "repaid" and "defaulted" stacked. Group B's bars sit further left.`],
    [`Dark vertical line in each histogram`, `The cut-off. Applicants to the right of it are approved, those to the left are rejected.`],
    [`"Approve if P(repay) is at least": "One threshold for everyone" or "One per group"`, `The second option is how the page lets you treat the two groups differently.`],
    [`Table rows "Applicants" and "Would repay"`, `The size of each group and its base rate.`],
    [`Rows "Approval rate", "Good approved (TPR)", "Defaulters approved (FPR)", "Precision", "Accuracy"`, `The five ratios, for group A, group B and all applicants. Check the denominators with the cheat card.`],
    [`Rows "Profit" and "Defaults approved"`, `Profit is +1,000 per repaid loan approved and −9,000 per default approved. "Defaults approved" is the raw count fp.`],
    [`Column "B − A"`, `B's figure minus A's in points. It turns green when the gap is under 1 point. Green only means "equal", not "good".`],
    [`Buttons under "Make one measure equal"`, `A keeps its cut-off. The page searches B's cut-off for the value where B's figure is closest to A's, switches to "One per group", and you read what happened to the other rows. For "Accuracy" a note under the table lists every cut-off that matches.`],
    [`Readouts "Overall accuracy", "Overall approval rate", "Overall profit"`, `The same figures for all applicants together. They can look fine while a group is not.`]],
  experiments: [
    { do: `Load the page and read the table at the starting cut-off of 0.80. Compare the two histograms.`,
      see: `Approval rate 65.5% for A and 41.9% for B. Good approved 75.1% and 55.9%, defaulters approved 26.4% and 12.3%, precision 92.0% and 90.6%, accuracy 74.8% and 66.1%. Overall accuracy 71.4%. In the "Would repay" row A is 80.2% and B 68.0%.`,
      why: `B's histogram sits further left, so the same line cuts away more of it. B's approvals are rarer but about as clean (precision 90.6%), which is why precision alone would not show the gap.` },
    { do: `Press "Approval rate" under "Make one measure equal".`,
      see: `The page switches to "One per group" and sets B's cut-off to 0.60. Approval rates are 65.5% and 65.0%. But defaulters approved become 26.4% against 33.7%, precision 92.0% against 83.4%, B's profit −1,025,000, and overall profit moves from +535,000 to −552,000.`,
      why: `To approve 23 points more of B, the cut-off drops to 0.60. Those extra applicants have a lower P(repay), and a group loses money once precision falls below 0.90. B's precision is now 83.4%.` },
    { do: `Press "Good applicants approved (TPR)", read the table, then press "Defaulters approved (FPR)" and read it again.`,
      see: `TPR button: B's cut-off 0.65. TPR 75.1% against 75.6%, but approval 65.5% against 60.7%, defaulters approved 26.4% against 29.0%, precision 92.0% against 84.7%. FPR button: cut-off 0.67. FPR 26.4% against 26.6%, but TPR 75.1% against 72.9%, approval 65.5% against 58.1%, precision 92.0% against 85.3%.`,
      why: `Each button fixes one row and the others stay unequal. B has a lower base rate, so with equal TPR and FPR its precision would fall to 85.8%. Equalising everything at once is not possible with one score.` },
    { do: `Press "Precision" and compare group B's approval rate and the overall profit with the start.`,
      see: `B's cut-off becomes 0.85. Precision is 92.0% against 92.2%, but B's approval rate falls from 41.9% to 34.3%, B's good applicants approved from 55.9% to 46.6%, and overall profit rises from +535,000 to +654,000.`,
      why: `Equal precision is reached by being stricter with B. That removes B's riskiest approvals, so profit goes up, while B's good applicants are turned away more often. Money and equality are different axes.` },
    { do: `Reload the page, press "New applicants" three times, then press "Accuracy".`,
      see: `The page's note says B's accuracy equals A's at two cut-offs, 0.33 and 0.59, and that the button used 0.33. Accuracy is 74.1% for A and 74.2% for B, but approval rates are 63.0% and 86.7%, defaulters approved 19.8% and 69.0%, precision 94.2% and 73.8%, overall profit −2,401,000.`,
      why: `Accuracy rises and then falls as the cut-off moves, so B's accuracy equals A's at two cut-offs (0.33 and 0.59 on this table). The button uses the closer match, here the extreme one. Equal accuracy tells you nothing about which errors are made.` },
    { do: `Reload the page, then press "New applicants" four times and read the table at 0.80 each time.`,
      see: `B's approval rate is 24.7, 24.1, 24.7 and 27.5 points below A's (70.6% against 45.9%, 68.4% against 44.3%, 63.0% against 38.3%, 67.3% against 39.8%). B's accuracy is 6 to 12 points below A's every time.`,
      why: `The groups are drawn from different distributions on purpose, so the pattern is built in and repeats on every table. These are measurements on made-up applicants, not claims about any real population. The slides used a different generator (35% in group B, cut-off 0.90), so slide numbers differ from the page.` }],
  remember: [
    { tag: 'Trick', text: `For every rate ask <b>"out of whom?"</b> Approval rate: everyone in the group. TPR: those who would repay. FPR: those who would default. Precision: those we approved. Accuracy: everyone. Nearly all mix-ups are a wrong denominator.` },
    { tag: 'Formula in words', text: `A group earns money when <b>precision is above loss / (gain + loss)</b>, here 9,000 / 10,000 = 0.90. Check: B's precision 90.6% gave +62,000; at 83.4% B lost 1,025,000.` },
    { tag: 'Rule of thumb', text: `Accuracy is the weakest kind of equality: false positives and false negatives can trade against each other. Look at the pair (FPR, TPR), or at all four cells, never at accuracy alone.` },
    { tag: 'Formula in words', text: `<b>Precision = TPR·π / (TPR·π + FPR·(1 − π))</b>. Same TPR and FPR but a lower base rate π means lower precision. A's rates with B's π give 85.8% instead of 92.0%.` },
    { tag: 'Picture', text: `Two histograms, one line each. Sliding B's line changes four numbers at once. Each "Make one measure equal" button says: slide B's line until this number matches A's, then read the rest.` },
    { tag: 'Sanity check', text: `For each group tp + fp + fn + tn must equal n (2,174 + 189 + 719 + 527 = 3,609), and the "All" cells must equal A plus B. If a rate does not recompute from the cells, a cell is mislabelled.` },
    { tag: 'Trick', text: `To look for proxies, try to predict the group from the other columns. AUC clearly above 0.5 means the columns carry group information: 0.67 on this table, 0.60 even after dropping income, balance and savings.` }],
  mistakes: [
    { wrong: `"The model never sees the group, so it cannot treat the groups differently."`, right: `Outcomes differ because the inputs differ by group. Here approval is 65.5% for A and 41.9% for B with the group column absent, and the group can be guessed from the other columns with AUC 0.67.` },
    { wrong: `"Equal accuracy means the model is equally good for both groups."`, right: `Accuracy adds two kinds of error together. At 74.8% and 74.7%, 5.2% of A's applicants and 9.9% of B's are approved defaulters.` },
    { wrong: `"Fair means approval rate, TPR, FPR and precision are all equal."`, right: `With base rates of 80.2% and 68.0% one score cannot do all of that. Each button equalises one figure and moves the rest. Which to equalise is a policy choice, not a statistic.` },
    { wrong: `"FPR is the share of approved applicants who default."`, right: `That is 1 − precision (8.0% for A). FPR is the share of <i>defaulters</i> who were approved (26.4% for A). Different denominators, different numbers.` }],
  code: [
    {
      title: `Five rates from four counts, per group`,
      py: `def rates(tp, fp, fn, tn):
    n = tp + fp + fn + tn
    return {"approval": (tp + fp) / n, "TPR": tp / (tp + fn), "FPR": fp / (fp + tn),
            "precision": tp / (tp + fp), "accuracy": (tp + tn) / n}
for name, cells in [("A", (2174, 189, 719, 527)), ("B", (908, 94, 717, 672))]:
    print(name, *[f"{k} {v:.3f}" for k, v in rates(*cells).items()], "profit", 1000 * cells[0] - 9000 * cells[1])`,
      out: `A approval 0.655 TPR 0.751 FPR 0.264 precision 0.920 accuracy 0.748 profit 473000
B approval 0.419 TPR 0.559 FPR 0.123 precision 0.906 accuracy 0.661 profit 62000`,
      walk: [
        ['def rates(tp, fp, fn, tn)', `One function per group. The four counts are all it needs; each rate is a different ratio of them.`],
        ['(tp + fp) / n', `Approval rate: everyone approved over everyone in the group.`],
        ['tp / (tp + fn)  and  fp / (fp + tn)', `TPR divides by the good applicants, FPR by the defaulters. Same numerator type, different denominators.`],
        ['rates(*cells)', `The <code>*</code> unpacks the tuple into four separate arguments.`],
        ['f"{k} {v:.3f}"', `An f-string: insert the name and the value rounded to 3 decimals.`],
        ['1000 * cells[0] - 9000 * cells[1]', `Profit: +1,000 per tp (cells[0]) and −9,000 per fp (cells[1]).`]],
      tip: `These are the page's own numbers at 0.80. Paste the third row of the example's table in to reproduce the "Accuracy" button.`
    },
    {
      title: `The same rates from rows, using masks`,
      py: `import numpy as np
from sklearn.linear_model import LogisticRegression
r = np.random.RandomState(0); n = 6000
g = (r.rand(n) < 0.4).astype(int)                                       # 1 = group B; never given to the model
s = r.randn(n) - 0.6 * g                                                # hidden financial strength, lower on average in B
X = np.c_[s + .5 * r.randn(n), s + .5 * r.randn(n), s + .6 * r.randn(n)]  # income, balance, savings: noisy copies of s
y = (r.rand(n) < 1 / (1 + np.exp(-1.5 - 1.2 * s))).astype(int)          # 1 = repaid
ok = LogisticRegression().fit(X, y).predict_proba(X)[:, 1] >= 0.8       # approve if P(repay) >= 0.8, same cut-off for all
for k in (0, 1):
    m = g == k                                                          # mask: the rows of one group
    print("AB"[k], "repay", y[m].mean().round(3), "approval", ok[m].mean().round(3), "TPR", ok[m & (y == 1)].mean().round(3),
          "FPR", ok[m & (y == 0)].mean().round(3), "precision", y[m & ok].mean().round(3))`,
      out: `A repay 0.768 approval 0.511 TPR 0.595 FPR 0.234 precision 0.894
B repay 0.651 approval 0.317 TPR 0.418 FPR 0.128 precision 0.859`,
      walk: [
        ['g == k', `A True/False array, one entry per applicant: True for the rows of group k. Use it to pick out one group.`],
        ['ok[m].mean()', `<code>ok</code> is True where approved. The mean of True/False values is the share of Trues: the approval rate within the group.`],
        ['ok[m & (y == 1)].mean()', `Narrow the rows to this group <i>and</i> good applicants, then take the share approved: TPR. The mask chooses the denominator.`],
        ['ok[m & (y == 0)].mean()', `Same with defaulters: FPR.`],
        ['y[m & ok].mean()', `Now narrow to the approved rows and take the share who repaid: precision. Mask by the approved, average the outcome.`],
        ['predict_proba(X)[:, 1]', `The model's P(repay) for each applicant. Column 1 is the probability of class 1 (repaid).`]],
      tip: `For brevity the model is scored on its own training rows. The page scores separate test rows, and you should too.`
    },
    {
      title: `Can the group be guessed after the column is dropped?`,
      py: `import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
r = np.random.RandomState(0); n = 6000
g = (r.rand(n) < 0.4).astype(int)                                       # 1 = group B: the column we "dropped"
s = r.randn(n) - 0.6 * g                                                # hidden strength, lower on average in B
X = np.c_[s + .5 * r.randn(n), s + .5 * r.randn(n), s + .6 * r.randn(n)]  # income, balance, savings: noisy copies of s
for keep in ([0, 1, 2], [1, 2], [2]):                                   # then drop income, then balance as well
    auc = cross_val_score(LogisticRegression(), X[:, keep], g, cv=5, scoring="roc_auc").mean()
    print("columns kept", keep, "-> AUC for guessing the group:", round(auc, 3))`,
      out: `columns kept [0, 1, 2] -> AUC for guessing the group: 0.644
columns kept [1, 2] -> AUC for guessing the group: 0.639
columns kept [2] -> AUC for guessing the group: 0.632`,
      walk: [
        ['X[:, keep]', `Keeps only the listed columns. The group column <code>g</code> is not in X at all; it is the thing we try to predict.`],
        ['cross_val_score(..., cv=5, scoring="roc_auc")', `Trains on 4/5 of the rows and scores AUC on the other 1/5, five times, so we measure guessing on unseen applicants.`],
        ['.mean()', `Average the five AUC scores. AUC 0.5 means a coin flip, 1.0 means perfect.`],
        ['keep in ([0, 1, 2], [1, 2], [2])', `Drop income, then balance as well. If dropping a column removed its information, AUC would fall to 0.5. It barely moves.`]],
      tip: `The page's table is not this one, but the lesson is the same: its six columns give AUC 0.67, and 0.60 after dropping income, balance and savings.`
    }],
  check: [
    { q: `Which rate answers "of the applicants who would have repaid, how many did we approve?"`, options: [`True positive rate (good applicants approved)`, `Precision`, `False positive rate (defaulters approved)`, `Approval rate`], answer: 0, why: `The bottom of the fraction is "applicants who would repay", so it is tp / (tp + fn), the TPR. Precision divides by the approved, FPR by the defaulters, approval rate by everyone.` },
    { q: `Group B at cut-off 0.80 has tp = 908, fp = 94, fn = 717, tn = 672. What is its false positive rate (share of defaulters approved)?`, options: [`12.3% (94 / 766)`, `9.4% (94 / 1,002)`, `3.9% (94 / 2,391)`, `44.1% (717 / 1,625)`], answer: 0, why: `FPR = fp / (fp + tn) = 94 / (94 + 672) = 94 / 766 = 12.3%. 9.4% is 1 − precision, 3.9% divides by everyone, and 44.1% is the share of good applicants rejected.` },
    { q: `On the page, you lower group B's cut-off until B's approval rate equals A's (65.5%). What happens to B's precision and to overall profit?`, options: [`B's precision falls (90.6% to 83.4%) and overall profit turns negative (+535,000 to −552,000)`, `B's precision rises and overall profit rises`, `B's precision stays the same because the model has not changed`, `Only B's accuracy changes`], answer: 0, why: `A lower cut-off approves applicants with a lower P(repay), so a larger share of the approved default. Since a default costs 9 times a repaid loan's gain, profit falls once precision is below 0.90.` }],
  teachback: { prompt: `In two sentences, explain why you should look at error rates for each group and not just overall accuracy, and why you cannot simply make every rate equal.`, model: `Overall accuracy averages the groups and mixes false approvals with false rejections, so two groups can share an accuracy while one has 9.9% approved defaulters and the other 5.2%. And when the groups have different base rates, one score cannot give equal approval rate, TPR, FPR and precision at once, so equalising one figure moves the others and which to choose is a policy decision.` },
  cheat: `Per group, from tp, fp, fn, tn: approval (tp+fp)/n; TPR tp/(tp+fn); FPR fp/(fp+tn); precision tp/(tp+fp); accuracy (tp+tn)/n. Ask "out of whom?". Different score histograms and base rates make one cut-off give unequal rates. Equal accuracy can hide unequal errors. Different base rates mean not every rate can be equal. Dropping a column leaves proxies. Which to equalise is policy.`
};
