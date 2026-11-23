// Lesson for evaluation/target-leak: columns written by the outcome, and the allow-list habit.
module.exports = {
  idea: 'Some columns exist only <i>because</i> the outcome happened: a cancellation survey, a refund. They make a model look brilliant on the table and useless on the day. Before training, ask of every column: <b>would I know this value at the moment I must predict?</b>',
  why: 'A churn model scored AUC 0.99 on the recorded table, then 0.72 on customers the day before they decide. That is worse than a model built without the suspicious columns (0.74). The 0.99 was reported and trusted, and the retention team was promised a model that cannot deliver it.',
  analogy: 'Predicting who wins a match from a photo of the scoreboard taken after the final whistle. The photo is a perfect predictor, because the result wrote it. Before the match the board reads 0 to 0, so your model knows nothing. Columns written by the event are the photo. Columns known at the toss (team sheets, pitch report) are honest.',
  vocab: [
    ['Target leakage', 'A column that contains, or is caused by, the answer. It is written after the outcome, or because of it.'],
    ['Prediction time', 'The moment the model must give its answer. Only values that exist at that moment may be used.'],
    ['Offline table and live snapshot', 'The offline table is the rows as recorded, after outcomes are known. The live snapshot is the same customers the day before they decide.'],
    ['AUC', 'The chance that a random churner gets a higher score than a random stayer. 1 is a perfect ranking, 0.5 is a coin flip.'],
    ['ROC curve', 'Churners caught (true positive rate) against stayers wrongly flagged (false positive rate) as the cut-off moves. The closer to the top-left corner, the better.'],
    ['Standardised weight', 'The size of a model\'s weight after all columns are scaled to the same spread, so columns can be compared. One weight far above the rest is a warning.'],
    ['Allow-list', 'A written list of the columns the model may use, each justified as known at prediction time. The opposite of "drop the columns that look bad".']],
  steps: [
    { h: 'Say when the prediction happens', p: 'The model is used on the day before a customer decides to stay or go. Each training row is a snapshot of one customer plus a label: did they churn. The model may use anything known on that day. Anything recorded <i>later</i> is information from the future, and the model will not have it in use.' },
    { h: 'Three columns are written by the churn itself', p: '<code>cancellation_survey_sent</code> is 1 for 92% of churners and 2% of stayers, because the survey goes out when someone cancels. <code>refund_issued</code> is 1 for 40% of churners and 1% of stayers. <code>days_since_last_login</code> is measured at the snapshot, which for churners is after they left, so it runs long.' },
    { h: 'Why the AUC looks brilliant', p: 'For a 0/1 column, <span class="eq">AUC = 0.5 + 0.5 × (share of churners with a 1 − share of stayers with a 1)</span>. For the survey flag: 0.5 + 0.5 × (0.92 − 0.02) = 0.95. Real business signals are rarely that clean: each honest column scores only 0.58 to 0.62, and all five together about 0.74.' },
    { h: 'On the day, the clue is blank', p: 'The day before a customer decides, no survey has been sent, no refund made, and the login gap looks like anyone else\'s. The flag is 0 for everybody: shares 0 and 0, AUC 0.5. The model gave the survey a weight of 2.7 (honest columns 0.4 to 0.5), so it loses its main input and drops from 0.99 to 0.72.' },
    { h: 'Changing the split does not catch it', p: 'A split by time (train on months 1 to 9, test on 10 to 12) gives 0.987, the same as random 5-fold (0.985). The leaky columns are filled in for every month. A time split protects you from drift and from future rows in training. It does nothing about a column that carries the answer.' },
    { h: 'Three clues, and why they are not enough', p: 'One column far stronger than the rest (survey 0.95 against 0.58 to 0.62). A column made after the event. One weight dwarfing the others. But refund (0.69) and login (0.71) do not stand out and still leak: drop only the survey and the model scores 0.87 offline but 0.71 live. Only the question "known at prediction time?" catches all three.' },
    { h: 'The habit: build X from an allow-list', p: 'For each column write down which system creates it and when. Keep only columns created before the prediction moment and put that list inside the model with a <code>ColumnTransformer</code> in a Pipeline. A column added to the data next month is then off by default. Do not work from "drop the bad ones": the one you miss will leak.' },
    { h: 'Test on a live-like snapshot', p: 'Rebuild the features as they stood on the prediction date for a recent batch and score the model there. A drop of more than about 0.1 from the offline number means leaky columns. A Pipeline cannot help here: it fixes learned steps that see test rows, while target leakage is wrong data. Two different doors, two different checks.' }],
  example: {
    title: 'the AUC of one column, by hand',
    setup: 'Ten customers: 5 churned and 5 stayed. The 0/1 column <code>survey_sent</code> reads 1, 1, 1, 1, 0 for the churners and 0, 0, 0, 0, 1 for the stayers. AUC is the average score over all 5 × 5 = 25 (churner, stayer) pairs: 1 point if the churner\'s value is higher, ½ if equal, 0 if lower.',
    table: { head: ['Churner has', 'Stayer has', 'Pairs', 'Points per pair', 'Total points'], rows: [
      ['1', '0', '4 × 4 = 16', '1', '16'],
      ['1', '1', '4 × 1 = 4', '½', '2'],
      ['0', '0', '1 × 4 = 4', '½', '2'],
      ['0', '1', '1 × 1 = 1', '0', '0']] },
    walk: [
      'Count by value. Churners: four 1s and one 0. Stayers: four 0s and one 1.',
      'Fill the table. Each pair of (1, 0) is a win. Pairs with equal values are ties. A (0, 1) pair is a loss.',
      'Add the points: 16 + 2 + 2 + 0 = 20. AUC = 20 / 25 = <b>0.80</b>.',
      'Shortcut: 4 of 5 churners have a 1 (0.8) and 1 of 5 stayers (0.2). <span class="eq">0.5 + 0.5 × (0.8 − 0.2) = 0.80</span>. Same answer.',
      'The live day: every survey flag is 0. All 25 pairs tie, so AUC = 12.5 / 25 = <b>0.50</b>.',
      'Scale up to the simulation: rates 0.92 and 0.02 give 0.5 + 0.5 × 0.90 = 0.95, which is the "AUC alone" shown for the survey column. Refund (0.40 and 0.01) gives 0.695, shown as 0.69.'],
    result: 'Offline AUC 0.80 (0.95 in the simulation), live AUC 0.50. A column can be the best clue in the table and carry no information on the day. A model that leans on it inherits the same collapse.' },
  read: [
    ['Each row in "Columns: tick the ones the model may use"', 'A tick box, the column name and three facts about it. The model is logistic regression on the ticked columns.'],
    ['Badge "known at prediction time? yes / NO"', 'Whether the value exists the day before the decision. NO (red outline) marks the three columns the churn event writes.'],
    ['"AUC alone"', 'The AUC of that column by itself. 0.5 means useless. It is shown in either direction, so 0.3 would appear as 0.7.'],
    ['"weight" bar', 'Size of the standardised coefficient in the fitted model, averaged over the five folds. A long bar is a column the model leans on (bars are capped in length).'],
    ['Table "AUC: offline and on the day"', 'Rows: your ticked columns, and the five honest columns. Columns: offline by random 5-fold, offline by time (train months 1 to 9, test 10 to 12), then the same two scored on the live snapshot.'],
    ['A red cell in the live columns', 'The live score is more than 0.1 below the offline score for the same folds.'],
    ['Solid and dashed lines in the ROC plot', 'Solid: ticked columns. Dashed: honest columns only. The diagonal is a coin flip. The AUC of each is printed on the plot.'],
    ['Switch "Score the model on"', 'Offline table versus live snapshot, same folds. The fitted model is identical; only the rows it is scored on change.'],
    ['Buttons "All columns" and "Only columns known at prediction time"', 'Quick ticks. The second one applies the allow-list.'],
    ['Button "New customers"', 'A fresh table of 6,000 made-up customers, about a quarter of them churning.']],
  experiments: [
    { do: 'Leave every column ticked and read the table, then the first two lines of the callout.', see: 'Ticked columns: about 0.99 offline (both random and by time) and about 0.72 and 0.69 live, shown in red. Honest row: about 0.74 and 0.73 everywhere.', why: 'The offline table contains the survey, refund and login columns as the churn left them. On the live snapshot those columns are blank or ordinary, so the model loses its main inputs.' },
    { do: 'Press <i>Only columns known at prediction time</i>.', see: 'The ticked row becomes the honest row: about 0.74 offline and 0.74 live (0.73 for the time split both ways). Offline and live agree.', why: 'All five columns look the same on the table and on the day, so the offline score is the live score. A lower offline number that holds up beats a higher one that does not.' },
    { do: 'Untick all columns except <code>cancellation_survey_sent</code>.', see: 'Offline about 0.95 by both splits. Live exactly 0.50.', why: 'The survey flag is 1 for most churners offline. On the live day it is 0 for everyone, every score is tied, and AUC is 0.5 whatever the model learned.' },
    { do: 'Tick all columns again, then untick only the survey column.', see: 'Offline about 0.87 (0.88 by time), live about 0.71 by random folds.', why: 'Refund and days since last login still leak. Their "AUC alone" (0.69 and 0.71) is nowhere near the survey\'s 0.95, so the number alone would not have warned you.' },
    { do: 'With all columns ticked, switch the ROC plot between "Offline table" and "Live snapshot".', see: 'The solid curve hugs the top-left corner offline and falls to about the dashed honest curve, slightly below it, on the live snapshot.', why: 'The curve is the model\'s ranking quality. Offline it ranks churners first using clues that exist only after the event. Live those clues are gone and only the honest signal is left.' }],
  remember: [
    { tag: 'Rule of thumb', text: 'One question per column: <b>"Would I know this value at the moment I predict?"</b> If the honest answer is no, or "I think so", the column is out, whatever it does to the score.' },
    { tag: 'Trick', text: '<b>Time-stamp test.</b> Write next to each column the moment it is created (at signup, at billing, at cancellation). Keep it only if that moment is before the prediction moment.' },
    { tag: 'Picture', text: 'The <b>scoreboard photo</b>: a column written by the outcome is a photo taken after the final whistle. It predicts the result perfectly and tells you nothing before the match.' },
    { tag: 'Sanity check', text: 'A single column with AUC above 0.9 on a hard business problem is a smell. Its absence proves nothing: refund (0.69) and login (0.71) looked ordinary and leaked anyway.' },
    { tag: 'Trick', text: '<b>Allow-list, not block-list.</b> Name the columns you permit. New columns arrive switched off and need an argument to get in.' },
    { tag: 'Formula in words', text: 'For a 0/1 column, <span class="eq">AUC = 0.5 + 0.5 × (TPR − FPR)</span>: how much more often it is 1 for churners than for stayers. A column that is the same for everyone scores 0.5.' },
    { tag: 'Sanity check', text: 'Score on a live-like snapshot before you report. An offline number more than about 0.1 above the live one means a leak.' }],
  mistakes: [
    { wrong: '"If I split by time instead of at random, leakage is solved."', right: 'A time split guards against drift and against training on the future. The leaky columns are filled in for the later months too, so it scores 0.987, the same as random folds (0.985).' },
    { wrong: '"I will drop the column with the huge AUC and then the model is clean."', right: 'Dropping only the survey still leaves 0.87 offline against 0.71 live. Refund and login leak with modest AUCs. Go through <i>every</i> column with the "known at prediction time" question.' },
    { wrong: '"Cross-validation or a Pipeline guards against all leakage."', right: 'A Pipeline stops learned steps from seeing test rows. A leaky column is wrong in the data itself and passes through every fold unchanged.' },
    { wrong: '"The model with the higher offline AUC is the better model."', right: 'Compare on a live-like snapshot. All eight columns: 0.99 offline, 0.72 live. Five honest columns: 0.74 both ways. The honest model is better.' }],
  code: [
    {
      title: 'The AUC of one 0/1 column: pairs, formula and the live day',
      py: `import numpy as np
from sklearn.metrics import roc_auc_score

churn = np.array([1, 1, 1, 1, 1, 0, 0, 0, 0, 0])      # 5 churners, 5 stayers
survey = np.array([1, 1, 1, 1, 0, 0, 0, 0, 0, 1])     # survey flag as recorded after the event
tpr, fpr = survey[churn == 1].mean(), survey[churn == 0].mean()
print("survey rate: churners", tpr, " stayers", fpr)
print("AUC by formula:", round(0.5 + 0.5 * (tpr - fpr), 2), " by sklearn:", round(roc_auc_score(churn, survey), 2))
print("AUC on the live day (survey = 0 for all):", roc_auc_score(churn, np.zeros(10)))`,
      out: 'survey rate: churners 0.8  stayers 0.2\nAUC by formula: 0.8  by sklearn: 0.8\nAUC on the live day (survey = 0 for all): 0.5',
      walk: [
        ['survey[churn == 1]', 'Boolean indexing: keep the survey values only where <code>churn == 1</code>, i.e. the churners.'],
        ['.mean()', 'The mean of a 0/1 column is the share of ones. For churners that is 4 of 5 = 0.8, which is the true positive rate of the rule "predict churn if survey is 1".'],
        ['0.5 + 0.5 * (tpr - fpr)', 'The shortcut formula for the AUC of a 0/1 column. It matches the 25-pair count in the worked example.'],
        ['roc_auc_score(churn, survey)', 'Arguments: true labels first, scores second. Scores can be probabilities, margins or, as here, a plain 0/1 column.'],
        ['np.zeros(10)', 'A score of 0 for everyone: what the survey column looks like on the live day. All pairs tie, so AUC is exactly 0.5.']],
      tip: 'For a real model pass <code>predict_proba(X)[:, 1]</code> as the score, not <code>predict(X)</code>. Hard 0/1 predictions throw away the ranking and give a coarser AUC.'
    },
    {
      title: 'Spot the suspicious column: AUC of each column alone',
      py: `import numpy as np
from sklearn.metrics import roc_auc_score

rng = np.random.RandomState(0); n = 4000
tenure = rng.gamma(3, 8, n); calls = rng.poisson(1.5, n)
churn = (rng.rand(n) < 1 / (1 + np.exp(1.5 + 0.04 * tenure - 0.35 * calls))).astype(int)
survey = np.where(churn == 1, rng.rand(n) < 0.92, rng.rand(n) < 0.02).astype(int)  # written AFTER they leave

for name, col in [("tenure", tenure), ("calls", calls), ("survey_sent", survey)]:
    auc = roc_auc_score(churn, col)
    print(f"{name:12s} AUC alone = {max(auc, 1 - auc):.2f}")`,
      out: 'tenure       AUC alone = 0.62\ncalls        AUC alone = 0.64\nsurvey_sent  AUC alone = 0.94',
      walk: [
        ['rng.gamma(3, 8, n)', 'Positive, right-skewed numbers (months of tenure) with mean 3 × 8 = 24.'],
        ['rng.poisson(1.5, n)', 'Counts of support calls: whole numbers, 1.5 on average.'],
        ['1 / (1 + np.exp(...))', 'The sigmoid: turns a score into a churn probability between 0 and 1. Longer tenure lowers it, more calls raise it.'],
        ['np.where(churn == 1, a, b)', 'Take the values from <code>a</code> where the customer churned and from <code>b</code> where not. This is how the survey flag is made to depend on the outcome.'],
        ['max(auc, 1 - auc)', 'A column that is high for stayers has AUC below 0.5. Taking the larger of the two reads strength in either direction.']],
      tip: 'Run this for every column of your own table. A column that stands out like 0.94 against 0.62 deserves the "known at prediction time?" question first. A column that does not stand out still needs it.'
    },
    {
      title: 'An allow-list inside the Pipeline, and a live-like check',
      py: `import numpy as np, pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import make_pipeline
rng = np.random.RandomState(0); n = 4000
df = pd.DataFrame({"tenure": rng.gamma(3, 8, n), "calls": rng.poisson(1.5, n)})
df["churn"] = (rng.rand(n) < 1 / (1 + np.exp(1.5 + 0.04 * df.tenure - 0.35 * df.calls))).astype(int)
df["survey_sent"] = np.where(df.churn == 1, rng.rand(n) < 0.92, rng.rand(n) < 0.02).astype(int)
live = df.assign(survey_sent=0)                         # the day before: no survey has been sent yet
for keep in (["tenure", "calls", "survey_sent"], ["tenure", "calls"]):      # the second list is the allow-list
    model = make_pipeline(ColumnTransformer([("keep", "passthrough", keep)]), LogisticRegression()).fit(df[:3000], df.churn[:3000])
    auc = lambda d: roc_auc_score(d.churn[3000:], model.predict_proba(d[3000:])[:, 1])
    print(len(keep), "columns: offline AUC", round(auc(df), 3), " live AUC", round(auc(live), 3))`,
      out: '3 columns: offline AUC 0.96  live AUC 0.703\n2 columns: offline AUC 0.704  live AUC 0.704',
      walk: [
        ['ColumnTransformer([("keep", "passthrough", keep)])', 'Picks columns <i>by name</i>. The triple is (a label, what to do with them, which columns). <code>"passthrough"</code> means pass them on unchanged. Columns not listed are dropped, so the model can never read anything else, even if the table gains new columns later.'],
        ['make_pipeline(ColumnTransformer(...), LogisticRegression())', 'The allow-list becomes the first step of the model. Whoever calls <code>predict_proba</code> on a wider table gets the same behaviour, because the list travels with the model.'],
        ['.fit(df[:3000], df.churn[:3000])', 'Trains on the first 3,000 rows. The whole table is passed in, including <code>churn</code> and <code>survey_sent</code>; the first step discards what is not on the list.'],
        ['live = df.assign(survey_sent=0)', 'A copy of the table where the survey column has the value it really has the day before: 0 for every customer.'],
        ['model.predict_proba(d[3000:])[:, 1]', 'Probability of class 1 (churn) for the 1,000 test rows. The model returns two columns, one per class, and <code>[:, 1]</code> takes the second.'],
        ['auc(df) and auc(live)', 'The same fitted model scored on the table as recorded and on the live-like table.']],
      tip: 'The second line is the goal: the honest model has the same AUC offline and live (0.704). The first model collapses from 0.96 to 0.703, no better than the honest one, despite looking far better offline.'
    }],
  check: [
    { q: 'A model predicts on the first day of each month whether a customer will cancel during that month. Which column is a target leak?', options: ['Tenure in months on day 1', 'Number of support calls in the previous 30 days', 'A flag "cancellation survey sent" as recorded at the end of the month', 'Monthly charges on day 1'], answer: 2, why: 'The survey is sent because the customer cancels, so its value at the end of the month contains the answer. The other three are known on day 1.' },
    { q: 'A 0/1 column equals 1 for 70% of churners and for 10% of stayers. What is its AUC alone?', options: ['0.60', '0.70', '0.80', '0.90'], answer: 2, why: 'AUC = 0.5 + 0.5 × (0.70 − 0.10) = 0.5 + 0.30 = 0.80.' },
    { q: 'You untick only <code>cancellation_survey_sent</code> and keep refund_issued and days_since_last_login. What do offline and live AUC show?', options: ['Both about 0.74, same as the honest model', 'Offline about 0.87, live about 0.71', 'Both near 0.50', 'Live higher than offline'], answer: 1, why: 'Refund and login are also written by the churn event. Offline they still add a lot (0.87). On the live day they carry nothing, and the score falls back to about 0.71.' }],
  teachback: { prompt: 'In two sentences, explain to a friend what target leakage is and how you protect a model from it.', model: 'Target leakage is a column that is filled in because of the outcome, such as a cancellation survey, so it looks like a perfect clue in the table but is blank or ordinary on the day you need a prediction. For every column ask whether its value would exist at prediction time, build the model from an allow-list of columns that pass, and check it on a snapshot that looks like the live day.' },
  cheat: 'Target leakage: a column written by, or after, the outcome. It inflates offline scores and vanishes in use (here AUC 0.99 offline, 0.72 live, honest model 0.74). Neither a time split nor a Pipeline catches it. Ask per column: known at prediction time? Build X from an allow-list, and score on a live-like snapshot. For a 0/1 column, AUC = 0.5 + 0.5 (TPR − FPR).'
};
