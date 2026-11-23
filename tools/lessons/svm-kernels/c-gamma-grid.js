// Lesson for svm-kernels/c-gamma-grid: tune C and gamma together on a log grid, scored on held-out points.
module.exports = {
  idea: `An RBF SVM has two dials. γ sets how far each point's influence reaches. C sets how hard the model insists on fitting every training point. Score a log grid of (C, γ) pairs on held-out data and choose from the good region.`,
  why: `Too small a γ or C gives a boundary that is too smooth: 77% on held-out points in the starting data. Too large a γ memorises: 100% on the training points but only 57% on new ones. The best pairs sit in a band. Judging by training accuracy would pick a bad cell. A grid finds the band.`,
  analogy: `Preparing for an exam. γ is how narrowly you study: only the exact past questions (huge γ) or whole chapters (small γ). C is how strictly you demand every practice question right. Studying only past papers and demanding 100% gives a perfect practice score and a poor real exam. You find a good mix with a mock exam of questions you did not practise on. The grid tries many mixes and marks each on that mock exam.`,
  vocab: [
    [`γ (gamma)`, `The reach of one point. Bump width is <span class="eq">σ = 1/√(2γ)</span>. Large γ means narrow bumps and a boundary that can wrap around single points.`],
    [`C`, `The cap on each support vector's weight, and so the price of a mistake. Small C tolerates many errors. Large C fights for every training point.`],
    [`Grid search`, `Train one model for every (C, γ) pair on a grid and score each one. Here 6 × 6 = 36 models.`],
    [`Log scale`, `Steps of ×10 (0.01, 0.1, 1, 10, 100, 1000) instead of steps of +1. C and γ act by multiplying, so equal ratios matter, not equal differences.`],
    [`Held-out accuracy`, `Accuracy on points the model never trained on. The honest measure of how it will do on new data.`],
    [`Underfit and overfit`, `Underfit: too smooth, training and held-out accuracy both low. Overfit: memorising, training accuracy high and held-out accuracy much lower.`],
    [`γ = "scale"`, `scikit-learn's default: <span class="eq">1 / (n_features × Var(X))</span>, where Var(X) is the variance over every entry of the training data.`],
    [`Cross-validation`, `Split the training data into 5 parts, train on 4 and score on the 5th, rotate, and average. It scores a cell without touching the test set.`]],
  steps: [
    { h: `Two dials, two jobs`, p: `γ sets the width of every bump: σ = 1/√(2γ). A small γ gives wide, overlapping bumps and a smooth, almost straight boundary. A large γ gives narrow bumps that can wrap around single points. C caps how tall a bump can get, which is the price of a mistake. A small C allows many mistakes. A large C fights for every training point.` },
    { h: `Why a grid on a log scale`, p: `No formula says which (C, γ) is best for your data, so you try pairs. Both dials act by multiplying, so useful steps are factors of 10 (0.01, 0.1, 1, 10, 100, 1000), not additions. Six values each give 6 × 6 = 36 cells, and every cell is a full SVM trained from scratch.` },
    { h: `Score each cell on points it did not train on`, p: `Training accuracy only measures memory. The right-hand column of the grid has 100% training accuracy in every row, and about 57% on held-out points. So each cell is scored on 150 held-out points that the SVM never saw. Pick the cell by that number.` },
    { h: `The corners tell the story`, p: `Bottom-left (C = 0.01, γ = 0.01): too smooth and too cheap, 79% on training and 77% held-out. That is underfit. Right-hand column (γ = 1000): each point gets its own island, every point is a support vector, 100% training and about 57% held-out. That is overfit. The good cells lie between.` },
    { h: `The good cells form a band, not a point`, p: `At γ = 10 any C up to 10 gives 89%. At γ = 1 you need C = 10 for 91%. At γ = 0.1 you need C = 1000 to reach 89%. Each tenfold fall in γ needs C to rise 100 to 1000 times. A small γ makes the model stiff, and a big C pushes it to bend anyway. The best cells run along a diagonal.` },
    { h: `Where to start: γ = "scale"`, p: `scikit-learn's default is 1 / (n_features × Var(X)). For these moons it is 0.86, almost exactly the γ = 1 column, which is a good column. So "scale" is a sensible centre for the search: keep γ within a factor of 100 of it on each side, and tune C on a log grid.` },
    { h: `Read near-ties honestly`, p: `One test point is 1/150, about 0.7 percentage points. The standard error of an accuracy p measured on n points is √(p(1 − p)/n): for 90.7% on 150 points it is 2.4 points. Cells within that distance of the best are statistically tied (9 of the 36 here). Choose the simplest of them, not the single highest number.` },
    { h: `The honest procedure`, p: `This page scores every cell on one held-out set and then picks the best by looking at those same scores, so its 91% is slightly optimistic. In your own work choose (C, γ) by 5-fold cross-validation on the training data only (36 cells × 5 folds = 180 fits), refit once, and use the test set a single time at the end.` }],
  example: {
    title: `reading the grid: five cells and one decision`,
    setup: `Moons with noise 0.25, the starting data: 150 training points and 150 held-out points. Five cells of the grid, with the number of correct predictions out of 150.`,
    table: { head: [`Cell (C, γ)`, `Train correct`, `Test correct`, `Test accuracy`, `Gap (train − test)`, `Support vectors`, `Reading`], rows: [
      [`(0.01, 0.01)`, `118`, `115`, `76.7%`, `2.0 points`, `150`, `underfit: too smooth, too cheap`],
      [`(1000, 0.1)`, `140`, `133`, `88.7%`, `4.7 points`, `38`, `good: on the band`],
      [`(10, 1)`, `140`, `136`, `90.7%`, `2.7 points`, `35`, `the best cell`],
      [`(10, 100)`, `149`, `128`, `85.3%`, `14.0 points`, `144`, `starting to memorise`],
      [`(10, 1000)`, `150`, `86`, `57.3%`, `42.7 points`, `150`, `memorised`]] },
    walk: [
      `Accuracy is correct ÷ 150. The best cell, (C = 10, γ = 1), gets 136 of 150 held-out points right: 136 / 150 = 0.9067, or <b>90.7%</b>. On the training points it gets 140 / 150 = 93.3%.`,
      `Gap = training accuracy − test accuracy. For the best cell, 93.3 − 90.7 = 2.7 points: small. For (10, 1000), 100 − 57.3 = <b>42.7 points</b>: the model memorised. A gap above about 10 points is the warning sign.`,
      `One test point is worth 1/150 = 0.67 points. The standard error of the best cell's accuracy is √(0.907 × 0.093 / 150) = √0.000564 = 0.0237, about <b>2.4 points</b>.`,
      `The cell (1000, 0.1) gets 133 of 150 = 88.7%, which is 2.0 points below the best. That is less than one standard error, so the two cells are tied. So are 7 others: 9 of the 36 cells lie within 2.4 points of the best.`,
      `Among tied cells prefer the simpler model. (10, 1) uses 35 support vectors and (1000, 0.1) uses 38. A model with fewer support vectors is cheaper to store and to evaluate.`,
      `Cost of the search: 36 cells × 5 folds = 180 fits, plus one final fit. That is why you search a coarse log grid first and refine around the best region afterwards.`],
    result: `The best cell (C = 10, γ = 1) gets 136/150 = 90.7%, give or take 2.4 points. Nine cells are statistically tied and they form the diagonal band. The five cells show the pattern: too smooth (77%), good (89 to 91%), starting to memorise (85%) and memorised (57%).` },
  read: [
    [`Colour and number of a cell`, `Brighter means a higher value of the chosen metric. The number is that value in percent.`],
    [`Horizontal axis: γ (log scale)`, `Each column is ten times the one before it, from 0.01 on the left to 1000 on the right.`],
    [`Vertical axis: C (log scale)`, `Each row is ten times the one below it: C = 0.01 at the bottom, 1000 at the top.`],
    [`Dashed vertical line: γ = “scale”`, `scikit-learn's default γ for this data. It falls between columns when its value is not a power of 10.`],
    [`Thick dark frame`, `The selected cell. Click any cell to select it. At the start the best cell is selected.`],
    [`Grid shows: Test accuracy, Training accuracy, SV share`, `Accuracy on the 150 held-out points, accuracy on the 150 training points, or support vectors divided by 150.`],
    [`Bottom plot: Decision boundary of the selected cell`, `The tint is the predicted class. The solid line is f = 0 and the dashed lines are f = ±1. The dots are the 150 training points.`],
    [`Readout: C, γ`, `The values of the selected cell.`],
    [`Readouts: Training accuracy and Test accuracy`, `The two accuracies of the selected cell. Test turns green when the cell ties the best on the grid.`],
    [`Readout: Support vectors`, `Out of 150. A value of 150 means every training point is a support vector.`],
    [`Readout: Best cell on the grid (picked by test score)`, `The cell with the highest test accuracy. Ties go to the smaller C, then the smaller γ. Because the same scores pick it and report it, its test accuracy is a little optimistic; the page says so under the readouts.`],
    [`Readout: γ = “scale” for this data`, `1 / (2 × Var(X)) for the 150 training points (two features).`]],
  experiments: [
    { do: `Look at the cell selected at the start (C = 10, γ = 1, the best one). Then click a cell in the right-hand column, such as C = 10, γ = 1000.`, see: `The first boundary is a smooth curve through the gap between the moons (35 support vectors, training 93%, test 91%). The second is a scatter of tiny islands around single points (150 of 150 support vectors, training 100%, test 57%).`, why: `At γ = 1000 the bump width is σ = 0.022, far smaller than the distance between points. Each point gets its own island and the rest of the plane is decided by the offset b.` },
    { do: `Set <i>Grid shows</i> to <i>Training accuracy</i>.`, see: `The whole γ = 1000 column shows 100% and the γ = 100 column shows 98 to 100%. The best test cell shows only 93%, and the bottom-left corner stays at 79%.`, why: `Training accuracy rewards memory. The cell that fits the training points best is not the one that predicts new points best. Choosing by training accuracy would pick a memorising cell.` },
    { do: `Set <i>Grid shows</i> to <i>SV share</i>.`, see: `The bottom row (C = 0.01) and the right-hand column are 100%. The lowest values, 21% to 25%, are in the γ = 1 column (C = 10 to 1000) and at C = 1000, γ = 0.1.`, why: `With a tiny C every point must keep some weight, so all become support vectors. With a huge γ every point stands alone. In between only the points near the boundary matter, which is a sign of a comfortable fit.` },
    { do: `On the starting data (before pressing <i>New data</i>) move <i>Noise</i> to 0.05, then 0.25, 0.35 and 0.5, and count the cells that show 90 or more with <i>Test accuracy</i>.`, see: `24 of 36 cells reach 90% at noise 0.05, 3 at 0.25, and none at 0.35 or 0.5. The best cell falls from 100% to 91%, 83% and 75%.`, why: `Noise makes the two moons overlap, so even the ideal model makes mistakes. The ceiling drops, and fewer cells get close to 90%.` },
    { do: `Starting from the initial data (noise 0.25, Moons), press <i>New data</i> five times, noting the best cell each time.`, see: `The best cell always has γ = 1 or 10, but its C is 0.01, 1000, 10, 100 and 1 on the five new samples. The best test accuracy runs from 94% to 97%.`, why: `The best cell is the maximum of 36 noisy numbers measured on 150 points, each uncertain by about 2 points, so the exact winner is partly luck. The stable thing is the region, not the cell.` },
    { do: `Switch <i>Shape</i> to <i>Rings</i>.`, see: `γ = “scale” is 1.53 here and the nearest column is γ = 1, which scores 95 to 98% in every row. The best cell is C = 100, γ = 0.1 at 99%.`, why: `When the scale line sits on a column that is already good, you can start there and mostly tune C. On the moons the same column ranges from 81% at C = 0.01 to 91% at C = 10, so C mattered more there.` }],
  remember: [
    { tag: `Picture`, text: `A map of 36 cells. Bottom-left is too smooth, the right-hand column is memorised, and a diagonal ridge of good cells runs between them.` },
    { tag: `Rule of thumb`, text: `Smaller γ needs larger C: here γ ÷ 10 needed C × 100 or more. Search along the diagonal, not across it.` },
    { tag: `Formula in words`, text: `γ sets bump width σ = 1/√(2γ). C caps bump height. Width and height together set how flexible the boundary is.` },
    { tag: `Sanity check`, text: `Always read train minus test. A gap above about 10 points means memorising (γ or C too big). Both low and close together means too smooth.` },
    { tag: `Trick`, text: `Start with γ = "scale" and C = 1. Search C over 0.01 … 1000 and γ over scale/100 … scale × 100, then refine around the best region.` },
    { tag: `Rule of thumb`, text: `A difference smaller than √(p(1 − p)/n) is noise: 2.4 points when 150 test points give about 90%.` },
    { tag: `Link to code`, text: `<code>GridSearchCV(SVC(), {"C": [...], "gamma": [...]}, cv=5)</code> runs the whole grid. <code>cv_results_["mean_test_score"].reshape(6, 6)</code> gives the table in the same layout as this page.` }],
  mistakes: [
    { wrong: `"The best cell is the one with the highest training accuracy."`, right: `Training accuracy is 100% in the whole γ = 1000 column, where held-out accuracy is about 57%. Choose by held-out data.` },
    { wrong: `"C and γ do the same job, so I only need to tune one."`, right: `γ sets the width and C the height. At γ = 0.01 even C = 1000 reaches only 81%. At γ = 1, C moves the score from 81% to 91%. They interact, so tune them together.` },
    { wrong: `"The cell with the highest number is the true best setting."`, right: `On 150 test points the standard error is 2.4 points, and nine cells are within it. Choose the middle of the plateau, or the simplest tied cell.` },
    { wrong: `"It is fine to pick the cell by the test score."`, right: `This page does it for teaching. In real work use cross-validation on the training data and look at the test set once, or the reported accuracy will be a little too good.` }],
  code: [
    {
      title: `Run a log grid with cross-validation`,
      py: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import GridSearchCV, train_test_split
from sklearn.svm import SVC

X, y = make_moons(n_samples=300, noise=0.25, random_state=12)
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.5, stratify=y, random_state=0)

powers = [10.0**k for k in range(-2, 4)]                  # 0.01, 0.1, ..., 1000: a log grid
grid = GridSearchCV(SVC(kernel="rbf"), {"C": powers, "gamma": powers}, cv=5).fit(Xtr, ytr)
table = grid.cv_results_["mean_test_score"].reshape(6, 6)  # rows follow C, columns follow gamma
print((100 * table).round().astype(int))
print("best:", grid.best_params_, " CV:", round(grid.best_score_, 3), " test:", round(grid.score(Xte, yte), 3))`,
      out: `[[77 78 87 90 79 53]
 [77 79 91 90 79 53]
 [79 85 93 93 78 55]
 [85 90 90 89 79 55]
 [85 88 89 85 79 54]
 [87 91 90 83 77 54]]
best: {'C': 1.0, 'gamma': 10.0}  CV: 0.927  test: 0.953`,
      walk: [
        [`test_size=0.5, stratify=y`, `Half the points for training, half held back. <code>stratify=y</code> keeps the share of each class equal in both halves.`],
        [`[10.0**k for k in range(-2, 4)]`, `A list comprehension: for k = −2, −1, 0, 1, 2, 3 it builds 10<sup>k</sup>, giving 0.01 … 1000. <code>**</code> is "to the power of".`],
        [`GridSearchCV(SVC(kernel="rbf"), {"C": powers, "gamma": powers}, cv=5)`, `Tries all 36 pairs. Each one is scored by 5-fold cross-validation on the training half only, so the held-out half stays untouched.`],
        [`.cv_results_["mean_test_score"].reshape(6, 6)`, `The mean CV accuracy of each cell as a flat list of 36 numbers, which <code>reshape(6, 6)</code> folds into rows (C, first parameter in alphabetical order) and columns (gamma).`],
        [`grid.score(Xte, yte)`, `After the search, the grid refits the best cell on the whole training half. This one call is the single look at the test half.`]],
      tip: `Compare with the widget: the same diagonal ridge, and an almost-chance column (53 to 55%) at γ = 1000.`
    },
    {
      title: `Where does gamma = "scale" land?`,
      py: `import numpy as np
from sklearn.datasets import make_moons
from sklearn.model_selection import cross_val_score
from sklearn.svm import SVC

X, y = make_moons(n_samples=300, noise=0.25, random_state=12)
g = 1 / (X.shape[1] * X.var())                   # 1 / (features x variance of every entry of X)
print("gamma 'scale' =", round(g, 3))
same = np.allclose(SVC(gamma="scale").fit(X, y).decision_function(X), SVC(gamma=g).fit(X, y).decision_function(X))
print("same model as gamma='scale':", same)
for name, gamma in [("scale", "scale"), ("scale / 100", g / 100), ("scale x 100", g * 100)]:
    print(f"{name:<12} CV = {cross_val_score(SVC(C=1, gamma=gamma), X, y, cv=5).mean():.3f}")`,
      out: `gamma 'scale' = 0.918
same model as gamma='scale': True
scale        CV = 0.933
scale / 100  CV = 0.817
scale x 100  CV = 0.887`,
      walk: [
        [`X.shape[1] * X.var()`, `<code>X.shape[1]</code> is the number of features (2). <code>X.var()</code> is the variance of all entries together, not per column. Their product is what gets inverted.`],
        [`np.allclose(a, b)`, `True when two arrays agree to within rounding. Here it proves that <code>gamma="scale"</code> is exactly this formula.`],
        [`gamma=g / 100`, `A γ one hundred times smaller: bumps ten times wider, boundary almost straight.`],
        [`cross_val_score(..., cv=5).mean()`, `Trains 5 times, each time scoring on the fifth that was held out, and averages the 5 accuracies.`]],
      tip: `The default is already near the best of the three. A range of ×100 on each side is the usual width for a first grid.`
    }],
  check: [
    { q: `A cell shows 100% training accuracy, 57% held-out accuracy and 150 of 150 support vectors. What does it tell you?`, options: [`γ is far too large: the model memorised the training points`, `C is far too small: the model is too smooth`, `No kernel could separate these data`, `The held-out set is too small to say anything`], answer: 0, why: `Training near 100% with held-out near chance and every point a support vector is the memorising pattern: each point has its own tiny island (σ is much smaller than the point spacing).` },
    { q: `The best cell gets 136 of 150 held-out points right. A neighbouring cell gets 133. Is the best cell really better? (The standard error of 90.7% on 150 points is about 2.4 points.)`, options: [`No: the gap is 2.0 points, which is less than one standard error`, `Yes: any higher count means a better model`, `Yes: 3 more correct out of 150 is a big difference`, `No: because both are above 85%`], answer: 0, why: `The difference is 3 points out of 150, that is 3/150 = 2.0 percentage points. One standard error is 2.4 points, so the gap is within noise. Prefer the simpler of the two.` },
    { q: `You pick the cell with the highest <i>training</i> accuracy instead of the highest test accuracy. What held-out accuracy do you get?`, options: [`Between 56% and 85%: the cells with 100% training accuracy are in the γ = 100 and γ = 1000 columns`, `About 91%, the same as the best cell`, `Above 95%, since training accuracy is a stricter test`, `About 77%, the underfit corner`], answer: 0, why: `Only cells with large γ reach 100% training accuracy: C = 100 or 1000 at γ = 100 (85% held-out) and every cell at γ = 1000 (56 to 57%). The underfit corner has the lowest training accuracy, so it would never be chosen.` }],
  teachback: { prompt: `In two sentences, explain to a friend what γ and C each control in an RBF SVM and why you tune them on a log grid scored on held-out data.`, model: `γ sets how far each point's influence reaches (large γ means narrow bumps that can memorise single points) and C caps how much the model will pay for mistakes; they trade off, so the good settings form a diagonal band. You search powers of ten because both act by multiplying, and you score each pair on points it never trained on, because training accuracy reaches 100% for a memorising model.` },
  cheat: `Tune C and γ together on log grids (0.01 … 1000), scoring each cell on held-out data or by cross-validation, never on training accuracy. γ sets bump width σ = 1/√(2γ), C caps bump height. Good cells form a diagonal: smaller γ needs larger C. Start from γ = "scale" = 1/(n_features·Var(X)). Differences under one standard error are noise.`
};
