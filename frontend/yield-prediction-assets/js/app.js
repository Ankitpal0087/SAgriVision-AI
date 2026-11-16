/* Kisan Salah frontend. Vanilla JS, no build step. CSP-safe: no inline styles/handlers. */
(function () {
  "use strict";
  const { t, pick } = I18N;
  const API_BASE = "http://localhost:3000/api/yield-prediction";
  const ASSET_BASE = "./yield-prediction-assets";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const S = { meta: null, ctx: {}, prefill: null, cache: {} };
  const ACRE = 0.4047;
  const view = $("#view");

  /* ------------------------------------------------------------ helpers */
  function toast(msg, ms = 4500) {
    const el = $("#toast"); el.textContent = msg; el.hidden = false;
    clearTimeout(toast.t); toast.t = setTimeout(() => (el.hidden = true), ms);
  }
  async function api(path, opts = {}) {
    const init = { method: opts.method || "GET", headers: {} };
    if (opts.body !== undefined) { init.method = "POST"; init.headers["Content-Type"] = "application/json"; init.headers["X-Requested-With"] = "CropAdvisor"; init.body = JSON.stringify(opts.body); }
    let res;
    init.headers.Authorization = `Bearer ${sessionStorage.getItem("sagrivision-auth-token") || ""}`;
    try { res = await fetch(`${API_BASE}${path.replace(/^\/api/, "")}`, init); } catch (e) { throw { message: t("err_net"), offline: true }; }
    let data = null; try { data = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok) { const er = (data && data.error) || {}; throw { message: pick(er) || t("err_generic"), code: er.code, field: er.field }; }
    return data;
  }
  const bars = (root = document) => $$("[data-w]", root).forEach((el) => (el.style.width = Math.max(0, Math.min(100, +el.dataset.w)) + "%"));
  const cropHi = (c) => { const k = S.meta.crops.find((x) => x.name === c); return (k && k.hi) || ""; };
  const cropLabel = (c) => { const h = cropHi(c); return !h ? c : I18N.lang() === "hi" ? `${h} · ${c}` : `${c} · ${h}`; };   // both names, side by side
  const cropOpt = cropLabel;
  const stateName = (s) => (I18N.lang() === "hi" && S.meta.state_hi[s]) || s;
  const seasonName = (s) => (I18N.lang() === "hi" && S.meta.season_hi[s]) || s;
  const num = (v, d = 2) => (v == null ? "–" : Charts.fmt(+v));
  const optionsHtml = (items, sel, first) => (first ? `<option value="">${esc(first)}</option>` : "") + items.map(([v, l]) => `<option value="${esc(v)}"${v === sel ? " selected" : ""}>${esc(l)}</option>`).join("");
  const stateOpts = (sel) => optionsHtml(S.meta.states.map((s) => [s, stateName(s)]), sel, t("choose"));
  const cropList = () => S.meta.crops.filter((c) => !c.aggregate).map((c) => c.name);
  const cropOpts = (sel, only) => optionsHtml((only || cropList()).map((c) => [c, cropOpt(c)]), sel, t("choose"));
  const soilOpts = (sel) => optionsHtml([["unknown", t("soil_unknown")], ...S.meta.soils.map((s) => [s.id, pick(s.name)])], sel || "unknown");
  const confBadge = (c) => `<span class="badge b-${c}">${esc(t("c_" + c))}</span>`;
  const note = (kind, text, icon = "i-info") => `<div class="note ${kind}"><svg class="ico"><use href="#${icon}"/></svg><div>${esc(text)}</div></div>`;
  const errBox = (e) => note("bad", e.message || t("err_generic"), "i-alert");
  const busy = (btn, on) => { btn.disabled = on; };
  const spinner = () => `<div class="empty"><span class="spinner" role="status" aria-label="${esc(t("loading"))}"></span></div>`;
  const uncoveredNote = () => (S.meta.states_not_covered && S.meta.states_not_covered.length ? note("info", t("uncovered", { s: S.meta.states_not_covered.map(stateName).join(", ") }), "i-info") : "");
  const stateDefaults = (s) => S.meta.state_defaults[s] || { fert_ha: 130, pest_ha: 0.27, rainfall: 1200 };

  /* ------------------------------------------------------------ pages */
  const NAV = [["home", "i-home"], ["predict", "i-wheat"], ["advice", "i-flask"], ["soil", "i-layers"], ["about", "i-info"]];
  function renderNav(cur) {
    $("#nav").innerHTML = NAV.map(([k, ic]) => `<a href="#/${k}"${k === cur ? ' aria-current="page"' : ""}><svg class="ico"><use href="#${ic}"/></svg><span>${esc(t("nav_" + k))}</span></a>`).join("");
  }

  /* ---- crops that have no record in the chosen state: marked, not selectable, popup explains */
  const yearsIn = (st, c) => ((S.meta.crops_by_state[st] || {})[c]) || 0;
  const okIn = (st, c) => !st || !c || yearsIn(st, c) >= S.meta.min_years;
  function showNA(st, c, done) {
    const n = yearsIn(st, c), grow = Object.keys(S.meta.crops_by_state).filter((x) => yearsIn(x, c) >= S.meta.min_years).sort((a, b) => yearsIn(b, c) - yearsIn(a, c)).slice(0, 6).map(stateName).join(", ");
    const prev = document.activeElement, ov = document.createElement("div"); ov.className = "modal";
    ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="na-t"><h2 id="na-t">${esc(t("na_title", { s: stateName(st) }))}</h2>
      <p><b>${esc(cropLabel(c))}</b>: ${esc(n === 0 ? t("na_t0", { s: stateName(st) }) : t("na_t1", { s: stateName(st), n }))}</p>
      ${grow ? `<p class="muted">${esc(t("na_where", { w: grow }))}</p>` : ""}<p class="muted">${esc(t("na_note"))}</p><button class="btn" type="button" id="na-ok">${esc(t("na_ok"))}</button></div>`;
    document.body.appendChild(ov); const ok = $("#na-ok"); ok.focus();
    const close = () => { ov.remove(); document.removeEventListener("keydown", esc_); if (prev && prev.focus) prev.focus(); if (done) done(); };
    const esc_ = (e) => { if (e.key === "Escape") close(); };
    ok.onclick = close; ov.onclick = (e) => { if (e.target === ov) close(); }; document.addEventListener("keydown", esc_);
  }

  const PAGES = {};

  PAGES.home = () => {
    const tiles = [["predict", "i-wheat"], ["advice", "i-flask"], ["soil", "i-layers"]];
    view.innerHTML = `
      <section class="hero one"><div>
          <h1>${esc(t("home_title"))}</h1><p>${esc(t("home_sub"))}</p>
          <a class="btn alt" href="#/predict">${esc(t("home_go"))}</a></div></section>
      <div class="grid g3">${tiles.map(([k, ic]) => `<a class="tile" href="#/${k}"><span class="ti"><svg class="ico"><use href="#${ic}"/></svg></span><b>${esc(t("nav_" + k))}</b><span>${esc(t("d_" + k))}</span></a>`).join("")}</div>
      <div class="card flat"><h3>${esc(t("honest_title"))}</h3><p>${esc(t("honest_text"))}</p></div>`;
  };

  /* ---- Predict */
  PAGES.predict = () => {
    const pf = S.prefill || {}; S.prefill = null;
    const def = stateDefaults(pf.state || S.ctx.state);
    const kb = S.meta.kb_crops.map((c) => c.name);
    view.innerHTML = `
      <h1>${esc(t("predict_title"))}</h1>${uncoveredNote()}
      <form id="pf" class="card form" novalidate>
        <div class="field"><label for="p-state">${esc(t("state"))}</label><select id="p-state" required>${stateOpts(pf.state || S.ctx.state)}</select></div>
        <div class="field"><label for="p-crop">${esc(t("crop"))}</label><select id="p-crop" required>${cropOpts(pf.crop || S.ctx.crop)}</select><span class="hint" id="na-key" hidden>${esc(t("na_key"))}</span></div>
        <div class="field"><label for="p-area">${esc(t("area"))}</label>
          <div class="row"><input id="p-area" type="number" inputmode="decimal" min="0.01" step="any" value="${pf.area_ha ? +(pf.area_ha / ACRE).toFixed(2) : 1}">
          <select id="p-unit" aria-label="unit"><option value="acre">${esc(t("unit_acre"))}</option><option value="bigha">${esc(t("unit_bigha"))}</option><option value="ha">${esc(t("unit_ha"))}</option></select></div></div>
        <div class="field" id="p-bg" hidden><label for="p-bigha">${esc(t("bigha_eq"))}</label><input id="p-bigha" type="number" inputmode="decimal" min="0.01" step="any" value="0.625"><span class="hint">${esc(t("bigha_hint"))}</span></div>
        <details class="adv full"><summary>${esc(t("advanced"))}</summary>
          <p class="hint muted">${esc(t("default_hint"))}</p>
          <div class="form">
            <div class="field"><label for="p-season">${esc(t("season"))}</label><select id="p-season">${optionsHtml(S.meta.seasons.map((s) => [s, seasonName(s)]), "", t("auto"))}</select></div>
            <div class="field"><label for="p-year">${esc(t("year"))}</label><input id="p-year" type="number" inputmode="numeric" min="1997" max="${S.meta.current_year + 5}" value="${S.meta.current_year}"></div>
            <div class="field"><label for="p-soil">${esc(t("soil"))}</label><select id="p-soil">${soilOpts(S.ctx.soil)}</select></div>
            <div class="field"><label for="p-rain">${esc(t("rainfall"))}</label><input id="p-rain" type="number" min="0" step="any" value="${def.rainfall}"></div>
            <div class="field"><label for="p-fert">${esc(t("fertilizer"))}</label><input id="p-fert" type="number" min="0" step="any" value="${def.fert_ha}"></div>
            <div class="field"><label for="p-pest">${esc(t("pesticide"))}</label><input id="p-pest" type="number" min="0" step="any" value="${def.pest_ha}"></div>
          </div></details>
        <div class="full"><button class="btn" id="p-go" type="submit">${esc(t("predict_btn"))}</button></div>
      </form>
      <div id="p-out" aria-live="polite"></div>
      <h2>${esc(t("compare_title"))}</h2>
      <div class="card"><p class="muted">${esc(t("pick_crops"))}</p><p class="muted" id="cmp-hint"></p>
        <div class="chips" id="cmp-chips">${kb.map((c) => `<button type="button" class="chip" data-c="${esc(c)}" aria-pressed="false">${esc(cropLabel(c))}</button>`).join("")}</div>
        <p><button class="btn ghost" id="cmp-go" type="button">${esc(t("compare_btn"))}</button></p>
        <div id="cmp-out"></div></div>`;

    const markCrops = () => {
      const st = $("#p-state").value;
      $$("#p-crop option").forEach((o) => { if (!o.value) return; const base = cropLabel(o.value); o.textContent = okIn(st, o.value) ? base : base + "  ✖"; });
      let hid = 0;                                   // comparison shows ONLY crops that are recorded in the chosen state
      $$("#cmp-chips .chip").forEach((c) => { const na = !st || !okIn(st, c.dataset.c); c.hidden = na; if (na) { c.setAttribute("aria-pressed", "false"); if (st) hid++; } });
      $("#cmp-hint").textContent = !st ? t("cmp_pickstate") : hid ? t("cmp_hidden", { n: hid, s: stateName(st) }) : "";
      $("#na-key").hidden = !st;
    };
    $("#p-state").onchange = (e) => {
      const d = stateDefaults(e.target.value); $("#p-rain").value = d.rainfall; $("#p-fert").value = d.fert_ha; $("#p-pest").value = d.pest_ha;
      const cur = $("#p-crop").value; markCrops();
      if (cur && !okIn(e.target.value, cur)) { $("#p-crop").value = ""; showNA(e.target.value, cur); }
    };
    $("#p-crop").onchange = (e) => { const st = $("#p-state").value, c = e.target.value; if (c && !okIn(st, c)) { e.target.value = ""; showNA(st, c); } };
    markCrops();
    $("#p-unit").value = "acre";
    $("#p-unit").onchange = () => ($("#p-bg").hidden = $("#p-unit").value !== "bigha");
    const body = () => {
      const unit = $("#p-unit").value, raw = parseFloat($("#p-area").value);
      const a = unit === "bigha" ? raw * (parseFloat($("#p-bigha").value) || 0.625) * ACRE : unit === "acre" ? raw * ACRE : raw;   // hectares
      return { state: $("#p-state").value, crop: $("#p-crop").value, season: $("#p-season").value || undefined, year: parseInt($("#p-year").value, 10),
        area: a, rainfall: parseFloat($("#p-rain").value), fertilizer: parseFloat($("#p-fert").value),
        pesticide: parseFloat($("#p-pest").value), soil: $("#p-soil").value };
    };
    $("#pf").onsubmit = async (e) => {
      e.preventDefault(); const b = body(), out = $("#p-out");
      if (!b.state) { out.innerHTML = note("warn", t("pick_state"), "i-alert"); return; }
      if (!b.crop) { out.innerHTML = note("warn", t("pick_crop"), "i-alert"); return; }
      if (!okIn(b.state, b.crop)) { out.innerHTML = ""; $("#p-crop").value = ""; showNA(b.state, b.crop); return; }
      S.ctx = { ...S.ctx, state: b.state, crop: b.crop }; if (b.soil !== "unknown") S.ctx.soil = b.soil;
      busy($("#p-go"), true); out.innerHTML = spinner();
      try { renderPrediction(await api("/api/predict", { body: b }), out); } catch (er) { out.innerHTML = errBox(er); }
      busy($("#p-go"), false);
    };
    $$("#cmp-chips .chip").forEach((c) => (c.onclick = () => {
      if (!okIn($("#p-state").value, c.dataset.c)) { showNA($("#p-state").value, c.dataset.c); return; }
      const on = c.getAttribute("aria-pressed") === "true";
      if (!on && $$("#cmp-chips [aria-pressed=true]").length >= 6) { toast(t("pick_crops")); return; }
      c.setAttribute("aria-pressed", String(!on));
    }));
    $("#cmp-go").onclick = async () => {
      const crops = $$("#cmp-chips [aria-pressed=true]").map((c) => c.dataset.c), out = $("#cmp-out"), b = body();
      if (!b.state) { out.innerHTML = note("warn", t("pick_state"), "i-alert"); return; }
      if (crops.length < 2) { out.innerHTML = note("warn", t("pick_crops"), "i-alert"); return; }
      out.innerHTML = spinner();
      try {
        const [r, hs] = await Promise.all([api("/api/compare", { body: { ...b, crop: undefined, crops, season: undefined } }), Promise.all(crops.map((c) => api(`/api/history?crop=${encodeURIComponent(c)}&state=${encodeURIComponent(b.state)}`).catch(() => null)))]);
        const acres = b.area / ACRE, rows = r.results.map((x, i) => { const tn = x.production_unit === "tonnes", P = tn ? window.PRICES.items[x.crop] : null;
          return { x, tn, P, q: x.yield.mid * (tn ? 10 : 1) * ACRE, risk: hs[i] ? riskOf(hs[i]) : null }; });
        out.innerHTML = `<p class="muted">${esc(t("cmp_help"))}</p><div class="tscroll"><table class="ctable"><thead><tr><th>${esc(t("col_crop"))}</th><th>${esc(t("cmp_q"))}</th><th>${esc(t("cmp_rate"))}</th><th>${esc(t("cmp_cost"))}</th><th>${esc(t("cmp_inc"))}</th><th>${esc(t("cmp_prof"))}</th><th>${esc(t("rk_short"))}</th></tr></thead><tbody>
          ${rows.map((o, i) => `<tr data-i="${i}"><td><b>${esc(cropLabel(o.x.crop))}</b><br><small>${esc(t("cmp_season"))}: ${esc(seasonName(o.x.season_used))}</small></td>
            <td>${num(o.q)} <small>${o.tn ? esc(t("quintal")) : esc(o.x.yield.unit.split("/")[0])}</small></td>
            <td><input class="cr" type="number" inputmode="decimal" min="0" value="${o.P ? o.P.msp : ""}" aria-label="${esc(t("cmp_rate"))}">${o.P ? "" : `<small>${esc(t("cmp_norate"))}</small>`}</td>
            <td><input class="cc" type="number" inputmode="decimal" min="0" aria-label="${esc(t("cmp_cost"))}">${o.P && o.P.cost ? `<small>${esc(t("cmp_ref", { c: Math.round(o.P.cost * o.q).toLocaleString("en-IN") }))}</small>` : ""}</td>
            <td class="ci"></td><td class="cp"></td><td>${o.risk ? `<span class="rk-b ${o.risk.level}">${esc(t("rk_" + o.risk.level))}</span>` : "–"}</td></tr>`).join("")}</tbody></table></div>
          <p><button class="btn ghost small" id="cmp-fill" type="button">${esc(t("cmp_fill"))}</button></p><div id="cmp-best"></div><h3 id="cmp-ct"></h3><div id="cmp-chart"></div>${note("info", t("compare_note"))}`;
        const upd = () => {
          const items = []; let any = false, best = null;
          rows.forEach((o, i) => { const tr = out.querySelector(`tr[data-i="${i}"]`), rate = parseFloat(tr.querySelector(".cr").value) || 0, cv = tr.querySelector(".cc").value, cost = parseFloat(cv) || 0;
            const inc = o.q * rate, prof = inc - cost, hasCost = cv !== ""; tr.querySelector(".ci").innerHTML = rate ? `₹ ${Math.round(inc).toLocaleString("en-IN")}<br><small>${esc(t("cmp_tot"))}: ₹ ${Math.round(inc * acres).toLocaleString("en-IN")}</small>` : "–";
            tr.querySelector(".cp").innerHTML = rate && hasCost ? `<b class="${prof < 0 ? "neg" : "pos"}">${prof < 0 ? "−" : ""}₹ ${Math.round(Math.abs(prof)).toLocaleString("en-IN")}</b><br><small>${esc(t("cmp_tot"))}: ₹ ${Math.round(prof * acres).toLocaleString("en-IN")}</small>` : "–";
            if (rate) { const v = hasCost ? prof : inc; if (hasCost) any = true; items.push({ label: cropLabel(o.x.crop), value: Math.round(v), text: "₹ " + Math.round(v).toLocaleString("en-IN"), signed: true }); if (hasCost && (!best || prof > best.p)) best = { p: prof, c: cropLabel(o.x.crop) }; } });
          $("#cmp-ct").textContent = items.length ? (any ? t("cmp_chart_p") : t("cmp_chart_i")) : ""; $("#cmp-best").innerHTML = best ? note("good", t("cmp_best", { c: best.c }), "i-check") : "";
          if (items.length) Charts.bars($("#cmp-chart"), { items, signed: true, unit: "", title: t("cmp_prof") }); else $("#cmp-chart").innerHTML = "";
        };
        out.querySelectorAll("input").forEach((i) => (i.oninput = upd));
        $("#cmp-fill").onclick = () => { rows.forEach((o, i) => { if (o.P && o.P.cost) out.querySelector(`tr[data-i="${i}"] .cc`).value = Math.round(o.P.cost * o.q); }); upd(); };
        upd();
      } catch (er) { out.innerHTML = errBox(er); }
    };
    if (pf.state && pf.crop) $("#pf").requestSubmit();
  };

  function riskOf(h) {
    const y = h.yield, yr = h.years; if (!y || y.length < 8) return null;
    let bad = 0, tests = 0, worst = 0;
    for (let i = 3; i < y.length; i++) { const base = (y[i - 1] + y[i - 2] + y[i - 3]) / 3, d = (y[i] - base) / base; tests++; if (d < -0.2) bad++; if (d < worst) worst = d; }
    const share = bad / tests, bi = y.indexOf(Math.max(...y)), wi = y.indexOf(Math.min(...y));
    return { n: y.length, bad, tests, worst: Math.round(-worst * 100), level: share < 0.1 ? "low" : share < 0.25 ? "medium" : "high", by: yr[bi], wy: yr[wi] };
  }
  const riskCard = (h) => { const k = riskOf(h); if (!k) return `<h2>${esc(t("rk_title"))}</h2><p class="muted">${esc(t("rk_few"))}</p>`;
    return `<h2>${esc(t("rk_title"))}</h2><p><span class="rk-b ${k.level}">${esc(t("rk_" + k.level))}</span></p><p>${esc(t("rk_text", { n: k.n, b: k.bad, t: k.tests }))}</p><p>${esc(t("rk_bw", { by: k.by, wy: k.wy, w: k.worst }))}</p><p class="muted">${esc(t("rk_note"))}</p>`; };
  async function cropInfo(name) { if (!S.cache["c:" + name]) { try { S.cache["c:" + name] = await api("/api/crop/" + encodeURIComponent(name)); } catch (e) { S.cache["c:" + name] = null; } } return S.cache["c:" + name]; }
  async function renderImprove(r, host) {
    const crop = r.inputs.crop, kbOk = S.meta.kb_crops.some((c) => c.name === crop);
    host.innerHTML = `<h2>${esc(t("imp_title"))}</h2>` + (kbOk ? `<p class="muted">${esc(t("imp_sub"))}</p>
      <div class="form"><div class="field"><label for="i-fert">${esc(t("fertility"))}</label><select id="i-fert">${optionsHtml([["unknown", t("f_unknown")], ["low", t("f_low")], ["medium", t("f_medium")], ["high", t("f_high")]], "unknown")}</select></div>
      <div class="field"><label for="i-wat">${esc(t("water"))}</label><select id="i-wat">${optionsHtml([["rainfed", t("w_rainfed")], ["limited", t("w_limited")], ["assured", t("w_assured")]], "limited")}</select></div>
      <div class="field"><label for="i-sow">${esc(t("imp_sow_q"))}</label><select id="i-sow">${optionsHtml([["ontime", t("sow_ontime")], ["late", t("sow_late")]], "ontime")}</select></div></div><div id="i-out"></div>` : `<p class="muted">${esc(t("imp_none"))}</p>`);
    if (!kbOk) return;
    const c = await cropInfo(crop); if (!$("#i-fert")) return;      // page changed while loading
    const draw = async () => {
      if (!$("#i-fert")) return;
      const fert = $("#i-fert").value, wat = $("#i-wat").value, sow = $("#i-sow").value; let bags = null;
      try { bags = await api("/api/fertilizer", { body: { crop, fertility: fert, area: r.inputs.area_ha } }); } catch (e) { /* skip fertilizer line */ }
      if (!$("#i-out")) return; const need = c.water_need, L = [];
      if (bags) L.push([t("imp_fert"), t("imp_bags", { u: bags.bags.urea, d: bags.bags.dap, m: bags.bags.mop })]);
      L.push([t("imp_water"), pick(c.irrigation) + (wat === "rainfed" && need === "high" ? " " + t("imp_hi_rain") : wat === "rainfed" && need === "medium" ? " " + t("imp_med_rain") : "") + (wat !== "assured" ? " " + t("imp_drip") : "")]);
      L.push([t("imp_sow"), pick(c.sowing) + (sow === "late" ? " " + t("imp_late") : "")]);
      L.push([t("imp_seed"), t("imp_seed_txt") + (c.tips[0] ? " " + pick(c.tips[0]) : "")]);
      L.push([t("imp_watch"), t("imp_watch_txt", { d: c.diseases.slice(0, 3).map((d) => pick(d.name)).join(", ") })]);
      if (fert === "unknown") L.push([t("imp_test"), t("imp_test_txt")]);
      $("#i-out").innerHTML = `<ul class="imp">${L.map(([h, x]) => `<li><b>${esc(h)}:</b> ${esc(x)}</li>`).join("")}</ul><p><a href="#/advice" id="i-more">${esc(t("imp_more"))} →</a></p>${note("warn", t("imp_note"), "i-alert")}`;
      const m = $("#i-more"); if (m) m.onclick = () => (S.prefill = { crop, tab: "disease" });
    };
    $$("#improve select").forEach((x) => (x.onchange = draw)); draw();
  }
  function renderPrediction(r, out) {
    const y = r.yield, lang = I18N.lang(), tn = !!r.production_quintal, acre = r.inputs.area_ha / ACRE;
    const Q = tn ? r.production_quintal : r.production, uName = tn ? t("quintal") : t("bale");
    const P = tn ? (window.PRICES.items[r.inputs.crop] || null) : null;
    const f1 = (v) => Charts.fmt(+v), money = (v) => "₹ " + Math.round(Math.abs(v)).toLocaleString("en-IN");
    const shown = r.warnings.filter((w) => w.code !== "FUTURE_YEAR" && w.code !== "DEMO");
    const extra = r.warnings.filter((w) => w.code === "FUTURE_YEAR" || w.code === "DEMO");
    const costRows = [["m_seed"], ["m_fert"], ["m_lab"], ["m_wat"], ["m_tr"], ["m_spr"], ["m_oth"]];
    const ref = P && P.cost ? t("m_ref", { c: P.cost.toLocaleString("en-IN"), t: Math.round(P.cost * Q.mid).toLocaleString("en-IN") }) : "";
    out.innerHTML = `
      <div class="hero-r">
        <div class="mu2">${esc(cropLabel(r.inputs.crop))} · ${esc(stateName(r.inputs.state))} · ${esc(seasonName(r.inputs.season))}</div>
        <div>${esc(t("y_you", { a: f1(acre) }))}</div>
        <div class="kpi">${f1(Q.mid)} <small>${esc(uName)}</small></div>
        <div class="mu2">${esc(t("y_range", { a: f1(Q.low), b: f1(Q.high), u: uName }))}</div>
        <div class="mu2">${esc(t("y_acre", { a: f1(Q.mid / acre), u: uName }))}</div>
        <p><span class="badge b-${r.confidence}">${esc(t("conf"))}: ${esc(t("c_" + r.confidence))}</span> <span class="mu2">${esc(t("c_ex_" + r.confidence))}</span></p>
      </div>
      ${shown.map((w) => note("warn", pick(w), "i-alert")).join("")}
      <div class="card" id="money"><h2>${esc(t("m_title"))}</h2>
        <label class="lbl" for="m-rate">${esc(t("m_rate", { u: uName }))}</label>
        <input id="m-rate" type="number" inputmode="decimal" min="0" value="${P ? P.msp : ""}">
        <p class="muted">${esc(P ? t("m_rate_hint") : t("m_nomsp"))}</p>
        ${P ? `<div class="note info"><svg class="ico"><use href="#i-info"/></svg><div><b>${esc(t("m_msp", { p: P.msp.toLocaleString("en-IN") }))}</b><br><small>${esc(pick(window.PRICES.tags[P.tag]))}</small><br><small>${esc(t("m_msp_note"))} <a href="https://agmarknet.gov.in" target="_blank" rel="noopener noreferrer">Agmarknet</a></small></div></div>` : ""}
        <h3>${esc(t("m_costs"))}</h3>
        ${costRows.map(([k]) => `<div class="mline"><div>${esc(t(k))}</div><input class="mc" type="number" inputmode="decimal" min="0" placeholder="₹" aria-label="${esc(t(k))}"></div>`).join("")}
        ${ref ? `<p class="muted">${esc(ref)}</p>` : ""}
        <div class="ptot"><span>${esc(t("m_cost"))}</span><span id="m-cost">₹ 0</span></div>
        <div id="m-res"></div>
      </div>
      <div class="card" id="risk">${riskCard(r.history)}</div>
      <div class="card" id="improve"></div>
      <details class="card more"><summary>${esc(t("more_info"))}</summary>
        <h3>${esc(t("history"))}</h3><div id="p-hist"></div>
        <div class="legend"><span><i class="lg1"></i>${esc(t("hist_actual"))}</span><span><i class="lg2"></i>${esc(t("hist_pred"))}</span></div>
        ${extra.map((w) => note("info", pick(w))).join("")}
        <p class="muted">${esc(t("not_in_model"))}</p><p class="muted">${esc(t("limits")[3].replace("{u}", y.unit))}</p>
      </details>
      ${note("warn", t("note_short"), "i-alert")}`;
    Charts.line($("#p-hist"), { unit: y.unit, title: t("history"), series: [{ name: t("hist_actual"), color: "#1E6B45", points: r.history.years.map((yr, i) => [yr, r.history.yield[i]]) }],
      marker: { x: r.inputs.year, y: y.mid, label: t("hist_pred") }, empty: t("no_results") });
    const upd = () => {
      const rate = parseFloat($("#m-rate").value) || 0; let cost = 0; $$(".mc").forEach((i) => (cost += parseFloat(i.value) || 0));
      $("#m-cost").textContent = money(cost); const res = $("#m-res");
      if (!rate) { res.innerHTML = ""; return; }
      const prof = (q) => q * rate - cost, P1 = prof(Q.mid), box = (l, v) => `<div>${esc(l)}<b class="${v < 0 ? "neg" : "pos"}">${v < 0 ? "−" : ""}${money(v)}</b></div>`;
      let h = `<div class="ptot"><span>${esc(t("m_inc"))}</span><span>${money(Q.mid * rate)}</span></div>
        <div class="kpi ${P1 < 0 ? "neg" : ""}">${esc(P1 < 0 ? t("m_loss") : t("m_profit"))}: ${money(P1)}</div>
        <div class="muted">${esc(t("m_per"))}: ${P1 < 0 ? "−" : ""}${money(P1 / acre)}</div>`;
      if (cost > 0) h += `<p class="muted">${esc(t("m_be", { b: Math.round(cost / Q.mid).toLocaleString("en-IN"), u: uName }))}</p>`;
      h += `<h3>${esc(t("m_sc"))}</h3><div class="three">${box(t("m_low"), prof(Q.low))}${box(t("m_exp"), P1)}${box(t("m_high"), prof(Q.high))}</div>`;
      if (P) {
        const d = rate - P.msp;
        h += note(d > 0 ? "good" : d < 0 ? "warn" : "info", d > 0 ? t("m_cmp_up", { d: Math.round(d).toLocaleString("en-IN") }) : d < 0 ? t("m_cmp_dn", { d: Math.round(-d).toLocaleString("en-IN") }) : t("m_cmp_eq"), d < 0 ? "i-alert" : "i-check");
        if (d !== 0) { const pm = Q.mid * P.msp - cost; h += `<p class="muted">${esc(t("m_at_msp", { p: (pm < 0 ? "−" : "") + money(pm) }))}</p>`; }
      }
      res.innerHTML = h;
    };
    $$("#money input").forEach((i) => (i.oninput = upd)); upd(); renderImprove(r, $("#improve"));
  }

  /* ---- Soil */
  PAGES.soil = async () => {
    const pf = S.prefill || {}; S.prefill = null; view.innerHTML = `<h1>${esc(t("soil_title"))}</h1>${spinner()}`;
    try {
      const [r, res] = await Promise.all([api("/api/soils"), api("/api/resources")]);
      view.innerHTML = `<h1>${esc(t("soil_title"))}</h1><p class="muted">${esc(t("soil_sub"))}</p>
        ${r.soils.map((s) => `<details class="card soil-card"${pf.soil === s.id ? " open" : ""}><summary>${esc(pick(s.name))}</summary>
          <p><b>${esc(t("where"))}:</b> ${esc(pick(s.where))}</p><p><b>${esc(t("traits"))}:</b> ${esc(pick(s.traits))} <span class="badge b-ok">pH ${esc(s.ph)}</span></p>
          <p><b>${esc(t("care"))}:</b> ${esc(pick(s.care))}</p>
          <p><b>${esc(t("good_for"))}:</b></p><div class="chips">${s.good_crops.map((c) => `<span class="badge b-good">${esc(cropLabel(c))}</span>`).join("") || "–"}</div>
          <p><b>${esc(t("ok_for"))}:</b></p><div class="chips">${s.ok_crops.map((c) => `<span class="badge b-ok">${esc(cropLabel(c))}</span>`).join("") || "–"}</div></details>`).join("")}
        ${note("info", pick(r.note))}
        <div class="card"><h3>${esc(t("sample_title"))}</h3><p>${esc(pick(res.how_to_sample))}</p>
          <a class="btn" href="https://soilhealth.dac.gov.in" target="_blank" rel="noopener noreferrer"><svg class="ico"><use href="#i-link"/></svg>${esc(t("shc"))}</a></div>`;
      if (pf.soil) { const o = $("details[open]"); if (o) o.scrollIntoView({ block: "center" }); }
    } catch (e) { view.innerHTML = `<h1>${esc(t("soil_title"))}</h1>${errBox(e)}`; }
  };

  /* ---- Advice */
  PAGES.advice = () => {
    const pf = S.prefill || {}; S.prefill = null; let tab = pf.tab || "fertilizer";
    const kb = S.meta.kb_crops.map((c) => c.name);
    view.innerHTML = `<h1>${esc(t("advice_title"))}</h1>
      <div class="card form"><div class="field"><label for="a-crop">${esc(t("crop"))}</label><select id="a-crop">${cropOpts(pf.crop || (kb.includes(S.ctx.crop) ? S.ctx.crop : ""), kb)}</select></div></div>
      <div class="tabs" role="tablist">${[["fertilizer", "tab_fert"], ["irrigation", "tab_irr"], ["disease", "tab_dis"], ["basics", "tab_basic"]].map(([k, l]) => `<button role="tab" data-t="${k}" aria-selected="${k === tab}">${esc(t(l))}</button>`).join("")}</div>
      <div id="a-out"></div>`;
    const draw = async () => {
      $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.t === tab)));
      const crop = $("#a-crop").value, out = $("#a-out"); if (!crop) { out.innerHTML = note("info", t("pick_crop")); return; }
      S.ctx.crop = crop; out.innerHTML = spinner();
      try {
        const c = await api("/api/crop/" + encodeURIComponent(crop)), disc = note("warn", pick(c.disclaimer), "i-alert");
        const kcc = `<div class="helpline"><svg class="ico"><use href="#i-phone"/></svg><div><small>${esc(t("kcc"))}</small><br><b>1800-180-1551</b></div></div>`;
        if (tab === "fertilizer") {
          out.innerHTML = `<form id="f-form" class="card form"><div class="field"><label for="f-lvl">${esc(t("fertility"))}</label><select id="f-lvl">${optionsHtml([["unknown", t("f_unknown")], ["low", t("f_low")], ["medium", t("f_medium")], ["high", t("f_high")]], "unknown")}</select></div>
            <div class="field"><label for="f-area">${esc(t("area"))}</label><div class="row"><input id="f-area" type="number" min="0.01" step="any" value="1"><select id="f-unit"><option value="acre">${esc(t("unit_acre"))}</option><option value="ha">${esc(t("unit_ha"))}</option></select></div></div>
            <div class="full"><button class="btn" type="submit">${esc(t("fert_btn"))}</button></div></form><div id="f-out"></div>${disc}`;
          const run = async (e) => {
            if (e) e.preventDefault(); const a = parseFloat($("#f-area").value) * ($("#f-unit").value === "acre" ? ACRE : 1);
            try {
              const f = await api("/api/fertilizer", { body: { crop, fertility: $("#f-lvl").value, area: a } }), n = f.range;
              if (!$("#f-out")) return;                      // user switched tab/page while loading
              $("#f-out").innerHTML = `<div class="card"><h3>${esc(t("nutrient_range"))}</h3><div class="grid g3"><div class="stat"><small>N</small><b>${n.N[0]}–${n.N[1]}</b></div><div class="stat"><small>P₂O₅</small><b>${n.P2O5[0]}–${n.P2O5[1]}</b></div><div class="stat"><small>K₂O</small><b>${n.K2O[0]}–${n.K2O[1]}</b></div></div></div>
                <div class="card"><h3>${esc(t("for_your_area"))} (${num(a)} ${esc(t("unit_ha"))})</h3><div class="tscroll"><table><tbody>
                ${[["urea", "urea_kg"], ["dap", "dap_kg"], ["mop", "mop_kg"]].map(([k, kg]) => `<tr><td>${esc(t(k))}</td><td><b>${num(f.total_for_area[kg])}</b> ${esc(t("kg"))}</td><td>≈ <b>${f.bags[k]}</b> ${esc(t("bags"))}</td></tr>`).join("")}</tbody></table></div>
                <ul>${pick(f.notes).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`;
            } catch (er) { if ($("#f-out")) $("#f-out").innerHTML = errBox(er); }
          };
          $("#f-form").onsubmit = run; run();
        } else if (tab === "irrigation") {
          out.innerHTML = `<div class="card"><p><b>${esc(t("water_need"))}:</b> <span class="badge b-${c.water_need === "high" ? "low" : c.water_need === "medium" ? "medium" : "high"}">${esc(t("n_" + c.water_need))}</span></p><p>${esc(pick(c.irrigation))}</p>${note("info", t("pmksy_tip"))}</div>${disc}`;
        } else if (tab === "disease") {
          out.innerHTML = c.diseases.map((d) => `<div class="card"><h3>${esc(pick(d.name))} <span class="badge b-medium">${esc(pick(d.kind_label))}</span></h3>
            <p><b>${esc(t("symptoms"))}:</b> ${esc(pick(d.symptoms))}</p><p><b>${esc(t("management"))}:</b> ${esc(pick(d.management))}</p></div>`).join("") + kcc + disc;
        } else {
          out.innerHTML = `<div class="card"><h3>${esc(t("sowing"))}</h3><p>${esc(pick(c.sowing))}</p><p class="muted">${esc(c.seasons.map(seasonName).join(", "))} · ${c.temp_range[0]}–${c.temp_range[1]} °C</p></div>
            <div class="card"><h3>${esc(t("tips"))}</h3><ul>${c.tips.map((x) => `<li>${esc(pick(x))}</li>`).join("")}</ul></div>${disc}`;
        }
      } catch (e) { out.innerHTML = errBox(e); }
    };
    $$(".tabs button").forEach((b) => (b.onclick = () => { tab = b.dataset.t; draw(); }));
    $("#a-crop").onchange = draw; draw();
  };

  /* ---- About */
  PAGES.about = async () => {
    view.innerHTML = `<h1>${esc(t("about_title"))}</h1>${spinner()}`;
    try {
      const m = await api("/api/model-info"), f = (v, d = 3) => (v == null ? "–" : (+v).toFixed(d));
      const order = ["Crop+State+Season historical mean", ...Object.keys(m.comparison)];
      const row = (n, x, sel) => `<tr${sel ? ' class="sel"' : ""}><td>${esc(n)}${sel ? " ✔" : ""}</td><td>${f(x.MAE_log)}</td><td>${f(x.RMSE_log)}</td><td>${f(x.R2_log)}</td><td>${f(x.R2_within_crop)}</td><td>${f(x.MAE_excl_coconut, 2)}</td><td>${f(x.RMSE_excl_coconut, 2)}</td><td>${f(x.R2_excl_coconut)}</td><td>${f(x.median_APE_pct, 1)}%</td></tr>`;
      const H = `<thead><tr><th>Model</th><th>MAE<sub>log</sub></th><th>RMSE<sub>log</sub></th><th>R²<sub>log</sub></th><th>R²<sub>within-crop</sub></th><th>MAE*</th><th>RMSE*</th><th>R²*</th><th>Median % err</th></tr></thead>`;
      view.innerHTML = `<h1>${esc(t("about_title"))}</h1>
        <div class="card"><p>${I18N.lang() === "hi" ? "यह ऐप 1997-2020 के सरकारी राज्य-स्तरीय रिकॉर्ड (19,689 पंक्तियाँ) से सीखता है। नीचे वह सब है जो मॉडल कर सकता है और नहीं कर सकता, ताकि आप उस पर सही मात्रा में भरोसा करें।" : `This app learns from ${m.dataset.rows_raw.toLocaleString("en-IN")} state-level government records (${m.dataset.years[0]}–${m.dataset.years[1]}). Below is what the model can and cannot do, so you can trust it exactly as much as it deserves.`}</p>
          <p class="muted">Selected: <b>${esc(m.selected_model)}</b> (${esc(m.selection_rule)}). Train ${esc(m.split.train)} · Validation ${esc(m.split.validation)} · Test ${esc(m.split.test)} (n=${m.split.n_test}). Trained ${esc(m.trained_at)}.</p></div>
        <div class="card"><h3>Test-set results (2017–2020, never used for selection)</h3><div class="tscroll"><table>${H}<tbody>${row("Baseline: historical mean (no ML)", m.baselines.test["Crop+State+Season historical mean"])}${Object.entries(m.comparison).map(([n, x]) => row(n, x.test, n === m.selected_model)).join("")}</tbody></table></div>
          <p class="muted">log = on log(1+yield). * = raw units excluding Coconut (nuts/ha would dominate). “within-crop R²” measures skill after removing the huge differences between crops, so it is the honest number. Plain R² on all crops is ${f(m.comparison[m.selected_model].test.R2)} but is inflated by Coconut and by crop differences.</p></div>
        <div class="card"><h3>What drives the prediction?</h3><div id="imp"></div>
          <div class="tscroll"><table><thead><tr><th>Ablation (selected model, test)</th><th>RMSE<sub>log</sub></th><th>R²<sub>within-crop</sub></th><th>Median % err</th></tr></thead><tbody>${Object.entries(m.ablation_test).map(([n, x]) => `<tr><td>${esc(n)}</td><td>${f(x.RMSE_log)}</td><td>${f(x.R2_within_crop)}</td><td>${f(x.median_APE_pct, 1)}%</td></tr>`).join("")}</tbody></table></div>
          ${note("warn", "Removing rainfall, fertilizer or pesticide changes nothing. The model works from crop identity and each state’s past yields. It does not learn how rain or fertilizer change yield, because the dataset stores them as state-year averages shared by all crops.", "i-alert")}</div>
        <div class="card"><h3>Prediction interval</h3><p>Target ${Math.round(m.interval.level * 100)}%, measured coverage on test years: <b>${(m.interval.empirical_test_coverage * 100).toFixed(1)}%</b> (slightly under target because later years drift from earlier ones).</p></div>
        <div class="card metrics"><h3>Charts</h3><div class="grid g2"><img src="${ASSET_BASE}/img/model_comparison.png" alt="Model comparison" loading="lazy"><img src="${ASSET_BASE}/img/predicted_vs_actual.png" alt="Predicted vs actual" loading="lazy"><img src="${ASSET_BASE}/img/feature_importance.png" alt="Feature importance" loading="lazy"><img src="${ASSET_BASE}/img/rolling_origin.png" alt="Rolling origin" loading="lazy"></div></div>
        <div class="card"><h3>Features missing from the dataset</h3><p>Soil type, soil fertility, temperature and irrigation are <b>not in the CSV</b>. They are not used by the model. The app uses a curated knowledge base (soil, fertilizer ranges, irrigation, diseases) for advice instead, and says so on each screen.</p>
          <h3>Data caveats</h3><ul>${m.data_caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
          <h3>Cleaning</h3><p class="muted">${m.dataset.cleaning.rows_in.toLocaleString("en-IN")} rows → ${m.dataset.cleaning.rows_out.toLocaleString("en-IN")}. Removed ${m.dataset.cleaning.dropped_zero_yield_rows} zero-yield rows and ${m.dataset.cleaning.dropped_outliers_per_crop_mad} impossible outliers (${esc(m.dataset.cleaning.outlier_rule)}).</p></div>`;
      Charts.bars($("#imp"), { items: m.permutation_importance.filter((x) => x.importance > 0.0005).slice(0, 8).map((x) => ({ label: x.feature, value: +x.importance.toFixed(4) })), title: "Permutation importance", unit: "" });
    } catch (e) { view.innerHTML = `<h1>${esc(t("about_title"))}</h1>${errBox(e)}`; }
  };

  /* ---------------------------------------------------------- router */
  function applyStatic() {
    $$("[data-i]").forEach((el) => (el.textContent = t(el.dataset.i)));
    $$("[data-ph]").forEach((el) => (el.placeholder = t(el.dataset.ph)));
    $("a.skip").textContent = t("skip");
    $("#lang-en").setAttribute("aria-pressed", String(I18N.lang() === "en")); $("#lang-hi").setAttribute("aria-pressed", String(I18N.lang() === "hi"));
  }
  async function route() {
    const key = (location.hash.replace(/^#\//, "") || "home").split("?")[0];
    const page = PAGES[key] ? key : "home";
    if (page === "predict" && location.hash.includes("?")) {   // link from another module: #/predict?crop=Wheat&state=Punjab&area_ha=1
      const q = new URLSearchParams(location.hash.split("?")[1]), ha = parseFloat(q.get("area_ha"));
      S.prefill = { crop: q.get("crop") || undefined, state: q.get("state") || undefined, area_ha: ha > 0 ? ha : undefined };
    }
    renderNav(page); applyStatic();
    if (!S.meta) {
      view.innerHTML = spinner();
      try { S.meta = await api("/api/meta"); } catch (e) {
        view.innerHTML = errBox(e) + `<button class="btn" id="m-retry" type="button">${esc(t("retry"))}</button>`; $("#m-retry").onclick = route; return;
      }
    }
    await PAGES[page](); bars(view); window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  const setLang = (l) => { I18N.set(l); route(); };
  $("#lang-en").onclick = () => setLang("en"); $("#lang-hi").onclick = () => setLang("hi");
  const net = () => { const b = $("#offline"); b.hidden = navigator.onLine; b.textContent = t("offline"); };
  window.addEventListener("online", net); window.addEventListener("offline", net);
  I18N.set(I18N.lang()); net(); route();
})();
