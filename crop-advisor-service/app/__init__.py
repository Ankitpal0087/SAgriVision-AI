"""Flask application factory and API routes."""
from __future__ import annotations

import datetime as dt
import json
import logging

from flask import Flask, jsonify, request, send_from_directory

from app.security import (ValidationError, get_choice, get_number, install_security,
                          need_json, rate_limited)
from config import Config, REPORT_DIR
from knowledge.crops_kb import (CROPS, FERTILITY_LEVELS, KIND, MANAGEMENT, SEASON_GROUP,
                                SOIL_TYPES, SOILS, fertilizer_plan)
from knowledge.resources import CROP_HI, SEASON_HI, STATE_HI, resources_for
from ml.predictor import ModelNotReady, get_predictor

log = logging.getLogger("cropadvisor")


def create_app(config_overrides=None):
    app = Flask(__name__, static_folder="static", static_url_path="/static")
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)
    install_security(app)
    logging.basicConfig(level=logging.INFO)

    # --------------------------------------------------------------- errors
    def err(code, en, hi, status, **extra):
        return jsonify(error={"code": code, "en": en, "hi": hi, **extra}), status

    @app.errorhandler(ValidationError)
    def _val(e):
        return err("VALIDATION", e.en, e.hi, 400, field=e.field)

    @app.errorhandler(ModelNotReady)
    def _nm(e):
        return err("MODEL_NOT_READY", "The prediction model is not trained yet. Run: python -m ml.train",
                   "भविष्यवाणी मॉडल अभी प्रशिक्षित नहीं है। चलाएँ: python -m ml.train", 503)

    @app.errorhandler(404)
    def _404(e):
        if request.path.startswith("/api/"):
            return err("NOT_FOUND", "Not found.", "नहीं मिला।", 404)
        return send_from_directory(app.static_folder, "index.html")

    @app.errorhandler(405)
    def _405(e): return err("METHOD", "Method not allowed.", "यह तरीका अनुमत नहीं है।", 405)

    @app.errorhandler(413)
    def _413(e): return err("TOO_LARGE", "Request is too large.", "अनुरोध बहुत बड़ा है।", 413)

    @app.errorhandler(Exception)
    def _500(e):
        log.exception("Unhandled error")           # details stay in the server log only
        return err("SERVER_ERROR", "Something went wrong on the server. Please try again.",
                   "सर्वर पर कुछ गड़बड़ हुई। कृपया फिर कोशिश करें।", 500)

    # ----------------------------------------------------------------- helpers
    def model_inputs(d, pred, need_crop=True):
        state = get_choice(d, "state", pred.states, required=True, label="State")
        crop = get_choice(d, "crop", pred.crops, required=need_crop, label="Crop")
        season = get_choice(d, "season", pred.seasons, label="Season")
        d0 = pred.fb.state_defaults_.get(state, {"fert_ha": 130.0, "pest_ha": 0.27, "rainfall": 1200.0})
        this_year = dt.date.today().year
        return dict(
            state=state, crop=crop, season=season,
            year=get_number(d, "year", 1997, this_year + 5, default=this_year, integer=True, label="Year"),
            rainfall=get_number(d, "rainfall", 0, 12000, default=d0["rainfall"], label="Rainfall (mm)"),
            fert_ha=get_number(d, "fertilizer", 0, 2000, default=d0["fert_ha"], label="Fertilizer (kg/ha)"),
            pest_ha=get_number(d, "pesticide", 0, 50, default=d0["pest_ha"], label="Pesticide (kg/ha)"),
            area=get_number(d, "area", 0.01, 1_000_000, default=1.0, label="Area (ha)"))

    def check_crop_in_state(pred, crop, state):
        """Reject crops that have no reliable record in the state (bilingual message, lists where it IS recorded)."""
        if pred.grown_in_state(crop, state):
            return
        n = pred.years_recorded(crop, state); where = ", ".join(pred.states_growing(crop)) or "-"
        where_hi = ", ".join(STATE_HI.get(x, x) for x in pred.states_growing(crop)) or "-"
        hi_c = CROPS[crop]["hi"] if crop in CROPS else CROP_HI.get(crop, crop)
        raise ValidationError("crop",
            f"{crop} has no meaningful record in {state} in our data (1997-2020){'' if n == 0 else f', only {n} year(s)'}, so we cannot estimate it (it may still be grown there, we just have no figures). It is recorded in: {where}.",
            f"हमारे डेटा (1997-2020) में {STATE_HI.get(state, state)} में {hi_c} का {'कोई उल्लेखनीय रिकॉर्ड नहीं है' if n == 0 else f'सिर्फ़ {n} साल का रिकॉर्ड है'}, इसलिए अंदाज़ा नहीं लगा सकते (हो सकता है वहाँ उगती हो, पर हमारे पास आँकड़े नहीं)। ये इन राज्यों में दर्ज है: {where_hi}।")

    # ------------------------------------------------------------------ pages
    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/health")
    def health():
        try:
            get_predictor(); ok = True
        except ModelNotReady:
            ok = False
        return jsonify(status="ok" if ok else "model_missing", time=dt.datetime.utcnow().isoformat() + "Z")

    # -------------------------------------------------------------------- meta
    @app.get("/api/meta")
    @rate_limited()
    def meta():
        p = get_predictor(); m = p.meta()
        for c in m["crops"]:
            c["hi"] = CROPS[c["name"]]["hi"] if c["name"] in CROPS else CROP_HI.get(c["name"], "")
        m["state_hi"] = STATE_HI; m["season_hi"] = SEASON_HI
        m["kb_crops"] = [{"name": c, "hi": v["hi"]} for c, v in CROPS.items()]
        m["soils"] = [{"id": s, "name": SOILS[s]["name"]} for s in SOIL_TYPES]
        m["current_year"] = dt.date.today().year
        return jsonify(m)

    @app.get("/api/model-info")
    @rate_limited()
    def model_info():
        f = REPORT_DIR / "metrics.json"
        if not f.exists():
            return err("NO_REPORT", "Evaluation report not found. Run: python -m ml.train",
                       "मूल्यांकन रिपोर्ट नहीं मिली। चलाएँ: python -m ml.train", 404)
        return jsonify(json.loads(f.read_text()))

    # ----------------------------------------------------------------- predict
    @app.post("/api/predict")
    @rate_limited()
    def predict():
        p = get_predictor(); d = need_json(); i = model_inputs(d, p)
        check_crop_in_state(p, i["crop"], i["state"])
        season = i["season"] or p.default_season(i["crop"], i["state"])
        args = (i["state"], i["crop"], season, i["year"], i["rainfall"], i["fert_ha"], i["pest_ha"], i["area"])
        res = p.predict(*args)
        res["sensitivity"] = p.sensitivity(*args)
        res["history"] = p.history(i["crop"], i["state"])
        # soil/irrigation/temperature are NOT model inputs: report the suitability separately
        soil = get_choice(d, "soil", SOIL_TYPES + ["unknown"], default="unknown", label="Soil")
        if i["crop"] in CROPS and soil != "unknown":
            s = CROPS[i["crop"]]["soil"]
            res["soil_suitability"] = "good" if soil in s["good"] else "ok" if soil in s["ok"] else "poor"
        res["not_in_model"] = ["soil_type", "soil_fertility", "temperature", "irrigation"]
        return jsonify(res)

    @app.post("/api/compare")
    @rate_limited()
    def compare():
        p = get_predictor(); d = need_json(); i = model_inputs(d, p, need_crop=False)
        crops = d.get("crops")
        if not isinstance(crops, list) or not (2 <= len(crops) <= 8) or any(c not in p.crops for c in crops):
            raise ValidationError("crops", "Choose between 2 and 8 valid crops to compare.",
                                  "तुलना के लिए 2 से 8 मान्य फसलें चुनें।")
        for c in crops:
            check_crop_in_state(p, c, i["state"])
        return jsonify(results=p.compare(i["state"], crops, i["season"], i["year"], i["rainfall"],
                                         i["fert_ha"], i["pest_ha"], i["area"]))

    @app.get("/api/history")
    @rate_limited()
    def history():
        p = get_predictor()
        crop = get_choice(request.args, "crop", p.crops, required=True, label="Crop")
        state = get_choice(request.args, "state", p.states, required=True, label="State")
        return jsonify(p.history(crop, state))

    # --------------------------------------------------------------- knowledge
    @app.get("/api/soils")
    @rate_limited()
    def soils():
        return jsonify(soils=[{"id": s, **SOILS[s],
                               "good_crops": [c for c, v in CROPS.items() if s in v["soil"]["good"]],
                               "ok_crops": [c for c, v in CROPS.items() if s in v["soil"]["ok"]]}
                              for s in SOIL_TYPES],
                       fertility_levels=FERTILITY_LEVELS,
                       note={"en": "Soil type and fertility are not in the training dataset; they drive suitability and fertilizer advice only.",
                             "hi": "मिट्टी का प्रकार व उर्वरता प्रशिक्षण डेटा में नहीं हैं; ये केवल उपयुक्तता व खाद सलाह के लिए उपयोग होते हैं।"})

    @app.get("/api/crop/<path:name>")
    @rate_limited()
    def crop_info(name):
        if name not in CROPS:
            return err("NOT_FOUND", "No detailed guidance for this crop. Ask your KVK.",
                       "इस फसल की विस्तृत जानकारी उपलब्ध नहीं। अपने KVK से पूछें।", 404)
        c = CROPS[name]
        return jsonify(name=name, hi=c["hi"], seasons=c["seasons"], water_need=["low", "medium", "high"][c["water"]],
                       temp_range=c["temp"], soil=c["soil"], sowing=c["sowing"], irrigation=c["irrigation"],
                       tips=c["tips"],
                       diseases=[{**dd, "kind_label": KIND[dd["kind"]], "management": MANAGEMENT[dd["kind"]]} for dd in c["diseases"]],
                       npk_range={"N": c["npk"][0], "P2O5": c["npk"][1], "K2O": c["npk"][2]},
                       disclaimer={"en": "Indicative ranges from common ICAR/SAU practices. Doses and dates vary by state, variety and soil test. Confirm with your Soil Health Card and KVK.",
                                   "hi": "ICAR/SAU की सामान्य पद्धतियों पर आधारित संकेतक सीमाएँ। मात्रा व तिथि राज्य, किस्म व मिट्टी जाँच से बदलती हैं। अपने मृदा स्वास्थ्य कार्ड व KVK से पुष्टि करें।"})

    @app.post("/api/fertilizer")
    @rate_limited()
    def fertilizer():
        d = need_json()
        crop = get_choice(d, "crop", list(CROPS), required=True, label="Crop")
        fert = get_choice(d, "fertility", FERTILITY_LEVELS + ["unknown"], default="unknown", label="Soil fertility")
        area = get_number(d, "area", 0.01, 100000, default=1.0, label="Area")
        plan = fertilizer_plan(crop, "medium" if fert == "unknown" else fert, area)
        plan["fertility_input"] = fert
        plan["notes"] = {
            "en": ["Apply phosphorus and potash at sowing; split nitrogen into 2-3 doses.",
                   "Add 5-10 tonnes/ha of well-rotted farmyard manure or compost where available; it improves every soil.",
                   "Pulses fix some of their own nitrogen, so they need less nitrogen than cereals.",
                   "Urea/DAP/MOP quantities are a calculator output of the nutrient range, not a prescription. A Soil Health Card gives the dose for your field."],
            "hi": ["फॉस्फोरस व पोटाश बुवाई पर दें; नाइट्रोजन 2-3 बार में दें।",
                   "उपलब्ध हो तो 5-10 टन/हेक्टेयर अच्छी सड़ी गोबर की खाद या कम्पोस्ट डालें; इससे हर मिट्टी सुधरती है।",
                   "दलहन फसलें कुछ नाइट्रोजन स्वयं स्थिर करती हैं, इसलिए अनाज से कम नाइट्रोजन चाहिए।",
                   "यूरिया/डीएपी/एमओपी की मात्रा पोषक-तत्व सीमा का गणना-परिणाम है, नुस्खा नहीं। आपके खेत की मात्रा मृदा स्वास्थ्य कार्ड से मिलेगी।"]}
        return jsonify(plan)

    @app.get("/api/resources")
    @rate_limited()
    def resources():
        p = get_predictor()
        state = get_choice(request.args, "state", p.states + p.meta()["states_not_covered"], label="State")
        district = (request.args.get("district") or "")[:60] or None
        return jsonify(resources_for(state, district))

    return app
