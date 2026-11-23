// Lesson for evaluation/split-schemes: K-fold, stratified, group and time-series splits, and how to choose.
module.exports = {
  idea: 'A fold scheme decides which rows the model may not see while it is scored. Pick the scheme that copies how the model will meet new data: random rows (K-fold, stratified if a class is rare), new customers (group K-fold), or the future (time-series split).',
  why: 'A score is only honest if the test rows are as new to the model as real future rows will be. Shuffle customers with several rows each into folds and the model is tested on people it has already met. Shuffle time-ordered rows and it peeks at the future. The score then looks great and the live model does not.',
  analogy: 'Marking a driving test. If the examiner sends a learner out on the very route the instructor practised with her for weeks, she passes, and you learn nothing about unfamiliar roads. For a fair test the route must be new in the way that matters: a new road (a new customer), or next month\'s traffic (the future), and enough bad-weather days to count (rare classes).',
  vocab: [
    ['Fold', 'One part of the rows. In each round one fold is the test set and the others train the model, so every row is tested once.'],
    ['K-fold', 'Shuffle the rows, cut them into K equal parts. It ignores what the rows are.'],
    ['Stratified K-fold', 'K-fold that deals each class out evenly, so every test fold has about the same share of positives as the whole data.'],
    ['Group K-fold', 'Keeps all rows of one group (a customer, a patient, a store) in the same fold, so a group is never on both sides of the cut.'],
    ['Time-series split', 'Forward chaining: each test block is later than all the rows it trains on. The earliest rows are never tested.'],
    ['Leakage (across the cut)', 'Information from test rows reaching the model through training rows, for example a customer\'s other rows. It inflates the score.']],
  steps: [
    { h: 'Every scheme makes two promises', p: 'Every row is tested exactly once, and a row is never trained on while it is being tested. These are true for all four schemes. What differs is <i>which other rows</i> may sit on the training side, and that is the whole question.' },
    { h: 'Ask what "new" means on the day of use', p: 'On the day, the model will meet one of three kinds of new row. A fresh draw from the same crowd (random rows). A customer it has never seen (new group). A later period (the future). The fold scheme must copy that. If the test rows are less new than the real ones, the score is too good.' },
    { h: 'Plain K-fold: fine when rows are independent', p: 'Shuffle 60 rows and cut into 5 folds of 12. Each row is tested once. When rows do not depend on each other, and both classes are common, this is a good, simple choice. It ignores class share, groups and time, so it fails when those matter.' },
    { h: 'Rare classes: stratify', p: 'Say 7 of 60 rows are positive. A shuffled test fold of 12 has no positive with probability <span class="eq">C(53,12)/C(60,12) = 0.19</span>. Over five folds that happens in about 3 of 4 shuffles. Its score then says nothing about the rare class. Stratified K-fold deals the 7 positives out as 2, 2, 1, 1, 1.' },
    { h: 'Several rows per customer: group', p: 'A customer\'s rows look alike. If row 1 trains and row 2 tests, the model has seen this customer, and the test is easy. Group K-fold puts all of a customer\'s rows in one fold. It packs the groups greedily: biggest first, each into the lightest fold. Price: the folds cannot be balanced by class.' },
    { h: 'Time order: forward chaining', p: 'If the model scores next month\'s customers, test it on a later block than the training rows. With 60 rows and 5 folds the blocks are 10 rows. Fold k trains on rows 0 to 10k−1 and tests on the next 10. Prices: rows 0 to 9 are never tested, and early folds train on only 10 or 20 rows.' },
    { h: 'No scheme fixes everything', p: 'Each scheme ignores something. K-fold ignores classes, groups and time. Stratified ignores groups and time. Group ignores class share and time. Time-series ignores groups. If two problems are present you need to handle both: <code>StratifiedGroupKFold</code> exists for rare classes with groups.' },
    { h: 'A choice rule you can run in your head', p: 'Ask in this order. (1) Will the model score the future? Use the time-series split. (2) Will it score new customers or patients? Use group K-fold. (3) Otherwise it is random rows: use K-fold, and stratify when the target is a class (it costs nothing). Then check the three diagnostics: class share, groups on both sides, earlier test rows.' }],
  example: {
    title: 'the same 60 rows, three schemes, by hand',
    setup: '60 rows and 5 folds. <b>(a)</b> 7 rows are positive. <b>(b)</b> The rows belong to 12 customers who have <b>9, 8, 7, 7, 6, 5, 5, 4, 3, 3, 2, 1</b> rows each. <b>(c)</b> The rows are in time order, row 0 the oldest. Place the customers by the group K-fold rule, biggest first, into the fold with the lightest load.',
    table: { head: ['Placed', 'Customer rows', 'Goes to fold', 'Loads of folds 1 to 5 afterwards'], rows: [
      ['1st', '9', '1', '9 · 0 · 0 · 0 · 0'],
      ['2nd', '8', '2', '9 · 8 · 0 · 0 · 0'],
      ['3rd', '7', '3', '9 · 8 · 7 · 0 · 0'],
      ['4th', '7', '4', '9 · 8 · 7 · 7 · 0'],
      ['5th', '6', '5', '9 · 8 · 7 · 7 · 6'],
      ['6th', '5', '5 (load 6)', '9 · 8 · 7 · 7 · 11'],
      ['7th', '5', '3 (load 7, first)', '9 · 8 · 12 · 7 · 11'],
      ['8th', '4', '4 (load 7)', '9 · 8 · 12 · 11 · 11'],
      ['9th', '3', '2 (load 8)', '9 · 11 · 12 · 11 · 11'],
      ['10th', '3', '1 (load 9)', '12 · 11 · 12 · 11 · 11'],
      ['11th', '2', '2 (load 11, first)', '12 · 13 · 12 · 11 · 11'],
      ['12th', '1', '4 (load 11, first)', '12 · 13 · 12 · 12 · 11']] },
    walk: [
      '<b>Plain K-fold.</b> 60 / 5 = 12 test rows in every fold, 48 training rows. Nothing else is guaranteed.',
      '<b>Stratified, 7 positives.</b> 7 = 5 × 1 + 2, so every fold gets 1 positive and two folds get a second one: 2, 2, 1, 1, 1 (scikit-learn gives exactly this). The 53 negatives are dealt the same way, 10 or 11 per fold. No test fold is empty of positives.',
      '<b>How bad is plain K-fold here?</b> The chance that one given fold of 12 has none of the 7 positives is <span class="eq">C(53,12)/C(60,12) = 0.19</span>. Across 1,000 shuffles, at least one of the five folds had none in 75% of them.',
      '<b>Group K-fold.</b> Read the table from the top. Each customer goes whole to the fold with the smallest load so far (the first such fold if tied). The final test sizes are <b>12, 13, 12, 12, 11</b>. No customer is split, so no customer is on both sides.',
      'The price: a customer has one label, so a fold of two or three customers has a class share of 0% or 100% unless you are lucky. On the page\'s default data the five test folds hold 100%, 0%, 100%, 92% and 0% positives.',
      '<b>Time-series split.</b> The test block size is 60 // (5 + 1) = 10. The five folds are: train 0 to 9, test 10 to 19; train 0 to 19, test 20 to 29; and so on up to train 0 to 49, test 50 to 59. Rows 0 to 9 are never tested.'],
    result: 'Each scheme gets what it promises and gives up something else. K-fold: equal folds of 12, nothing more. Stratified: 2, 2, 1, 1, 1 positives, so the rare class is always tested. Group: no customer on both sides, folds of 12, 13, 12, 12, 11 rows, but unbalanced classes. Time-series: every test row is later than its training rows, but 10 rows are never tested and the first model trains on 10 rows.' },
  read: [
    ['Top strip, row "Class"', 'One thin cell per row of the file. Orange is a positive row, grey a negative one.'],
    ['Top strip, row "Group"', 'The customer each row belongs to, shown by colour. Only for the customers data.'],
    ['Top strip, row "Position"', 'A colour ramp from the first row to the last. It stands for time: light is early, dark is late.'],
    ['Four fold cards, five rows each', 'One row of cells per fold, for K-fold, stratified, group and time-series. A tall orange cell is a test row, a thin blue cell trains the model, and a thin grey line is not used in that fold.'],
    ['Card title "← fits this data"', 'The scheme the page recommends for the kind of data you chose.'],
    ['Table: Share of positives in each test fold', 'The positive share of each of the five test folds, labelled even, uneven or "a fold has none". You want numbers close to the overall share.'],
    ['Table: Groups on both sides, per fold', 'For each fold, how many customers have rows in both train and test. You want 0 when the model will meet new customers.'],
    ['Table: Test rows earlier than a training row, per fold', 'For each fold, how many test rows are older than the newest training row. You want 0 when the model will score the future.'],
    ['Button: New rows and new shuffle', 'Draws new rows (new labels and customers) and new random cuts. The group and time-series folds do not use a shuffle.']],
  experiments: [
    { do: 'Choose each kind of data in turn and compare the "fits" label with the table.', see: 'Balanced rows: stratified K-fold, with every other column "does not apply". Rare class: stratified. Customers: group. Time order: time-series. On the rare class the table shows K-fold flagged and stratified green. On balanced rows the plain K-fold shares are uneven (42% to 75% on the first draw) while stratified are exactly 50% each.', why: 'Each recommendation follows the table: the scheme that fits is the one whose problem column reads zero or even. On balanced rows stratifying is free, so use it whenever the target is a class.' },
    { do: 'Choose <i>Customers with several rows each</i>. Read "Groups on both sides" for each scheme.', see: 'K-fold and stratified show 5 to 9 of the 12 customers on both sides in every fold (6 to 8 on the first draw). Group K-fold shows 0 0 0 0 0. The group row shares are 100%, 0%, 100%, 92%, 0%.', why: 'A customer with nine rows will almost surely have some in training and some in test under a shuffle. The group scheme fixes that, but each test fold is only 2 or 3 customers with one label each, so its class share cannot be balanced.' },
    { do: 'Choose <i>Rows in time order</i> and look at the time-series card. Hover a cell around position 26 in each fold row.', see: 'Row 26 is grey (not used) in fold 1, an orange test cell in fold 2, and a blue training cell in folds 3 to 5. Rows 1 to 10 are never orange. The table shows 11 or 12 of 12 test rows earlier than a training row for the other three schemes, and 0 for time-series.', why: 'Forward chaining only ever trains on what came before the test block, so the earliest rows have nothing to be tested against. The shuffled schemes use later rows to predict earlier ones.' },
    { do: 'Choose <i>Rare positive class</i> and press <i>New rows and new shuffle</i> five times. After each press count how often the K-fold row says "a fold has none".', see: 'On a fresh page it happens on 2 of the first 5 presses (the 3rd and the 5th). In the long run it is about 3 in 4. The stratified row shows 8% or 17% in every fold every time, which is 1 or 2 positives.', why: 'The chance that a given fold of 12 has none of 7 positives is 0.19, and there are five folds. Stratifying deals the 7 positives out, so none is empty.' },
    { do: 'Hover one cell in the top strip, then hover the same column in each of the four fold cards.', see: 'In K-fold, stratified and group the row is orange in exactly one fold and blue in the other four. In the time-series card the first ten rows are never orange, and each later row is grey in the folds before its test fold and blue in the folds after it.', why: 'This is the "every row tested exactly once" promise, and the way time-series breaks it for the early rows.' }],
  remember: [
    { tag: 'Picture', text: 'Four <b>strips</b> of 60 cells. K-fold and stratified: a scatter of tall cells. Group: tall cells in blocks that follow customers. Time-series: a staircase of tall cells moving right.' },
    { tag: 'Rule of thumb', text: 'Choose by the question <b>"new what?"</b> New rows: K-fold. New customers: group K-fold. New period: time-series split. Rare class: stratify as well, whenever you can.' },
    { tag: 'Sanity check', text: 'After you cut, print three numbers for each fold: the share of positives in the test fold, how many groups sit on both sides, and whether any test row is older than a training row. If a number is not what you intend, change the scheme.' },
    { tag: 'Rule of thumb', text: 'Use stratified K-fold by default for classification. It never hurts and it removes the empty-fold problem: with 7 positives in 60 rows, plain K-fold had an empty fold in 3 shuffles out of 4.' },
    { tag: 'Trick', text: 'For <b>groups</b>, ask whether you can name a person, device, store or patient behind several rows. If yes, pass <code>groups=</code> to <code>.split</code> or <code>cross_val_score</code> and use a group scheme.' },
    { tag: 'Link to code', text: '<code>KFold(5, shuffle=True, random_state=0)</code>, <code>StratifiedKFold(…).split(X, y)</code>, <code>GroupKFold(5).split(X, groups=g)</code>, <code>TimeSeriesSplit(5)</code>. Each <code>.split</code> yields (train_indices, test_indices).' }],
  mistakes: [
    { wrong: '"Stratified K-fold fixes leakage."', right: 'It balances <i>classes</i> only. On the customers data stratified folds still had 5 to 9 of the 12 customers on both sides of every cut.' },
    { wrong: '"Group K-fold also balances the classes."', right: 'No. A customer has one label, so a fold of two or three customers is mostly one class. The page shows 100%, 0%, 100%, 92% and 0% positives in the five test folds.' },
    { wrong: '"Time-series split is only for forecasting time series."', right: 'It is for any model that will score future rows: churn, credit risk, fraud. If the rule that links features to labels changes over time, random folds look too good.' },
    { wrong: '"The time-series split tests every row."', right: 'The first block is only ever training data: rows 0 to 9 of 60 are never tested, and the first model trains on just 10 rows.' },
    { wrong: '"Shuffled K-fold on time-ordered rows is fine, since the model never sees its own test row."', right: 'It sees later rows. On the default draw 11 or 12 of the 12 test rows in every fold are older than some training row (10 to 12 on almost every fold over 200 draws), so the model is partly predicting the past from the future.' }],
  code: [
    {
      title: 'Rare positives: empty folds in plain K-fold, even folds when stratified',
      py: 'import numpy as np\nfrom sklearn.model_selection import KFold, StratifiedKFold\n\ny = np.array([1] * 7 + [0] * 53)                  # 7 positives in 60 rows\nX = np.zeros((60, 1))                              # the features do not matter for the cut\nempty = 0\nfor s in range(1000):\n    folds = KFold(5, shuffle=True, random_state=s).split(X)\n    empty += any(y[te].sum() == 0 for _, te in folds)        # a test fold with no positive?\nprint("plain K-fold, shuffles with an empty fold:", empty / 1000)\nsk = StratifiedKFold(5, shuffle=True, random_state=0)\nprint("stratified positives per test fold:", [int(y[te].sum()) for _, te in sk.split(X, y)])',
      out: 'plain K-fold, shuffles with an empty fold: 0.75\nstratified positives per test fold: [2, 2, 1, 1, 1]',
      walk: [
        ['np.array([1] * 7 + [0] * 53)', 'List repetition: seven 1s followed by fifty-three 0s. <code>1</code> marks a positive row.'],
        ['KFold(5, shuffle=True, random_state=s).split(X)', 'Five shuffled folds. The seed <code>s</code> makes each of the 1000 loops a different shuffle. <code>.split(X)</code> yields <code>(train_indices, test_indices)</code>. Plain K-fold never looks at y.'],
        ['y[te].sum() == 0', '<code>y[te]</code> picks the labels of the test rows. Their sum is the number of positives, so 0 means an empty fold.'],
        ['empty += any(...)', '<code>any</code> is True if at least one fold is empty. Adding a True counts as 1.'],
        ['StratifiedKFold(...).split(X, y)', 'The stratified splitter must be given y, because it deals the classes out evenly. With 7 positives and 5 folds it gives 2, 2, 1, 1, 1.']],
      tip: 'About 3 shuffles in 4 leave some fold with no positive. Your own number will be near 0.75.'
    },
    {
      title: 'Group K-fold: no customer on both sides',
      py: 'import numpy as np\nfrom sklearn.model_selection import GroupKFold\n\nsizes = [9, 8, 7, 7, 6, 5, 5, 4, 3, 3, 2, 1]        # rows per customer\ng = np.repeat(np.arange(12), sizes)                   # customer number of each of the 60 rows\nfor k, (tr, te) in enumerate(GroupKFold(5).split(np.zeros(60), groups=g), start=1):\n    both = set(g[tr]) & set(g[te])                    # customers on both sides of the cut\n    print("fold", k, "test rows", len(te), "customers", sorted(set(g[te].tolist())), "on both sides:", len(both))',
      out: 'fold 1 test rows 12 customers [0, 8] on both sides: 0\nfold 2 test rows 13 customers [1, 9, 10] on both sides: 0\nfold 3 test rows 12 customers [3, 5] on both sides: 0\nfold 4 test rows 12 customers [2, 7, 11] on both sides: 0\nfold 5 test rows 11 customers [4, 6] on both sides: 0',
      walk: [
        ['np.repeat(np.arange(12), sizes)', 'Repeats customer number 0 nine times, number 1 eight times, and so on: a customer id for each of the 60 rows.'],
        ['GroupKFold(5).split(np.zeros(60), groups=g)', 'The second argument is a dummy X, because only the row count matters. <code>groups=g</code> tells the splitter which rows belong together. There is no random shuffle: the greedy packing from the worked example decides everything.'],
        ['enumerate(..., start=1)', 'Numbers the folds from 1 instead of 0.'],
        ['set(g[tr]) & set(g[te])', 'A set of customer ids on the training side, intersected (<code>&</code>) with those on the test side. If the intersection is empty, nobody is on both sides.'],
        ['len(te)', 'Fold sizes 12, 13, 12, 12, 11: exactly what the hand packing gave.']],
      tip: 'Fold 1 holds customers 0 and 8 (9 + 3 = 12 rows). Fold 2 holds customers 1, 9 and 10 (8 + 3 + 2 = 13 rows).'
    },
    {
      title: 'Time-series split: train on the past, test on the next block',
      py: 'import numpy as np\nfrom sklearn.model_selection import TimeSeriesSplit\n\ntested = []\nfor k, (tr, te) in enumerate(TimeSeriesSplit(n_splits=5).split(np.zeros(60)), start=1):\n    print("fold", k, "train rows", tr.min(), "to", tr.max(), "| test rows", te.min(), "to", te.max())\n    tested += te.tolist()\nprint("rows never tested:", sorted(set(range(60)) - set(tested)))',
      out: 'fold 1 train rows 0 to 9 | test rows 10 to 19\nfold 2 train rows 0 to 19 | test rows 20 to 29\nfold 3 train rows 0 to 29 | test rows 30 to 39\nfold 4 train rows 0 to 39 | test rows 40 to 49\nfold 5 train rows 0 to 49 | test rows 50 to 59\nrows never tested: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]',
      walk: [
        ['TimeSeriesSplit(n_splits=5)', 'Forward chaining. The rows must already be sorted from oldest to newest, because the splitter only looks at row positions.'],
        ['.split(np.zeros(60))', 'Again a dummy X of 60 rows. Each yielded pair has the training rows (everything before the test block) and the test rows.'],
        ['tr.min(), tr.max()', 'The training block always starts at row 0 and grows: 10 rows, then 20, up to 50.'],
        ['tested += te.tolist()', 'Collect every test row so we can see which rows were never tested.'],
        ['set(range(60)) - set(tested)', 'Set difference: rows 0 to 9 are only ever training data.']],
      tip: 'Sort the data by date <i>before</i> you split. The splitter trusts the row order.'
    }],
  check: [
    { q: 'A bank has 12 monthly statements per customer and will use the model to score <b>new customers</b>. Which scheme gives the most honest estimate?', options: ['Shuffled K-fold', 'Stratified K-fold', 'Group K-fold with customer as the group', 'Time-series split'], answer: 2, why: 'Rows of one customer look alike, so under a shuffle the model is tested on customers it has already met. Group K-fold keeps each customer on one side. Stratified balances classes only, and the time-series split does not look at customers.' },
    { q: '7 of 60 rows are positive, and you use 5-fold stratified. How many positives can one test fold hold?', options: ['0 to 4, as in plain K-fold', '1 or 2', 'Exactly 1.4', 'Exactly 2'], answer: 1, why: '7 = 5 × 1 + 2, so every fold gets 1 and two folds get one extra: 2, 2, 1, 1, 1. A fold cannot hold 1.4 rows.' },
    { q: 'You run <code>TimeSeriesSplit(5)</code> on 60 rows in time order. Which rows are never in a test fold, and how many rows does the first model train on?', options: ['The last 10 rows; 50 rows', 'The first 10 rows; 10 rows', 'No row is left out; 48 rows', 'Random 10 rows; 48 rows'], answer: 1, why: 'The block size is 60 // 6 = 10. Fold 1 trains on rows 0 to 9 and tests on 10 to 19, so rows 0 to 9 are never tested, and the first model has only 10 training rows.' }],
  teachback: { prompt: 'In two sentences, explain to a friend how to pick between K-fold, group K-fold and the time-series split.', model: 'Ask what is new on the day the model is used: if it will score ordinary new rows use K-fold (stratified when a class is rare), if it will score customers it has never seen keep each customer on one side with group K-fold, and if it will score the future always train on the past and test on the next block. Then print class share, groups on both sides and earlier test rows to check the cut did what you meant.' },
  cheat: 'Fold scheme = a copy of how the model meets new data. New rows: K-fold, stratified for a class target (rare class: 3 shuffles in 4 leave an empty fold otherwise). New customers: group K-fold (no customer on both sides, class share uneven). New period: time-series split (test is later than train, first block never tested). Check class share, groups on both sides, earlier test rows.'
};
