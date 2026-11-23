// Lesson for evaluation/preprocessing-leak: learned steps (here feature selection) must live inside the cross-validation loop.
module.exports = {
  idea: 'Any step that learns from the data (choosing columns, scaling, PCA) must be fitted on the <b>training rows of each fold only</b>. If it sees every row first, the test rows have already helped build the model, so your score is too high.',
  why: 'With 200 coin-flip labels and 5,000 columns of pure noise, choosing the 20 best columns on all rows and then cross-validating gives about 81% accuracy. The honest answer is 50%. A leaky score makes a useless model look excellent, and you find out only after deployment, when it behaves like a coin.',
  analogy: 'An exam where you may read the answer key to decide which 20 chapters to revise, and the paper is then set from the same key. You score 81%, but you learned the key, not the subject. The honest way is to choose chapters from past papers (the training rows) and sit a paper nobody has shown you (the held-out fold).',
  vocab: [
    ['Leakage', 'Information from the test rows (or from the future) reaching the model before it is scored. The score then looks better than the model really is.'],
    ['Learned step', 'Any preprocessing that computes numbers from data: a scaler (mean and spread), an imputer (median), PCA (axes), a feature selector (which columns to keep).'],
    ['fit and transform', '<code>fit</code> learns the numbers from the rows you give it. <code>transform</code> applies numbers already learned. Leak-free rule: <code>fit</code> sees training rows only.'],
    ['Feature selection', 'Keeping the k columns that look most related to the label. <code>SelectKBest(f_classif, k=20)</code> ranks columns by the F statistic: how far apart the two class averages are, compared with the spread inside each class.'],
    ['Pipeline', 'A chain of steps ending in a model, treated as one estimator. Cross-validation refits the whole chain inside every fold.'],
    ['Chance correlation', 'A noise column that happens to line up with the labels in this sample. With thousands of columns, the best few always look informative.']],
  steps: [
    { h: 'Start with a score you should not believe', p: 'The labels are coin flips and all 5,000 columns are noise, so nothing can be predicted. The honest accuracy is 50%. Yet "select the 20 best columns, then cross-validate" reports about 81%. Nothing is wrong with the classifier or the folds. Something upstream is cheating, and the rest of this lesson finds it.' },
    { h: 'Noise columns match the labels by chance', p: 'One noise column has a sample correlation with the labels of about ±1/√n, which is ±0.07 for 200 rows. That is small. But you pick the <i>largest</i> of 5,000, and the largest of many draws is far above a typical one. Simulated, the best of 5,000 noise columns reaches about 0.27. Keep the best 20 and they separate the 200 rows well, by luck alone.' },
    { h: 'The mistake is the order', p: 'The selector looks at the labels of all 200 rows. Then 5-fold cross-validation hides 40 rows and calls them "unseen". They are not unseen: their labels already voted on which columns to keep. So the chosen columns agree with the held-out labels by construction. The classifier is innocent. A step that uses y ran <b>outside</b> the loop.' },
    { h: 'The fix: choose columns inside each fold', p: 'Per fold: (1) take the training rows only, (2) rank the columns on those rows, (3) keep the top k, (4) fit the classifier on them, (5) apply the <i>same</i> k columns to the held-out rows and score. Held-out labels are used only in step 5, to mark the answers. On the same data this gives about 50%, which is the truth.' },
    { h: 'A Pipeline does the five steps for you', p: 'Put the selector and the classifier in one <b>Pipeline</b> and hand it to <code>cross_val_score</code>. For each fold it fits every step on the training rows, and on the held-out rows every step only <i>transforms</i>. You cannot misplace the selection line, because there is no separate selection line.' },
    { h: 'It is not only selectors', p: 'Scalers, imputers, PCA, text vectorisers (TfidfVectorizer), target encoders and oversamplers such as SMOTE leak the same way. The size differs: on 100-row samples of the breast-cancer data, scaling first lifted SVM accuracy by only 0.3 points, while selecting first lifted noise by about 30. You cannot know the size in advance, so every learned step goes in the pipeline.' },
    { h: 'How to catch a leak', p: '<b>1. Shuffle test.</b> Permute y and run the whole procedure. An honest one falls to chance (50% for balanced classes). <b>2. Read the order.</b> A <code>fit</code> or <code>fit_transform</code> on the full X before <code>cross_val_score</code> or <code>train_test_split</code> is a warning. <b>3. Distrust a great score on wide data</b> (as many columns as rows or more): genes, text, sensors.' }],
  example: {
    title: 'ten rows and six columns, by hand',
    setup: 'Ten customers with labels y = <code>+---++----</code> (+ is repaid, − is default). Six columns A to F, each a coin flip per row, so no column knows anything. The "selector" picks the column that agrees with y on the most rows. The "classifier" predicts that column\'s sign. True accuracy of every column: 50%.<br><code>A -+++++++-+</code> agrees on 3<br><code>B +--++-+-++</code> agrees on 5<br><code>C -+--+++--+</code> agrees on 6<br><code>D +--+-+++++</code> agrees on 4<br><code>E -+-++-+-++</code> agrees on 3<br><code>F +---+--+-+</code> agrees on 7<br>Use 5 folds of 2 rows (rows 1-2, 3-4, 5-6, 7-8, 9-10).',
    table: { head: ['Held-out rows', 'Agreements of A, B, C, D, E, F on the other 8 rows', 'Column chosen', 'Correct on the 2 held-out rows'], rows: [
      ['1, 2', '3, 3, 6, 2, 3, 5', 'C', '0 of 2'],
      ['3, 4', '3, 4, 4, 3, 2, 5', 'F', '2 of 2'],
      ['5, 6', '1, 4, 4, 3, 2, 6', 'F', '1 of 2'],
      ['7, 8', '3, 4, 5, 4, 2, 6', 'F', '1 of 2'],
      ['9, 10', '2, 5, 5, 4, 3, 6', 'F', '1 of 2']] },
    walk: [
      '<b>Wrong way.</b> Choose on all ten rows: F agrees on 7 of 10 (the best of the six). Score F on the same ten rows, fold by fold: 7 of 10 = <b>70%</b>. Every row was "tested", but F was picked by looking at all ten labels.',
      '<b>Right way, fold 1.</b> Hide rows 1 and 2. On rows 3 to 10 count agreements: A 3, B 3, C 6, D 2, E 3, F 5. C wins. Row 1: C is − but y is +, wrong. Row 2: C is + but y is −, wrong. 0 of 2.',
      '<b>Folds 2 to 5.</b> Do the same on the other eight rows each time (the table). F wins every time. It gets 2, 1, 1 and 1 of the held-out pairs right.',
      'Add up the held-out hits: 0 + 2 + 1 + 1 + 1 = 5 of 10 = <b>50%</b>.',
      'Why 70% is a lie: F\'s 7 agreements include the very rows it was later "tested" on. Averaged over 5,000 random tables like this one the wrong way scores 0.70 and the right way 0.50.',
      'More columns make it worse. A column agrees with 10 coin flips on 8 or more rows with probability 56/1024 = 0.055. So the chance that at least one of p columns does is <span class="eq">1 − (1 − 0.055)<sup>p</sup></span>: 29% for p = 6, 94% for p = 50, and nearly 100% for p = 500.'],
    result: 'Wrong way 70%, right way 50%, truth 50%. The leak is the 20 points that come from letting the selector see the held-out labels. With 5,000 noise columns instead of 6, the same mechanism takes accuracy from 50% to 81%.' },
  read: [
    ['Triangles in the left column, "Wrong: select first"', 'One dot per run. In each run the k best columns are chosen on all rows, then 5-fold cross-validation scores a nearest-centroid classifier (it predicts the class whose average row is closer).'],
    ['Circles in the right column, "Right: select in each fold"', 'Same data and same folds, but the columns are re-chosen inside each fold from the training rows only.'],
    ['Thick black bar with a % label', 'The mean accuracy over the 30 runs.'],
    ['Dashed horizontal line at 50%', 'What an honest score must be, because the labels are coin flips. Also shown as "What coin flips allow".'],
    ['Sliders Rows, n and Noise features, p', 'n is the number of customers (30 to 300). p is the number of useless columns (10 to 5,000, log scale).'],
    ['Slider Features kept, k', 'How many top columns the selector keeps. If k is at least p, nothing is selected and both ways are identical.'],
    ['Readout "Wrong way: mean accuracy"', 'Average over the 30 runs. It is marked as bad when above 60%.'],
    ['Readouts "lowest to highest"', 'The worst and the best of the 30 runs for each way.'],
    ['Button Run again', 'Draws 30 fresh noise datasets with a new seed. The cloud of dots changes, the story does not.']],
  experiments: [
    { do: 'Answer the "Predict first" question, then look at the readouts with the sliders untouched (200 rows, 5,000 columns, k = 20).', see: 'Wrong way: mean about 81%, runs from about 76% to 86%. Right way: mean about 50%, runs from about 43% to 59%.', why: 'The labels are coin flips, so 50% is the only honest answer. The wrong way is 30 points above it because the 20 chosen columns were picked with the held-out labels in view.' },
    { do: 'Drag <i>Noise features, p</i> down to its minimum, 10 (k stays at 20).', see: 'The two columns of dots become identical and both sit near 50%.', why: 'With p = 10 and k = 20 every column is kept, so nothing is selected and nothing can leak. A leak needs a choice made using the labels.' },
    { do: 'Set <i>Features kept, k</i> to 1, then to 50.', see: 'Wrong way: about 61% for k = 1 and about 90% for k = 50. Right way stays near 50% for both.', why: 'Each extra kept column is another noise column that was chosen because it matched the labels, so the agreement adds up. The honest way gets no such help.' },
    { do: 'Set <i>Rows, n</i> to 300, then to 50.', see: 'Wrong way: about 77% at n = 300, about 97% at n = 50. Right way: still near 50%.', why: 'Chance correlation shrinks like 1/√n. With few rows a noise column matches the labels easily, and the selector finds the best matches.' },
    { do: 'Press <i>Run again</i> five times and watch both clouds.', see: 'The wrong-way cloud stays high (means 81% to 82%). The right-way dots wander between about 40% and 59%, with means near 50%.', why: 'Each right-way run scores 200 coin flips, so it swings by about ±4 points from luck. A leak is a <i>consistent</i> 30-point lift, not a wobble.' }],
  remember: [
    { tag: 'Rule of thumb', text: '<b>Fit on train, transform on test.</b> Every <code>fit</code> or <code>fit_transform</code> may see training rows only. Held-out rows may only be <i>transformed</i>.' },
    { tag: 'Picture', text: 'A <b>sealed box</b>. Scaler, selector and model sit inside one Pipeline box. Cross-validation opens a fresh box for each fold, so nothing learned in one fold can touch another fold\'s test rows.' },
    { tag: 'Sanity check', text: '<b>Shuffle the labels and rerun the whole procedure.</b> An honest one drops to chance. In the second snippet below the leaky way still scores 0.80 on shuffled labels, which proves a leak.' },
    { tag: 'Rule of thumb', text: '<b>The leak grows with columns per row.</b> More columns p, fewer rows n, more columns kept k: each pushes the wrong-way score up. Wide data (genes, text, sensors) is where this bites hardest.' },
    { tag: 'Sanity check', text: '<b>Find the first <code>fit</code> in your script.</b> If it runs on the full <code>X</code> before <code>cross_val_score</code> or <code>train_test_split</code>, you have a leak.' },
    { tag: 'Link to code', text: 'Inside <code>GridSearchCV</code> you reach a pipeline step\'s setting by <b>step name, two underscores, parameter</b>, for example <code>selectkbest__k</code>. With <code>make_pipeline</code> the step name is the lower-case class name.' }],
  mistakes: [
    { wrong: '"Scaling before the split is fine because it does not use the labels."', right: 'It uses the test rows\' <i>values</i> (their mean and spread), so they do influence the model. The leak is small for a scaler (0.3 points in a test) and large for anything that uses labels. You cannot tell the size beforehand, so put every learned step in the pipeline.' },
    { wrong: '"Cross-validation protects me even if I select features first."', right: 'Cross-validation only protects the steps <i>inside</i> the loop. A step run before it has already used every label.' },
    { wrong: '"The classifier is overfitting, so I need a simpler one."', right: 'The classifier is not the problem. Put any classifier on the wrongly selected columns and the score stays high. The fault is the order of operations.' },
    { wrong: '"One honest run gave 56%, so there is a little signal."', right: 'One run on 200 coin flips swings by about ±4 points from luck alone (the dots span 43% to 59%). Judge by repeated runs, or by the shuffle test.' }],
  code: [
    {
      title: 'Select first (wrong) versus select inside a Pipeline (right)',
      py: `import numpy as np
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
rng = np.random.RandomState(0)
X, y = rng.normal(size=(100, 1000)), rng.randint(0, 2, 100)   # pure noise, coin-flip labels
X_sel = SelectKBest(f_classif, k=20).fit_transform(X, y)      # WRONG: picks columns using every label
wrong = cross_val_score(LogisticRegression(), X_sel, y, cv=5).mean()
pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression())
right = cross_val_score(pipe, X, y, cv=5).mean()              # RIGHT: picks columns inside each fold
print("wrong way:", round(wrong, 2), " right way:", round(right, 2))`,
      out: 'wrong way: 0.83  right way: 0.49',
      walk: [
        ['rng.normal(size=(100, 1000))', 'A table of 100 rows and 1,000 columns of random numbers. <code>size=(rows, columns)</code>. Pure noise: no column knows anything about y.'],
        ['rng.randint(0, 2, 100)', '100 labels, each 0 or 1 (the upper limit 2 is excluded). Coin flips, so the best honest accuracy is 50%.'],
        ['SelectKBest(f_classif, k=20)', 'The selector. <code>f_classif</code> is the score that ranks columns (the F statistic). <code>k=20</code> keeps the 20 highest.'],
        ['.fit_transform(X, y)', 'Learns which columns to keep <b>using y</b>, then returns X with only those columns. Run on all rows, this is the leak.'],
        ['make_pipeline(selector, model)', 'Chains the two into one estimator. The step names are made from the class names: <code>selectkbest</code> and <code>logisticregression</code>.'],
        ['cross_val_score(pipe, X, y, cv=5)', 'Receives the raw X. For each of the 5 folds it fits the whole pipeline on four fifths of the rows and scores the last fifth, so the selector never sees held-out labels. <code>.mean()</code> averages the 5 scores.']],
      tip: 'Change <code>RandomState(0)</code> to 1, 2, 3 and run again. The wrong way stays between 0.73 and 0.90 and the pipeline hovers around 0.50 (0.43 to 0.58). One honest run is noisy, the leak is not.'
    },
    {
      title: 'The shuffle test: an honest procedure falls to chance',
      py: `import numpy as np
from sklearn.datasets import make_classification
from sklearn.feature_selection import SelectKBest, f_classif
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
X, y = make_classification(n_samples=100, n_features=1000, n_informative=5, n_redundant=0, random_state=0)
y_shuf = np.random.RandomState(0).permutation(y)        # breaks every link between X and y
for name, lab in [("real labels", y), ("shuffled labels", y_shuf)]:
    leaky = cross_val_score(LogisticRegression(), SelectKBest(f_classif, k=20).fit_transform(X, lab), lab, cv=5).mean()
    pipe = make_pipeline(SelectKBest(f_classif, k=20), LogisticRegression())
    safe = cross_val_score(pipe, X, lab, cv=5).mean()
    print(f"{name}: leaky {leaky:.2f}   pipeline {safe:.2f}")`,
      out: 'real labels: leaky 0.88   pipeline 0.62\nshuffled labels: leaky 0.80   pipeline 0.44',
      walk: [
        ['make_classification(..., n_informative=5)', 'Builds data where exactly 5 of the 1,000 columns carry a real signal about y. <code>random_state=0</code> makes it repeatable.'],
        ['np.random.RandomState(0).permutation(y)', 'The same labels in a random order. Each customer keeps their features but receives someone else\'s label, so any real link is destroyed.'],
        ['for name, lab in [(...), (...)]', 'Runs the same two procedures once with the real labels and once with the shuffled ones.'],
        ['SelectKBest(...).fit_transform(X, lab)', 'The leaky way again: selection on all rows, outside the loop.'],
        ['make_pipeline(...) then cross_val_score(pipe, X, lab)', 'The safe way: selection refitted inside every fold.'],
        ['f"{name}: leaky {leaky:.2f}"', 'An f-string. <code>{leaky:.2f}</code> prints the number with 2 decimals.']],
      tip: 'Read the second line. With no real link between X and y, the right answer is about 0.5. The pipeline gives 0.44 (noise). The leaky way gives 0.80, which no honest procedure can do. That gap is how you catch a leak in your own code.'
    },
    {
      title: 'Fit the scaler on the training rows, then check the fingerprint',
      py: `import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

rng = np.random.RandomState(0)
X = rng.normal(loc=50, scale=10, size=(200, 3))          # three features centred near 50
X_train, X_test = train_test_split(X, test_size=0.25, random_state=0)
off = lambda Z: round(float(np.abs(Z.mean(axis=0)).max()), 2)   # largest distance of a column mean from 0
sc = StandardScaler().fit(X_train)                       # learn mean and spread from TRAIN rows only
print("train after scaling:", off(sc.transform(X_train)))
print("test after scaling: ", off(sc.transform(X_test)))
print("test, scaler fitted on test:", off(StandardScaler().fit_transform(X_test)))`,
      out: 'train after scaling: 0.0\ntest after scaling:  0.32\ntest, scaler fitted on test: 0.0',
      walk: [
        ['train_test_split(X, test_size=0.25, random_state=0)', 'Splits the rows into 150 for training and 50 for testing. <code>random_state</code> fixes the shuffle so you get the same split every time.'],
        ['StandardScaler().fit(X_train)', 'Learns each column\'s mean and standard deviation from the <b>training</b> rows and stores them inside <code>sc</code>. It does not change any data yet.'],
        ['sc.transform(X_test)', 'Applies the <i>training</i> mean and spread to the test rows. Their means are not exactly 0, and that is correct: the test rows are new.'],
        ['StandardScaler().fit_transform(X_test)', 'Learns from the test rows and applies at once. The column means become exactly 0, which is the fingerprint of a scaler that looked at the test data.'],
        ['off = lambda Z: ...', 'A one-line helper: the largest absolute column mean after scaling.']],
      tip: 'A test set whose scaled column means are exactly 0 means the scaler saw it. In a Pipeline this cannot happen, because the pipeline calls <code>fit</code> on training rows and only <code>transform</code> on test rows.'
    }],
  check: [
    { q: 'A student runs <code>X_scaled = StandardScaler().fit_transform(X)</code> on all rows and then <code>cross_val_score(SVC(), X_scaled, y, cv=5)</code>. What is wrong?', options: ['Nothing: the scaler never sees y', 'The scaler\'s mean and spread were computed using rows that later act as test folds', 'SVC cannot be cross-validated', 'cv=5 is too small to be safe'], answer: 1, why: 'The scaler does not use y, but it does use the values of every row, including the future test rows. The leak is usually small for a scaler, yet the safe habit costs nothing: <code>make_pipeline(StandardScaler(), SVC())</code>.' },
    { q: 'A coin-flip column agrees with 10 coin-flip labels on 8 or more rows with probability 56/1024 = 0.055. How likely is it that at least one of 50 such columns does?', options: ['About 5%', 'About 28%', 'About 94%', 'About 100%'], answer: 2, why: 'All 50 columns miss with probability (1 − 0.055)<sup>50</sup> = 0.945<sup>50</sup> ≈ 0.06. So at least one hits with probability ≈ 0.94. With many columns, a "good" column is almost guaranteed by luck.' },
    { q: 'In the simulation you reduce <i>Rows, n</i> from 200 to 50 and keep p = 5,000 and k = 20. What happens to the wrong-way mean?', options: ['It falls towards 50%', 'It stays at about 81%', 'It rises to about 97%', 'It becomes the same as the right way'], answer: 2, why: 'Chance correlations shrink like 1/√n, so with fewer rows noise columns match the labels more strongly, and the selector finds better "matches". The right way stays near 50%.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why selecting features before cross-validation inflates the score, and what you do instead.', model: 'If the selector sees the labels of all rows, the rows we later call "test" have already helped choose the columns, so the columns match them by construction, even when the data is pure noise. Instead, put the selector and the model in one Pipeline and cross-validate it, so the columns are chosen again from the training rows of every fold.' },
  cheat: 'Every step that learns from data (selector, scaler, PCA, imputer) must be fitted on the training rows of each fold only: put all steps and the model in one Pipeline and pass it to cross_val_score. Leak signs: a great score on wide or noisy data, or a score far above chance after shuffling y. On 200 coin-flip rows with 5,000 noise columns: select first 81%, pipeline 50%.'
};
