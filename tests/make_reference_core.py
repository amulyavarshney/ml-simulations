"""Reference values from scikit-learn for ml-core.js. Run: python3 tests/make_reference_core.py  (needs numpy, scikit-learn)."""
import json, numpy as np
from sklearn.datasets import load_wine, load_digits, make_swiss_roll
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import trustworthiness
from sklearn.model_selection import StratifiedKFold

ref = {}
w = load_wine(); d = load_digits()
ref["wine_raw_ratio"] = PCA().fit(w.data).explained_variance_ratio_.tolist()
ref["wine_std_ratio"] = PCA().fit(StandardScaler().fit_transform(w.data)).explained_variance_ratio_.tolist()
p = PCA().fit(StandardScaler().fit_transform(w.data))
ref["wine_std_pc1"] = p.components_[0].tolist()
pd_ = PCA().fit(d.data)
ref["digits_ratio"] = pd_.explained_variance_ratio_.tolist()
ref["digits_k95"] = int(PCA(n_components=0.95).fit(d.data).n_components_)
ref["digits_pc1"] = pd_.components_[0].tolist()
# reconstruction error identity at k=10
X = d.data; k = 10; pk = PCA(n_components=k).fit(X)
rec = pk.inverse_transform(pk.transform(X[:5])); ref["digits_rec_first5_k10"] = rec.tolist()
# trustworthiness: swiss roll sample vs its PCA map and vs a random map
rs = np.random.RandomState(1)
Xr, t = make_swiss_roll(150, random_state=1)
E = PCA(2).fit_transform(Xr); Er = rs.normal(size=(150, 2))
ref["tw"] = {"X": Xr.tolist(), "E_pca": E.tolist(), "E_rand": Er.tolist(),
             "tw_pca": trustworthiness(Xr, E, n_neighbors=10), "tw_rand": trustworthiness(Xr, Er, n_neighbors=10)}
# stratified folds
folds = [te.tolist() for _, te in StratifiedKFold(5).split(w.data, w.target)]
ref["wine_folds"] = folds
json.dump(ref, open("tests/reference_core.json", "w"))
print("ok", ref["digits_k95"], ref["tw"]["tw_pca"], ref["tw"]["tw_rand"])
