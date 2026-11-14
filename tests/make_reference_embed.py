"""Reference values for ml-embed.js. t-SNE: scikit-learn (exact method, same starting positions). UMAP a/b: scipy curve_fit as in umap-learn's find_ab_params."""
import json, numpy as np, warnings
from scipy.optimize import curve_fit
from scipy.spatial.distance import squareform
from sklearn.datasets import make_blobs
from sklearn.manifold import TSNE
from sklearn.manifold._t_sne import _joint_probabilities
from sklearn.metrics import pairwise_distances
warnings.filterwarnings("ignore")
X, y = make_blobs(100, n_features=5, centers=3, cluster_std=[1.0, 2.0, 1.0], random_state=7)
init = 1e-4 * np.random.RandomState(0).normal(size=(100, 2))
D = pairwise_distances(X, squared=True).astype(np.float32)
P = squareform(_joint_probabilities(D, 15.0, 0))
ref = {"X": X.tolist(), "init": init.tolist(), "P_full": P.tolist()}
for it in (250, 1000):
    t = TSNE(n_components=2, perplexity=15, init=init, method="exact", learning_rate="auto", max_iter=it, random_state=0).fit(X)
    ref["Y%d" % it] = t.embedding_.tolist(); ref["kl%d" % it] = float(t.kl_divergence_) if it == 1000 else None
# Replay of scikit-learn's own gradient (_kl_divergence) and update rule, to compare early iterations before t-SNE's chaos amplifies float noise
from sklearn.manifold._t_sne import _kl_divergence
Pc = squareform(P, checks=False)
def replay(start, snaps=()):
    Y = start.copy(); upd = np.zeros_like(Y); gains = np.ones_like(Y); out = {}
    for it in range(1000):
        exag = 12.0 if it < 250 else 1.0; mom = 0.5 if it < 250 else 0.8
        _, g = _kl_divergence(Y.ravel(), Pc * exag, 1, 100, 2, 0, True); g = g.reshape(100, 2)
        inc = upd * g < 0; gains[inc] += 0.2; gains[~inc] *= 0.8; np.clip(gains, 0.01, None, out=gains)
        upd = mom * upd - 50.0 * g * gains; Y = Y + upd
        if it + 1 in snaps: out[it + 1] = Y.tolist()
    return _kl_divergence(Y.ravel(), Pc, 1, 100, 2, 0, True)[0], out
kl_rep, snaps = replay(init, (1, 10)); ref["replay_kl1000"] = float(kl_rep); ref["replay_Y1"] = snaps[1]; ref["replay_Y10"] = snaps[10]
rs = np.random.RandomState(1)
spread = [float(replay(init * (1 + 1e-9 * rs.normal(size=init.shape)))[0]) for _ in range(8)]
ref["kl_spread"] = [min(spread), max(spread)]
def curve(x, a, b): return 1.0 / (1.0 + a * x ** (2 * b))
ab = {}
for md in (0.0, 0.1, 0.5, 0.99):
    xv = np.linspace(0, 3, 300); yv = np.zeros(300); yv[xv < md] = 1.0; yv[xv >= md] = np.exp(-(xv[xv >= md] - md))
    p, _ = curve_fit(curve, xv, yv); ab[str(md)] = p.tolist()
ref["ab"] = ab
json.dump(ref, open("tests/reference_embed.json", "w")); print("ok kl250=%.4f kl1000=%.4f" % (0, ref["kl1000"]), ab)
