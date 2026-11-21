"""Reference values from scikit-learn and SciPy for ml-decide.js. Run: python3 tests/make_reference_decide.py  (needs numpy, scipy, scikit-learn).
Writes tests/reference_decide.json: brier_score_loss, log_loss, calibration_curve (uniform bins), IsotonicRegression, Platt scaling as an
unregularised logistic regression on the scores, GaussianNB and KNeighborsClassifier probabilities, exact McNemar p-values (binomtest),
chi-square and Student-t distribution functions, the regularised incomplete beta function, one-sample t-tests, and per-group confusion matrices."""
import json
import numpy as np
from scipy import stats, special
from sklearn.metrics import brier_score_loss, log_loss, confusion_matrix, precision_score, recall_score
from sklearn.calibration import calibration_curve
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier

rs = np.random.RandomState(20261)
ref = {}
sig = lambda z: 1 / (1 + np.exp(-z))

# ---- probability sets used by several checks ----
def prob_sets():
    sets = []
    p = rs.beta(0.6, 0.3, size=300); y = (rs.rand(300) < 0.5 * p + 0.35).astype(int); sets.append((p, y))          # over-confident, mass near 0 and 1
    p = sig(rs.normal(0, 1.5, size=500)); y = (rs.rand(500) < p).astype(int); sets.append((p, y))                    # calibrated
    p = np.round(rs.rand(400) * 5) / 5; y = (rs.rand(400) < 0.15 + 0.7 * p).astype(int); sets.append((p, y))         # multiples of 0.2 (ties, values on bin edges)
    p = np.round(rs.rand(350) * 10) / 10; y = (rs.rand(350) < p).astype(int); sets.append((p, y))                    # multiples of 0.1 (ties, values on bin edges)
    p = rs.rand(60); p[:4] = [0.0, 1.0, 1.0, 0.0]; y = (rs.rand(60) < p).astype(int); sets.append((p, y))            # exact 0 and 1
    return sets

# ---- Brier score and log-loss ----
ref["scores"] = []
for p, y in prob_sets():
    p2 = np.clip(p, 1e-9, 1 - 1e-9) if (p == 0).any() or (p == 1).any() else p   # log-loss compared away from the clip ...
    ref["scores"].append({"p": p.tolist(), "y": y.tolist(), "brier": float(brier_score_loss(y, p)), "p_ll": p2.tolist(), "logloss": float(log_loss(y, p2))})
# ... and once with probabilities of exactly 0 and 1 that are wrong, to check the clipping rule
yw = np.array([0, 1, 1, 0, 1, 1, 0, 1]); pw = np.array([1.0, 1.0, 0.0, 0.2, 0.9, 0.7, 0.0, 0.5])
ref["logloss_clip"] = {"p": pw.tolist(), "y": yw.tolist(), "logloss": float(log_loss(yw, pw))}

# ---- calibration_curve (uniform bins), counts per bin, expected calibration error ----
cc = []
for p, y in prob_sets():
    for nb in (5, 10, 20, 7):
        pt, pp = calibration_curve(y, p, n_bins=nb, strategy="uniform")
        edges = np.linspace(0.0, 1.0, nb + 1); ids = np.searchsorted(edges[1:-1], p); cnt = np.bincount(ids, minlength=nb)
        ece = float(np.sum(cnt[cnt > 0] / len(p) * np.abs(pt - pp)))
        cc.append({"p": p.tolist(), "y": y.tolist(), "n_bins": nb, "prob_true": pt.tolist(), "prob_pred": pp.tolist(), "counts": cnt.tolist(), "ece": ece})
ref["calibration"] = cc

# ---- IsotonicRegression ----
iso = []
for n, kind in [(80, "continuous"), (120, "ties"), (300, "continuous"), (40, "ties"), (25, "continuous")]:
    x = rs.normal(0, 1.5, size=n)
    if kind == "ties":
        x = np.round(x * 2) / 2
    y = (rs.rand(n) < sig(1.4 * x - 0.3)).astype(int)
    m = IsotonicRegression(out_of_bounds="clip").fit(x, y)
    grid = np.concatenate([np.linspace(x.min() - 1, x.max() + 1, 41), rs.uniform(x.min(), x.max(), 25)])
    iso.append({"x": x.tolist(), "y": y.tolist(), "X_thr": m.X_thresholds_.tolist(), "y_thr": m.y_thresholds_.tolist(), "fit": m.predict(x).tolist(), "grid": grid.tolist(), "pred": m.predict(grid).tolist()})
ref["isotonic"] = iso

# ---- Platt scaling = unregularised logistic regression of y on the score ----
plat = []
for n, a, b, sd in [(200, 1.5, -0.5, 1.0), (1000, 3.0, 1.0, 1.0), (60, 0.7, -1.2, 2.0), (500, 0.4, 0.2, 3.0)]:
    s = rs.normal(0, sd, size=n); y = (rs.rand(n) < sig(a * s + b)).astype(int)
    lr = LogisticRegression(C=1e10, solver="newton-cholesky", tol=1e-12, max_iter=200).fit(s.reshape(-1, 1), y)
    plat.append({"s": s.tolist(), "y": y.tolist(), "a": float(lr.coef_[0][0]), "b": float(lr.intercept_[0])})
ref["platt"] = plat

# ---- Gaussian naive Bayes and k-nearest-neighbour probabilities ----
n, d = 240, 6
X = rs.normal(size=(n, d)); X[:, 1] = 0.8 * X[:, 0] + 0.6 * X[:, 1]; y = (X[:, 0] + 0.6 * X[:, 2] + rs.normal(size=n) > 0.4).astype(int)
Xt = rs.normal(size=(60, d)); Xt[:, 1] = 0.8 * Xt[:, 0] + 0.6 * Xt[:, 1]
nb = GaussianNB().fit(X, y)
ref["gnb"] = {"X": X.tolist(), "y": y.tolist(), "Xt": Xt.tolist(), "prob": nb.predict_proba(Xt)[:, 1].tolist(), "var": nb.var_.tolist(), "theta": nb.theta_.tolist()}
knn = []
for k in (1, 3, 5, 15, 40):
    knn.append({"k": k, "prob": KNeighborsClassifier(n_neighbors=k).fit(X, y).predict_proba(Xt)[:, 1].tolist()})
ref["knn"] = {"X": X.tolist(), "y": y.tolist(), "Xt": Xt.tolist(), "cases": knn}

# ---- McNemar: exact (binomtest) and chi-square with continuity correction ----
mc = []
for b, c in [(60, 50), (5, 15), (0, 10), (30, 30), (1, 0), (100, 60), (300, 250), (240, 200), (7, 7), (12, 3), (2, 1), (500, 410)]:
    k, nn = min(b, c), b + c
    exact = float(stats.binomtest(k, nn, 0.5).pvalue)
    stat = max(0, abs(b - c) - 1) ** 2 / nn
    mc.append({"b": b, "c": c, "exact": exact, "stat": float(stat), "chi2_p": float(stats.chi2.sf(stat, 1))})
ref["mcnemar"] = mc

# ---- distribution functions ----
tt = []
for df in (1, 2, 3, 4, 9, 19, 49, 99, 299):
    for t in (0.0, 0.3, -0.3, 1.0, -1.0, 2.0, 2.5, -2.5, 4.0, 8.0, -8.0, 15.0, 40.0):
        tt.append({"t": t, "df": df, "cdf": float(stats.t.cdf(t, df)), "p2": float(2 * stats.t.sf(abs(t), df))})
ref["t"] = tt
ref["chi2"] = [{"x": x, "k": k, "sf": float(stats.chi2.sf(x, k))} for k in (1, 2, 3, 5) for x in (0.01, 0.5, 1.0, 3.84, 10.0, 30.0, 100.0)]
ref["beta"] = [{"a": a, "b": b, "x": x, "v": float(special.betainc(a, b, x))} for a, b in [(0.5, 0.5), (0.5, 4.5), (2.0, 3.0), (10.0, 0.5), (50.0, 0.5), (0.5, 150.0), (7.0, 7.0)] for x in (0.001, 0.05, 0.3, 0.5, 0.8, 0.99)]
ref["norm"] = [{"z": z, "cdf": float(stats.norm.cdf(z))} for z in (-6.0, -3.0, -1.96, -0.5, 0.0, 0.7, 1.96, 3.0)]
ref["binom_pmf"] = [{"n": n, "p": p, "pmf": stats.binom.pmf(np.arange(n + 1), n, p).tolist()} for n, p in [(20, 0.3), (60, 0.85), (200, 0.5)]]

# ---- paired t-test on fold differences and the Nadeau-Bengio corrected version ----
ct = []
for J, nte, ntr, scale in [(10, 60, 240, 0.03), (25, 60, 240, 0.02), (50, 30, 270, 0.04), (10, 100, 100, 0.03), (6, 50, 450, 0.04)]:
    d_ = np.round(rs.normal(0.01, scale, size=J) * nte) / nte
    t1 = stats.ttest_1samp(d_, 0.0)
    v = d_.var(ddof=1) * (1.0 / J + nte / ntr); tc = d_.mean() / np.sqrt(v)
    ct.append({"d": d_.tolist(), "n_test": nte, "n_train": ntr, "naive_t": float(t1.statistic), "naive_p": float(t1.pvalue), "corr_t": float(tc), "corr_p": float(2 * stats.t.sf(abs(tc), J - 1))})
ref["ttests"] = ct

# ---- confusion counts and rates by group ----
gr = []
for n, thr in [(400, [0.55, 0.8]), (1000, [0.9, 0.7]), (250, [0.3, 0.3])]:
    g = (rs.rand(n) < 0.4).astype(int); p = np.where(g == 1, rs.beta(3, 1.6, size=n), rs.beta(5, 1.4, size=n)); y = (rs.rand(n) < p).astype(int)
    res = []
    for k in (0, 1):
        m = g == k; pred = (p[m] >= thr[k]).astype(int); tn, fp, fn, tp = confusion_matrix(y[m], pred, labels=[0, 1]).ravel()
        res.append({"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp), "precision": float(precision_score(y[m], pred, zero_division=0)), "tpr": float(recall_score(y[m], pred, zero_division=0)), "fpr": float(fp / (fp + tn)), "approval": float(pred.mean())})
    gr.append({"p": p.tolist(), "y": y.tolist(), "g": g.tolist(), "thr": thr, "groups": res})
ref["groups"] = gr

assert all(np.isfinite(c["corr_t"]) for c in ref["ttests"])
json.dump(ref, open("tests/reference_decide.json", "w"), allow_nan=False)
print("ok", {k: (len(v) if isinstance(v, list) else 1) for k, v in ref.items()})
