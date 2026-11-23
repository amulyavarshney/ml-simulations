// Lesson for svm-margin/max-margin. This is the model lesson: copy its depth, tone and structure.
module.exports = {
  idea: 'Many lines can split two groups of points. A support vector machine picks the one with the <b>widest empty street</b> around it, and only the few points touching that street decide where it goes.',
  why: 'A line that squeezes past one group will misjudge new customers who are only slightly different from the ones you trained on. The line with the most room on both sides is the safest guess for points you have not seen yet.',
  analogy: 'Painting the centre line on a road between two rows of parked cars. You could paint it hugging one row, but the careful choice is the middle, with the most space on both sides. Only the car nearest the line on each side decides where the middle is. Cars further back do not matter.',
  vocab: [
    ['Decision boundary', 'The line (in 2 features) or flat surface (in more) where the model switches from one class to the other: all points with <span class="eq">w·x + b = 0</span>.'],
    ['Margin', 'The distance from the boundary to the nearest point, <span class="eq">1/‖w‖</span>. It is half of the street.'],
    ['Street', 'The empty band around the boundary, <span class="eq">2/‖w‖</span> wide: twice the margin. Its two edges are <span class="eq">w·x + b = +1</span> and <span class="eq">−1</span>.'],
    ['Support vector', 'A training point sitting exactly on an edge of the street. Remove it and the boundary moves. Remove any other point and nothing changes.'],
    ['w and b', '<b>w</b> is the weight vector. It points across the street and sets its direction and width. <b>b</b> slides the line sideways.'],
    ['Hard margin', 'The strict rule: no point may be inside the street or on the wrong side. It only exists when the groups are <i>separable</i>.'],
    ['Separable', 'At least one straight line puts all of class A on one side and all of class B on the other.']],
  steps: [
    { h: 'Start with the plain problem', p: 'Each customer is a point, described by two numbers. Blue means repaid, orange means defaulted. A classifier is a rule that colours the plane: everything on one side of a line is predicted blue, the rest orange.' },
    { h: 'Many lines do the job', p: 'If the groups do not touch, there are infinitely many lines that put every training point on its correct side. The faint grey lines in the simulation are a few of them. All score 100% on the training data, so <b>training accuracy cannot choose between them</b>.' },
    { h: 'A good line leaves room', p: 'Tilt a line until it almost touches one blue point. It still classifies the training data correctly, but a new blue customer a little to the right would land on the orange side. A line far from both groups tolerates more variation in new data.' },
    { h: 'Measure the room: the margin', p: 'For a line <span class="eq">f(x) = w·x + b = 0</span>, the distance from a point to the line is <span class="eq">|f(x)| / ‖w‖</span>. Scale w and b so that the nearest points on each side have <span class="eq">f = +1</span> and <span class="eq">f = −1</span>. Then the nearest points are <span class="eq">1/‖w‖</span> from the line (the <b>margin</b>) and the street between them is <b>2 / ‖w‖</b> wide.' },
    { h: 'Widest street means smallest ‖w‖', p: 'Making 2/‖w‖ big is the same as making ‖w‖ small. So the SVM minimises <span class="eq">½‖w‖²</span> (squaring just makes the maths easier) subject to <span class="eq">yᵢ(w·xᵢ + b) ≥ 1</span> for every point. With yᵢ = ±1, that one inequality says: correct side <i>and</i> outside the street.' },
    { h: 'Only the touching points matter', p: 'At the answer, the inequality is an exact equality (yᵢ f(xᵢ) = 1) only for points on the street edges: the support vectors. All other points satisfy it with room to spare, so moving or deleting them cannot change the best line. The page shows this as "Delete a non-support point: change in line" reading max 0.0e+0.' },
    { h: 'When the groups overlap, hard margin fails', p: 'If no line separates the groups, the inequalities cannot all hold and there is no answer. One stray point can also squeeze the street very narrow. The <b>soft margin</b> (next simulation) fixes both by letting points break the rule at a price, called C.' }],
  example: {
    title: 'three customers, solved by hand',
    setup: 'Two features per customer (think: a standardised income score and a savings score). One defaulted, at <b>(1, 1)</b>, label −1. Two repaid, at <b>(3, 3)</b> and <b>(4, 3)</b>, label +1.',
    table: { head: ['Point', 'Label y', 'f(x) = 0.5·x₁ + 0.5·x₂ − 2', 'y · f(x)', 'Role'], rows: [
      ['(1, 1)', '−1', '−1.0', '1.0', 'on the street edge: support vector'],
      ['(3, 3)', '+1', '+1.0', '1.0', 'on the street edge: support vector'],
      ['(4, 3)', '+1', '+1.5', '1.5', 'outside the street: not a support vector']] },
    walk: [
      'Guess: the closest opposite pair is (1,1) and (3,3). The best line should sit halfway between them, passing through the midpoint (2, 2), at right angles to the segment joining them.',
      'That segment points along (1, 1), so <b>w</b> must point that way too: w = (a, a).',
      'Edge conditions: <span class="eq">w·(3,3) + b = +1</span> gives 6a + b = 1, and <span class="eq">w·(1,1) + b = −1</span> gives 2a + b = −1.',
      'Subtract the second from the first: 4a = 2, so <b>a = 0.5</b>, and then <b>b = −2</b>. So w = (0.5, 0.5), b = −2.',
      'Street width = 2/‖w‖ = 2 / √(0.25 + 0.25) = 2 / 0.707 = <b>2.83</b>. That equals the distance between (1,1) and (3,3), which is √8 = 2.83. The two answers agree.',
      'Check the third point: f(4, 3) = 0.5·4 + 0.5·3 − 2 = 1.5, which is more than 1. It is safely outside the street, so it is <b>not</b> a support vector. Delete it, or move it to (9, 3), and w and b do not change.'],
    result: 'Two support vectors, <span class="eq">w = (0.5, 0.5)</span>, <span class="eq">b = −2</span>, street width 2.83 (margin 1.41). A new customer at (2.2, 2.2) gets f = 0.2: positive, so "repaid", but only just, because it sits close to the boundary. The size of f tells you the distance, and its sign tells you the side.' },
  read: [
    ['Blue circles and orange triangles', 'The two classes. Click the plot to add points; drag a point to move it.'],
    ['Solid black line', 'The maximum-margin boundary, where <span class="eq">f(x) = 0</span>.'],
    ['Dashed lines', 'The street edges, where <span class="eq">f(x) = ±1</span>. The street is the empty band between them.'],
    ['Black rings around points', 'The support vectors: the points touching a dashed edge.'],
    ['Faint grey lines', 'Other lines that also separate the data (tick box "Show other separating lines"). They are the "many lines do the job" from step 2, and they are re-drawn at random after each edit.'],
    ['Readout: Separable?', '"yes" if some line splits the classes. "no: the groups overlap" means a hard margin cannot exist, and the other readouts show "–".'],
    ['Readouts: w and b', 'The learned weights and offset. A bigger ‖w‖ means a narrower street.'],
    ['Readout: Street width', 'The value of 2/‖w‖, in the same units as the axes.'],
    ['Readout: Support vectors', 'How many points touch the street, written like "3 of 28".'],
    ['Readout: Delete a non-support point: change in line', 'The largest movement of the boundary over every way of deleting one non-support point, written like "max 0.0e+0". Zero means none of them moves it.'],
    ['Readout: Delete a support vector: change in line', 'The median movement when you delete one support vector, written like "median 0.183". It is clearly above zero.']],
  experiments: [
    { do: 'Keep <i>Start from</i> on <i>Two separated groups</i>. Under "Click on the plot to…" choose <i>remove</i> and click two or three blue circles that are <b>not</b> ringed.', see: 'The black line and dashed lines do not move: street width stays 1.164 and w stays about (1.62, 0.57). "Delete a non-support point: change in line" keeps reading max 0.0e+0. (The faint grey lines are re-drawn at random: ignore them.)', why: 'A point strictly outside the street satisfies yᵢ f(xᵢ) > 1 with room to spare. The best line was decided by the points on the edges, so removing a far point cannot change it.' },
    { do: 'On <i>Two separated groups</i>, drag one ringed point about 0.3 units away from the street, towards its own group.', see: 'The street gets wider, from 1.164 to about 1.18 to 1.46 depending on which ringed point you move, and the ring may jump to another point.', why: 'The street can only grow until it touches a point again. The nearest points always define the width, so moving a support vector changes the street, while moving a far point does not.' },
    { do: 'Switch <i>Start from</i> to <i>Separated groups + one odd point</i>.', see: 'Street width reads 0.467 and w grows to (4.04, 1.43). Without the odd orange point the same groups would have a street of 1.716. The line itself turns by only about 1.4°.', why: 'A hard margin obeys every point without exception, so a single outlier can dictate the whole boundary. This weakness is exactly why the soft margin exists.' },
    { do: 'Switch <i>Start from</i> to <i>Overlapping groups</i>.', see: 'Readout "Separable?" says "no: the groups overlap", and the street, the other lines and the other readouts disappear.', why: 'When no line can put every point on its correct side, the constraints cannot all be met, so a hard-margin SVM has no solution.' },
    { do: 'On <i>Two separated groups</i>, use <i>add blue</i> and <i>add orange</i> under "Click on the plot to…" to place four or five new points of each colour near the far edges, blue on the left and orange on the right.', see: 'The line does not move: w stays (1.62, 0.57), the street stays 1.164 and "Support vectors" still shows 3.', why: 'Far points are not support vectors. Only points touching the street have any influence, which is why SVMs are said to depend on a small subset of the training data.' }],
  remember: [
    { tag: 'Picture', text: 'Widest <b>street</b>, touching <b>cars</b> decide. The rings are the cars that touch the line.' },
    { tag: 'Rule of thumb', text: '<b>Small w, wide street.</b> Width is 2/‖w‖, so shrinking ‖w‖ widens the street. "Minimise ‖w‖" and "maximise the margin" are the same instruction.' },
    { tag: 'Read the sign and size', text: 'For any point, <b>sign of f(x)</b> is the predicted side and <b>|f(x)|</b> is how far it is from the line (in units of 1/‖w‖). |f| = 1 means exactly on a street edge.' },
    { tag: 'Decode the inequality', text: '<span class="eq">y·f(x) ≥ 1</span> reads as "on the correct side <i>and</i> outside the street" in one go. If y·f is between 0 and 1 the point is correct but inside the street; below 0 it is wrong.' },
    { tag: 'Sanity check', text: 'Few support vectors usually means a clean, well-separated problem. If almost every point is a support vector, the classes overlap a lot.' }],
  mistakes: [
    { wrong: '"The SVM line is the line closest to the points."', right: 'It is the line <b>farthest</b> from the nearest points on both sides: it maximises the smallest distance.' },
    { wrong: '"Every training point affects the boundary."', right: 'Only the <b>support vectors</b> do. Delete the rest and the boundary stays exactly where it was.' },
    { wrong: '"The street width is ‖w‖."', right: 'It is <b>2/‖w‖</b>. They move in opposite directions: big ‖w‖, thin street.' },
    { wrong: '"A hard-margin SVM works on any data."', right: 'Only on <b>separable</b> data. With overlap or a stray point you need the soft margin (parameter C).' }],
  code: [
    {
      title: 'Fit a (nearly) hard-margin linear SVM and read what it learned',
      py: 'import numpy as np\nfrom sklearn.svm import SVC\n\nX = np.array([[1, 1], [3, 3], [4, 3]])   # three customers, two features\ny = np.array([-1, 1, 1])                  # -1 = defaulted, +1 = repaid\n\nsvm = SVC(kernel="linear", C=1e6)         # huge C: (almost) no violations allowed\nsvm.fit(X, y)\n\nprint("w =", np.round(svm.coef_[0], 3), " b =", round(float(svm.intercept_[0]), 3))\nprint("support vectors:", svm.support_vectors_.tolist())\nprint("street width:", round(2 / float(np.linalg.norm(svm.coef_[0])), 3))',
      out: 'w = [0.5 0.5]  b = -2.0\nsupport vectors: [[1.0, 1.0], [3.0, 3.0]]\nstreet width: 2.828',
      walk: [
        ['SVC(kernel="linear", C=1e6)', 'Build the model object. <code>kernel="linear"</code> means a straight boundary. <code>C</code> is the price of breaking the rules; a huge C makes it behave like a hard margin.'],
        ['svm.fit(X, y)', '<code>fit</code> learns from the data. Features first (a 2-D array, one row per customer), labels second.'],
        ['svm.coef_[0]', 'The learned <b>w</b>. Attributes that end in an underscore are results of fitting. <code>coef_</code> has one row per boundary, hence <code>[0]</code>.'],
        ['svm.intercept_[0]', 'The learned <b>b</b>.'],
        ['svm.support_vectors_', 'The training rows that ended up on the street edges: exactly the rings in the picture.'],
        ['2 / np.linalg.norm(w)', 'The street width formula 2/‖w‖. <code>np.linalg.norm</code> computes ‖w‖.']],
      tip: 'Labels may be any two values (−1/+1, 0/1, strings). Only the features must be numbers.'
    },
    {
      title: 'Score a new customer: side and confidence',
      py: 'import numpy as np\nfrom sklearn.svm import SVC\n\nX = np.array([[1, 1], [3, 3], [4, 3]])\ny = np.array([-1, 1, 1])\nsvm = SVC(kernel="linear", C=1e6).fit(X, y)    # fit returns the model, so you can chain\n\nnew = np.array([[2.2, 2.2]])                   # note the double brackets: one row\nprint("f(x) =", np.round(svm.decision_function(new), 3))\nprint("class:", svm.predict(new))',
      out: 'f(x) = [0.2]\nclass: [1]',
      walk: [
        ['.fit(X, y)', 'Returns the fitted model itself, so <code>SVC(...).fit(X, y)</code> builds and trains in one line.'],
        ['new = np.array([[2.2, 2.2]])', 'sklearn always wants a 2-D table: rows are customers, columns are features. One customer is a table with one row, hence the double brackets.'],
        ['svm.decision_function(new)', 'Returns f(x) = w·x + b: the signed distance score. Here 0.5·2.2 + 0.5·2.2 − 2 = 0.2.'],
        ['svm.predict(new)', 'Just the sign of f turned into a class label: positive gives +1.']],
      tip: 'If the numbers disagree with your hand calculation, check that you used the same scaling. SVMs need scaled features (see the scaling simulation).'
    }],
  check: [
    { q: 'A trained SVM has <span class="eq">w = (2, 0)</span>. How wide is the street?', options: ['2', '1', '0.5', '4'], answer: 1, why: 'Width = 2/‖w‖ = 2/2 = 1. A bigger ‖w‖ means a narrower street.' },
    { q: 'You delete a training point that is <b>not</b> a support vector and refit a hard-margin SVM. What happens to the boundary?', options: ['It does not change', 'It moves slightly', 'The street gets wider', 'The SVM becomes soft-margin'], answer: 0, why: 'Only support vectors define the boundary. A point with yᵢ f(xᵢ) > 1 has no say, so the same line is still optimal.' },
    { q: 'Which condition means "point i is on its correct side and outside the street"?', options: ['yᵢ (w·xᵢ + b) ≥ 1', 'w·xᵢ + b = 0', '‖w‖ ≥ 1', 'yᵢ = sign(b)'], answer: 0, why: 'y is ±1 and f(x) has the sign of the side, so y·f ≥ 1 means correct side with at least 1 unit to spare, which is exactly outside the street.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why an SVM chooses the widest street, and which points control the result.', model: 'Lots of lines split the training data, so the SVM picks the one with the most empty space around it, because that leaves the most room for new points to still land on the right side. Only the points that touch the edge of the street (the support vectors) set the line; deleting any other point changes nothing.' },
  cheat: 'SVM = widest street between the classes. Street width = 2/‖w‖, so minimise ‖w‖ subject to y(w·x + b) ≥ 1. Only support vectors (on the street edges) decide the line. Hard margin needs separable data; overlap needs the soft margin (C).'
};
