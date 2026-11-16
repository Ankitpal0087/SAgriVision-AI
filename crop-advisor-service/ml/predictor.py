"""Inference layer: loads the saved model bundle and answers prediction queries.

Everything returned is traceable to the CSV / the saved model. Nothing here
invents data; where history is missing the response says so (warnings) and the
confidence level is lowered.
"""
from __future__ import annotations

import math
from functools import lru_cache

import joblib
import numpy as np
import pandas as pd

from config import MODEL_PATH
from ml.crop_meta import AGGREGATE_CROPS, crop_group, unit_info
from ml.preprocessing import ALL_FEATURES


# Reference list: the 28 Indian states. Any not present in the CSV are reported to the user.
REFERENCE_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"]


class ModelNotReady(RuntimeError):
    """Raised when the trained model file is missing."""


def _w(code, en, hi):
    return {"code": code, "en": en, "hi": hi}


class Predictor:
    def __init__(self, path=MODEL_PATH):
        try:
            self.b = joblib.load(path)
        except FileNotFoundError as e:
            raise ModelNotReady(
                f"Model file not found at {path}. Run `python -m ml.train` first.") from e
        except Exception as e:      # e.g. scikit-learn / pandas version differs from the one that saved the model
            raise ModelNotReady(
                "The saved model could not be loaded (usually a different scikit-learn/pandas version). "
                f"Run `python -m ml.train` once to rebuild it for this computer. Details: {type(e).__name__}: {e}") from e
        self.model = self.b["model"]
        self.fb = self.b["feature_builder"]
        self.calib = self.b["calibration"]
        self.src = self.fb.src_            # training history (Crop, State, Season, Crop_Year, ly)
        self._cs_season = (self.src.groupby(["Crop", "State", "Season"]).size().to_dict())
        self._cs = (self.src.groupby(["Crop", "State"]).size().to_dict())
        # number of DIFFERENT YEARS each crop is recorded in each state (drives the "not grown here" filter)
        self._years = self.src.groupby(["Crop", "State"])["Crop_Year"].nunique().to_dict()
        # token entries (e.g. wheat in Kerala = ~1 hectare) are not "grown here": ignore pairs with a tiny average area
        try:
            from config import DATA_PATH
            from ml.preprocessing import clean, load_raw
            area = clean(load_raw(DATA_PATH))[0].groupby(["Crop", "State"])["Area"].mean()
            self._years = {k: (y if float(area.get(k, 0)) >= self.MIN_AREA_HA else 0) for k, y in self._years.items()}
        except Exception:      # data file missing: keep the year-count rule only
            pass

    # ------------------------------------------------- is the crop grown in this state?
    MIN_YEARS = 3          # fewer recorded years than this = no reliable record
    MIN_AREA_HA = 10       # average area below this (hectares) = token entry, not real cultivation

    def years_recorded(self, crop, state):
        return int(self._years.get((crop, state), 0))

    def grown_in_state(self, crop, state):
        return self.years_recorded(crop, state) >= self.MIN_YEARS

    def states_growing(self, crop, top=6):
        s = sorted(((st, y) for (c, st), y in self._years.items() if c == crop and y >= self.MIN_YEARS), key=lambda kv: -kv[1])
        return [st for st, _ in s[:top]]

    # ---------------------------------------------------------------- metadata
    @property
    def crops(self): return self.b["crops"]
    @property
    def states(self): return self.b["states"]
    @property
    def seasons(self): return self.b["seasons"]

    def crop_median(self, crop):
        return self.b["crop_stats"][crop]["median_yield"]

    def meta(self):
        return {
            "crops": [{"name": c, "group": crop_group(c), "unit": unit_info(c)["yield_unit"],
                       "aggregate": c in AGGREGATE_CROPS, "n_rows": int(self.b["crop_stats"][c]["n"])}
                      for c in self.crops],
            "states": self.states, "seasons": self.seasons, "min_years": self.MIN_YEARS,
            "crops_by_state": {st: {c: int(y) for (c, s2), y in self._years.items() if s2 == st} for st in self.states},
            "states_not_covered": [x for x in REFERENCE_STATES if x not in self.states],
            "state_defaults": self.fb.state_defaults_,
            "ranges": {k: [round(v[0], 3), round(v[1], 3)] for k, v in self.fb.ranges_.items()},
            "data_years": self.b["data_years"], "model_name": self.b["model_name"],
            "trained_at": self.b["trained_at"], "rows": self.b["trained_on_rows"],
        }

    def seasons_for(self, crop, state):
        """Seasons in which this crop is actually recorded in this state (most common first)."""
        s = {k[2]: v for k, v in self._cs_season.items() if k[0] == crop and k[1] == state}
        return [k for k, _ in sorted(s.items(), key=lambda kv: -kv[1])]

    def default_season(self, crop, state):
        s = self.seasons_for(crop, state)
        if s:
            return s[0]
        sub = self.src[self.src.Crop == crop]["Season"]
        return sub.mode().iloc[0] if len(sub) else self.seasons[0]

    # ----------------------------------------------------------------- predict
    def _q(self, crop):
        return (self.calib["by_crop"].get(crop) or self.calib["by_group"].get(crop_group(crop))
                or self.calib["global"])

    def predict(self, state, crop, season, year, rainfall, fert_ha, pest_ha, area):
        # Training rows are district-level crop areas (median ~9,000 ha). A farm of a few
        # hectares is far outside that, but Area has almost no influence on per-hectare
        # yield (permutation importance ~0.006), so the MODEL sees the area clamped into
        # its training range, while PRODUCTION is still computed from the farmer's real area.
        a_lo, a_hi = self.fb.ranges_["Area"]
        a_model = float(min(max(area, a_lo), a_hi))
        row = pd.DataFrame([{
            "Crop": crop, "State": state, "Season": season, "Crop_Year": int(year),
            "Annual_Rainfall": float(rainfall), "Fertilizer": float(fert_ha) * a_model,
            "Pesticide": float(pest_ha) * a_model, "Area": a_model}])
        X = self.fb.transform(row, "frozen")
        pred_log = float(self.model.predict(X[ALL_FEATURES])[0])
        q = self._q(crop)
        mid = float(np.expm1(pred_log))
        lo = float(max(0.0, np.expm1(pred_log - q)))
        hi = float(np.expm1(pred_log + q))
        hist_level = int(X["hist_level"].iloc[0]); hist_n = int(X["hist_n"].iloc[0])
        hist_mean = float(np.expm1(X["hist_mean"].iloc[0]))

        warnings = []
        if hist_level == 2:
            warnings.append(_w("NO_SEASON_HISTORY",
                               f"{crop} has no record in {state} for the {season} season; history from other seasons was used.",
                               f"{state} में {season} सीज़न के लिए {crop} का रिकॉर्ड नहीं है; अन्य सीज़न का इतिहास उपयोग हुआ।"))
        elif hist_level >= 3:
            warnings.append(_w("NO_STATE_HISTORY",
                               f"{crop} is not recorded in {state} in the dataset. The estimate relies on all-India patterns for this crop and is unreliable.",
                               f"डेटा में {state} में {crop} दर्ज नहीं है। अनुमान पूरे भारत के पैटर्न पर आधारित है और भरोसेमंद नहीं है।"))
        r = self.fb.ranges_
        for key, val, label_en, label_hi in [
                ("Annual_Rainfall", rainfall, "Rainfall", "वर्षा"),
                ("fert_ha", fert_ha, "Fertilizer rate", "उर्वरक दर"),
                ("pest_ha", pest_ha, "Pesticide rate", "कीटनाशक दर")]:
            lo_r, hi_r = r[key]
            if val < lo_r or val > hi_r:
                warnings.append(_w("OUT_OF_RANGE",
                                   f"{label_en} {val:g} is outside the range seen in training data ({lo_r:.3g}-{hi_r:.3g}); the model is extrapolating.",
                                   f"{label_hi} {val:g} प्रशिक्षण डेटा की सीमा ({lo_r:.3g}-{hi_r:.3g}) से बाहर है; मॉडल अनुमान से आगे जा रहा है।"))
        if year > self.b["data_years"][1] + 1:
            gap = year - self.b["data_years"][1]
            warnings.append(_w("FUTURE_YEAR",
                               f"The data ends in {self.b['data_years'][1]}; this forecast is {gap} years beyond it, so recent technology/policy/climate changes are not reflected.",
                               f"डेटा {self.b['data_years'][1]} तक है; यह अनुमान उससे {gap} वर्ष आगे का है, इसलिए हाल के तकनीकी/नीतिगत/जलवायु बदलाव शामिल नहीं हैं।"))

        # ---- confidence level (bands are about THIS crop's validation error)
        level = 0 if q <= 0.25 else 1 if q <= 0.5 else 2          # 0 high, 1 medium, 2 low
        level += {1: 0, 2: 1}.get(hist_level, 2)
        if any(w["code"] == "OUT_OF_RANGE" for w in warnings):
            level += 1
        name = ["high", "medium", "low"][min(level, 2)]

        ratio = mid / max(self.crop_median(crop), 1e-9)
        u = unit_info(crop)
        prod = {"mid": mid * area, "low": lo * area, "high": hi * area}
        out = {
            "inputs": {"state": state, "crop": crop, "season": season, "year": int(year),
                       "rainfall_mm": rainfall, "fertilizer_kg_ha": fert_ha,
                       "pesticide_kg_ha": pest_ha, "area_ha": area},
            "yield": {"mid": round(mid, 3), "low": round(lo, 3), "high": round(hi, 3), "unit": u["yield_unit"]},
            "production": {k: round(v, 2) for k, v in prod.items()},
            "production_unit": u["production_unit"],
            "interval_level": self.calib["level"],
            "interval_empirical_coverage": self.calib.get("empirical_test_coverage"),
            "confidence": name,
            "vs_crop_median_pct": round((ratio - 1) * 100, 1),
            "historical_mean": round(hist_mean, 3), "history_years": hist_n,
            "model": self.b["model_name"], "unit_confidence": u["confidence"],
            "warnings": warnings,
        }
        if u["tonnes"]:
            out["production_quintal"] = {k: round(v * 10, 1) for k, v in prod.items()}
        return out

    def sensitivity(self, state, crop, season, year, rainfall, fert_ha, pest_ha, area):
        """How much does the model's answer move if rainfall / fertilizer change by +-20%?
        Honest transparency: in this dataset these inputs carry almost no signal."""
        base = self.predict(state, crop, season, year, rainfall, fert_ha, pest_ha, area)["yield"]["mid"]
        out = {}
        for label, kw in {"rainfall": "rainfall", "fertilizer": "fert_ha"}.items():
            vals = {"rainfall": rainfall, "fert_ha": fert_ha, "pest_ha": pest_ha}
            res = []
            for f in (0.8, 1.2):
                v = dict(vals); v[kw] = vals[kw] * f
                y = self.predict(state, crop, season, year, v["rainfall"], v["fert_ha"], v["pest_ha"], area)["yield"]["mid"]
                res.append(round((y / max(base, 1e-9) - 1) * 100, 1))
            out[label] = {"minus20_pct": res[0], "plus20_pct": res[1]}
        return out

    # ----------------------------------------------------------------- compare
    def compare(self, state, crops, season, year, rainfall, fert_ha, pest_ha, area):
        res = []
        for c in crops:
            s = season if season and self._cs_season.get((c, state, season)) else self.default_season(c, state)
            p = self.predict(state, c, s, year, rainfall, fert_ha, pest_ha, area)
            res.append({"crop": c, "season_used": s, "yield": p["yield"], "production": p["production"],
                        "production_unit": p["production_unit"], "confidence": p["confidence"],
                        "vs_crop_median_pct": p["vs_crop_median_pct"], "warnings": p["warnings"]})
        return res

    # ----------------------------------------------------------------- history
    def history(self, crop, state, season=None):
        """Actual recorded yield by year for a crop in a state (from the CSV training frame)."""
        s = self.src[(self.src.Crop == crop) & (self.src.State == state)]
        if season:
            s = s[s.Season == season]
        if s.empty:
            return {"years": [], "yield": [], "unit": unit_info(crop)["yield_unit"]}
        g = s.groupby("Crop_Year")["ly"].mean().sort_index()
        return {"years": [int(y) for y in g.index], "yield": [round(float(np.expm1(v)), 3) for v in g.values],
                "unit": unit_info(crop)["yield_unit"]}

    def evidence(self, crop, state, season):
        """How much history backs this crop/state/season combo (0..1)."""
        n_s = self._cs_season.get((crop, state, season), 0)
        n = self._cs.get((crop, state), 0)
        return 1.0 if n_s >= 3 else 0.6 if n >= 3 else 0.2


@lru_cache(maxsize=1)
def get_predictor() -> Predictor:
    return Predictor()
