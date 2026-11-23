// Lesson for evaluation/random-vs-real: two ways random folds flatter a model, customers with several rows and drift over time.
module.exports = {
  idea: 'Random folds are honest only if rows are independent and the world stands still. Several rows per customer, or drift over time, make them flatter the model. Choose folds that copy the real situation: new customers, or the future.',
  why: 'A model that scores 99% in cross-validation and 50% on new customers has not failed in production, it was never tested for production. Random folds can overstate accuracy by 10 to 50 points. You find out only after the model is live, when the cost of the surprise is highest.',
  analogy: 'A student prepares from last year\'s paper and is tested with a paper made from the same questions, reworded. She scores 99% and has learned nothing general. That is a customer\'s other rows in training. A second student studies the syllabus of 2020 to 2024 and is tested on a 2022 question: easy, the syllabus is on both sides. The real exam is in 2026, after the syllabus has changed. That is drift.',
  vocab: [
    ['Random fold', 'A fold made by shuffling rows, ignoring who owns each row and when it was recorded.'],
    ['Twin (sibling) row', 'Another row of the same customer. It looks almost the same and has the same label, so a test row can be answered by its twin in training.'],
    ['1-nearest-neighbour', 'The model on the customers page: predict the label of the single closest training row. It memorises, so it shows leakage clearly.'],
    ['Group fold', 'Keeps all rows of a customer on one side. Its score is what you get on customers the model has not met.'],
    ['Drift', 'The rule that links features to the label changes over time. A model trained on the past is slowly out of date.'],
    ['Forward chaining', 'Train on everything before a block, test on that block, then move on. It scores the past predicting the future, in order.'],
    ['Real number', 'What the model gets on genuinely new data: 300 unseen customers, or the block of weeks after the history. The page computes it so you can see which estimate is honest.']],
  steps: [
    { h: 'Know what the score is for', p: 'You report a score so that someone can predict how the model will do <i>in use</i>. In use the model meets customers it has never seen and weeks that have not happened. A fold scheme is honest if its test rows are as unfamiliar to the model as those will be.' },
    { h: 'Customers: the twin finds the answer', p: 'On the page each customer has several rows in a tight cluster, one label, and a label that has nothing to do with the features. A 1-nearest-neighbour model copies the closest row. With random folds, a test row\'s twins are usually in training, so the copy is right. The model has recognised a customer, not learned a pattern.' },
    { h: 'How many twins are in training?', p: 'In 5-fold, a test row\'s twin lands in the same test fold with chance about 0.2, so it is in training with chance about 0.8. With 2 rows per customer that is 80%; the page scores about 87%. With 8 rows almost every test row has a twin in training: 98%. More rows per customer means easier memorising, and the real number stays at 50%.' },
    { h: 'Group folds fix it, with noise', p: 'Group folds keep each customer on one side, so the test row\'s twins are all in the test fold. The model must use the features, and they carry no signal, so it scores about 50%. That is honest. With only 40 customers the estimate is noisy: over 20 draws, from 39% to 61%. With 10 customers, from 19% to 84%.' },
    { h: 'Drift: the rule keeps turning', p: 'In the second story the label depends on two features through a boundary line that rotates as weeks pass, by up to 360° over the history. A row in week 30 has neighbours in week 29 and week 31, both with almost the same rule. Random folds test the model among neighbours on both sides in time: it only has to interpolate.' },
    { h: 'Forward chaining, and what it cannot see', p: 'Train on weeks 0 to k, test on the next block. This copies how the model is used, and it is closer to the real number than random folds in 19 of 20 draws at 270°. But it only sees the turning that has already happened. Two straight rules <b>Δ degrees apart disagree on Δ/180 of the points</b>, so a 45° further turn costs 25% of accuracy.' },
    { h: 'When random folds are fine', p: 'With no drift (0°) random 5-fold, forward chaining and the real block agree: 87.0%, 86.2% and 87.0% (mean of 20 draws). The gap opens as the drift grows: about 4 points at 120°, 11 points at 270°, 17 points at 360°. So the test is not "use random folds" or "never use them": it is "does this scheme copy the deployment?"' },
    { h: 'A rule you can apply every time', p: 'Write down what will be new on the day: a row, a customer, a month. Pick the scheme that withholds exactly that. Then compute the random-fold score <i>and</i> the honest one. A gap of more than about 5 points is a warning that the data have twins or drift. If you can get real new data, even a small pilot, check against it.' }],
  example: {
    title: 'twelve rows, two ways of cutting, by hand',
    setup: 'Six customers A to F with <b>two rows each</b>, one feature, positions on a line. The label belongs to the customer and follows no pattern with position: A 0, B 1, C 1, D 0, E 0, F 1. The model copies the label of the nearest other row it may use (1-nearest-neighbour). Compare a <b>random cut</b> (leave one row out, so its twin stays in training) with a <b>group cut</b> (leave the whole customer out).',
    table: { head: ['Test row', 'Customer · label', 'Random cut: nearest row → prediction', 'Group cut: nearest row of another customer → prediction'], rows: [
      ['1.0', 'A · 0', '1.2 (A) → 0 ✓', '2.5 (B) → 1 ✗'],
      ['1.2', 'A · 0', '1.0 (A) → 0 ✓', '2.5 (B) → 1 ✗'],
      ['2.5', 'B · 1', '2.8 (B) → 1 ✓', '1.2 (A) → 0 ✗'],
      ['2.8', 'B · 1', '2.5 (B) → 1 ✓', '4.0 (C) → 1 ✓'],
      ['4.0', 'C · 1', '4.1 (C) → 1 ✓', '2.8 (B) → 1 ✓'],
      ['4.1', 'C · 1', '4.0 (C) → 1 ✓', '2.8 (B) → 1 ✓'],
      ['5.5', 'D · 0', '5.8 (D) → 0 ✓', '4.1 (C) → 1 ✗'],
      ['5.8', 'D · 0', '5.5 (D) → 0 ✓', '7.1 (E) → 0 ✓'],
      ['7.1', 'E · 0', '7.3 (E) → 0 ✓', '5.8 (D) → 0 ✓'],
      ['7.3', 'E · 0', '7.1 (E) → 0 ✓', '5.8 (D) → 0 ✓'],
      ['8.9', 'F · 1', '9.0 (F) → 1 ✓', '7.3 (E) → 0 ✗'],
      ['9.0', 'F · 1', '8.9 (F) → 1 ✓', '7.3 (E) → 0 ✗']] },
    walk: [
      '<b>Random cut.</b> Every row has its twin 0.1 to 0.3 away, and any other customer at least 1.2 away. So the nearest row is always the twin, which has the same label. All 12 predictions are right: <b>100%</b>.',
      '<b>Group cut.</b> Remove both rows of the customer, so the nearest row left belongs to someone else. Its label is unrelated to the customer\'s, so the prediction is only right when the two labels happen to match.',
      'Count per customer: A 0 of 2 right, B 1, C 2, D 1, E 2, F 0. The total is 0 + 1 + 2 + 1 + 2 + 0 = 6 of 12, which is <b>50%</b>. The labels had nothing to do with position, so 50% is the truth.',
      'Same data and same model: 100% against 50%. The first number measured whether the model can recognise a customer it has already seen. Only the second measured what you will get on a new customer.',
      'Caution: with 6 customers the group score moves in steps of 1/12. Some labelings give 25% or 75% by luck. The page uses 40 customers and the estimate has a standard deviation of about 7 points; with 10 customers it is about 16.'],
    result: 'Random cut: 12 of 12 right (100%). Group cut: 6 of 12 right (50%). The 50 points between them are not an improvement the model earned, they are the twins in training. The page does the same with 40 customers of 8 rows each: random 5-fold says 99.7% at the default draw, group 5-fold 59% and new customers 49%.' },
  read: [
    ['Scenario: Customers', 'Each customer has a fixed number of rows in a tight cluster in four features, one label, and no link between the features and the label. The model is 1-nearest-neighbour.'],
    ['Scenario: Drift over time', '600 rows in time order. The label rule is a line through the origin that rotates over the history. The model is 5-nearest-neighbours on the two features and the week number.'],
    ['Top plot, Customers', 'Features 1 and 2 of every row. A tight clump of one colour is one customer.'],
    ['Top plot, Drift', 'The blue line is the angle of the true boundary against time. The shaded strip on the right is the future, after the history. Dashed vertical lines mark where forward-chaining test blocks start.'],
    ['Bottom plot: three bars', 'Each bar is an accuracy, shown as a shaded bar up to its mean (black tick). Dots on the first two bars are single folds. The third bar has no dots: it is one number measured on new data. The dashed line is 50%, chance.'],
    ['Readout: Random 5-fold says', 'The mean accuracy of 5 shuffled folds.'],
    ['Readout: Honest folds say', 'Group 5-fold (customers) or forward chaining (drift).'],
    ['Readout: You really get', 'The accuracy on 300 unseen customers, or on the 2,000 rows of the block after the history.'],
    ['Readout: Random folds overstate by', 'Random minus real, in points. It turns red above 5 points.'],
    ['Sliders', '<i>Number of customers</i> and <i>Rows per customer</i> (Customers). <i>Drift</i>, in degrees turned over the history (Drift). <i>New data</i> redraws everything.']],
  experiments: [
    { do: 'On <i>Customers</i> set <i>Rows per customer</i> to 2, then to 20. Read the three bars each time.', see: 'Random 5-fold goes from about 86% (rows = 2) to about 99% (rows = 20). The real number stays at about 50%, and the group number wobbles around 50%.', why: 'With 2 rows, a test row\'s twin is in training about 80% of the time. With 20, almost always. More rows make memorising easier and add no information about new customers.' },
    { do: 'Set <i>Number of customers</i> to 10, then 40, then 100, pressing <i>New data</i> a few times at each.', see: 'The group number swings widely with 10 customers (from 19% to 84% over 20 draws) and settles near 50% with 100 (standard deviation about 5 points). Random 5-fold stays at 96% to 100%.', why: 'The group estimate rests on a handful of customers. It is honest on average, and noisy when there are few. More customers, not more rows per customer, steady it.' },
    { do: 'Switch to <i>Drift over time</i>. Move the drift from 0° up to 360° in steps and watch the three bars.', see: 'Random 5-fold stays around 85% to 87% throughout. Forward chaining and the real number fall together: at 0° all three read about 87%; at 135° random says 86% and real 82.5%; at 270° real is 74.7%; at 360° it is 66.8%.', why: 'Random folds always test a week among its neighbours. Real use meets weeks past the end, with a rule that has turned further. The more the rule turns, the further apart they sit.' },
    { do: 'Set drift to 270° and press <i>New data</i> ten times. Compare how far "Random 5-fold says" and "Honest folds say" are from "You really get".', see: 'Random is above real by about 11 points on average. Forward chaining is typically within about 4 points of the real number and is closer than random in 19 draws out of 20.', why: 'Forward chaining trains on the past and tests on what follows, which is how the model is used. Its remaining error is noise from a block of 100 rows and the drift it cannot see.' },
    { do: 'Set drift to 360° and compare forward chaining with the real number.', see: 'On average forward chaining says about 69% and the real block gives 66.8%. It is better than random folds (83.5%) but still about 2 points too high.', why: 'Forward chaining has only seen the turning that already happened. The next block lies beyond it, and no fold can show how far the rule will turn.' }],
  remember: [
    { tag: 'Picture', text: 'Random folds are a <b>bridge</b>: every test point has training points on both sides. Real use is the <b>edge of a cliff</b>: all your training data is behind you.' },
    { tag: 'Rule of thumb', text: '<b>Make validation look like deployment.</b> New customers: group folds. Next period: forward chaining. New rows from the same crowd: random folds are fine.' },
    { tag: 'Formula in words', text: 'Two straight-line rules through the origin that differ by Δ degrees disagree on <b>Δ/180</b> of points. A 45° turn between training and use costs up to 25 points of accuracy.' },
    { tag: 'Sanity check', text: 'Compute both numbers: random-fold and honest-fold. If they differ by more than about 5 points, look for twins (several rows per owner) or drift. A 99% that does not survive group folds was memory.' },
    { tag: 'Sanity check', text: 'Ask "who owns this row?" for every dataset: customer, patient, device, store, session. If the answer is not "nobody", you probably need <code>GroupKFold</code>.' },
    { tag: 'Link to code', text: '<code>cross_val_score(model, X, y, cv=GroupKFold(5), groups=g)</code> for customers, and <code>cv=TimeSeriesSplit(5)</code> for time. Sort rows by time before the split.' }],
  mistakes: [
    { wrong: '"Random 5-fold is the standard, so its number is the honest one."', right: 'Only when rows are independent and the world is steady. On the page it says 99.7% for a model that gets 49% on new customers.' },
    { wrong: '"Group folds give a lower score, so they are too pessimistic."', right: 'Here the labels have no link to the features, so 50% is the correct score. The lower number is the honest one. It is noisy with few customers, not biased.' },
    { wrong: '"More rows per customer gives a better estimate."', right: 'More rows per customer make memorising easier. Random 5-fold goes from 87% to 99% as rows rise from 2 to 20, while the real number stays near 50%.' },
    { wrong: '"Forward chaining tells me exactly how the model will do next month."', right: 'It is much closer than random folds, but it only sees drift that has already happened. At 360° it still reads about 2 points above the real block.' },
    { wrong: '"The gap between random and honest folds is a bug in my code."', right: 'It is information. The gap is the amount by which random folds flatter the model on this kind of data.' }],
  code: [
    {
      title: 'The twelve-row example: leave one row out, or leave one customer out',
      py: 'import numpy as np\nfrom sklearn.model_selection import LeaveOneGroupOut, LeaveOneOut, cross_val_score\nfrom sklearn.neighbors import KNeighborsClassifier\n\nx = np.array([1.0, 1.2, 2.5, 2.8, 4.0, 4.1, 5.5, 5.8, 7.1, 7.3, 8.9, 9.0]).reshape(-1, 1)   # position\ng = np.repeat(np.arange(6), 2)                               # customers A..F, two rows each\ny = np.repeat([0, 1, 1, 0, 0, 1], 2)                         # one label per customer\nknn = KNeighborsClassifier(n_neighbors=1)\nrow = cross_val_score(knn, x, y, cv=LeaveOneOut()).mean()                  # leave one row out\ngrp = cross_val_score(knn, x, y, cv=LeaveOneGroupOut(), groups=g).mean()   # leave one customer out\nprint("leave one row out:", round(row, 3), " leave one customer out:", round(grp, 3))',
      out: 'leave one row out: 1.0  leave one customer out: 0.5',
      walk: [
        ['np.repeat(np.arange(6), 2)', 'The customer id of each row: 0, 0, 1, 1, 2, 2, and so on. <code>groups=</code> must have one entry per row.'],
        ['np.repeat([0, 1, 1, 0, 0, 1], 2)', 'The label belongs to the customer, so both rows of a customer carry the same one.'],
        ['KNeighborsClassifier(n_neighbors=1)', 'Predicts the label of the single nearest training row. It stores the training data and does no other learning, so its score shows exactly how close the nearest twin is.'],
        ['cv=LeaveOneOut()', 'Each row is the test set once. Its twin is still in training, which is what a random fold does most of the time.'],
        ['cv=LeaveOneGroupOut(), groups=g', 'Each customer is the test set once, with both of its rows. No twin is left in training.']],
      tip: 'The code gives 1.0 and 0.5, exactly the hand count in the table: 12 of 12 against 6 of 12.'
    },
    {
      title: '40 customers: random folds, group folds, and brand-new customers',
      py: 'import numpy as np\nfrom sklearn.model_selection import GroupKFold, KFold, cross_val_score\nfrom sklearn.neighbors import KNeighborsClassifier\n\ng = np.repeat(np.arange(40), 8)                           # 40 customers, 8 rows each\nknn = KNeighborsClassifier(n_neighbors=1)\nfor seed in range(3):\n    rng = np.random.RandomState(seed)\n    y = rng.randint(0, 2, 40)[g]                          # one coin-flip label per customer\n    X = rng.randn(40, 4)[g] + 0.15 * rng.randn(320, 4)    # each customer is a tight cluster\n    rnd = cross_val_score(knn, X, y, cv=KFold(5, shuffle=True, random_state=0)).mean()\n    grp = cross_val_score(knn, X, y, cv=GroupKFold(5), groups=g).mean()\n    new = knn.fit(X, y).score(rng.randn(300, 4), rng.randint(0, 2, 300))   # 300 unseen customers\n    print(seed, "random:", round(rnd, 3), " group:", round(grp, 3), " new customers:", round(new, 3))',
      out: '0 random: 0.991  group: 0.388  new customers: 0.47\n1 random: 0.984  group: 0.456  new customers: 0.513\n2 random: 0.991  group: 0.531  new customers: 0.45',
      walk: [
        ['rng.randint(0, 2, 40)[g]', '40 coin flips, one per customer, then indexed by <code>g</code> so each customer\'s 8 rows get the same label. The features carry no information about it.'],
        ['rng.randn(40, 4)[g]', '40 random centres in four dimensions, repeated for each customer\'s 8 rows. Adding <code>0.15 * rng.randn(320, 4)</code> scatters the rows slightly around their centre: a tight cluster.'],
        ['cv=GroupKFold(5), groups=g', 'Five folds where a customer\'s rows all go to the same fold.'],
        ['knn.fit(X, y).score(rng.randn(300, 4), ...)', 'Fits on all 320 rows, then scores 300 customers it has never seen, with random labels. Their features are new centres, so the nearest training row tells nothing.'],
        ['for seed in range(3)', 'Three different datasets. Random folds say 98 to 99% every time. Group folds scatter around 50% (39% to 53%) because only 40 customers are behind each estimate.']],
      tip: 'The page does the same thing with its own random numbers. The pattern is identical: about 99% for random folds, about 50% for group folds and new customers.'
    },
    {
      title: 'Drift: random folds against forward chaining against the next block',
      py: 'import numpy as np\nfrom sklearn.model_selection import KFold, TimeSeriesSplit, cross_val_score\nfrom sklearn.neighbors import KNeighborsClassifier\n\ndef make(n, t0, t1, rng):                          # the label rule turns 270 degrees per unit of time\n    t = np.linspace(t0, t1, n); X = rng.randn(n, 2); a = np.deg2rad(270 * t)\n    y = (np.cos(a) * X[:, 0] + np.sin(a) * X[:, 1] + 0.35 * rng.randn(n)) > 0\n    return np.c_[X, 3 * t], y.astype(int)           # time is a feature, scaled up so it counts\nrng = np.random.RandomState(0)\nX, y = make(600, 0, 1, rng); Xn, yn = make(2000, 1, 7 / 6, rng)       # history, then the next block\nknn = KNeighborsClassifier(5)\nfor name, cv in [("random 5-fold", KFold(5, shuffle=True, random_state=0)), ("forward chaining", TimeSeriesSplit(5))]:\n    print(name, round(cross_val_score(knn, X, y, cv=cv).mean(), 3))\nprint("next block:", round(knn.fit(X, y).score(Xn, yn), 3))',
      out: 'random 5-fold 0.813\nforward chaining 0.768\nnext block: 0.697',
      walk: [
        ['a = np.deg2rad(270 * t)', 'The angle of the true boundary at time t: 0° at the start, 270° at t = 1, and still rising after.'],
        ['np.cos(a) * X[:, 0] + np.sin(a) * X[:, 1]', 'The projection of each point onto the direction at angle a. Its sign says which side of the boundary the point is on. Adding noise (0.35) blurs the edge.'],
        ['np.c_[X, 3 * t]', 'Glue a third column, the time, onto the two features so the model can find neighbours in time. The factor 3 makes a week count as much as a unit of feature distance.'],
        ['make(2000, 1, 7 / 6, rng)', 'The next block: times from 1 to 1.17, a sixth of the history, with the rule turned further.'],
        ['TimeSeriesSplit(5)', 'Forward chaining. Rows must already be in time order, which they are.'],
        ['knn.fit(X, y).score(Xn, yn)', 'Train on the whole history and score the block that follows: the number you would get in use.']],
      tip: 'Random 5-fold says 81%, forward chaining 77% and the real block gives 70%. The ordering is the same as on the page; the exact values differ with the random numbers.'
    }],
  check: [
    { q: 'Random 5-fold gives 99% on data where each customer has 8 near-identical rows and the features say nothing about the label. Why?', options: ['Random folds always use more training data', 'A test row\'s twin from the same customer is in training and the model copies its label', 'Cross-validation always overstates accuracy by about 50 points', 'The model has learned a very good rule'], answer: 1, why: 'The rows of a customer sit almost on top of each other and share one label. With 8 rows per customer, almost every test row has a twin in training, so a nearest-neighbour model is right by recognising the customer. New customers score about 50%.' },
    { q: 'Two straight-line decision rules through the origin differ in angle by 45°. On about what share of random points do they disagree?', options: ['12.5%', '25%', '45%', '50%'], answer: 1, why: 'Disagreement is Δ/180 of the points, as two wedges of Δ degrees out of 360. For 45° that is 45/180 = 25%.' },
    { q: 'On the drift page you raise the drift from 0° to 270°. What happens to random 5-fold and to the real score?', options: ['Both fall by about 12 points', 'Random 5-fold stays near 85% while the real score falls to about 75%', 'Random 5-fold rises while the real score falls', 'Neither changes, because the model is a nearest-neighbour model'], answer: 1, why: 'Random folds test each week among neighbours on both sides in time, so the model can interpolate and still scores 85% to 87%. The real block lies beyond the history, after the rule has turned further, so its accuracy falls from about 87% to about 75%.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why random folds can report 99% for a model that gets 50% on new customers, and how to avoid it.', model: 'When a customer has several near-identical rows, random folds put some in training and some in test, so the model scores by recognising a customer it has already seen. Keep each customer in one fold (group folds), and for time-ordered data train on the past and test on the next block, then compare with random folds: a big gap means leakage or drift.' },
  cheat: 'Validation must copy deployment. Customers with several rows: random folds leak twins (99.7% vs 49% on new customers); use group folds (noisy with few customers). Drifting rules: random folds test among neighbours in time (85% vs 75% real at 270°); use forward chaining. Two rules Δ degrees apart disagree on Δ/180 of points. A gap over 5 points is a warning.'
};
