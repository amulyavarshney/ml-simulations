"""Reference values from scikit-learn for ml-eval.js. Run: python3 tests/make_reference_eval.py  (needs numpy, scikit-learn).
Writes tests/reference_eval.json: fold assignments (KFold, StratifiedKFold, GroupKFold, TimeSeriesSplit), roc_auc_score,
roc_curve, f_classif / SelectKBest, NearestCentroid and KNeighborsClassifier predictions on stored inputs."""
import json
import numpy as np
from sklearn.model_selection import KFold, StratifiedKFold, GroupKFold, TimeSeriesSplit
from sklearn.metrics import roc_auc_score, roc_curve
from sklearn.feature_selection import f_classif, SelectKBest
from sklearn.neighbors import NearestCentroid, KNeighborsClassifier

rs = np.random.RandomState(20260)
ref = {}


def tests_of(splitter, *args, **kw):
    return [te.tolist() for _, te in splitter.split(*args, **kw)]


def pairs_of(splitter, *args, **kw):
    return [{"train": tr.tolist(), "test": te.tolist()} for tr, te in splitter.split(*args, **kw)]


# KFold, no shuffling
ref["kfold"] = [{"n": n, "k": k, "tests": tests_of(KFold(k), np.arange(n))} for n, k in [(23, 5), (60, 5), (10, 3), (7, 7), (101, 10)]]

# StratifiedKFold, no shuffling: imbalanced binary, balanced binary, three classes (rows in class-mixed order)
strat = []
for n, k, probs in [(47, 5, [0.85, 0.15]), (60, 5, [0.5, 0.5]), (53, 4, [0.5, 0.3, 0.2]), (30, 5, [0.9, 0.1]), (64, 5, [0.7, 0.3])]:
    y = rs.choice(len(probs), size=n, p=probs)
    strat.append({"y": y.tolist(), "k": k, "tests": tests_of(StratifiedKFold(k), np.zeros(n), y)})
ref["stratified"] = strat

# GroupKFold, no shuffling: unequal group sizes, ties between sizes, non-contiguous ids, rows in mixed order
grp = []
for n, k, ng in [(60, 5, 12), (80, 4, 20), (45, 3, 9), (100, 5, 8), (36, 6, 6)]:
    ids = rs.permutation(np.array([3 * i + 2 for i in range(ng)]))
    g = rs.choice(ids, size=n)
    if len(np.unique(g)) < k:
        continue
    grp.append({"groups": g.tolist(), "k": k, "tests": tests_of(GroupKFold(k), np.zeros(n), groups=g)})
ref["group"] = grp

# TimeSeriesSplit, no shuffling (it has none): plain, test_size, gap, max_train_size
ref["timeseries"] = [
    {"n": n, "k": k, "opts": opts, "pairs": pairs_of(TimeSeriesSplit(n_splits=k, **sk), np.zeros(n))}
    for n, k, opts, sk in [
        (37, 5, {}, {}), (60, 5, {}, {}), (100, 4, {"testSize": 10}, {"test_size": 10}),
        (50, 4, {"gap": 3}, {"gap": 3}), (80, 5, {"maxTrain": 30}, {"max_train_size": 30}), (13, 3, {}, {}),
    ]
]

# roc_auc_score: continuous scores, scores with many ties, perfect and reversed separation
auc = []
for n, ties in [(40, False), (200, False), (200, True), (60, True), (15, False)]:
    y = rs.randint(0, 2, size=n)
    s = np.round(rs.normal(size=n) + 0.8 * y, 8)
    if ties:
        s = np.round(s * 2) / 2
    auc.append({"y": y.tolist(), "s": s.tolist(), "auc": float(roc_auc_score(y, s))})
y = np.array([0, 0, 0, 1, 1, 1]); auc.append({"y": y.tolist(), "s": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6], "auc": 1.0})
auc.append({"y": y.tolist(), "s": [0.6, 0.5, 0.4, 0.3, 0.2, 0.1], "auc": 0.0})
ref["auc"] = auc
y = rs.randint(0, 2, size=50); s = np.round(rs.normal(size=50) + 0.7 * y, 8)
fpr, tpr, _ = roc_curve(y, s, drop_intermediate=False)
ref["roc"] = {"y": y.tolist(), "s": s.tolist(), "fpr": fpr.tolist(), "tpr": tpr.tolist()}

# f_classif and SelectKBest on data where a few columns carry signal
fc = []
for n, p, K, k in [(60, 40, 2, 7), (90, 25, 3, 5), (100, 150, 2, 12)]:
    y = rs.randint(0, K, size=n)
    X = rs.normal(size=(n, p)); X[:, :4] += 0.9 * y[:, None] * rs.choice([-1, 1], size=4)
    X = np.round(X, 8)
    F, _ = f_classif(X, y)
    sel = SelectKBest(f_classif, k=k).fit(X, y).get_support(indices=True)
    rows = rs.choice(n, size=int(0.8 * n), replace=False)
    Fsub, _ = f_classif(X[rows], y[rows])
    fc.append({"X": X.tolist(), "y": y.tolist(), "F": F.tolist(), "k": k, "selected": sel.tolist(), "rows": rows.tolist(), "Fsub": Fsub.tolist()})
ref["fclassif"] = fc

# NearestCentroid and KNeighborsClassifier: stored predictions
X = np.round(rs.normal(size=(80, 5)), 8); y = (X[:, 0] + 0.8 * rs.normal(size=80) > 0).astype(int)
Xt = np.round(rs.normal(size=(60, 5)), 8)
ref["centroid"] = {"X": X.tolist(), "y": y.tolist(), "Xt": Xt.tolist(), "pred": NearestCentroid().fit(X, y).predict(Xt).tolist(),
                   "cols": [0, 2, 3], "pred_cols": NearestCentroid().fit(X[:, [0, 2, 3]], y).predict(Xt[:, [0, 2, 3]]).tolist()}
knn = []
for k, w, p in [(1, "uniform", 2), (5, "uniform", 2), (7, "distance", 2), (5, "uniform", 1), (9, "distance", 1), (15, "uniform", 2)]:
    m = KNeighborsClassifier(n_neighbors=k, weights=w, p=p).fit(X, y)
    knn.append({"k": k, "weights": w, "p": p, "pred": m.predict(Xt).tolist(), "acc_train_cv": None})
ref["knn"] = {"X": X.tolist(), "y": y.tolist(), "Xt": Xt.tolist(), "cases": knn}
# fast k-NN grid: accuracy on a held-out block for several settings
tr = np.arange(0, 56); te = np.arange(56, 80)
grid = []
for k, w, p in [(1, "uniform", 2), (3, "distance", 2), (5, "uniform", 1), (9, "distance", 1), (15, "uniform", 2), (21, "distance", 2)]:
    m = KNeighborsClassifier(n_neighbors=k, weights=w, p=p).fit(X[tr], y[tr])
    grid.append({"k": k, "weights": w, "p": p, "acc": float(m.score(X[te], y[te]))})
ref["knngrid"] = {"train": tr.tolist(), "test": te.tolist(), "cases": grid}

json.dump(ref, open("tests/reference_eval.json", "w"))
print("ok", {k: (len(v) if isinstance(v, list) else 1) for k, v in ref.items()})
