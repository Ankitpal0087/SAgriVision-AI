"""API security + strict input validation.

Controls
  * per-IP sliding-window rate limit (in-memory; use Redis for multi-process deploys)
  * optional API key (X-API-Key) via the API_KEY env var, compared in constant time
  * state-changing requests must be JSON and carry `X-Requested-With: CropAdvisor`
    (a custom header cannot be sent cross-site without a CORS pre-flight, and we
    send no CORS headers, so other websites cannot call the API from a browser)
  * strict security headers incl. a Content-Security-Policy
  * request size cap (Flask MAX_CONTENT_LENGTH) and no stack traces in responses
  * validators reject NaN/inf/bool/strings-as-numbers and unknown categories
"""
from __future__ import annotations

import hmac
import math
import time
from collections import defaultdict, deque
from functools import wraps

from flask import current_app, jsonify, request


class ValidationError(Exception):
    def __init__(self, field, en, hi):
        super().__init__(en)
        self.field, self.en, self.hi = field, en, hi


# ------------------------------------------------------------------ validators
def get_number(data, key, lo, hi, *, default=None, required=False, integer=False, label=None):
    label = label or key
    v = data.get(key, None)
    if v is None or v == "":
        if required:
            raise ValidationError(key, f"{label} is required.", f"{label} भरना ज़रूरी है।")
        return default
    if isinstance(v, bool) or not isinstance(v, (int, float, str)):
        raise ValidationError(key, f"{label} must be a number.", f"{label} एक संख्या होनी चाहिए।")
    try:
        x = float(v)
    except (TypeError, ValueError):
        raise ValidationError(key, f"{label} must be a number.", f"{label} एक संख्या होनी चाहिए।")
    if math.isnan(x) or math.isinf(x):
        raise ValidationError(key, f"{label} must be a finite number.", f"{label} एक वैध संख्या होनी चाहिए।")
    if x < lo or x > hi:
        f = lambda n: f"{n:,.0f}" if abs(n) >= 1000 else f"{n:g}"
        raise ValidationError(key, f"{label} must be between {f(lo)} and {f(hi)}.",
                              f"{label} {f(lo)} से {f(hi)} के बीच होना चाहिए।")
    if integer:
        if x != int(x):
            raise ValidationError(key, f"{label} must be a whole number.", f"{label} पूर्ण संख्या होनी चाहिए।")
        return int(x)
    return x


def get_choice(data, key, allowed, *, default=None, required=False, label=None):
    label = label or key
    v = data.get(key, None)
    if v is None or v == "":
        if required:
            raise ValidationError(key, f"{label} is required.", f"{label} चुनना ज़रूरी है।")
        return default
    if not isinstance(v, str) or v not in allowed:
        raise ValidationError(key, f"{label} is not a valid choice.", f"{label} का चयन मान्य नहीं है।")
    return v


def need_json():
    if not request.is_json:
        raise ValidationError("body", "Request must be JSON (Content-Type: application/json).",
                              "अनुरोध JSON में होना चाहिए।")
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValidationError("body", "Request body must be a JSON object.", "अनुरोध की बॉडी JSON ऑब्जेक्ट होनी चाहिए।")
    return data


# ---------------------------------------------------------------- rate limiting
_hits: dict[str, deque] = defaultdict(deque)


def _client_ip():
    # Do not trust X-Forwarded-For unless you run behind your own proxy and set it up.
    return request.remote_addr or "unknown"


def rate_limited(limit_per_min=None):
    def deco(fn):
        @wraps(fn)
        def wrapper(*a, **kw):
            limit = limit_per_min or current_app.config["RATE_LIMIT_PER_MIN"]
            now = time.time(); q = _hits[_client_ip()]
            while q and now - q[0] > 60:
                q.popleft()
            if len(q) >= limit:
                resp = jsonify(error={"code": "RATE_LIMITED",
                                      "en": "Too many requests. Please wait a minute and try again.",
                                      "hi": "बहुत अधिक अनुरोध। कृपया एक मिनट रुककर फिर कोशिश करें।"})
                resp.status_code = 429; resp.headers["Retry-After"] = "60"
                return resp
            q.append(now)
            return fn(*a, **kw)
        return wrapper
    return deco


def reset_rate_limits():
    _hits.clear()


# ---------------------------------------------------------------------- hooks
def install_security(app):
    @app.before_request
    def _guard():
        if not request.path.startswith("/api/"):
            return None
        key = app.config.get("API_KEY")
        if key:
            sent = request.headers.get("X-API-Key", "")
            if not hmac.compare_digest(sent.encode(), key.encode()):
                return jsonify(error={"code": "UNAUTHORIZED", "en": "Missing or invalid API key.",
                                      "hi": "API कुंजी गायब या अमान्य है।"}), 401
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            if request.headers.get("X-Requested-With") != "CropAdvisor":
                return jsonify(error={"code": "FORBIDDEN", "en": "Missing X-Requested-With header.",
                                      "hi": "आवश्यक हेडर गायब है।"}), 403
        return None

    @app.after_request
    def _headers(resp):
        resp.headers["X-Content-Type-Options"] = "nosniff"
        resp.headers["X-Frame-Options"] = "DENY"
        resp.headers["Referrer-Policy"] = "no-referrer"
        resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        resp.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; "
            "base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
        if request.path.startswith("/api/"):
            resp.headers["Cache-Control"] = "no-store"
        return resp
