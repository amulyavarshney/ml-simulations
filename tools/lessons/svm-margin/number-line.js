// Lesson for svm-margin/number-line: the margin idea in one feature, before lines and planes.
module.exports = {
  idea: 'Many thresholds split healthy readings from failing ones. The safest is the one farthest from the nearest reading on either side: exactly halfway across the gap. Only those two nearest readings decide where it goes.',
  why: 'A threshold that fits the training readings but hugs one class will misjudge new readings that are only a little different. With threshold 0.4 in this page, a new failing reading at 0.3 is called healthy, though it is 0.2 from the failing group and 0.7 from the healthy group. One feature lets you see the whole idea before it turns into lines and planes.',
  analogy: 'A teacher sets the pass mark. The best failing script has 38 marks and the weakest passing script has 58. Any mark from 39 to 58 sorts these scripts correctly, but 48 is safest: if rechecking moves a mark by up to 10, nobody flips. A pass mark of 40 flips with a 2-mark change. Scripts with 12 or 95 marks play no part in the choice.',
  vocab: [
    ['Threshold', 'One number t. A reading above t is called failing, a reading below is called healthy. With one feature the "boundary" is just this point.'],
    ['Gap', 'The empty stretch between the highest healthy reading and the lowest failing reading. Here it runs from −0.4 to 0.5, so it is 0.9 long.'],
    ['Margin', 'The distance from the threshold to the nearest reading, on either side. It is half of the street: street width = 2 × margin.'],
    ['Support point', 'One of the two readings nearest the gap (the ringed ones). Move or delete any other reading and the best threshold stays put.'],
    ['Separable', 'Some threshold puts every healthy reading on one side and every failing reading on the other.'],
    ['w and b', 'The SVM writes its rule as <span class="eq">f(x) = w·x + b</span>. With one feature w is a single number. The threshold is where f = 0, which is <span class="eq">−b/w</span>.'],
    ['C', 'The price the SVM pays for each reading that breaks the rule (inside the street, or on the wrong side). Large C: strict. Small C: forgiving. It is a price, not a count.']],
  steps: [
    { h: 'One feature, one cut point', p: 'Each sensor reading is a single number. Healthy readings are on the left (−2.1 to −0.4) and failing ones on the right (0.5 to 2.3). A classifier is one number t: call a reading failing if it is above t. Twelve readings, one decision: where to put t.' },
    { h: 'Many thresholds score 100%', p: 'Any t between −0.4 and 0.5 gets all twelve readings right. That is a whole gap of choices, 0.9 long. Training accuracy is the same for all of them, so it cannot tell you which one to trust. (The slider starts at 0.60, which is outside the gap: the failing reading at 0.5 is on the wrong side.)' },
    { h: 'A threshold that hugs a class is fragile', p: 'Put t at 0.4. The nearest failing reading, 0.5, is only 0.1 away. A new failing reading at 0.3 is called healthy. Put t at 0.05 instead and the same new reading is called failing. We want a number that says how much room a threshold leaves.' },
    { h: 'Define the margin', p: 'The <b>margin</b> of a threshold is the distance to the nearest reading. For a t in the gap it is <span class="eq">min(t − (−0.4), 0.5 − t)</span>. If t is outside the gap it does not separate the classes, and the page draws margin 0. Plotted against t, the margin is a tent: it rises, peaks, and falls.' },
    { h: 'The peak is the midpoint', p: 'As t moves right, the distance to the healthy side grows by 1 for every 1 you move, and the distance to the failing side shrinks by 1. The smaller of two such distances is largest when they are equal: <span class="eq">t* = (a + b) / 2</span>, margin <span class="eq">(b − a) / 2</span>, where a = −0.4 and b = 0.5 are the two closest readings. Here t* = 0.05 and the margin is 0.45.' },
    { h: 'The SVM says the same thing with w and b', p: 'Write the rule as <span class="eq">f(x) = w·x + b</span> and scale it so the two nearest readings score exactly −1 and +1. Then the street between f = −1 and f = +1 has half-width <span class="eq">1/|w|</span>, which equals the margin. Making the margin large means making |w| small. This is the form that still works with 2 features, or 2000.' },
    { h: 'One odd reading breaks the strict rule', p: 'Add a failing reading at −1.2, in the middle of the healthy group. No threshold separates the classes now, so there is no largest margin. The soft margin lets readings break the rule at a price C. A large C keeps the threshold near the data (−0.10 at C = 1000). A tiny C makes the street so wide that the threshold flies off to −5.98 and every reading is called failing.' }],
  example: {
    title: 'the twelve readings, solved by hand',
    setup: 'Healthy (label −1): <b>−2.1, −1.7, −1.4, −1.0, −0.7, −0.4</b>. Failing (label +1): <b>0.5, 0.9, 1.2, 1.6, 2.0, 2.3</b>. Find the threshold with the largest margin, then express it as w and b.',
    table: { head: ['Threshold t', 'Distance to nearest healthy', 'Distance to nearest failing', 'Margin (the smaller)', 'Verdict'], rows: [
      ['−0.20', '0.20', '0.70', '0.20', 'hugs the healthy group'],
      ['0.05', '0.45', '0.45', '0.45', 'equal distances: the best'],
      ['0.10', '0.50', '0.40', '0.40', 'the midpoint of the two class averages (−1.22 and 1.42): close, but not the best'],
      ['0.30', '0.70', '0.20', '0.20', 'hugs the failing group'],
      ['0.60', 'n/a', 'n/a', '0', 'the failing reading at 0.5 is on the wrong side: does not separate']] },
    walk: [
      'Find the two closest readings from opposite classes: the largest healthy one is <b>a = −0.4</b> and the smallest failing one is <b>b = 0.5</b>. For any t in the gap these are the nearest readings on each side, so the other ten never matter.',
      'Margin at t is min(t + 0.4, 0.5 − t). The two distances are equal when t + 0.4 = 0.5 − t, so 2t = 0.1 and <b>t* = 0.05</b>. The margin is (0.5 − (−0.4)) / 2 = <b>0.45</b>.',
      'Now the SVM form. The nearest readings must score −1 and +1: <span class="eq">−0.4w + b = −1</span> and <span class="eq">0.5w + b = +1</span>.',
      'Subtract the first from the second: 0.9w = 2, so <b>w = 2.222</b> (that is 20/9). Put it back: b = 1 − 0.5 × 2.222 = <b>−0.111</b>.',
      'Read off the threshold: <span class="eq">−b/w = 0.111 / 2.222 = 0.05</span>. It matches. The half-width is 1/w = 0.45, which equals the margin, and the street runs from −0.4 to 0.5. With a hard margin on one feature, the street fills the gap exactly.',
      'Check a reading that is not a support point: f(0.9) = 2.222 × 0.9 − 0.111 = 1.889, which is more than 1, so it lies outside the street. Move 0.9 to 2.0 and w and b do not change.'],
    result: 'Threshold 0.05, <span class="eq">w = 2.222</span>, <span class="eq">b = −0.111</span>, margin 0.45, street 0.9 wide, two support points (−0.4 and 0.5). A new reading at 0.3 scores f = 0.556: positive, so failing. A new reading at 0.0 scores f = −0.111: healthy, but barely, because it is inside the street.' },
  read: [
    ['Blue circles (left) and orange triangles (right)', 'Healthy and failing readings. Drag a reading sideways to move it.'],
    ['Heavy black vertical line, "your threshold"', 'The threshold you control. Drag it, or use the slider "Your threshold" (it starts at 0.60).'],
    ['Light shaded band around your threshold', 'The street at your threshold: it reaches the nearest reading on each side. It is drawn only when your threshold separates the classes.'],
    ['Dashed line labelled "SVM", with two short dotted ticks', 'The threshold the SVM learned. The ticks mark the street edges, 1/|w| away on each side.'],
    ['Black rings', 'The support points, the readings that touch the street.'],
    ['Lower plot: blue tent', 'The margin of every possible threshold. It is 0 where the threshold does not separate the classes.'],
    ['Diamond labelled "maximum 0.45", and the black dot', 'The diamond is the best threshold. The dot is where your threshold stands now.'],
    ['Readout: Margin at your threshold', 'Distance to the nearest reading, or "threshold does not separate" if some reading is on the wrong side.'],
    ['Readouts: SVM threshold, half-width 1/|w|, support points', 'What the SVM learned: −b/w, the margin 1/|w| and how many readings touch or break the street.'],
    ['Slider: SVM penalty C', '0.01 to 1000 on a log scale. At 1.0e+3 it behaves like a hard margin.']],
  experiments: [
    { do: 'Read "Margin at your threshold" at the start (threshold 0.60). Then press <i>Snap to maximum margin</i>.', see: 'First it says "threshold does not separate". After the snap the black line sits at 0.05, on top of the dashed "SVM" line, and both "Margin at your threshold" and "Largest possible margin" read 0.450.', why: 'At 0.60 the failing reading at 0.5 is on the wrong side. The snap puts the threshold at the midpoint of the two closest opposite readings, (−0.4 + 0.5)/2, and the SVM finds the same place on its own.' },
    { do: 'Drag the slider "Your threshold" from −0.4 to 0.5 slowly and watch the black dot on the lower plot.', see: 'The margin readout climbs from 0 to 0.450 at 0.05, then falls back to 0 at 0.5. At −0.20 and at 0.30 it reads 0.200 both times.', why: 'Inside the gap the margin is min(t + 0.4, 0.5 − t): the closer reading sets it. The two sides of the tent are mirror images around the midpoint.' },
    { do: 'Drag a reading that is <b>not</b> ringed, for example the healthy one at −2.1, to about −1.0.', see: 'Nothing important changes: "Largest possible margin" stays 0.450 at 0.050 and the SVM line does not move.', why: 'Only the nearest healthy and nearest failing readings enter the formula (a + b)/2. A reading further away than a is never nearest to a threshold in the gap.' },
    { do: 'Drag the ringed failing reading at 0.5 left, into the gap, to about 0.2.', see: 'The tent shrinks: "Largest possible margin" falls to about 0.300 at about −0.100, and the SVM line follows it.', why: 'The closest pair is now (−0.4, 0.2), so the gap is 0.6 and the best threshold is its midpoint, −0.1. Moving a support point moves the answer.' },
    { do: 'Press <i>Add an odd reading</i> (a failing reading at −1.2, among the healthy ones).', see: '"Largest possible margin" says "none: the groups overlap" and the tent flattens to zero. The SVM still draws a line (threshold about −0.100, half-width 0.600, 4 support points).', why: 'No threshold can separate the classes now, so a hard margin has no answer. At C = 1000 the SVM accepts one error and keeps the street narrow.' },
    { do: 'With the odd reading in place, drag "SVM penalty C" from 1000 down to 0.01.', see: 'The half-width grows (0.600 to 8.130) and the support points climb from 4 to 12. At C = 0.01 the SVM threshold reads −5.980, far off the left edge of the plot.', why: 'A small C makes broken rules cheap, so the SVM prefers a tiny w: a huge street. With 7 failing and 6 healthy readings, the threshold slides away until every reading is called failing.' }],
  remember: [
    { tag: 'Picture', text: 'Find the <b>gap</b>, stand in the <b>middle</b>. The two readings touching the gap are the only ones that matter: the rings.' },
    { tag: 'Formula in words', text: 'Best threshold = average of the two closest opposite readings, <span class="eq">(a + b)/2</span>. Margin = half the gap between them, <span class="eq">(b − a)/2</span>.' },
    { tag: 'Sanity check', text: 'At the best threshold the distances to the nearest reading on the left and on the right are <b>equal</b>. If they differ (0.2 and 0.7, say), slide the threshold towards the farther side until they match.' },
    { tag: 'Rule of thumb', text: '<b>Margin = how much a reading can wiggle before its label flips.</b> Margin 0.45 means measurement noise up to 0.45 on the nearest readings is harmless.' },
    { tag: 'Trick', text: '<b>Margin is the half, street is the whole.</b> Street = 2 × margin = 2/|w|. On one feature with a hard margin, the street fills the gap exactly (0.9 here).' },
    { tag: 'Link to code', text: '<code>-svm.intercept_[0] / svm.coef_[0, 0]</code> is the threshold and <code>1 / abs(svm.coef_[0, 0])</code> is the margin. Both come from the same two numbers w and b.' }],
  mistakes: [
    { wrong: '"The best threshold is the midpoint of the two class averages."', right: 'It is the midpoint of the two <b>closest</b> readings. Here the class averages give 0.10 (margin 0.40), the closest pair gives 0.05 (margin 0.45). The SVM never looks at averages.' },
    { wrong: '"The margin is the whole gap between the classes."', right: 'The gap is 0.9. The margin is the distance from the threshold to the nearest reading, 0.45: half of it. The street, 2 × margin, is the whole gap.' },
    { wrong: '"Adding more readings must move the best threshold."', right: 'Only if the new reading lands <b>inside</b> or beyond the current closest pair. A new healthy reading at −3 changes nothing.' },
    { wrong: '"C = 1000 means no mistakes are allowed."', right: 'C is a price, not a ban. With the odd reading present, C = 1000 still returns a threshold, and it makes 1 training error.' }],
  code: [
    {
      title: 'Find the best threshold by hand: the midpoint of the closest pair',
      py: 'import numpy as np\n\nx = np.array([-2.1, -1.7, -1.4, -1.0, -0.7, -0.4, 0.5, 0.9, 1.2, 1.6, 2.0, 2.3])\ny = np.array([-1] * 6 + [1] * 6)              # -1 healthy (left), +1 failing (right)\n\na, b = x[y == -1].max(), x[y == 1].min()      # the closest healthy and closest failing reading\nprint("closest pair:", a, b)\nprint("best threshold:", round((a + b) / 2, 2), " margin:", round((b - a) / 2, 2))\nfor t in [-0.2, 0.05, 0.3]:                   # other thresholds inside the gap\n    print("threshold", t, "-> margin", round(float(np.abs(x - t).min()), 2))',
      out: 'closest pair: -0.4 0.5\nbest threshold: 0.05  margin: 0.45\nthreshold -0.2 -> margin 0.2\nthreshold 0.05 -> margin 0.45\nthreshold 0.3 -> margin 0.2',
      walk: [
        ['y = np.array([-1] * 6 + [1] * 6)', 'Six labels of −1 followed by six of +1. List repetition (<code>[-1] * 6</code>) is a quick way to write a label column.'],
        ['x[y == -1]', 'A <b>boolean mask</b>: <code>y == -1</code> is True for the healthy readings, and indexing with it keeps only those.'],
        ['x[y == -1].max(), x[y == 1].min()', 'The largest healthy reading and the smallest failing reading: the two edges of the gap, a and b.'],
        ['(a + b) / 2 and (b - a) / 2', 'The midpoint and the half-gap: the best threshold and its margin.'],
        ['np.abs(x - t).min()', 'The margin of any threshold t: the smallest distance from t to any reading. <code>x - t</code> subtracts t from every reading at once.']],
      tip: 'This only works when the classes are separable and in one feature. The SVM code below gives the same answer and also handles the odd reading.'
    },
    {
      title: 'Let the SVM find the same threshold from w and b',
      py: 'import numpy as np\nfrom sklearn.svm import SVC\n\nx = np.array([-2.1, -1.7, -1.4, -1.0, -0.7, -0.4, 0.5, 0.9, 1.2, 1.6, 2.0, 2.3])\ny = np.array([-1] * 6 + [1] * 6)\n\nsvm = SVC(kernel="linear", C=1e6).fit(x.reshape(-1, 1), y)   # one feature, so one column\nw, b = svm.coef_[0, 0], svm.intercept_[0]\nprint("w =", round(float(w), 3), " b =", round(float(b), 3))\nprint("threshold -b/w =", round(float(-b / w), 3), " half-width 1/w =", round(float(1 / w), 3))\nprint("support readings:", svm.support_vectors_.ravel().tolist())',
      out: 'w = 2.222  b = -0.111\nthreshold -b/w = 0.05  half-width 1/w = 0.45\nsupport readings: [-0.4, 0.5]',
      walk: [
        ['x.reshape(-1, 1)', 'sklearn wants a table: rows are readings, columns are features. <code>reshape(-1, 1)</code> turns the 12 numbers into 12 rows and 1 column. The <code>-1</code> means "work out the row count yourself".'],
        ['SVC(kernel="linear", C=1e6)', 'A linear SVM with a huge price for breaking the rule, so on separable data it behaves like a hard margin.'],
        ['svm.coef_[0, 0]', 'The learned w. <code>coef_</code> is a 2-D array (one row per boundary, one column per feature), so a single feature needs <code>[0, 0]</code>.'],
        ['-b / w and 1 / w', 'The threshold is where f(x) = w·x + b equals 0, so x = −b/w. The street edges are at f = ±1, so the half-width is 1/w.'],
        ['svm.support_vectors_.ravel()', 'The readings that touch the street, as a column; <code>ravel()</code> flattens it to a plain row.']],
      tip: 'The numbers w = 2.222 and b = −0.111 are what you get by solving the two edge equations by hand.'
    },
    {
      title: 'Add an odd reading and sweep C',
      py: 'import numpy as np\nfrom sklearn.svm import SVC\n\nx = np.array([-2.1, -1.7, -1.4, -1.0, -0.7, -0.4, 0.5, 0.9, 1.2, 1.6, 2.0, 2.3, -1.2])\ny = np.array([-1] * 6 + [1] * 6 + [1])       # the last reading, at -1.2, is an odd "failing" one\nX = x.reshape(-1, 1)\n\nfor C in [1000, 1, 0.1, 0.01]:\n    svm = SVC(kernel="linear", C=C).fit(X, y)\n    w, b = svm.coef_[0, 0], svm.intercept_[0]\n    errors = int((svm.predict(X) != y).sum())\n    print(f"C={C:<6} threshold={-b / w:6.2f}  half-width={1 / w:5.2f}  support={len(svm.support_):2d}  errors={errors}")',
      out: 'C=1000   threshold= -0.10  half-width= 0.60  support= 4  errors=1\nC=1      threshold= -0.05  half-width= 0.95  support= 6  errors=1\nC=0.1    threshold= -0.05  half-width= 1.65  support=10  errors=1\nC=0.01   threshold= -5.98  half-width= 8.13  support=12  errors=6',
      walk: [
        ['[1] ... + [1]', 'The last label is +1 even though the reading sits among the healthy ones: that is what makes it "odd".'],
        ['for C in [1000, 1, 0.1, 0.01]', 'Refit the same model at four prices. C is a value you choose before fitting, not something the model learns.'],
        ['svm.support_', 'The row numbers of the support points. <code>len(...)</code> counts them: 4 at the strict end, 12 of the 13 readings at the lenient end.'],
        ['svm.predict(X) != y', 'A True/False list marking the readings the model gets wrong; <code>.sum()</code> counts the Trues.'],
        ['f"C={C:<6} ... {x:6.2f}"', 'An f-string. <code>:&lt;6</code> pads on the right to width 6, <code>:6.2f</code> means width 6 with 2 decimals, so the columns line up.']],
      tip: 'At C = 0.01 the 6 errors are exactly the six healthy readings: the threshold has left the data and everything is called failing.'
    }],
  check: [
    { q: 'Why is the threshold halfway between the two closest opposite readings the best one?', options: ['The distances to the nearest reading on each side are equal, so the smaller of the two is as large as it can be', 'It is the only threshold with zero training errors', 'It is the average of all the readings', 'It makes the street as narrow as possible'], answer: 0, why: 'Many thresholds have zero training errors, so that cannot be the reason. The margin is the smaller of the two distances, and it is largest when they are equal, which is the midpoint.' },
    { q: 'A trained SVM on one feature has <code>coef_ = [[0.25]]</code> and <code>intercept_ = [-4.0]</code>. What are the threshold and the margin?', options: ['threshold 16, margin 4', 'threshold 4, margin 16', 'threshold 16, margin 8', 'threshold −4, margin 0.25'], answer: 0, why: 'The threshold is −b/w = 4 / 0.25 = 16. The margin (half-width) is 1/w = 4. The street, 2/w = 8, is twice the margin.' },
    { q: 'You drag the closest failing reading from 0.5 to 0.2, towards the healthy group (closest healthy reading: −0.4). What happens to the best threshold and the margin?', options: ['The threshold moves to −0.1 and the margin falls to 0.3', 'Nothing changes, because this reading is not a support point', 'The threshold stays at 0.05 and the margin falls to 0.3', 'The threshold moves to −0.1 and the margin stays 0.45'], answer: 0, why: 'This reading is a support point, so moving it changes the answer. The new closest pair is (−0.4, 0.2): midpoint −0.1, margin (0.2 + 0.4)/2 = 0.3.' }],
  teachback: { prompt: 'In two sentences, explain to a friend where to put the threshold between two groups on a number line and which readings decide it.', model: 'Many thresholds sort the training readings correctly, so I pick the one with the most room: halfway between the highest healthy and the lowest failing reading, where the distance to the nearest reading is the same on both sides. Only those two closest readings matter, and the distance to them is the margin.' },
  cheat: 'Margin of a threshold = distance to the nearest reading. Best threshold = midpoint of the two closest opposite readings: t = (a + b)/2, margin (b − a)/2. The SVM writes the same thing as f(x) = w·x + b with threshold −b/w, margin 1/|w|, street 2/|w|. One odd reading removes the hard margin; C prices the broken rule.'
};
