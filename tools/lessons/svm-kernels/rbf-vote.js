// Lesson for svm-kernels/rbf-vote: the RBF score as a sum of bumps, one per support vector, plus an offset.
module.exports = {
  idea: `An RBF SVM scores a new point as a vote of its support vectors. Each one adds a bump of height α·y that fades with distance. The bumps and an offset b add up, and the sign of the total is the prediction.`,
  why: `The formula f(x) = Σ αᵢyᵢ K(xᵢ, x) + b looks abstract until you see it as bumps on a line. The picture explains what γ and C do, why only a few points matter at any spot, and why a huge γ goes wrong: far from every support vector nobody votes and b alone decides.`,
  analogy: `A village decides on loans by asking elders who each remember one past case: repaid or defaulted. Each elder lives at a fixed spot. Their voice carries only so far (that is γ: larger γ, shorter reach) and only so loudly (that is C, the cap on loudness). An applicant hears mostly the nearest elders. If nobody lives close enough, nobody is heard, and the village falls back on its standing habit: the offset b.`,
  vocab: [
    [`Bump`, `One support vector's vote as a function of position: <span class="eq">αᵢyᵢ · exp(−γ(z − zᵢ)²)</span>. Tallest at zᵢ, fading towards 0 on both sides.`],
    [`Support vector`, `A training point with α > 0. Only these points have a bump at all.`],
    [`α·y`, `The signed height of a bump: positive for failing readings (y = +1), negative for healthy ones (y = −1). Its size can never exceed C.`],
    [`Offset b`, `A constant added to the sum of the bumps. Wherever every bump is 0, the score equals b.`],
    [`Probe z*`, `The new reading you test. The page lists every support vector's vote at z*.`],
    [`Effective voters`, `<span class="eq">(ΣK)² / ΣK²</span>: how many support vectors really count at the probe. It is 1 when one voter dominates and k when all k count equally.`],
    [`Width σ`, `How far a bump reaches: <span class="eq">σ = 1/√(2γ)</span>. γ = 1 gives 0.71, γ = 100 gives 0.071, γ = 0.01 gives 7.1.`]],
  steps: [
    { h: `Write the score as a sum`, p: `After training, the RBF SVM scores a point z with <span class="eq">f(z) = Σᵢ αᵢyᵢ · K(zᵢ, z) + b</span>, summed over the support vectors only. Each term is one support vector's vote. The sign of f is the class: positive means failing (+1), negative means healthy (−1).` },
    { h: `The weight is a similarity`, p: `<span class="eq">K(zᵢ, z) = exp(−γ(z − zᵢ)²)</span> is 1 when z sits on the support vector and falls as z moves away. At γ = 1: distance 0.5 gives 0.78, distance 1 gives 0.37, distance 2 gives 0.018. A support vector shouts at its neighbours and whispers at strangers.` },
    { h: `One bump per support vector`, p: `Plot one vote against z and you get a bell-shaped bump centred on the support vector, with height <span class="eq">αᵢyᵢ</span>. Failing supports (y = +1) give bumps that point up. Healthy supports (y = −1) give bumps that point down. Each thin curve on the page is one bump.` },
    { h: `Add the bumps, add b`, p: `The thick curve is the sum of all bumps plus the offset b. Where up-bumps win it is above zero (failing). Where down-bumps win it is below zero (healthy). The decision boundary is where the thick curve crosses zero.` },
    { h: `Width is γ, height is C`, p: `Width: <span class="eq">σ = 1/√(2γ)</span>. Height: training chooses each αᵢ, but never above C. On these readings the largest height the SVM wants is 1.97, so every C above that gives the same model. C = 0.5 chops every bump to at most 0.5.` },
    { h: `Who votes at a probe`, p: `At a probe z*, only supports within about σ of it have a K worth counting. Effective voters, (ΣK)² / ΣK², counts them. With γ = 1 and z* = 1.0 it is 2.2 of 4. With γ = 100 it is 1.0 of 12: the single nearest reading is the whole vote.` },
    { h: `Far from everyone, the offset decides`, p: `Far from every support vector all K are near 0, so all votes are near 0 and the score is about b. At γ = 1, f(3) = 0.40 while b = 0.32: almost all of the score is b. Where the data give no vote, b answers for them.` },
    { h: `Not a nearest-neighbour vote`, p: `A nearest-neighbour vote divides by the total weight, so the weights add to 1 and even a distant point picks a winner. The SVM does not divide: its votes just fade. At a large γ every point is far from every other, the votes vanish, and b alone labels the gaps (at γ = 1000 b is about 0, so the score is about 0 and no class is named). That is how a huge γ memorises the readings and says little about new ones.` }],
  example: {
    title: `the vote at z* = 1.0, by hand`,
    setup: `The twelve readings with γ = 1 and C = 10. The SVM keeps four support vectors with α·y = +1.969 (failing, z = 1.2 and −1.25) and −1.969 (healthy, z = 0.5 and −0.55), and offset b = 0.3245 (the page shows 0.324). Test the reading z* = 1.0.`,
    table: { head: [`Support vector z`, `α·y`, `Distance² (1.0 − z)²`, `K = exp(−1 · distance²)`, `Vote α·y·K`], rows: [
      [`1.2`, `+1.969`, `0.04`, `0.9608`, `+1.8918`],
      [`0.5`, `−1.969`, `0.25`, `0.7788`, `−1.5335`],
      [`−0.55`, `−1.969`, `2.4025`, `0.0905`, `−0.1782`],
      [`−1.25`, `+1.969`, `5.0625`, `0.0063`, `+0.0125`],
      [`Sum of votes`, ``, ``, ``, `+0.1926`],
      [`Offset b`, ``, ``, ``, `+0.3245`],
      [`Score f(1.0)`, ``, ``, ``, `+0.5171 → failing`]] },
    walk: [
      `Distances from z* = 1.0 to the four supports: 0.2, 0.5, 1.55 and 2.25. Square them (third column): 0.04, 0.25, 2.4025, 5.0625.`,
      `K = exp(−γ·d²) with γ = 1: e^(−0.04) = 0.9608, e^(−0.25) = 0.7788, e^(−2.4025) = 0.0905, e^(−5.0625) = 0.0063. The two nearest supports have K near 1. The farthest has almost none.`,
      `Votes = α·y × K: +1.969 × 0.9608 = +1.8918, −1.969 × 0.7788 = −1.5335, −1.969 × 0.0905 = −0.1782, and +1.969 × 0.0063 = +0.0125 (a calculator with the unrounded K gives 0.0125).`,
      `Sum of votes: 1.8918 − 1.5335 − 0.1782 + 0.0125 = 0.1926. The two big votes nearly cancel: a failing support 0.2 to the right of the probe and a healthy one 0.5 to its left. Add the offset: f = 0.1926 + 0.3245 = <b>0.5171</b>. Positive, so failing.`,
      `Effective voters: ΣK = 1.8364 and ΣK² = 1.5378, so (1.8364)² / 1.5378 = <b>2.19</b>. About two of the four supports decide.`,
      `Check the model itself. A support vector on a street edge must score exactly +1. At z = 1.2: f = 1.969 × (1 − 0.6126 − 0.0468 + 0.0025) + 0.3245 = 1.969 × 0.3431 + 0.3245 ≈ 1.000. It works.`,
      `Now move the probe to z* = 3.0, beyond all the data. K is 0.0392 for the support at 1.2 and 0.0019 for the one at 0.5 (the others round to 0.0000). Votes: +0.0771 and −0.0038, sum 0.0733. f = 0.0733 + 0.3245 = 0.398, still failing, but 82% of that score is b.`],
    result: `f(1.0) = +0.517, failing, decided by the two supports within 0.5 of the probe (2.19 effective voters of 4). At z* = 3 the votes shrink to 0.073 and the offset 0.324 supplies most of f = 0.398. These are the same numbers as the widget's vote table and readouts.` },
  read: [
    [`Thick black curve`, `The score f(z): all bumps added, plus b. Above 0 means failing, below 0 means healthy.`],
    [`Thin orange curves`, `Bumps of failing support vectors (α·y > 0). They point up.`],
    [`Thin blue curves`, `Bumps of healthy support vectors (α·y < 0). They point down.`],
    [`Dotted grey line labelled b = …`, `The offset. The thick curve returns to this height wherever the bumps die out.`],
    [`Dark-blue dashed vertical line`, `The probe z*. Drag it or use the Probe slider.`],
    [`Dots on the probe line`, `Each support vector's vote at z*: a triangle for a positive vote, a circle for a negative one. The black diamond is the total score f(z*).`],
    [`Strip labelled data`, `The twelve readings (blue circles healthy, orange triangles failing) with black rings on the support vectors. Drag a reading sideways to move it.`],
    [`Table: Votes at the probe`, `One row per support vector, biggest vote first: α·y, K = exp(−γ(z* − z)²) and the vote α·y·K. Below them the sum of votes, b and the score f(z*).`],
    [`Readout: Support vectors`, `How many of the 12 readings have a bump.`],
    [`Readout: Score at probe, f(z*)`, `The total, and the class it implies. A score below 1e-9 in size reads "about 0: no class named".`],
    [`Readout: Effective voters at probe`, `(ΣK)² / ΣK² and the number of support vectors it is counted out of.`],
    [`Readout: Positions where |votes| < |b|`, `The share of the axis from −3 to 3 where the bumps add up to less than the offset, so b effectively decides. Flagged as a warning above 30%. It reads "n/a" when b is below 1e-9, because then the score is about 0 there, not decided by b.`]],
  experiments: [
    { do: `Leave the defaults (γ = 1, C = 10, probe 1.00) and read the table <i>Votes at the probe</i>.`, see: `Four rows: +1.89 (z = 1.2), −1.53 (0.5), −0.18 (−0.55) and +0.01 (−1.25). The votes sum to 0.19, b is 0.324 and f is 0.517, so failing. Effective voters: 2.2 of 4.`, why: `The two nearest supports (0.2 and 0.5 away) carry the vote and nearly cancel. The farther ones barely speak.` },
    { do: `Drag the probe line (or the slider) to the far right, to about z* = 3.`, see: `The votes shrink to +0.08 and −0.004 (the others are 0.000). f falls to about 0.40, close to b = 0.32, and effective voters drop to about 1.1.`, why: `K = exp(−γd²) dies quickly: at distance 1.8 from the support at 1.2 it is only 0.04. With no voters left, f approaches b.` },
    { do: `Raise γ to 100, then to 1000, keeping C = 10.`, see: `Support vectors rise to 12 of 12 and the bumps become thin spikes at every reading. Effective voters at the probe fall to 1.0 of 12, and b shrinks to about 0.012 at γ = 100 and 0.000 at γ = 1000. At γ = 1000 the score at the probe reads "about 0: no class named" and "Positions where…" reads n/a.`, why: `σ is 0.071 and 0.022, narrower than the 0.2 gaps between neighbouring readings. So every reading stands alone as a spike of height about 1, and between spikes the score is just b. At γ = 1000, b is about 0, so the gaps get no real information at all.` },
    { do: `Set γ back to 1. Lower C to about 0.5, then to 0.1, then raise it to 1000.`, see: `At C ≈ 0.5, 11 of 12 readings are support vectors and no bump is taller than 0.5. At C = 0.1 all 12 are supports with bumps 0.1 tall. From C = 2 up to 1000 the model is identical: the same 4 supports at ±1.97.`, why: `C caps the bump height. Once C is above the height the data actually need (1.97), the cap is never reached, so a larger C changes nothing.` },
    { do: `Set γ = 0.01 (the left end of the slider) with C = 10.`, see: `All 12 readings are support vectors. The thick curve is a shallow wave that never leaves about ±0.4, and four readings end up on the wrong side: the failing ones at −2, −1.55, −1.25 and 1.2.`, why: `σ is 7.1, wider than the whole axis. Bumps of height 10 (the cap) overlap and cancel, and their sum cannot make the dip-and-rise pattern. A bump that is too wide fails as surely as one that is too narrow.` }],
  remember: [
    { tag: `Picture`, text: `Elders at fixed houses, voices that fade with distance, and a village habit b when nobody is close enough to be heard.` },
    { tag: `Formula in words`, text: `Score = Σ (signed height × closeness) + b. Signed height is α·y (never above C in size). Closeness is exp(−γ × distance²).` },
    { tag: `Rule of thumb`, text: `Compare the width σ = 1/√(2γ) with the spacing of your data. σ much larger than the spacing: too smooth. σ much smaller: every point stands alone. Here readings are 0.2 or more apart, so γ = 1 (σ = 0.71) works and γ = 100 (σ = 0.07) memorises.` },
    { tag: `Sanity check`, text: `A support vector on a street edge must score exactly ±1. If your hand calculation does not give ±1 at a support vector (here f(1.2) = +1), you have an arithmetic slip or a wrong weight.` },
    { tag: `Trick`, text: `Effective voters tells you how local the vote is. On these readings at the probe 1.0 it is 12.0 at γ = 0.01, 2.2 at γ = 1 and 1.0 at γ = 100.` },
    { tag: `Link to code`, text: `<code>dual_coef_</code> holds α·y, <code>support_vectors_</code> the bump centres and <code>intercept_</code> the offset b. Rebuild the score by hand from them to check you have read them correctly.` }],
  mistakes: [
    { wrong: `"The RBF SVM is just a nearest-neighbour classifier."`, right: `Only roughly. A nearest-neighbour vote is normalised. The SVM votes are not: they fade, and where they all fade, b decides. At γ = 1000 the votes vanish and b is about 0, so the score in the gaps is about 0 and the page names no class.` },
    { wrong: `"Every training point votes."`, right: `Only support vectors do: 4 of 12 at γ = 1. At γ = 1000 all 12 are supports, but each one is audible only within about 0.02 of itself.` },
    { wrong: `"A bigger C always gives a different, stronger model."`, right: `C only caps the bump heights. On these readings any C from 2 to 1000 gives the same model, because the cap (1.97 needed) is never touched.` },
    { wrong: `"A larger γ fits better, because training accuracy rises."`, right: `γ = 100 and 1000 classify all 12 readings correctly, but only because each reading has its own spike. Between spikes the score is just b: 0.012 at γ = 100 and 0.000 at γ = 1000, which tells you nothing.` }],
  code: [
    {
      title: `Fit an RBF SVM and read its bumps`,
      py: `import numpy as np
from sklearn.svm import SVC

z = np.array([-0.55, -0.35, -0.15, 0.05, 0.25, 0.5, -2.0, -1.55, -1.25, 1.2, 1.6, 2.05])
y = np.array([-1] * 6 + [1] * 6)                       # -1 healthy, +1 failing
svm = SVC(kernel="rbf", gamma=1, C=10, tol=1e-9).fit(z.reshape(-1, 1), y)   # one feature, so one column

print("support vectors:", svm.support_vectors_.ravel())
print("alpha*y        :", np.round(svm.dual_coef_[0], 3))
print("offset b       :", np.round(svm.intercept_, 4))`,
      out: `support vectors: [-0.55  0.5  -1.25  1.2 ]
alpha*y        : [-1.969 -1.969  1.969  1.969]
offset b       : [0.3245]`,
      walk: [
        [`z.reshape(-1, 1)`, `scikit-learn needs a 2-D table with one row per reading and one column per feature. <code>reshape(-1, 1)</code> turns a flat list of 12 numbers into 12 rows and 1 column; <code>-1</code> means "work out this size yourself".`],
        [`SVC(kernel="rbf", gamma=1, C=10)`, `The RBF SVM. <code>gamma</code> is γ in exp(−γ·d²) and <code>C</code> caps α. A tight <code>tol</code> gives exact weights.`],
        [`svm.support_vectors_.ravel()`, `The positions of the bump centres. <code>support_vectors_</code> is a table (4 rows, 1 column); <code>ravel()</code> flattens it to a plain list.`],
        [`svm.dual_coef_[0]`, `α·y for each support vector, listed in the same order as above, but ordered by class (healthy first). Healthy supports are negative and failing supports positive: the up and down bumps.`],
        [`svm.intercept_`, `The offset b, one number per boundary (so an array of length 1).`]],
      tip: `Four support vectors, four bumps: the same four the widget rings at the default settings.`
    },
    {
      title: `Rebuild the score at a probe from the votes`,
      py: `import numpy as np
from sklearn.svm import SVC

z = np.array([-0.55, -0.35, -0.15, 0.05, 0.25, 0.5, -2.0, -1.55, -1.25, 1.2, 1.6, 2.05])
y = np.array([-1] * 6 + [1] * 6)
svm = SVC(kernel="rbf", gamma=1, C=10, tol=1e-9).fit(z.reshape(-1, 1), y)

probe = 1.0
sv, ay, b = svm.support_vectors_.ravel(), svm.dual_coef_[0], svm.intercept_[0]
K = np.exp(-1 * (probe - sv) ** 2)                     # closeness of each support vector to the probe
votes = ay * K                                         # signed height times closeness
print("votes:", np.round(votes, 4), " sum:", round(votes.sum(), 4))
print("score:", round(votes.sum() + b, 4), " sklearn:", np.round(svm.decision_function([[probe]]), 4))
print("effective voters:", round(K.sum() ** 2 / (K**2).sum(), 2))`,
      out: `votes: [-0.1782 -1.5335  0.0125  1.8918]  sum: 0.1926
score: 0.5171  sklearn: [0.5171]
effective voters: 2.19`,
      walk: [
        [`K = np.exp(-1 * (probe - sv) ** 2)`, `One K per support vector, all at once: <code>probe - sv</code> subtracts the probe from every centre, <code>** 2</code> squares each distance, and the <code>-1</code> is γ.`],
        [`votes = ay * K`, `Element-by-element product: each support vector's signed height times its closeness. These are the numbers in the widget's vote table.`],
        [`votes.sum() + b`, `The score is the sum of the votes plus the offset: the formula f(z) = Σ αᵢyᵢ K + b written as code.`],
        [`svm.decision_function([[probe]])`, `scikit-learn's own score at the probe. It matches the hand-built 0.5171, which proves you read <code>dual_coef_</code>, <code>support_vectors_</code> and <code>intercept_</code> correctly.`],
        [`K.sum() ** 2 / (K**2).sum()`, `Effective voters (ΣK)² / ΣK². Note <code>K**2</code> squares each entry before summing, while <code>K.sum() ** 2</code> squares the total.`]],
      tip: `If your rebuilt score differs from decision_function, you almost certainly mixed up the order of the arrays or used the wrong gamma in the exponent.`
    },
    {
      title: `Watch the votes die as gamma grows`,
      py: `import numpy as np
from sklearn.svm import SVC

z = np.array([-0.55, -0.35, -0.15, 0.05, 0.25, 0.5, -2.0, -1.55, -1.25, 1.2, 1.6, 2.05])
y = np.array([-1] * 6 + [1] * 6)
for gamma in (0.1, 1, 10, 1000):
    svm = SVC(kernel="rbf", gamma=gamma, C=10, tol=1e-9).fit(z.reshape(-1, 1), y)
    far = svm.decision_function([[3.0]])[0]            # a reading 0.95 beyond the last training reading
    print(f"gamma={gamma:<6} SVs={len(svm.support_):>2}  b={svm.intercept_[0]:.4f}  f(3.0)={far:.4f}")`,
      out: `gamma=0.1    SVs= 7  b=2.5901  f(3.0)=3.5475
gamma=1      SVs= 4  b=0.3245  f(3.0)=0.3978
gamma=10     SVs=11  b=0.2538  f(3.0)=0.2539
gamma=1000   SVs=12  b=0.0000  f(3.0)=0.0000`,
      walk: [
        [`for gamma in (0.1, 1, 10, 1000)`, `Four bump widths: σ = 2.2, 0.71, 0.22 and 0.022.`],
        [`len(svm.support_)`, `The number of support vectors. It is not monotonic in γ: 7, then 4 at the sweet spot, then 11 and 12 as bumps become spikes.`],
        [`svm.decision_function([[3.0]])[0]`, `The score at z = 3.0. <code>[[3.0]]</code> is one row, one column; <code>[0]</code> takes the single number out of the result array.`],
        [`f"{gamma:<6}"`, `Formatting: left-align the value in a field 6 characters wide so the columns line up.`]],
      tip: `Compare f(3.0) with b in each row. For γ = 10 they agree to 4 digits: at that distance the votes are gone, and the offset is the whole score.`
    }],
  check: [
    { q: `In an RBF SVM, what does the score f(z) approach as z moves far away from every support vector?`, options: [`The offset b`, `The sum of all α·y`, `Zero, whatever b is`, `Plus or minus infinity`], answer: 0, why: `Every K = exp(−γd²) tends to 0, so every vote tends to 0 and only b is left. On these readings b = 0.32, and f(3) = 0.40 is already close to it.` },
    { q: `A support vector at z = 2 has α·y = −1.5. With γ = 2, what is its vote at the probe z* = 2.5?`, options: [`−0.91`, `−0.55`, `−1.17`, `−1.50`], answer: 0, why: `d² = 0.25, so K = e^(−2 × 0.25) = e^(−0.5) = 0.6065 and the vote is −1.5 × 0.6065 = −0.91. The value −0.55 forgets to square the distance, −1.17 forgets γ, and −1.50 forgets K.` },
    { q: `You raise γ from 1 to 1000 (C stays 10) and put the probe at z* = 1.0. What does the vote table show?`, options: [`Every vote is close to 0, effective voters is about 1, and the score is just b, which is about 0`, `The same four votes as before`, `Bigger votes, because the bumps are taller`, `An empty table, because no reading is a support vector`], answer: 0, why: `At γ = 1000 all 12 readings are support vectors, but the nearest one is 0.2 away, so K = e^(−1000 × 0.04) = e^(−40) ≈ 0. Every vote vanishes and f is just b, which is about 0 here.` }],
  teachback: { prompt: `In two sentences, explain to a friend how an RBF SVM scores a new reading, and why the offset b decides when the reading is far from all the data.`, model: `Each support vector adds a vote equal to its signed weight α·y times how close the reading is to it (exp(−γ × distance²)), and the sum of votes plus the offset b is the score. Far from every support vector all the closeness values are almost 0, so all the votes vanish and only b is left to decide.` },
  cheat: `RBF score: f(z) = Σ αᵢyᵢ exp(−γ(z − zᵢ)²) + b over the support vectors. Each term is a bump of height αᵢyᵢ (never above C in size) and width σ = 1/√(2γ). Sign of f is the class. Far from every support vector f ≈ b. Large γ: narrow spikes, about one voter, b decides the gaps.`
};
