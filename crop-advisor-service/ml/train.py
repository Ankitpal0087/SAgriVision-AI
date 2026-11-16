"""Train, compare, evaluate and save the yield model.

Run from the project root:   python -m ml.train

Evaluation protocol (all TEMPORAL - never a random split, because random splits
let the model see the same state-year's rainfall/fertilizer rate in both train
and test, which inflates scores):

    train       : Crop_Year <= 2014
    validation  : 2015-2016   (model selection + prediction-interval calibration)
    test        : 2017-2020   (touched once, for the final report)

The target is log1p(Yield). Crops differ by 4 orders of magnitude (cardamom
0.08 vs coconut 8,000 nuts/ha), so raw-scale RMSE is dominated by one crop.
We therefore report log-scale metrics, within-crop R2, and raw-scale metrics
with and without Coconut.
"""
from __future__ import annotations

import json
import math
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import (ExtraTreesRegressor, GradientBoostingRegressor,
                              HistGradientBoostingRegressor, RandomForestRegressor)
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from config import DATA_PATH, MODEL_PATH, REPORT_DIR, BASE_DIR
from ml.crop_meta import crop_group, GROUPS
from ml.preprocessing import (ALL_FEATURES, BASE_NUM, CAT_FEATURES, HIST_NUM,
                              NUM_FEATURES, FeatureBuilder, clean, load_raw)

warnings.filterwarnings("ignore")
SEED = 42
TRAIN_END, VAL_END = 2014, 2016
INTERVAL_LEVEL = 0.80


# ---------------------------------------------------------------- model factory
def make_pipeline(estimator, num_cols=NUM_FEATURES, cat_cols=CAT_FEATURES):
    pre = ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")),
                          ("sc", StandardScaler())]), num_cols),
    ])
    return Pipeline([("pre", pre), ("model", estimator)])


def candidate_models():
    return {
        "Ridge (linear baseline)": lambda: Ridge(alpha=3.0),
        "Random Forest": lambda: RandomForestRegressor(
            n_estimators=120, min_samples_leaf=2, max_features=0.5, n_jobs=-1, random_state=SEED),
        "Extra Trees": lambda: ExtraTreesRegressor(
            n_estimators=120, min_samples_leaf=2, max_features=0.6, n_jobs=-1, random_state=SEED),
        "Gradient Boosting": lambda: GradientBoostingRegressor(
            n_estimators=250, learning_rate=0.07, max_depth=4, subsample=0.8, random_state=SEED),
        "HistGradientBoosting": lambda: HistGradientBoostingRegressor(
            max_iter=400, learning_rate=0.06, max_leaf_nodes=31, l2_regularization=1.0, random_state=SEED),
    }


# ---------------------------------------------------------------------- metrics
def _r2(y, p):
    ss_res = float(np.sum((y - p) ** 2)); ss_tot = float(np.sum((y - np.mean(y)) ** 2))
    return 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")


def metrics(frame: pd.DataFrame, pred_log: np.ndarray) -> dict:
    """frame has Crop, Yield. pred_log is predicted log1p(yield)."""
    y_log = np.log1p(frame["Yield"].values)
    y, p = frame["Yield"].values, np.expm1(pred_log)
    crop_mean = pd.Series(y_log).groupby(frame["Crop"].values).transform("mean").values
    ss_res = np.sum((y_log - pred_log) ** 2); ss_within = np.sum((y_log - crop_mean) ** 2)
    nc = (frame["Crop"] != "Coconut").values
    ape = np.abs(p - y) / np.maximum(y, 1e-9)
    return {
        "n": int(len(frame)),
        "MAE_log": float(np.mean(np.abs(y_log - pred_log))),
        "RMSE_log": float(math.sqrt(np.mean((y_log - pred_log) ** 2))),
        "R2_log": _r2(y_log, pred_log),
        "R2_within_crop": float(1 - ss_res / ss_within),
        "MAE": float(np.mean(np.abs(y - p))),
        "RMSE": float(math.sqrt(np.mean((y - p) ** 2))),
        "R2": _r2(y, p),
        "MAE_excl_coconut": float(np.mean(np.abs(y[nc] - p[nc]))),
        "RMSE_excl_coconut": float(math.sqrt(np.mean((y[nc] - p[nc]) ** 2))),
        "R2_excl_coconut": _r2(y[nc], p[nc]),
        "median_APE_pct": float(np.median(ape) * 100),
        "within_25pct_share": float(np.mean(ape <= 0.25)),
    }


# ------------------------------------------------------------------- core loops
def fit_eval(model_factory, train, test, num_cols=NUM_FEATURES, cat_cols=CAT_FEATURES):
    """Fit on `train` (expanding history), evaluate on `test` (frozen history)."""
    fb = FeatureBuilder().fit(train)
    Xtr, Xte = fb.transform(train, "train"), fb.transform(test, "frozen")
    pipe = make_pipeline(model_factory(), num_cols, cat_cols)
    pipe.fit(Xtr[cat_cols + num_cols], np.log1p(train["Yield"].values))
    pred = pipe.predict(Xte[cat_cols + num_cols])
    return pipe, fb, Xte, pred


def naive_baselines(train, test):
    """Non-ML baselines the model must beat."""
    fb = FeatureBuilder().fit(train)
    X = fb.transform(test, "frozen")
    y = np.log1p(test["Yield"].values)
    crop_med = train.assign(ly=np.log1p(train["Yield"])).groupby("Crop")["ly"].median()
    out = {
        "Global mean (log)": metrics(test, np.full(len(test), np.log1p(train["Yield"]).mean())),
        "Crop median": metrics(test, test["Crop"].map(crop_med).fillna(crop_med.median()).values),
        "Crop+State+Season historical mean": metrics(test, X["hist_mean"].values),
    }
    return out


# ------------------------------------------------------------------------ charts
def make_charts(comp, best_name, test, pred_log, imp, rolling):
    REPORT_DIR.mkdir(exist_ok=True)
    plt.rcParams.update({"font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
    green, amber, blue, grey = "#1E6B45", "#E8B320", "#2B6C9E", "#9AA5A0"

    fig, ax = plt.subplots(figsize=(8, 4))
    names = list(comp.keys()); x = np.arange(len(names))
    ax.bar(x - 0.2, [comp[n]["validation"]["RMSE_log"] for n in names], 0.4, label="Validation (2015-16)", color=blue)
    ax.bar(x + 0.2, [comp[n]["test"]["RMSE_log"] for n in names], 0.4, label="Test (2017-20)", color=green)
    ax.set_xticks(x); ax.set_xticklabels([n.replace(" (", "\n(") for n in names], fontsize=8)
    ax.set_ylabel("RMSE on log1p(yield)  (lower = better)"); ax.legend(frameon=False)
    ax.set_title("Model comparison (temporal split)"); fig.tight_layout()
    fig.savefig(REPORT_DIR / "model_comparison.png", dpi=140); plt.close(fig)

    fig, ax = plt.subplots(figsize=(5.2, 5))
    y = np.log1p(test["Yield"].values)
    ax.scatter(y, pred_log, s=5, alpha=.35, color=green)
    lim = [min(y.min(), pred_log.min()), max(y.max(), pred_log.max())]
    ax.plot(lim, lim, color=amber, lw=1.5); ax.set_xlabel("Actual log1p(yield)")
    ax.set_ylabel("Predicted log1p(yield)"); ax.set_title(f"{best_name}: test set 2017-20")
    fig.tight_layout(); fig.savefig(REPORT_DIR / "predicted_vs_actual.png", dpi=140); plt.close(fig)

    fig, ax = plt.subplots(figsize=(6.5, 4))
    imp = imp.sort_values("importance")
    ax.barh(imp["feature"], imp["importance"], color=green)
    ax.set_xlabel("Increase in RMSE_log when feature is shuffled"); ax.set_title("Permutation importance (test set)")
    fig.tight_layout(); fig.savefig(REPORT_DIR / "feature_importance.png", dpi=140); plt.close(fig)

    fig, ax = plt.subplots(figsize=(7, 3.8))
    for n, r in rolling.items():
        ax.errorbar([n], [r["RMSE_log_mean"]], yerr=[r["RMSE_log_std"]], fmt="o", color=blue, capsize=4)
    ax.set_ylabel("RMSE_log  (mean +/- std over 3 origins)"); ax.tick_params(axis="x", labelsize=7, rotation=20)
    ax.set_title("Rolling-origin stability"); fig.tight_layout()
    fig.savefig(REPORT_DIR / "rolling_origin.png", dpi=140); plt.close(fig)


# -------------------------------------------------------------------------- main
def main():
    t0 = time.time()
    REPORT_DIR.mkdir(exist_ok=True); MODEL_PATH.parent.mkdir(exist_ok=True)
    raw = load_raw(DATA_PATH)
    df, clean_rep = clean(raw)
    print(f"[data] {clean_rep['rows_in']} rows -> {clean_rep['rows_out']} after cleaning")

    train = df[df.Crop_Year <= TRAIN_END].reset_index(drop=True)
    val = df[(df.Crop_Year > TRAIN_END) & (df.Crop_Year <= VAL_END)].reset_index(drop=True)
    test = df[df.Crop_Year > VAL_END].reset_index(drop=True)
    print(f"[split] train={len(train)} (<= {TRAIN_END})  val={len(val)}  test={len(test)}")

    # ---- baselines (non-ML)
    base = {"validation": naive_baselines(train, val), "test": naive_baselines(train, test)}

    # ---- compare models: fit on train, evaluate on val (selection) and test (report)
    comp, fitted = {}, {}
    for name, fac in candidate_models().items():
        s = time.time()
        pipe, fb, Xv, pv = fit_eval(fac, train, val)
        Xt = fb.transform(test, "frozen"); pt = pipe.predict(Xt[ALL_FEATURES])
        comp[name] = {"validation": metrics(val, pv), "test": metrics(test, pt),
                      "fit_seconds": round(time.time() - s, 1)}
        fitted[name] = (pipe, fb, pt)
        print(f"[model] {name:26s} val RMSE_log={comp[name]['validation']['RMSE_log']:.4f} "
              f"test RMSE_log={comp[name]['test']['RMSE_log']:.4f}  ({comp[name]['fit_seconds']}s)")

    best_name = min(comp, key=lambda n: comp[n]["validation"]["RMSE_log"])   # selected on VALIDATION only
    print(f"[select] best on validation: {best_name}")
    best_pipe, best_fb, best_test_pred = fitted[best_name]
    best_factory = candidate_models()[best_name]

    # ---- rolling-origin stability (3 origins, 2-year test windows)
    rolling = {}
    for name, fac in candidate_models().items():
        rm, r2w = [], []
        for cut in (2008, 2011, 2014):
            tr = df[df.Crop_Year <= cut]; te = df[(df.Crop_Year > cut) & (df.Crop_Year <= cut + 2)]
            _, _, _, p = fit_eval(fac, tr, te)
            m = metrics(te, p); rm.append(m["RMSE_log"]); r2w.append(m["R2_within_crop"])
        rolling[name] = {"RMSE_log_mean": float(np.mean(rm)), "RMSE_log_std": float(np.std(rm)),
                         "R2_within_crop_mean": float(np.mean(r2w)), "origins": [2008, 2011, 2014]}

    # ---- ablations on the selected model (what really drives accuracy?)
    ablation = {}
    for label, nums in {"All features": NUM_FEATURES,
                        "No history features": BASE_NUM,
                        "No fertilizer/pesticide": [c for c in NUM_FEATURES if c not in ("fert_ha", "pest_ha")],
                        "No rainfall": [c for c in NUM_FEATURES if c not in ("Annual_Rainfall", "rain_anom")]}.items():
        _, _, _, p = fit_eval(best_factory, train, test, num_cols=nums)
        ablation[label] = metrics(test, p)

    # ---- permutation importance (selected model, test set)
    Xt = best_fb.transform(test, "frozen")[ALL_FEATURES]
    pi = permutation_importance(best_pipe, Xt, np.log1p(test["Yield"].values), n_repeats=5,
                                random_state=SEED, scoring="neg_root_mean_squared_error", n_jobs=1)
    imp = pd.DataFrame({"feature": ALL_FEATURES, "importance": pi.importances_mean,
                        "std": pi.importances_std}).sort_values("importance", ascending=False)

    # ---- prediction-interval calibration on VALIDATION residuals (split conformal)
    Xv = best_fb.transform(val, "frozen")
    res = np.abs(np.log1p(val["Yield"].values) - best_pipe.predict(Xv[ALL_FEATURES]))
    val_crop = val["Crop"].values; val_grp = val["Crop"].map(crop_group).values

    def qhat(r):
        n = len(r); k = min(n, math.ceil((n + 1) * INTERVAL_LEVEL))
        return float(np.sort(r)[k - 1])
    calib = {"global": qhat(res), "level": INTERVAL_LEVEL, "by_crop": {}, "by_group": {}}
    for c in np.unique(val_crop):
        r = res[val_crop == c]
        if len(r) >= 30: calib["by_crop"][c] = qhat(r)
    for g in np.unique(val_grp):
        r = res[val_grp == g]
        if len(r) >= 30: calib["by_group"][g] = qhat(r)

    def q_for(crop):
        return calib["by_crop"].get(crop) or calib["by_group"].get(crop_group(crop)) or calib["global"]
    pt_log = best_test_pred
    q = test["Crop"].map(q_for).values
    ylt = np.log1p(test["Yield"].values)
    coverage = float(np.mean((ylt >= pt_log - q) & (ylt <= pt_log + q)))
    calib["empirical_test_coverage"] = coverage
    print(f"[interval] target {INTERVAL_LEVEL:.0%}  empirical test coverage {coverage:.1%}")

    # ---- per crop-group test error (honest view of where it works / fails)
    by_group = {}
    tg = test["Crop"].map(crop_group)
    for g in sorted(tg.unique()):
        m = (tg == g).values
        by_group[g] = {"n": int(m.sum()),
                       "median_APE_pct": float(np.median(np.abs(np.expm1(pt_log[m]) - test["Yield"].values[m]) / test["Yield"].values[m]) * 100),
                       "RMSE_log": float(math.sqrt(np.mean((ylt[m] - pt_log[m]) ** 2)))}

    # ---- final deployment model: refit on ALL cleaned data
    fb_all = FeatureBuilder().fit(df)
    X_all = fb_all.transform(df, "train")
    final = make_pipeline(best_factory())
    final.fit(X_all[ALL_FEATURES], np.log1p(df["Yield"].values))

    crops_info = df.groupby("Crop").agg(n=("Yield", "size"), median_yield=("Yield", "median"),
                                        p10=("Yield", lambda s: s.quantile(.1)),
                                        p90=("Yield", lambda s: s.quantile(.9))).round(4).to_dict("index")
    cs = df.groupby(["Crop", "State"]).size().reset_index(name="n")
    season_map = df.groupby(["State", "Season"]).size().reset_index(name="n")

    bundle = {
        "model": final, "feature_builder": fb_all, "calibration": calib,
        "model_name": best_name, "trained_on_rows": int(len(df)),
        "data_years": [int(df.Crop_Year.min()), int(df.Crop_Year.max())],
        "crops": sorted(df.Crop.unique().tolist()), "states": sorted(df.State.unique().tolist()),
        "seasons": sorted(df.Season.unique().tolist()), "crop_stats": crops_info,
        "crop_state_pairs": {f"{r.Crop}|{r.State}": int(r.n) for r in cs.itertuples()},
        "state_season_counts": {f"{r.State}|{r.Season}": int(r.n) for r in season_map.itertuples()},
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
    }
    joblib.dump(bundle, MODEL_PATH, compress=3)
    print(f"[save] {MODEL_PATH}  ({MODEL_PATH.stat().st_size/1e6:.1f} MB)")

    # ---- reports
    report = {
        "dataset": {"file": "crop_yield.csv", "rows_raw": clean_rep["rows_in"],
                    "rows_after_cleaning": clean_rep["rows_out"],
                    "years": bundle["data_years"], "n_crops": len(bundle["crops"]),
                    "n_states": len(bundle["states"]), "cleaning": clean_rep},
        "split": {"train": f"<= {TRAIN_END}", "validation": f"{TRAIN_END+1}-{VAL_END}", "test": f"> {VAL_END}",
                  "n_train": len(train), "n_val": len(val), "n_test": len(test)},
        "selected_model": best_name, "selection_rule": "lowest validation RMSE_log (test set not used for selection)",
        "baselines": base, "comparison": comp, "rolling_origin": rolling, "ablation_test": ablation,
        "permutation_importance": imp.round(5).to_dict("records"),
        "error_by_crop_group_test": by_group,
        "interval": {"level": INTERVAL_LEVEL, "empirical_test_coverage": coverage,
                     "global_log_halfwidth": calib["global"]},
        "final_model_note": "Deployed model is refit on all rows 1997-2020 using the same hyperparameters; "
                            "the metrics above come from the train-only fit.",
        "missing_features": {
            "soil_type": "not in dataset", "soil_fertility": "not in dataset",
            "temperature": "not in dataset", "irrigation": "not in dataset",
            "note": "These cannot be model inputs without inventing data. They drive rule-based, "
                    "source-cited advisory modules instead (see knowledge/)."},
        "data_caveats": [
            "Annual_Rainfall is one value per State-Year (identical for every crop and district in it).",
            "Fertilizer and Pesticide are state-year per-hectare rates multiplied by crop area; "
            "the per-hectare rate is identical for all crops in a state-year, so the model cannot learn "
            "a per-crop fertilizer response.",
            "Yield is district/state aggregate; it is not farm-level.",
            "Rajasthan is not present in the dataset (30 states/UTs are), so yield estimates and crop ranking are unavailable for it.",
            "Units are not stated in the CSV; t/ha assumed except nuts/ha (Coconut) and bales/ha (Cotton, Jute, Mesta, Sannhamp).",
        ],
        "trained_at": bundle["trained_at"], "seconds": round(time.time() - t0, 1),
    }
    (REPORT_DIR / "metrics.json").write_text(json.dumps(report, indent=2))
    pd.DataFrame([{"model": n, **{f"val_{k}": v for k, v in c["validation"].items()},
                   **{f"test_{k}": v for k, v in c["test"].items()}} for n, c in comp.items()]
                 ).to_csv(REPORT_DIR / "model_comparison.csv", index=False)
    make_charts(comp, best_name, test, pt_log, imp, rolling)
    static_img = BASE_DIR / "app" / "static" / "img"; static_img.mkdir(parents=True, exist_ok=True)
    for f in REPORT_DIR.glob("*.png"):
        (static_img / f.name).write_bytes(f.read_bytes())
    print(f"[done] {time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
