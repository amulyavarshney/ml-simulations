// Lesson for svm-kernels/kernel-identities: a kernel is a dot product in a lifted space, computed without the lift.
module.exports = {
  idea: `A kernel K(a, b) returns the dot product of two lifted points straight from a and b, so an SVM can work in a huge, even infinite, lifted space without ever building it.`,
  why: `Lifting 64 pixel values with every product up to degree 3 gives each image 47,905 coordinates. Building and multiplying those for thousands of images is slow and uses huge memory. The SVM only ever needs dot products, so a formula that returns the dot product directly turns that work into a 64-term sum.`,
  analogy: `Multiplying 99 × 101. The long way: write both numbers out, multiply digit by digit, add the rows. The shortcut: 100² − 1 = 9999. Same answer, almost no work. The explicit lift is the long multiplication. The kernel is the shortcut formula. The SVM only ever asks for the answer (the dot product), never for the working (the lifted points).`,
  vocab: [
    [`Dot product`, `<span class="eq">a·b</span>: multiply matching coordinates and add. One number that is large when the two points point the same way.`],
    [`Lift φ`, `The rule that turns a point into a longer list of coordinates, as on the previous page.`],
    [`Kernel K(a, b)`, `A function with <span class="eq">K(a, b) = φ(a)·φ(b)</span> for some lift φ. You evaluate it from a and b alone.`],
    [`Polynomial kernel`, `<span class="eq">(γ·a·b + r)<sup>d</sup></span>. d is the degree and r the offset. In scikit-learn: <code>degree</code>, <code>coef0</code> and <code>gamma</code>.`],
    [`Gram matrix`, `The table of <span class="eq">K(xᵢ, xⱼ)</span> for every pair of training points. It is all the SVM ever sees of the data.`],
    [`α·y (dual weights)`, `One weight per training point. The score is <span class="eq">f(x) = Σ αᵢyᵢ K(xᵢ, x) + b</span>. A point with weight 0 does not appear in it.`],
    [`RBF kernel`, `<span class="eq">exp(−γ‖a − b‖²)</span>: 1 for identical points and falling towards 0 with distance.`],
    [`Taylor series`, `Writing a function as a sum of powers. Here <span class="eq">eˣ = Σ xⁿ / n!</span> for n = 0, 1, 2, …`]],
  steps: [
    { h: `The SVM touches the data only through dot products`, p: `In Session 3 the trained score was <span class="eq">f(x) = Σ αᵢyᵢ (xᵢ·x) + b</span>, and the training problem also used the data only through <span class="eq">xᵢ·xⱼ</span>. The coordinates themselves never appeared on their own. This one fact is what makes the kernel trick possible.` },
    { h: `After a lift, they become dot products of lifted points`, p: `With a lift φ, every <span class="eq">xᵢ·xⱼ</span> becomes <span class="eq">φ(xᵢ)·φ(xⱼ)</span> and nothing else changes: same margin, same support vectors, same formulas. The long way is to build both lifted points and multiply them. If φ has 47,905 coordinates, that is a lot of work for one number.` },
    { h: `Find the lift hiding inside a formula`, p: `Expand the square: <span class="eq">(ab + r)² = 2r·ab + a²b² + r²</span>. Each term is a product of one coordinate of a and the matching one of b: <span class="eq">(√(2r)·a)(√(2r)·b) + a²·b² + r·r</span>. So the lift is <span class="eq">φ(z) = (√(2r)·z, z², r)</span>. For a = 2, b = 3, r = 1 both routes give 49.` },
    { h: `The shortcut: the kernel`, p: `Define <span class="eq">K(a, b) = φ(a)·φ(b)</span>. In this example K is just <span class="eq">(ab + r)²</span>: one multiply, one add, one square. For two 64-pixel images the degree-3 kernel needs one 64-term dot product, not two vectors of 47,905 numbers. The kernel answers the dot-product question without building φ.` },
    { h: `Swap it in everywhere`, p: `Train on the Gram matrix of values <span class="eq">K(xᵢ, xⱼ)</span> in place of the dot products, and score with <span class="eq">f(x) = Σ αᵢyᵢ K(xᵢ, x) + b</span>. The boundary is flat in the lifted space and curved in the original one. The cost moves from the size of φ to the size of the table: n × n entries.` },
    { h: `XOR: no line, but a kernel works`, p: `XOR is four points at the corners of a square, with the same colour on opposite corners. No line splits them: a linear SVM gets 2 of 4. With <span class="eq">K = (x·z + 1)²</span> the SVM gives each point weight α = 1/8 and b = 0, and the score is exactly <span class="eq">f(x) = x₁x₂</span>: positive when the signs of x₁ and x₂ agree, negative when they differ.` },
    { h: `RBF: every degree at once`, p: `Split the exponent: <span class="eq">e^(−γ(a−b)²) = e^(−γa²) · e^(−γb²) · e^(2γab)</span>. The last factor has the Taylor series <span class="eq">Σ (2γab)ⁿ / n!</span>, and each term is a polynomial kernel of degree n, divided by n!. Degrees 1 and 2 together give a lift like the (z, z²) of the previous page, up to scaling. Adding every degree gives infinitely many coordinates.` },
    { h: `Why infinity is affordable`, p: `The weights 1/n! shrink faster than powers grow, so a few terms already match the exact value to many digits. But you never need the series: one RBF value costs one subtraction, one square and one exponential. The real prices are still the n × n table and the risk of memorising, which the next pages measure.` }],
  example: {
    title: `XOR by hand with K = (x·z + 1)²`,
    setup: `Four points: (1, 1) and (−1, −1) with y = +1, and (1, −1) and (−1, 1) with y = −1. Kernel <span class="eq">K(x, z) = (x·z + 1)²</span>. Find the SVM weights α, the offset b and the score.`,
    table: { head: [`K(row, column)`, `(1, 1)`, `(−1, −1)`, `(1, −1)`, `(−1, 1)`], rows: [
      [`(1, 1)`, `9`, `1`, `1`, `1`],
      [`(−1, −1)`, `1`, `9`, `1`, `1`],
      [`(1, −1)`, `1`, `1`, `9`, `1`],
      [`(−1, 1)`, `1`, `1`, `1`, `9`]] },
    walk: [
      `Fill the Gram table. The diagonal is (x·x + 1)² = (2 + 1)² = 9. For (1, 1) and (−1, −1): x·z = −2, so (−2 + 1)² = 1. For (1, 1) and (1, −1): x·z = 0, so (0 + 1)² = 1. Every off-diagonal entry is 1.`,
      `The four corners are mirror images of each other, so by symmetry the four weights are equal: αᵢ = a.`,
      `The dual objective is Σα − ½ΣΣ αᵢαⱼ yᵢyⱼ Kᵢⱼ. Add up yᵢyⱼKᵢⱼ over the table: 4 × 9 on the diagonal, plus 4 × (+1) for the two same-colour pairs (both orders), minus 8 × 1 for the four opposite-colour pairs (both orders). Total 36 + 4 − 8 = <b>32</b>.`,
      `So the objective is 4a − ½·32·a² = 4a − 16a². Its maximum is where 4 − 32a = 0, so <b>a = 1/8</b>. The constraint Σαy = 0 holds because two weights are positive and two negative.`,
      `The score is f(x) = ⅛[(x₁ + x₂ + 1)² + (−x₁ − x₂ + 1)² − (x₁ − x₂ + 1)² − (−x₁ + x₂ + 1)²] + b. Let s = x₁ + x₂ and d = x₁ − x₂. The first pair is 2 + 2s² and the second pair is 2 + 2d², so the bracket is 2(s² − d²) = 8x₁x₂ and <b>f(x) = x₁x₂ + b</b>.`,
      `Find b from a point on a street edge. At (1, 1) the score must be +1: ⅛(9 + 1 − 1 − 1) + b = 1 + b = 1, so <b>b = 0</b>.`,
      `Test a new point, (1.2, −0.7): f = 1.2 × (−0.7) = −0.84, negative, so class −1. The four corners give f = +1, +1, −1, −1 exactly.`],
    result: `α = 1/8 for all four points, b = 0, f(x) = x₁x₂. The boundary f = 0 is the two axes (a cross) and the street edges f = ±1 are the curves x₁x₂ = ±1 through the corners. The widget prints the same weights (0.125, 0.125, −0.125, −0.125) and scores 1, 1, −1, −1.` },
  read: [
    [`Panel 1 table: Kernel, computed directly`, `The value (a·b + r)² from one small formula.`],
    [`Panel 1 table: Lifted points φ(z)`, `The three coordinates (√(2r)·z, z², r) of each point. They are built only to prove the number is right. The kernel never needs them.`],
    [`Panel 1 table: Dot product and Difference`, `The long route. The difference is 0 or about 1e-15 (rounding), because both routes are the same algebra.`],
    [`Panel 2 table: Gram matrix`, `The 4 × 4 table of (x·z + r)² between the four corners. At r = 1 it is 9 on the diagonal and 1 elsewhere.`],
    [`Panel 2: SVM weights α·y and b`, `The fitted dual weights, in the order (1,1), (−1,−1), (1,−1), (−1,1), and the offset b. A line under them says what to expect: ±1/8 for every r above 0, and only two supports at r = 0.`],
    [`Panel 2: f at the four points`, `The score at each corner. 1, 1, −1, −1 means every corner sits exactly on a street edge.`],
    [`Panel 2 plot: lines and tint`, `Solid black is f = 0. Dashed orange and blue are f = +1 and f = −1. The tint shows the predicted class.`],
    [`Panel 3 bars`, `The contribution of degree n: e^(−γa²−γb²)·(2γab)ⁿ / n!. Blue if positive, orange if negative (when ab is negative the bars alternate). Faded bars are beyond "Terms kept".`],
    [`Panel 3 black line with dots`, `The running total after each degree. The dashed orange horizontal line is the exact kernel value; the black line climbs to it.`],
    [`Panel 3 table: Error after n terms`, `|exact − running total|. Hover over a bar to read its own term and the running total.`],
    [`Slider: Terms kept (degrees 0 … n−1)`, `How many terms of the series are used. The maximum is 14.`]],
  experiments: [
    { do: `In panel 1 press <i>a = 2, b = 3, r = 1</i>, then <i>r = ½</i>. Then set a = −1.7, b = 3.3 and r = 0.35 with the sliders.`, see: `The kernel and the dot product agree each time: 49 and 49, then 42.25 and 42.25, then 27.6676 and 27.6676. The Difference row is 0 or about 1e-15.`, why: `The kernel is the dot product after algebra: (ab + r)² = 2r·ab + a²b² + r² is the sum of three coordinate products. Only rounding in the last digit can separate the two routes.` },
    { do: `Slide <i>offset r</i> in panel 1 down to 0 (a = 2, b = 3).`, see: `The lifted points become (0, 4, 0) and (0, 9, 0), and the kernel is 36 = (2·3)², the pure square term.`, why: `With r = 0 the terms 2r·ab and r² vanish and only a²b² is left. The offset r decides how much of the lower-order parts (the straight-line term and the constant) the kernel keeps.` },
    { do: `In panel 2 move <i>Kernel offset r</i> through 0.5, 1, 1.5 and 2.`, see: `The Gram matrix changes (its diagonal is 6.25, 9, 12.25, 16), but α·y stays at 0.125, 0.125, −0.125, −0.125, b stays 0 and f stays at 1, 1, −1, −1.`, why: `Add up yᵢyⱼKᵢⱼ and every r-dependent part cancels between same-colour and opposite-colour pairs. The total is 32 for every r, so the dual problem 4a − 16a² always has the answer a = 1/8. For XOR the boundary does not depend on r.` },
    { do: `Move the same slider to 0.`, see: `The weights become 0, 0.25, 0, −0.25: only two support vectors. The scores are still 1, 1, −1, −1.`, why: `With r = 0 the kernel is (x·z)², and (1, 1) and (−1, −1) land on the same lifted point (x₁², √2·x₁x₂, x₂²) = (1, 1.41, 1). So do the two orange corners. The weight can sit on either twin, and the solver put all of it on one point of each pair.` },
    { do: `In panel 3 (defaults a = 1, b = −0.4, γ = 0.5) drag <i>Terms kept</i> from 1 up to 10.`, see: `The running total goes 0.5599, 0.3359, 0.3807, 0.3748, 0.3754 and so on to the exact 0.3753111. After 10 terms the error is 1.6e-11.`, why: `Because ab is negative the terms alternate in sign, and they shrink like 1/n!. Each new degree corrects the previous overshoot by a smaller amount.` },
    { do: `Raise γ in panel 3 to 1, 2 and 3 (keep a = 1, b = −0.4) and count the terms until the error is below 1e-6. Then set a = b = 2 with γ = 1.`, see: `You need 7, 9, 11 and 13 terms for γ = 0.5, 1, 2 and 3. With a = b = 2 and γ = 1 even 14 terms leave an error of about 3e-2.`, why: `The terms are (2γab)ⁿ / n!. They grow until n is about 2γ|ab| and only then shrink. A larger γ or |ab| moves that peak to the right (n = 7 and 8 for a = b = 2, γ = 1), so more terms are needed.` }],
  remember: [
    { tag: `Formula in words`, text: `K(a, b) is the dot product of the lifted points. For (ab + r)² the lift is (√(2r)·z, z², r). The 2 in √(2r) is what produces the cross term 2r·ab.` },
    { tag: `Picture`, text: `The Gram matrix is a table of how alike each pair of points is. Everything the SVM knows about your data is in that table. Row i, column j: how alike points i and j look in the lifted space.` },
    { tag: `Sanity check`, text: `To trust a kernel claim, compute both routes for one pair. K(2, 3) at r = 1: kernel (6 + 1)² = 49, lifted 12 + 36 + 1 = 49.` },
    { tag: `Rule of thumb`, text: `XOR needs the product x₁x₂ as a coordinate. A degree-2 polynomial kernel contains it, which is why f = x₁x₂ appears.` },
    { tag: `Trick`, text: `Count the lifted coordinates for p inputs and degree d: C(p + d, d). That is 6 for p = 2, d = 2 and 47,905 for p = 64, d = 3. The kernel needs only p multiplications either way.` },
    { tag: `Link to code`, text: `scikit-learn's polynomial kernel is <code>(gamma·x·z + coef0) ** degree</code>. With <code>gamma=1, coef0=r, degree=2</code> it is exactly the kernel of this page.` }],
  mistakes: [
    { wrong: `"The kernel trick builds the lifted points and then multiplies them."`, right: `It never builds them. K(2, 3) = 49 comes from (2·3 + 1)². The lifted points are drawn only to show why that number is right.` },
    { wrong: `"RBF has infinitely many coordinates, so it must be slow or must overfit."`, right: `One RBF value costs one exponential. How much it overfits is set by γ and C, not by the number of coordinates.` },
    { wrong: `"The constant third coordinate r in the lift changes the classifier."`, right: `It is the same for every point, so it never moves a point. It adds r² to every kernel value, and that cancels because Σαy = 0. (r matters through the 2r·ab term.)` },
    { wrong: `"An SVM cannot solve XOR."`, right: `A <i>linear</i> SVM scores 2 of 4. With K = (x·z + 1)² the same SVM fits all four corners exactly.` }],
  code: [
    {
      title: `Check that the kernel equals the dot product of lifted points`,
      py: `import numpy as np
from sklearn.metrics.pairwise import polynomial_kernel

a, b = 2.0, 3.0
for r in (1.0, 0.5):
    phi = lambda z: np.array([np.sqrt(2 * r) * z, z**2, r])      # the lift hiding inside (a*b + r)**2
    lifted = phi(a) @ phi(b)                                       # the long way: lift, then dot product
    direct = polynomial_kernel([[a]], [[b]], degree=2, gamma=1, coef0=r)[0, 0]   # the shortcut
    print(f"r={r}: lifted {lifted:.2f}, kernel {direct:.2f}")`,
      out: `r=1.0: lifted 49.00, kernel 49.00
r=0.5: lifted 42.25, kernel 42.25`,
      walk: [
        [`lambda z: np.array([...])`, `A one-line function. It returns the three lifted coordinates <code>(√(2r)·z, z², r)</code> of a reading z. <code>np.sqrt(2 * r)</code> is √(2r).`],
        [`phi(a) @ phi(b)`, `The <code>@</code> operator is the dot product of two arrays: multiply matching entries and add. This is the expensive route.`],
        [`polynomial_kernel([[a]], [[b]], ...)`, `scikit-learn's kernel function. It wants 2-D tables (rows are points), hence the double brackets, and returns a table of all pairs; <code>[0, 0]</code> picks the only entry.`],
        [`degree=2, gamma=1, coef0=r`, `The kernel is <code>(gamma · a·b + coef0) ** degree</code>. With gamma 1 and degree 2 this is (ab + r)².`],
        [`f"r={r}: lifted {lifted:.2f}"`, `An f-string. <code>{lifted:.2f}</code> prints the value with two decimals, so tiny rounding differences do not show.`]],
      tip: `Change a, b and r. The two numbers always agree, because they are the same algebra written two ways.`
    },
    {
      title: `Solve XOR with a polynomial kernel`,
      py: `import numpy as np
from sklearn.svm import SVC

X = np.array([[1, 1], [-1, -1], [1, -1], [-1, 1]])       # the four XOR corners
y = np.array([1, 1, -1, -1])
print("linear accuracy:", SVC(kernel="linear").fit(X, y).score(X, y))

svm = SVC(kernel="poly", degree=2, gamma=1, coef0=1, C=1e6, tol=1e-10).fit(X, y)   # K = (x.z + 1)**2
print("alpha*y:", np.round(svm.dual_coef_[0], 4), " b is zero:", bool(abs(svm.intercept_[0]) < 1e-6))
test = np.array([[1.2, -0.7], [0.5, 0.5]])               # two new points
print("f:", np.round(svm.decision_function(test), 3), " x1*x2:", test[:, 0] * test[:, 1])`,
      out: `linear accuracy: 0.5
alpha*y: [-0.125 -0.125  0.125  0.125]  b is zero: True
f: [-0.84  0.25]  x1*x2: [-0.84  0.25]`,
      walk: [
        [`SVC(kernel="linear")`, `A straight boundary. On XOR it gets exactly 2 of 4 right (0.5), no better than guessing.`],
        [`kernel="poly", degree=2, gamma=1, coef0=1`, `The polynomial kernel <code>(gamma · x·z + coef0) ** degree</code> = (x·z + 1)². <code>C=1e6</code> and a tiny <code>tol</code> make it behave like a hard margin and give the exact weights.`],
        [`svm.dual_coef_[0]`, `The product α·y for each support vector. It lists support vectors by class (−1 first), not in your input order, so the signs read −, −, +, +.`],
        [`svm.intercept_[0]`, `The offset b. We print whether it is (numerically) zero rather than the number, so a tiny −0.0 does not appear.`],
        [`test[:, 0] * test[:, 1]`, `<code>test[:, 0]</code> is the first column (x₁) and <code>test[:, 1]</code> the second (x₂). Their product is x₁x₂, which should equal the SVM score.`]],
      tip: `The score equals x1*x2 at points the SVM never saw, not only at the four corners: the formula is exact, not a fit.`
    },
    {
      title: `Add up the RBF series term by term`,
      py: `import math
import numpy as np

a, b, g = 1.0, -0.4, 0.5
prefix = np.exp(-g * a**2 - g * b**2)            # e^(-g a^2) * e^(-g b^2): does not depend on n
total = 0.0
for n in range(6):                               # degrees 0 ... 5
    term = prefix * (2 * g * a * b) ** n / math.factorial(n)   # polynomial kernel of degree n, divided by n!
    total += term
    print(n, f"{term:+.6f}", f"{total:.6f}")
print("exact:", f"{np.exp(-g * (a - b) ** 2):.6f}")`,
      out: `0 +0.559898 0.559898
1 -0.223959 0.335939
2 +0.044792 0.380731
3 -0.005972 0.374759
4 +0.000597 0.375356
5 -0.000048 0.375308
exact: 0.375311`,
      walk: [
        [`prefix = np.exp(-g * a**2 - g * b**2)`, `The two outer factors e^(−γa²)·e^(−γb²) from splitting the exponent. They are the same for every term.`],
        [`(2 * g * a * b) ** n / math.factorial(n)`, `The n-th term of the Taylor series of e^(2γab): the polynomial kernel (2γ·ab)ⁿ divided by n!. <code>**</code> is "to the power of".`],
        [`total += term`, `Running total after adding degree n. This is the black line in the widget's third panel.`],
        [`f"{term:+.6f}"`, `<code>+</code> always prints the sign and <code>.6f</code> keeps six decimals. The terms alternate in sign because ab = −0.4 is negative.`],
        [`np.exp(-g * (a - b) ** 2)`, `The exact RBF kernel value. Six terms already agree with it to 5 decimals (0.375308 against 0.375311).`]],
      tip: `Change g to 3 and print more terms: they stay large for longer before shrinking.`
    }],
  check: [
    { q: `Why can an SVM use <span class="eq">(a·b + 1)²</span> without ever computing the lifted points?`, options: [`Training and scoring use the data only through dot products, and the kernel returns the dot product of the lifted points directly`, `The SVM drops the lifted coordinates that it does not need`, `The lifted points are stored on disk and loaded when needed`, `The kernel approximates the lifted points with fewer coordinates`], answer: 0, why: `The dual problem and the score use only xᵢ·xⱼ. Replace it by K(xᵢ, xⱼ) = φ(xᵢ)·φ(xⱼ) and the answer is identical to the one from lifting, with no lifted point built. Nothing is dropped or approximated.` },
    { q: `What is K(a, b) = (ab + r)² for a = 1, b = 4 and r = 2?`, options: [`36`, `6`, `20`, `25`], answer: 0, why: `K = (1·4 + 2)² = 6² = 36. Check by lifting: φ(1) = (√4·1, 1, 2) = (2, 1, 2) and φ(4) = (8, 16, 2), and the dot product is 16 + 16 + 4 = 36. The value 6 forgets the square, 20 = 4² + 2² forgets the cross term 2r·ab, and 25 uses r = 1.` },
    { q: `In the XOR panel you move the offset r from 1 to 1.5. What happens to the weights α·y, to b and to the scores at the four corners?`, options: [`Nothing: still ±0.125, b = 0 and scores 1, 1, −1, −1`, `The weights grow because the Gram matrix entries grow`, `The data become inseparable`, `b becomes non-zero`], answer: 0, why: `The sum of yᵢyⱼKᵢⱼ is 32 for every r, because the r-dependent parts cancel. The dual 4a − 16a² keeps its maximum at a = 1/8, so the weights, b and the scores f = x₁x₂ do not change. Only the Gram matrix itself changes.` }],
  teachback: { prompt: `In two sentences, explain to a friend why an SVM does not need to build the lifted points, and what the RBF kernel adds up to.`, model: `The SVM uses the data only through dot products, and a kernel such as (a·b + r)² gives the dot product of the lifted points straight from a and b, so the lift is never built. The RBF kernel is the same idea taken to the limit: polynomial kernels of every degree added with weights 1/n!, an infinite lift that still costs one exponential per pair.` },
  cheat: `Kernel: K(a, b) = φ(a)·φ(b), computed from a and b without building φ. The SVM needs only dot products, so it trains on the Gram matrix K(xᵢ, xⱼ) and scores f(x) = Σ αᵢyᵢ K(xᵢ, x) + b. (ab + r)² lifts to (√(2r)·a, a², r); K(2, 3) = 49 at r = 1. XOR: α = 1/8, f = x₁x₂. RBF = every degree n of (2γab)ⁿ/n!.`
};
