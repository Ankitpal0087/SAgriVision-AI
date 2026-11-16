"""Data loading, cleaning and feature engineering.

Leakage rules enforced here
---------------------------
1. `Production` is NEVER a feature: in the CSV, Yield and Production/Area have
   correlation 0.9965, so using it would hand the model the answer.
2. `Yield` of the SAME row never reaches that row's features. History features
   (previous yields of the same crop/state/season) use ONLY earlier years:
     - training rows : expanding statistics over strictly earlier years
     - validation/test/app rows : frozen statistics from the training period only
3. Fertilizer and pesticide are converted to per-hectare rates. (The CSV stores
   totals = rate x area; totals would just leak Area-scale into the model.)
4. All statistics (state rainfall mean, history tables) are fitted on the
   training period only (see FeatureBuilder.fit).
"""
from __future__ import annotations

import re
import numpy as np
import pandas as pd

from ml.crop_meta import crop_group

REQUIRED_COLUMNS = ["Crop", "Crop_Year", "Season", "State", "Area", "Production",
                    "Annual_Rainfall", "Fertilizer", "Pesticide", "Yield"]
CAT_FEATURES = ["Crop", "State", "Season", "crop_group"]
BASE_NUM = ["Crop_Year", "Annual_Rainfall", "rain_anom", "fert_ha", "pest_ha", "log_area"]
HIST_NUM = ["hist_mean", "hist_recent", "hist_n", "hist_level"]
NUM_FEATURES = BASE_NUM + HIST_NUM
ALL_FEATURES = CAT_FEATURES + NUM_FEATURES


# --------------------------------------------------------------------------- load
def _norm_text(s: pd.Series) -> pd.Series:
    return s.astype(str).str.strip().str.replace(r"\s+", " ", regex=True)


def load_raw(path) -> pd.DataFrame:
    df = pd.read_csv(path)
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            f"Dataset is missing required columns: {missing}. "
            f"Found columns: {list(df.columns)}")
    for c in ("Crop", "Season", "State"):
        df[c] = _norm_text(df[c])
    return df


# -------------------------------------------------------------------------- clean
def clean(df: pd.DataFrame, mad_z: float = 6.0):
    """Return (clean_df, report). Every removal is counted and reported."""
    rep = {"rows_in": int(len(df))}
    df = df.copy()

    # numeric coercion; bad values become NaN and are handled below
    for c in ["Crop_Year", "Area", "Production", "Annual_Rainfall",
              "Fertilizer", "Pesticide", "Yield"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    rep["missing_values_by_column"] = {k: int(v) for k, v in df.isna().sum().items() if v}
    n = len(df)
    df = df.dropna(subset=["Crop", "State", "Season", "Crop_Year", "Area", "Yield"])
    rep["dropped_missing_target_or_keys"] = n - len(df)

    n = len(df)
    df = df.drop_duplicates()
    rep["dropped_exact_duplicates"] = n - len(df)

    n = len(df)
    df = df[(df["Area"] > 0)]
    rep["dropped_non_positive_area"] = n - len(df)

    # Yield == 0 means "nothing recorded/harvested" (Production is also 0).
    # Keeping them would teach the model that zero is a normal outcome.
    n = len(df)
    df = df[df["Yield"] > 0]
    rep["dropped_zero_yield_rows"] = n - len(df)

    # Within-crop robust outliers on log scale (median / MAD). Catches impossible
    # values such as Maize 989 t/ha caused by tiny-area/data-entry errors.
    df["ly"] = np.log1p(df["Yield"])
    keep = pd.Series(True, index=df.index)
    for crop, g in df.groupby("Crop"):
        if len(g) < 15:
            continue
        med = g["ly"].median()
        mad = (g["ly"] - med).abs().median() * 1.4826
        if mad < 1e-6:
            continue
        keep.loc[g.index] = ((g["ly"] - med).abs() / mad) <= mad_z
    rep["dropped_outliers_per_crop_mad"] = int((~keep).sum())
    rep["outlier_rule"] = f"|log1p(yield) - crop median| / (1.4826*MAD) > {mad_z}"
    df = df[keep]

    rep["rows_out"] = int(len(df))
    return df.reset_index(drop=True), rep


# ------------------------------------------------------------ basic row features
def add_basic_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["fert_ha"] = out["Fertilizer"] / out["Area"]
    out["pest_ha"] = out["Pesticide"] / out["Area"]
    out["log_area"] = np.log1p(out["Area"])
    out["crop_group"] = out["Crop"].map(crop_group)
    return out


# ------------------------------------------------------------- history features
class FeatureBuilder:
    """Builds leakage-safe features. Fit on a TRAINING frame only.

    transform(df, mode="train")  -> expanding stats over strictly earlier years
                                    (used for rows that were in fit()).
    transform(df, mode="frozen") -> stats frozen at the end of the fit period
                                    (validation, test and live predictions).
    """

    LEVELS = [["Crop", "State", "Season"], ["Crop", "State"], ["Crop"]]

    def fit(self, train: pd.DataFrame) -> "FeatureBuilder":
        t = add_basic_features(train)
        if "ly" not in t:
            t["ly"] = np.log1p(t["Yield"])
        self.src_ = t[["Crop", "State", "Season", "Crop_Year", "ly"]].copy()
        self.state_rain_ = t.groupby("State")["Annual_Rainfall"].mean().to_dict()
        self.global_rain_ = float(t["Annual_Rainfall"].mean())
        self.global_ly_ = float(t["ly"].mean())
        self.last_year_ = int(t["Crop_Year"].max())
        self._frozen_ = {i: self._frozen_table(keys) for i, keys in enumerate(self.LEVELS)}
        # ranges used for "input outside the training range" warnings
        self.ranges_ = {c: (float(t[c].quantile(0.005)), float(t[c].quantile(0.995)))
                        for c in ["Annual_Rainfall", "fert_ha", "pest_ha", "Area"]}
        # state defaults for the UI (last 5 years of data)
        recent = t[t["Crop_Year"] >= self.last_year_ - 4]
        self.state_defaults_ = {
            s: {"fert_ha": round(float(g["fert_ha"].median()), 1),
                "pest_ha": round(float(g["pest_ha"].median()), 3),
                "rainfall": round(float(g["Annual_Rainfall"].median()), 0)}
            for s, g in recent.groupby("State")}
        return self

    # ---- frozen (end-of-period) stats
    def _frozen_table(self, keys):
        s = self.src_
        yr = s.groupby(keys + ["Crop_Year"], as_index=False)["ly"].mean().sort_values(keys + ["Crop_Year"])
        grp = yr.groupby(keys)["ly"]
        out = pd.DataFrame({
            "mean": s.groupby(keys)["ly"].mean(),
            "n": s.groupby(keys)["ly"].size(),
            "recent": grp.apply(lambda x: x.tail(3).mean()),
        }).reset_index()
        return out

    # ---- expanding (strictly-earlier-years) stats for training rows
    def _expanding_table(self, keys):
        s = self.src_
        g = s.groupby(keys + ["Crop_Year"], as_index=False).agg(
            sum_=("ly", "sum"), cnt=("ly", "size"), m=("ly", "mean"))
        g = g.sort_values(keys + ["Crop_Year"])
        gb = g.groupby(keys)
        g["mean"] = (gb["sum_"].cumsum() - g["sum_"]) / (gb["cnt"].cumsum() - g["cnt"]).replace(0, np.nan)
        g["n"] = gb["cnt"].cumsum() - g["cnt"]
        g["recent"] = gb["m"].transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
        return g[keys + ["Crop_Year", "mean", "n", "recent"]]

    def transform(self, df: pd.DataFrame, mode: str = "frozen") -> pd.DataFrame:
        if mode not in ("train", "frozen"):
            raise ValueError("mode must be 'train' or 'frozen'")
        out = add_basic_features(df).reset_index(drop=True)
        out["rain_anom"] = out["Annual_Rainfall"] - out["State"].map(self.state_rain_).fillna(self.global_rain_)

        merged = []
        for i, keys in enumerate(self.LEVELS):
            if mode == "train":
                tab = self._expanding_table(keys)
                m = out[keys + ["Crop_Year"]].merge(tab, on=keys + ["Crop_Year"], how="left")
            else:
                m = out[keys].merge(self._frozen_[i], on=keys, how="left")
            m.columns = [c if c in keys + ["Crop_Year"] else f"{c}{i}" for c in m.columns]
            merged.append(m)

        mean = merged[0]["mean0"].copy()
        level = pd.Series(np.where(mean.notna(), 1, np.nan), index=out.index)
        for i in (1, 2):
            fill = merged[i][f"mean{i}"]
            level = level.where(mean.notna() | fill.isna(), i + 1)
            mean = mean.fillna(fill)
        level = level.fillna(4)
        mean = mean.fillna(self.global_ly_)

        recent = merged[0]["recent0"].fillna(merged[1]["recent1"]).fillna(merged[2]["recent2"]).fillna(mean)
        out["hist_mean"] = mean.values
        out["hist_recent"] = recent.values
        out["hist_n"] = merged[0]["n0"].fillna(0).values
        out["hist_level"] = level.values
        return out
