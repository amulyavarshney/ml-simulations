"""Reference values from scikit-learn for ml-svm.js. Run: python3 tests/make_reference_svm.py"""
import json, numpy as np
from sklearn.datasets import make_moons, make_blobs, load_wine
from sklearn.svm import SVC, SVR, OneClassSVM
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.pipeline import make_pipeline
from sklearn.model_selection import cross_val_score

ref = {}
def grid(lo, hi, m):
    g = np.linspace(lo, hi, m); return np.array([[a, b] for a in g for b in g])
Xm, ym = make_moons(120, noise=0.25, random_state=0); T = grid(-1.5, 2.5, 7)
for name, kw in {"rbf": dict(kernel="rbf", gamma=2.0, C=1.0), "rbf_bigC": dict(kernel="rbf", gamma=0.5, C=100.0),
                 "poly2": dict(kernel="poly", degree=2, gamma=1.0, coef0=1.0, C=1.0), "linear": dict(kernel="linear", C=0.3)}.items():
    m = SVC(tol=1e-4, **kw).fit(Xm, ym)
    ref["svc_" + name] = {"X": Xm.tolist(), "y": ym.tolist(), "T": T.tolist(), "kw": kw, "dec": m.decision_function(T).tolist(),
                          "nsv": int(m.n_support_.sum()), "b": float(m.intercept_[0]), "train_acc": float(m.score(Xm, ym))}
Xs = np.sort(np.random.RandomState(2).uniform(-3, 3, 80)); ys = np.sin(Xs) + 0.2 * np.random.RandomState(3).normal(size=80)
Ts = np.linspace(-3, 3, 25)
for name, kw in {"a": dict(kernel="rbf", gamma=1.0, C=10.0, epsilon=0.1), "b": dict(kernel="rbf", gamma=0.5, C=1.0, epsilon=0.3)}.items():
    m = SVR(tol=1e-4, **kw).fit(Xs[:, None], ys)
    ref["svr_" + name] = {"X": Xs.tolist(), "y": ys.tolist(), "T": Ts.tolist(), "kw": kw, "pred": m.predict(Ts[:, None]).tolist(), "nsv": int(len(m.support_))}
Xo = np.random.RandomState(4).normal(size=(100, 2)); To = grid(-3, 3, 7)
for nu in (0.05, 0.2):
    m = OneClassSVM(kernel="rbf", gamma=0.5, nu=nu, tol=1e-4).fit(Xo)
    ref["oc_%g" % nu] = {"X": Xo.tolist(), "T": To.tolist(), "nu": nu, "dec": m.decision_function(To).tolist(), "nsv": int(len(m.support_)),
                         "frac_out": float((m.predict(Xo) == -1).mean())}
Xb, yb = make_blobs(80, centers=[[0, 0], [1.5, 1.2]], cluster_std=1.0, random_state=5)
lr = LogisticRegression(C=1.0, tol=1e-10, max_iter=1000).fit(Xb, yb)
ref["logreg"] = {"X": Xb.tolist(), "y": yb.tolist(), "w": lr.coef_[0].tolist(), "b": float(lr.intercept_[0])}
# wine pipeline CV (standardise -> PCA(k) -> multinomial logistic regression, 5-fold stratified)
w = load_wine(); cv = {}
for k in (1, 2, 3, 5, 8, 13):
    pipe = make_pipeline(StandardScaler(), PCA(n_components=k), LogisticRegression(max_iter=5000))
    s = cross_val_score(pipe, w.data, w.target, cv=5); cv[k] = [float(s.mean()), float(s.std())]
ref["wine_cv"] = cv
json.dump(ref, open("tests/reference_svm.json", "w")); print("ok", {k: ref[k]["nsv"] for k in ref if "nsv" in ref[k]}, cv)
