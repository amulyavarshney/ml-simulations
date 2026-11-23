// Lesson for svm-kernels/playground: read decision boundaries and diagnose under- and over-fitting.
module.exports = {
  idea: `The kernel decides which boundary shapes are possible, and C and γ decide how flexible the boundary is. Comparing training accuracy with cross-validated accuracy tells you whether it is too stiff (underfit) or too wiggly (overfit).`,
  why: `A boundary that looks right on the points you trained on can be wrong on new ones. On the moons, γ = 1000 gets 100% on the training points and 53% on held-out points: no better than a coin. Reading the picture and two accuracies catches this before the model is used.`,
  analogy: `A cartographer draws the border between two kingdoms. With a ruler (linear kernel) the border is a straight line. With a French curve (polynomial) it bends smoothly. With a freehand pen (RBF) it can follow anything, even a small circle round every village (overfit). A ruler through a winding coast is underfit. To judge a border, check it against villages the cartographer never surveyed: that is cross-validation.`,
  vocab: [
    [`Decision boundary`, `Where the score f(x) = 0. Points on one side are predicted class A, points on the other side class B.`],
    [`Underfit`, `The boundary is too stiff for the data. Training and cross-validated accuracy are both low and close together, and a more flexible setting does better.`],
    [`Overfit`, `The boundary chases individual points. Training accuracy is high and cross-validated accuracy is much lower.`],
    [`CV accuracy`, `Split the points into 5 groups. Train on 4, score on the 5th, repeat five times and average. An estimate of accuracy on new points.`],
    [`Gap`, `Training accuracy minus CV accuracy. A gap of 10 points or more is the overfitting warning.`],
    [`Polynomial kernel`, `<span class="eq">(γ·x·z + r)<sup>d</sup></span>. Degree d is how bendy the boundary can be. Offset r keeps the lower-order terms. With r = 0 only the degree-d terms remain.`],
    [`Vote`, `<span class="eq">α·y·K(support vector, probe)</span>: one support vector's contribution to the score at a spot. The score is the sum of the votes plus b.`],
    [`Support-vector share`, `Support vectors divided by the number of points. It is high when γ is far too small or far too large.`]],
  steps: [
    { h: `The kernel chooses the family of shapes`, p: `The boundary is where <span class="eq">f(x) = Σ αᵢyᵢK(xᵢ, x) + b</span> equals 0. The kernel K decides which shapes are possible. Linear: a straight line. Polynomial: smooth curves up to degree d. RBF: any shape built from local bumps. A shape that cannot match the data stays wrong whatever C you choose.` },
    { h: `What C and γ do`, p: `C is the price of a mistake. A small C accepts mistakes for a smoother boundary. A large C bends the boundary to catch every training point. γ is the reach of each point (it also scales the polynomial kernel). A small γ gives a smooth, global boundary. A large γ gives local islands. Start from γ = "scale" and C = 1, then turn one dial at a time.` },
    { h: `Reading the picture`, p: `The tint shows the predicted class everywhere. The solid line is f = 0. The dashed lines are f = ±1, the street. Rings mark support vectors, the points that touch or break the street. A smooth boundary with a clear street and few rings is a calm fit. Islands, wiggles and rings on nearly every point are a nervous one.` },
    { h: `Two accuracies and the gap`, p: `Training accuracy asks how well the model recalls points it saw. 5-fold CV asks how it does on points it did not see. The gap between them is your overfitting meter. With 80 points one point is 1.25 percentage points, so a gap or a difference of one or two points is noise.` },
    { h: `Underfit looks like this`, p: `Training and CV are both low and close together, and the boundary is too stiff for the shape: a line through moons or rings. A more flexible setting does noticeably better. On the moons a linear kernel scores 88% and 89%, while RBF with γ = 1 scores 100% and 100%. Low is only "underfit" if something else does better.` },
    { h: `Overfit looks like this`, p: `Training accuracy is high, often 100%, and CV is far lower: a gap of 10 points or more. The boundary breaks into islands round single points and nearly every point is a support vector. On the moons, γ = 1000 gives training 100%, CV 53% and 80 of 80 support vectors. A very large C can overfit too.` },
    { h: `Neither: the noise ceiling`, p: `On the Overlap data the classes really do overlap. CV peaks at about 81% (RBF with C = 10, or a degree-2 polynomial) and no setting does much better. Pushing flexibility further only raises training accuracy: C = 1000 gives 90% on training and 65% in CV. When nothing lifts CV, you have hit the limit of the data, so stop and keep the simplest model.` },
    { h: `A routine for diagnosing`, p: `Set γ = "scale", C = 1. Read training and CV. If both are low, add flexibility (a bendier kernel, a larger γ or C). If the gap is 10 points or more, remove flexibility (a smaller γ or C). Move dials by factors of 10, one at a time. Use the probe to see who votes in an empty spot: if the offset b decides there, γ is too large.` }],
  example: {
    title: `diagnosing six settings on the moons`,
    setup: `Start from: Two moons, first sample (before pressing New sample): 80 points, 40 per class. RBF with C = 1 in the five RBF rows. Training accuracy, 5-fold CV and the support-vector count are read off the Readouts panel.`,
    table: { head: [`Setting`, `Training`, `5-fold CV`, `Gap`, `Support vectors`, `Diagnosis`], rows: [
      [`Linear`, `88%`, `89%`, `−1`, `25 of 80`, `underfit: a line on curved data`],
      [`RBF, γ = 0.01`, `85%`, `85%`, `0`, `46 of 80`, `underfit: bumps wider than the picture`],
      [`RBF, γ = “scale” (0.22)`, `96%`, `95%`, `+1`, `27 of 80`, `decent; can improve`],
      [`RBF, γ = 1`, `100%`, `100%`, `0`, `27 of 80`, `good fit`],
      [`RBF, γ = 100`, `100%`, `63%`, `+37`, `80 of 80`, `overfit: memorises`],
      [`RBF, γ = 1000`, `100%`, `53%`, `+47`, `80 of 80`, `overfit: chance on new points`]] },
    walk: [
      `Compute the gap, training minus CV, for each row: −1, 0, +1, 0, +37, +47. Only the last two rows exceed 10 points.`,
      `A small gap does not mean a good model. The first two rows also have gaps near 0 but low scores. Look at the level too: another setting (γ = 1) reaches 100%, so 88% and 85% are not a ceiling. Those rows are underfit. If nothing had passed 89%, you could not call 88% underfit.`,
      `Support-vector share is SVs ÷ 80: 31%, 58%, 34%, 34%, 100%, 100%. It is high at both extremes of γ (too wide: many points break the street; too narrow: every point stands alone) and about a third in the good rows.`,
      `One CV point is worth 1/80 = 1.25 points. A difference of 100% against 98% is one or two points, which is noise. (RBF with γ = 10 gives about 100% and 98% with about 70 supports: the count jumping from 27 to about 70 is the real sign that it is tipping towards memorising.)`,
      `γ = "scale" is 1 / (n_features × Var(X)) where Var(X) is the variance over every entry. Hand example: points (0,0), (2,0), (0,2), (2,2). The eight entries 0,0,2,0,0,2,2,2 have mean 1 and variance 1, so scale = 1 / (2 × 1) = 0.5. For the moons it is 0.2214, a factor of 4.5 below the best γ here.`,
      `Verdict by rule: gap of 10 points or more means overfit. Both well below the best CV you can find means underfit. The highest CV with a small gap is the fit to keep.`],
    result: `Keep RBF with γ around 1 (100% and 100%, 27 supports). Linear and γ = 0.01 are underfit. γ = 100 and 1000 are overfit: gaps of 37 and 47 points and every point a support vector. The default γ = "scale" is decent but a factor of 4.5 too small for these moons.` },
  read: [
    [`Blue circles and orange triangles`, `Class A and class B points. A click adds a point of the colour chosen under "Click on the plot to…", removes one, or places the probe. Dragging any point always moves it.`],
    [`Tinted regions`, `The predicted class at every spot: blue for class A, orange for class B. A darker tint means a larger |f|, so the model is surer.`],
    [`Solid black curve`, `The decision boundary, f = 0.`],
    [`Dashed blue and orange curves`, `The street edges f = −1 and f = +1. A wide street means a smooth fit.`],
    [`Black rings`, `The support vectors: the points that touch or break the street.`],
    [`Star and coloured circles (probe mode)`, `The star is the probe. A circle around a support vector shows its vote at the star: bigger means a bigger vote, blue for class A, orange for class B.`],
    [`Panel: Vote inspector`, `For a probe: the sum of the votes, the offset b, the score f and the class. For RBF also the effective voters and a warning when b outweighs the votes. Then a table of the six biggest votes.`],
    [`Readout: Support vectors`, `How many of the points are support vectors, out of all points.`],
    [`Readout: Training accuracy`, `The share of the plotted points the model classifies correctly.`],
    [`Readout: 5-fold cross-validated accuracy`, `The CV estimate, with fixed folds. It is recomputed when you release a dragged point or change a setting. While you drag, the old value stays, marked "(old: updates when you let go)".`],
    [`Readout: γ = “scale” would be`, `1 / (n_features × variance of all entries) for the current points. The button γ = “scale” copies it into the γ slider.`],
    [`Controls: Kernel, C, γ, Degree, Offset r`, `C and γ are log sliders: equal slider distances are equal ratios. γ is hidden for Linear. Degree and Offset r appear only for Polynomial. Choosing another Start from data set resets γ to "scale" for that data.`]],
  experiments: [
    { do: `Choose <i>Start from</i>: XOR (γ resets to “scale”, 0.351), then RBF. Read the three readouts, then switch to <i>Polynomial</i> (degree 3, r = 1) and to <i>Linear</i>.`, see: `RBF: 17 of 48 support vectors, training 100%, CV 98%. Polynomial: 8 supports, 100% and 98%. Linear: 38 supports, 65% and 65%.`, why: `XOR needs the product x₁x₂, which a straight line cannot make. Linear has a small gap and low scores: textbook underfit. The polynomial kernel contains the product and fits with only 8 supports.` },
    { do: `Choose <i>Two moons</i>, RBF, C = 1. Move γ to 0.01, then about 1, about 10 and 1000.`, see: `Support vectors: 46, about 27, about 70 and 80 of 80. CV: 85%, about 100%, about 98% and 53%. Training rises from 85% to 100%.`, why: `The support-vector count is high at both ends: very small γ makes bumps wider than the picture, so many points break the street. Very large γ makes every point its own island. The count is lowest where the fit is best.` },
    { do: `Set γ = 1000, choose <i>probe</i> under "Click on the plot to…", and click between the two moons.`, see: `The Vote inspector shows votes summing to about 0, b = 0.022, and "The offset outweighs the vote here: b decides." The empty plane is faintly orange because b is positive. At the default γ (“scale”) a click at the centre shows votes summing to about −0.3, ten times larger than b = 0.026.`, why: `At σ = 0.022 no support vector is close enough to speak, so every vote vanishes and the sign of b labels the whole empty plane.` },
    { do: `Choose <i>Overlapping groups</i> (γ resets to “scale”, 0.52), keep RBF, and move C from about 1 up to 1000.`, see: `Training accuracy rises from about 77% to 90% while 5-fold CV falls from about 79% to 65%. Support vectors fall from about 34 to 26 of 48.`, why: `A huge C punishes every training mistake so hard that the boundary twists round a few noisy points. Training improves, new-point accuracy gets worse. Note that the support-vector count went down while it overfitted, so judge by the gap, not by the count.` },
    { do: `Choose <i>Two moons</i> (first sample), <i>Polynomial</i>, set Degree to 2 and Offset r to 1, then slide r all the way to 0.`, see: `At r = 1: training 89%, CV 89%, 28 supports. At r = 0: training 51%, CV 48%, 78 supports. Setting Degree back to 3 with r = 0 recovers to 86% and 88%.`, why: `With r = 0 and degree 2 the score is an even function, f(−x) = f(x). The two moons are mirror images through their centre with the colours swapped, which needs the opposite sign. r > 0 adds odd terms. With r = 0 and degree 3 the score is odd, f(−x) = −f(x), which is exactly what swapped colours need.` },
    { do: `Choose <i>Two separated groups</i> (γ resets to “scale”) and compare the three kernels.`, see: `All three score 100% and 100%. Supports out of 28: Linear 4, Polynomial 3, RBF 8.`, why: `When the groups are well separated, extra flexibility buys nothing. Prefer the simplest model that reaches the best CV.` }],
  remember: [
    { tag: `Picture`, text: `Ruler, French curve, freehand pen: the kernel picks the tool. A pen that circles every village is overfit and a ruler through a coastline is underfit.` },
    { tag: `Sanity check`, text: `Training minus CV: below about 3 points is fine, 10 or more is overfit. Both low and equal means underfit, but only if something else scores higher. CV is the number to maximise.` },
    { tag: `Rule of thumb`, text: `Start at γ = "scale", C = 1. Move one dial at a time and by factors of 10, so each move is big enough to see.` },
    { tag: `Trick`, text: `Probe an empty spot between your classes. If the inspector says "b decides" there, γ is far too large: the model has no opinion in the gaps.` },
    { tag: `Rule of thumb`, text: `Support-vector share is high at both extremes of γ, and about a third in the good rows of the moons. But a large C can overfit with fewer supports, so use the gap, not the count.` },
    { tag: `Formula in words`, text: `γ_scale = 1 / (number of features × variance of all entries). Polynomial kernel: (γ·x·z + r) raised to d.` },
    { tag: `Link to code`, text: `<code>svm.score(X, y)</code> is training accuracy, <code>cross_val_score(svm, X, y, cv=5).mean()</code> is the CV readout and <code>svm.n_support_.sum()</code> is the support-vector count.` }],
  mistakes: [
    { wrong: `"A higher training accuracy means a better model."`, right: `On the moons γ = 1000 gets 100% training accuracy and 53% in CV. Training accuracy only measures recall.` },
    { wrong: `"More support vectors always means overfitting, and fewer is always better."`, right: `γ = 0.01 is underfit with 46 of 80 supports. A large C overfits the Overlap data with fewer supports (34 down to 26). Use the training-minus-CV gap.` },
    { wrong: `"RBF is always the best kernel."`, right: `On well-separated groups all three reach 100%, and the linear kernel needs only 4 supports against 8 for RBF. Choose by CV and prefer the simpler model when scores tie.` },
    { wrong: `"The offset r in the polynomial kernel is just a constant and does not matter."`, right: `On the moons with degree 2, CV is 89% for r = 1 and 48% for r = 0. It decides whether the lower-order terms exist at all.` },
    { wrong: `"The colour far away from the points tells you what the model learned."`, right: `Where no support vector is near, the tint comes from the offset b (RBF) or from the polynomial's growth. At γ = 1000 the empty plane is simply the sign of b.` }],
  code: [
    {
      title: `Training accuracy, CV accuracy and the gap`,
      py: `from sklearn.datasets import make_moons
from sklearn.model_selection import cross_val_score
from sklearn.svm import SVC

X, y = make_moons(n_samples=80, noise=0.2, random_state=3)
for gamma in (0.01, 1, 1000):
    svm = SVC(kernel="rbf", C=1, gamma=gamma)
    train = svm.fit(X, y).score(X, y)                       # accuracy on points the model has seen
    cv = cross_val_score(svm, X, y, cv=5).mean()            # accuracy on points held out in 5 folds
    print(f"gamma={gamma:<5} train={train:.2f}  cv={cv:.2f}  gap={train - cv:+.2f}  SVs={svm.n_support_.sum()}/80")`,
      out: `gamma=0.01  train=0.80  cv=0.79  gap=+0.01  SVs=74/80
gamma=1     train=0.94  cv=0.93  gap=+0.01  SVs=29/80
gamma=1000  train=1.00  cv=0.61  gap=+0.39  SVs=80/80`,
      walk: [
        [`make_moons(n_samples=80, noise=0.2, random_state=3)`, `Two interleaved half-circles with 40 points each. <code>noise</code> is the spread added to each coordinate; <code>random_state</code> fixes the sample so the numbers repeat.`],
        [`svm.fit(X, y).score(X, y)`, `<code>fit</code> returns the model, so <code>.score</code> can follow at once. Scoring on the same X, y gives <b>training</b> accuracy: recall, not prediction.`],
        [`cross_val_score(svm, X, y, cv=5).mean()`, `Clones the model, trains it on 4 folds and scores it on the 5th, five times. It returns five accuracies, and <code>.mean()</code> averages them. The model <code>svm</code> itself is not changed.`],
        [`svm.n_support_.sum()`, `<code>n_support_</code> counts support vectors per class (two numbers); <code>.sum()</code> gives the total.`],
        [`{train - cv:+.2f}`, `Formatting: <code>+.2f</code> shows two decimals and always prints the sign. This is the gap.`]],
      tip: `The numbers differ from the page because this sample is not the page's sample, but the pattern is the same: a gap of 0.39 at γ = 1000.`
    },
    {
      title: `Which kernel can draw the shape?`,
      py: `from sklearn.datasets import make_moons
from sklearn.model_selection import cross_val_score
from sklearn.svm import SVC

X, y = make_moons(n_samples=80, noise=0.2, random_state=3)
X = X - X.mean(axis=0)                                      # centre the moons, as the playground does
models = {"linear": SVC(kernel="linear"),
          "poly d=2 r=0": SVC(kernel="poly", degree=2, coef0=0, gamma="scale"),
          "poly d=3 r=1": SVC(kernel="poly", degree=3, coef0=1, gamma="scale"),
          "rbf": SVC(kernel="rbf", gamma="scale")}
for name, svm in models.items():
    print(f"{name:<13} train={svm.fit(X, y).score(X, y):.2f}  cv={cross_val_score(svm, X, y, cv=5).mean():.2f}")`,
      out: `linear        train=0.88  cv=0.88
poly d=2 r=0  train=0.51  cv=0.47
poly d=3 r=1  train=0.95  cv=0.94
rbf           train=0.94  cv=0.93`,
      walk: [
        [`X - X.mean(axis=0)`, `Subtracts the mean of each column, so the cloud is centred on (0, 0). Without this the degree-2, r = 0 kernel result would differ, because that kernel treats the origin as special.`],
        [`models = {"linear": SVC(...), ...}`, `A dictionary: name on the left, ready-made model on the right. It lets one loop try several kernels.`],
        [`coef0=0`, `This is the offset r of the page. <code>coef0=0</code> with <code>degree=2</code> keeps only degree-2 terms, an even function that cannot fit these moons.`],
        [`gamma="scale"`, `scikit-learn's default: 1 / (n_features × X.var()), the same as the page's button.`],
        [`models.items()`, `Gives each (name, model) pair in turn, so the loop variables <code>name</code> and <code>svm</code> take them one by one.`]],
      tip: `Poly with r = 0 sits at chance (0.51, 0.47) and r = 1 jumps to 0.94: one parameter, 47 points of CV accuracy.`
    },
    {
      title: `Far from the data the offset b decides`,
      py: `from sklearn.datasets import make_moons
from sklearn.svm import SVC

X, y = make_moons(n_samples=80, noise=0.2, random_state=3)
spot, far = [[0.5, 0.25]], [[8.0, 8.0]]                     # a gap between the moons, and a point far from all data
for gamma in (1, 1000):
    svm = SVC(kernel="rbf", C=1, gamma=gamma).fit(X, y)
    print(f"gamma={gamma:<5} b={svm.intercept_[0]:+.3f}  f(gap)={svm.decision_function(spot)[0]:+.3f}  f(far)={svm.decision_function(far)[0]:+.3f}")`,
      out: `gamma=1     b=-0.019  f(gap)=-0.033  f(far)=-0.019
gamma=1000  b=-0.028  f(gap)=-0.028  f(far)=-0.028`,
      walk: [
        [`spot, far = [[0.5, 0.25]], [[8.0, 8.0]]`, `Two query points, each a table with one row and two columns (hence the double brackets). The first lies between the moons, the second far outside.`],
        [`svm.intercept_[0]`, `The offset b.`],
        [`svm.decision_function(spot)[0]`, `The score f at the spot: the sum of the votes plus b. <code>[0]</code> takes the number out of the one-item result.`],
        [`f(far) = b`, `At γ = 1 the far point has f exactly equal to b because every K is 0 there. At γ = 1000 even the gap between the moons has f = b.`]],
      tip: `If f at a point equals b to three decimals, no support vector is voting there: the model is guessing.`
    }],
  check: [
    { q: `A model shows 80 of 80 support vectors, training accuracy 100% and 5-fold CV 55%. What is the problem, and which dial do you turn?`, options: [`Overfitting (memorising): lower γ, or lower C`, `Underfitting: raise γ`, `The data are noise-limited, so nothing can be done`, `Nothing: a perfect training score is the goal`], answer: 0, why: `A 45-point gap and every point a support vector is the memorising pattern. Lowering γ widens the bumps (and a lower C reduces how hard each mistake is punished), so the boundary stops circling single points.` },
    { q: `Four points (0, 0), (4, 0), (0, 4), (4, 4) are the whole data set. What is γ = "scale"?`, options: [`0.125`, `0.25`, `0.5`, `4`], answer: 0, why: `The eight entries are 0, 0, 4, 0, 0, 4, 4, 4: mean 2, and every entry is 2 away from the mean, so the variance is 4. γ = 1 / (2 features × 4) = 0.125. The value 0.25 forgets the number of features, and 4 is the variance itself.` },
    { q: `On the Overlap data with γ = "scale" you move C from 1 up to 1000. What do the readouts do?`, options: [`Training accuracy rises (about 77% to 90%) while CV falls (about 79% to 65%)`, `Both training and CV accuracy rise`, `Both fall`, `Nothing changes, because C only matters for the linear kernel`], answer: 0, why: `A very large C makes every training mistake very costly, so the boundary twists round noisy points. Recall improves and prediction gets worse: a growing gap is overfitting, even though the support-vector count falls.` }],
  teachback: { prompt: `In two sentences, explain to a friend how you tell from the page's readouts whether a kernel SVM is underfitting or overfitting.`, model: `Compare the training accuracy with the 5-fold cross-validated accuracy: if both are low and close together, and a more flexible setting does better, it is underfitting; if training is near 100% and CV is 10 or more points lower, it is overfitting. Boundaries made of small islands and nearly every point a support vector confirm overfitting, and you fix it by lowering γ or C.` },
  cheat: `The kernel sets the shape family: line, polynomial curve of degree d (use r > 0), or RBF local bumps (width from γ). Diagnose with training minus CV accuracy. Both low, and a better setting exists: underfit, add flexibility. Gap of 10 points or more: overfit, lower γ or C. Start at γ = "scale" = 1/(n_features·Var(X)) and C = 1, then turn one dial at a time.`
};
