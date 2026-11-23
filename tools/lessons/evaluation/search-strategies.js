// Lesson for evaluation/search-strategies: grid, random and TPE search under a fixed budget of trials.
module.exports = {
  idea: 'You can afford only a few trained models. Grid search spends them on a tidy lattice, random search on random settings, and TPE (the default in Optuna) learns from earlier trials where to look next. Which one wins depends on how many knobs actually matter.',
  why: 'C and γ change an SVM\'s accuracy by up to 20 points (69% to 89% on the default data), and every trial costs a full cross-validation. A wasteful search leaves accuracy on the table, or burns hours repeating the same values of a knob that does not matter.',
  analogy: 'Finding the best oven temperature and baking time with only 9 test cakes. A grid bakes at 3 temperatures × 3 times, so you only ever learn about 3 temperatures. Random baking tries 9 different temperatures. Smart baking tastes each cake and bakes the next ones near the best so far. If time hardly matters, the grid wasted six cakes.',
  vocab: [
    ['Hyperparameter', 'A setting you choose before training (C, γ, k in k-NN), not learned from data. Weights are parameters; C is a hyperparameter.'],
    ['Trial', 'One setting tried and scored by cross-validation. With 5 folds, one trial is 5 model fits.'],
    ['Budget', 'The number of trials you can afford. It is set by time and money, not by the method.'],
    ['Grid search', 'Try every combination from fixed lists. g values for each of k knobs cost g<sup>k</sup> trials.'],
    ['Random search', 'Each trial draws every knob independently from its range.'],
    ['TPE', 'Tree-structured Parzen Estimator, a smart search. It separates good trials from bad ones so far and proposes the next trial where good ones were common and bad ones rare.'],
    ['Log scale', 'Spacing by factors (0.1, 1, 10, 100) instead of steps. Right for C and γ, where a factor of 10 matters, not a step of 10.'],
    ['Good region', 'The cells of the map whose score is close to the best. Its share of the map, q, decides how easily a random trial finds it.']],
  steps: [
    { h: 'Tuning is a search on a map', p: 'Every pair (C, γ) has a score: its 5-fold cross-validated accuracy. Together the pairs form a map. In the simulation the map has 15 × 15 = 225 pairs, with scores from 69.2% to 89.2%. Scoring one pair is one <b>trial</b>. You can afford only a few trials, so you only ever look at a few cells.' },
    { h: 'Grid search: a tidy lattice', p: 'List some values for each knob and try every combination. Three values of C and three of γ give 9 trials, but only <b>3 different C values</b> and 3 different γ values: each C is repeated for every γ. With g values for each of k knobs a grid costs g<sup>k</sup> trials, so every extra knob multiplies the cost.' },
    { h: 'Random search: every trial is new', p: 'Draw each knob independently from its range. Nine trials give nine different C values and nine different γ values (on the simulation\'s 15-step map draws sometimes repeat, so about 7 of each). Draw C and γ on a <b>log scale</b>: going from 0.1 to 1 matters as much as from 10 to 100.' },
    { h: 'How many random trials do you need?', p: 'Say a share q of the map is "good" (near the best). One random trial misses it with probability 1 − q. All n trials miss with <span class="eq">(1 − q)<sup>n</sup></span>, so the chance of at least one hit is <span class="eq">1 − (1 − q)<sup>n</sup></span>. For 95% you need <span class="eq">n = ln 0.05 / ln(1 − q)</span>: 59 trials when q = 5%, 29 when q = 10%.' },
    { h: 'The real case for random: a knob that does not matter', p: 'If one knob has no effect, a 3 × 3 × 3 grid spends 27 trials but visits only 9 different (C, γ) pairs, because each pair is repeated for every value of the useless knob. 27 random trials visit 27 different pairs. This, not magic, is why random search beats a grid when only a few of many knobs matter.' },
    { h: 'Smart search: learn from earlier trials', p: 'TPE starts with a few random trials (5 in the simulation, 10 in Optuna). It then sorts the trials so far into a good group (the best quarter here; about the best 10% in Optuna) and the rest, and fits a smooth density to each: <i>l</i>(x) for good, <i>g</i>(x) for bad. The next trial goes where <span class="eq">l(x) / g(x)</span> is largest.' },
    { h: 'What the simulation shows, honestly', p: 'At 9 models on the default map: grid 89.2% (a lucky grid), random 87.7% on average, TPE 87.8%. One random draw ranges from 85.8% to 88.3%. At 20 models all three are within 0.3 points (88.3%, 88.4%, 88.6%), because with two knobs the good band is wide. TPE does concentrate its trials: at 40 trials 41% land in the best 13% of cells (random: 14%), but the score gain is 0.1 points.' },
    { h: 'The best score a search reports is flattered', p: 'Whatever the strategy, <code>best_score_</code> is the maximum of many noisy scores, so it is biased upwards. A search helps you <i>choose</i> settings. To <i>report</i> performance, use nested cross-validation or a test set the search never saw (see the nested-CV simulation).' }],
  example: {
    title: 'planning a 9-model search on the default map',
    setup: 'The default map (moons, noise 0.3, 120 training points) has 225 cells. The best scores 89.2% and the worst 69.2%. Call a cell <i>good</i> if it is within 2 points of the best (at least 87.2%). 30 of the 225 cells are good, so <span class="eq">q = 30 / 225 = 0.133</span>. You may train 9 models.',
    table: { head: ['Strategy', 'Models', 'Different C values', 'Different γ values', 'Chance of at least one trial in the good 13%'], rows: [
      ['3 × 3 grid', '9', '3', '3', 'No dice involved: the 9 fixed points hit or miss. Here they hit (89.2%).'],
      ['9 random pairs', '9', 'about 7 (7.1 on average)', 'about 7', '1 − 0.867<sup>9</sup> = 72% by formula (76% over 100 draws)'],
      ['9 TPE trials', '9', 'about 7', 'about 7', '73% over 100 draws: the first 5 trials are random, so no gain yet']] },
    walk: [
      'Grid: 3 values of C × 3 values of γ = 9 models. It tries <b>3</b> different C values. It has no randomness: it either lands in the good band or it does not.',
      'Random: each of the 9 trials picks its own C. On a map with 15 steps per axis some picks repeat, so the 9 picks cover about <b>7</b> different C values (7.1 averaged over 100 draws).',
      'One random trial misses the good band with probability 1 − 0.133 = 0.867.',
      'All 9 miss: 0.867<sup>9</sup> = 0.276. At least one hits: 1 − 0.276 = <b>0.72</b>.',
      'To be 95% sure: n = ln 0.05 / ln 0.867 = −2.996 / −0.143 = 20.9, so <b>21</b> trials.',
      'What is at stake: with 9 models random draws average 87.7%, the best cell is 89.2%, so missing the band costs about 1.5 points. A badly chosen C costs far more: the worst cell is 69.2%.',
      'Add a useless third knob with 3 values: the grid becomes 27 trials but still only 9 different (C, γ) pairs.'],
    result: 'With 9 models random search tries about 7 different C values against the grid\'s 3, and has a 72% chance of landing in the best 13% of the map (95% would take 21 trials). On this two-knob map the final scores are close: random 87.7% on average, grid 89.2%, TPE 87.8%, best possible 89.2%.' },
  read: [
    ['Three maps: Grid, Random, TPE (compact)', 'Each square is one (C, γ) pair: γ on the x axis, C on the y axis, both log scales (one step is a factor of 2.3). Colour is the 5-fold accuracy of the pair, on the same scale in all three maps (bar below the maps).'],
    ['Coloured dots (square, circle, triangle)', 'The pairs this strategy trained. A grid must be a whole a × b lattice, so it trains the biggest one that fits the budget (4 at budget 5, 36 at budget 40). Random and TPE use the whole budget.'],
    ['Black ring', 'The best of the pairs that strategy tried. The map title shows how many models were trained and the score ("Grid · 9 models · best 89.2%").'],
    ['Green diamond', 'The best cell on the whole map. A real search never sees the map, only the cells it trains.'],
    ['Table "What each strategy found with this budget"', 'Models trained, best accuracy found, how many different C and γ values were tried, and how many steps the nearest tried C was from the best cell\'s C ("0 steps (hit)" means it tried the best C).'],
    ['Slider "Budget: models you may train"', 'From 4 to 40 trials.'],
    ['Button "Draw again"', 'New seed for the random and TPE runs. The grid does not change, because it has no randomness.'],
    ['Button "Repeat 100 times"', 'Runs random and TPE 100 times for every budget from 1 to 40 and draws the line chart below.'],
    ['Line chart "Average best score against budget"', 'Green squares: grid (one run). Blue line: random. Dashed line: TPE. Bands: the middle 80% of the 100 runs. Grey dashed line: the best cell on the map. Vertical dashed line: your budget.'],
    ['Callout under the chart', 'At your budget: the average best score of each strategy, how many different C values random tries, and the chance of trying a C within one step of the best C.']],
  experiments: [
    { do: 'Answer "Predict first". On a freshly loaded page, with the budget at 9, press <i>Repeat 100 times</i>.', see: 'Callout: grid 89.2% with 3 different C values, random about 87.7% with about 7.1 different C values, TPE about 87.8%. Chance of trying a C within one step of the best: random about 90%, TPE about 85%.', why: 'Random search covers more values of C, so it nearly always tries a C near the best. But the good band is wide, so covering more C values buys less than a point of score.' },
    { do: 'After the repeats, drag the budget from 4 to 40 and watch the line chart.', see: 'Grid zigzags (about 86.7% at 4, 89.2% at 9, 87.5% at 16, 89.2% at 25). Random and TPE climb smoothly (about 86% at 4 to 88.7% at 40). From a budget of 16 up the three lines stay within 1 point of each other.', why: 'The grid\'s score depends on where its lines happen to fall, so it is not monotone. Random and TPE are averages over 100 runs. Once there are enough trials, any strategy lands somewhere in the wide good band.' },
    { do: 'At budget 9, press <i>Draw again</i> ten times and note the "Best found" of the Random row each time.', see: 'It ranges from about 85.8% to 88.3% from one draw to the next (the default draw gave 88.3%). The grid row never changes.', why: 'A single random search is a lottery ticket: 9 draws can miss the good band. Report which seed you used, and prefer more trials over cleverer ones when the budget allows.' },
    { do: 'Press <i>New data</i> once, then again, and compare the grid\'s "Best found" with the green diamond\'s score in the callout.', see: 'First new map: best cell 96.7%, the grid finds it. Second: best cell 91.7%, the grid\'s best is 90.0%.', why: 'The grid is deterministic, so it is lucky or unlucky about where its fixed points meet a new landscape. Over more maps it is neither better nor worse than random on two knobs.' },
    { do: 'Set the budget to 40 and look at where the dots of each map sit.', see: 'Grid: a regular 6 × 6 lattice. Random: scattered over the whole map. TPE: most dots crowd into the bright vertical stripe, γ roughly 0.7 to 19.', why: 'TPE keeps proposing where good trials were dense: about 69% of its trials have γ in that stripe, against 35% for random, and 41% land in the best 13% of cells against 14%. The stripe is wide, so this moves the best score by only about 0.1 points here.' }],
  remember: [
    { tag: 'Picture', text: 'Look at the dots <b>from the side</b>. A 3 × 3 grid projects onto only 3 values of C. 9 random points project onto 9. Count the different values per axis, not the dots.' },
    { tag: 'Formula in words', text: '<span class="eq">P(hit) = 1 − (1 − q)<sup>n</sup></span>. If the good region is q of the space, n random trials all miss with probability (1 − q)<sup>n</sup>. About 30 trials find a top-10% setting 96% of the time. About 60 find a top-5% setting 95% of the time.' },
    { tag: 'Rule of thumb', text: '<b>Log scale for C, γ and learning rates.</b> A plain uniform draw between 0.01 and 1,000 puts 99% of draws above 10 and almost never tries small values.' },
    { tag: 'Rule of thumb', text: '<b>Choose by situation.</b> One or two knobs and cheap trials: a grid is fine. Many knobs, few of which matter: random. Expensive trials or a narrow good region: TPE (Optuna).' },
    { tag: 'Sanity check', text: '<b>Is the best value on the edge of your range?</b> If the best C is the largest one you offered, the true best may be outside. Widen the range and search again.' },
    { tag: 'Link to code', text: '<code>GridSearchCV(estimator, param_grid)</code> takes lists. <code>RandomizedSearchCV(estimator, distributions, n_iter=...)</code> takes distributions, and <code>n_iter</code> is the budget. Both return <code>cv_results_</code>, <code>best_params_</code> and <code>best_score_</code>.' }],
  mistakes: [
    { wrong: '"Random search is always better than grid search."', right: 'On two knobs with a broad good region they are close (about a point apart on average). Random wins when some knobs matter little, because the grid wastes trials on repeated values.' },
    { wrong: '"Optuna gives a better model."', right: 'It finds good settings with fewer trials when the good region is narrow. It does not make the score honest: the best score it reports is still the maximum of many noisy scores.' },
    { wrong: '"A finer grid is a more careful search."', right: 'A grid with g values for each of k knobs costs g<sup>k</sup> trials, so a 10 × 10 × 10 grid is 1,000 trials, and a knob with no effect still repeats every pair of the other two.' },
    { wrong: '"The best trial is the best the model can do."', right: 'It is the best of the cells you looked at. The simulation can show the best of all 225 cells; a real search never can. With 9 random trials the gap is about 1.5 points on this map.' }],
  code: [
    {
      title: 'Grid versus random: how many different values does each try?',
      py: `from scipy.stats import loguniform
from sklearn.datasets import make_moons
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.svm import SVC

X, y = make_moons(n_samples=120, noise=0.3, random_state=4)
grid = GridSearchCV(SVC(), {"C": [0.1, 10, 1000], "gamma": [0.01, 1, 100]}, cv=5)       # 3 x 3 = 9 models
rand = RandomizedSearchCV(SVC(), {"C": loguniform(1e-2, 1e3), "gamma": loguniform(1e-3, 1e2)},
                          n_iter=9, cv=5, random_state=0)                                # 9 random pairs
for name, search in [("grid", grid), ("random", rand)]:
    res = search.fit(X, y).cv_results_
    print(name, "| models:", len(res["params"]), "| different C:", len(set(res["param_C"])), "| different gamma:", len(set(res["param_gamma"])))`,
      out: 'grid | models: 9 | different C: 3 | different gamma: 3\nrandom | models: 9 | different C: 9 | different gamma: 9',
      walk: [
        ['GridSearchCV(SVC(), {...}, cv=5)', 'Builds the search object; nothing is trained yet. The dict maps each parameter name to the list of values to try. Every combination is tried (3 × 3 = 9), each with 5-fold cross-validation.'],
        ['loguniform(1e-2, 1e3)', 'A distribution, not a list. It draws numbers between 0.01 and 1,000 so that every power of ten is equally likely (a log scale).'],
        ['RandomizedSearchCV(..., n_iter=9, random_state=0)', '<code>n_iter</code> is the budget: how many random pairs to draw. <code>random_state</code> fixes the draws so you get the same ones again.'],
        ['search.fit(X, y).cv_results_', 'Runs all the trials and returns a dictionary of arrays, one entry per trial. <code>fit</code> returns the search itself, so you can chain the attribute.'],
        ['set(res["param_C"])', 'The C used in each trial; <code>set</code> keeps each value once, so <code>len(set(...))</code> counts different values.']],
      tip: 'Scores are left out on purpose. On 20 moons datasets with these settings the grid averaged 0.902 and 9 random pairs 0.910, under a point apart. The difference you see here is coverage, not accuracy.'
    },
    {
      title: 'A knob that does nothing: 27 trials, but how many different pairs?',
      py: `from scipy.stats import loguniform
from sklearn.datasets import make_moons
from sklearn.model_selection import GridSearchCV, RandomizedSearchCV
from sklearn.svm import SVC

X, y = make_moons(n_samples=120, noise=0.3, random_state=4)
grid = {"C": [0.1, 10, 1000], "gamma": [0.01, 1, 100], "cache_size": [100, 200, 400]}   # cache_size changes memory use, not the model
space = {"C": loguniform(1e-2, 1e3), "gamma": loguniform(1e-3, 1e2)}
g = GridSearchCV(SVC(), grid, cv=5).fit(X, y)
r = RandomizedSearchCV(SVC(), space, n_iter=27, cv=5, random_state=0).fit(X, y)
pairs = lambda s: len({(p["C"], p["gamma"]) for p in s.cv_results_["params"]})
print("grid  : 27 models, different (C, gamma) pairs:", pairs(g))
print("random: 27 models, different (C, gamma) pairs:", pairs(r))`,
      out: 'grid  : 27 models, different (C, gamma) pairs: 9\nrandom: 27 models, different (C, gamma) pairs: 27',
      walk: [
        ['"cache_size": [100, 200, 400]', 'How many megabytes SVC may use to cache kernel values. It affects speed and memory, never the fitted model, so it is a perfect irrelevant knob.'],
        ['cv_results_["params"]', 'A list with one dictionary per trial, for example <code>{"C": 10, "gamma": 1, "cache_size": 200}</code>.'],
        ['{(p["C"], p["gamma"]) for p in ...}', 'A set comprehension. It builds the pair (C, gamma) of every trial and keeps each pair once, so its length is the number of different pairs.'],
        ['pairs = lambda s: ...', 'A one-line function, so both searches are counted by the same code.'],
        ['n_iter=27', 'Gives random search the same budget as the 3 × 3 × 3 grid.']],
      tip: 'This is the argument for random search that survives checking. A grid\'s score still depends on where its lines fall, so do not expect random to win every time, only to try three times as many (C, γ) pairs.'
    },
    {
      title: 'The usual recipe: a pipeline inside a randomised search',
      py: `import numpy as np
from scipy.stats import loguniform
from sklearn.datasets import make_moons
from sklearn.model_selection import RandomizedSearchCV
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
X, y = make_moons(n_samples=120, noise=0.3, random_state=4)
pipe = make_pipeline(StandardScaler(), SVC())                  # steps are named standardscaler and svc
space = {"svc__C": loguniform(1e-2, 1e3), "svc__gamma": loguniform(1e-3, 1e2)}   # step name, two underscores, parameter
res = RandomizedSearchCV(pipe, space, n_iter=20, cv=5, random_state=0).fit(X, y).cv_results_
for i in np.argsort(res["rank_test_score"])[:3]:               # the three best trials
    p = res["params"][i]
    print(f"CV {res['mean_test_score'][i]:.3f}  C={p['svc__C']:.2f}  gamma={p['svc__gamma']:.2f}")`,
      out: 'CV 0.900  C=2.03  gamma=7.99\nCV 0.892  C=5.55  gamma=3.77\nCV 0.892  C=1.31  gamma=1.70',
      walk: [
        ['make_pipeline(StandardScaler(), SVC())', 'Scaler and model as one estimator. The scaler is refitted inside every fold, so the search is leak-free. Steps are named after their classes in lower case.'],
        ['"svc__C"', 'Step name, two underscores, parameter name: how a search reaches a setting inside a pipeline.'],
        ['res["rank_test_score"]', 'Rank 1 is the best trial. <code>np.argsort</code> returns trial numbers ordered by rank, and <code>[:3]</code> keeps the first three.'],
        ['res["mean_test_score"][i]', 'The mean 5-fold accuracy of trial number <code>i</code>.'],
        ['p[\'svc__C\']:.2f', 'Reads the C of that trial and prints it with two decimals.']],
      tip: 'The same search with Optuna (not run here; Optuna is a separate install) looks like this. Write <code>def objective(trial)</code> that calls <code>trial.suggest_float("C", 1e-2, 1e3, log=True)</code> and the same for gamma, builds the pipeline and returns <code>cross_val_score(...).mean()</code>. Then <code>study = optuna.create_study(direction="maximize")</code>, <code>study.optimize(objective, n_trials=20)</code> and read <code>study.best_params</code>. Its default sampler is TPE.'
    }],
  check: [
    { q: 'Why can 9 random trials try more different C values than a 3 × 3 grid?', options: ['Random search runs faster per trial', 'Each random trial draws its own C, while the grid reuses its 3 values of C for every value of γ', 'Random search uses more cross-validation folds', 'Random search always finds the best cell'], answer: 1, why: 'A 3 × 3 grid has 3 values of C and repeats each three times. Nine random pairs have nine separate draws of C (fewer only if two draws happen to coincide).' },
    { q: 'A good region covers 10% of the search space. How many random trials give at least a 95% chance of landing in it at least once?', options: ['10', '20', '29', '95'], answer: 2, why: 'You need 1 − 0.9<sup>n</sup> ≥ 0.95, so 0.9<sup>n</sup> ≤ 0.05 and n ≥ ln 0.05 / ln 0.9 = 28.4. The smallest whole number is 29.' },
    { q: 'You add a third knob with no effect on the score and turn a 3 × 3 grid into a 3 × 3 × 3 grid. How many different (C, γ) pairs does it now try?', options: ['27', '18', '9', '3'], answer: 2, why: 'The useless knob multiplies the number of trials to 27 but creates no new (C, γ) pairs. Each of the 9 pairs is repeated three times.' }],
  teachback: { prompt: 'In two sentences, explain to a friend why 9 random trials can cover more of a hyperparameter space than a 3 × 3 grid, and when that matters.', model: 'A 3 × 3 grid reuses the same 3 values of each knob, so it only learns about 3 values of each, while 9 random trials try 9 different values of each. It matters most when some knobs barely affect the score, because then the grid wastes trials repeating settings of the knobs that do matter.' },
  cheat: 'Tuning is a search under a trial budget. Grid: g values per knob, g^k trials, only g different values per knob. Random: every trial new; P(hit a good region of share q) = 1 − (1 − q)^n. TPE (Optuna) learns where good trials were. On two knobs they tie within about a point; random wins when knobs are irrelevant. best_score_ is still optimistic: use nested CV.'
};
