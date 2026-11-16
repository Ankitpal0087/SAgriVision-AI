/* Tiny dependency-free SVG charts (no CDN needed, so they work offline).
   Colours come from CSS variables, so they follow light/dark mode. */
(function () {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#1E6B45";
  const nice = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const fmt = (v) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString("en-IN") : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.0+$/, "");

  function tooltip(host) {
    const tip = document.createElement("div");
    tip.className = "tip"; tip.hidden = true; host.appendChild(tip);
    return {
      show(html, x, y) { tip.innerHTML = html; tip.hidden = false; tip.style.left = x + "px"; tip.style.top = y + "px"; },
      hide() { tip.hidden = true; },
    };
  }
  function hostPos(host, e) {
    const r = host.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e;
    return [t.clientX - r.left, t.clientY - r.top];
  }

  /* ---- line chart: opts {series:[{name,color,points:[[x,y],..]}], marker:{x,y,label}, xLabel, unit, title} */
  function line(host, opts) {
    host.innerHTML = ""; host.classList.add("chart");
    const W = 640, H = 270, m = { l: 48, r: 14, t: 14, b: 34 };
    const pts = opts.series.flatMap((s) => s.points);
    if (opts.marker) pts.push([opts.marker.x, opts.marker.y]);
    if (!pts.length) { host.innerHTML = '<div class="empty">' + esc(opts.empty || "No data") + "</div>"; return; }
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1;
    const ymax = nice(Math.max(...ys) * 1.1 || 1);
    const sx = (x) => m.l + ((x - x0) / Math.max(1, x1 - x0)) * (W - m.l - m.r);
    const sy = (y) => H - m.b - (y / ymax) * (H - m.t - m.b);
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = (ymax / 4) * i;
      g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 6}" y="${sy(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    const step = Math.max(1, Math.ceil((x1 - x0) / 7));
    for (let x = x0; x <= x1; x += step) g += `<text x="${sx(x)}" y="${H - 10}" text-anchor="middle">${x}</text>`;
    const dots = [];
    opts.series.forEach((s) => {
      const d = s.points.map((p, i) => (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(p[1]).toFixed(1)).join("");
      g += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round"/>`;
      s.points.forEach((p) => { g += `<circle cx="${sx(p[0])}" cy="${sy(p[1])}" r="3.6" fill="${s.color}"/>`; dots.push({ x: sx(p[0]), y: sy(p[1]), label: `${s.name}: ${p[0]}: <b>${fmt(p[1])}</b> ${esc(opts.unit || "")}` }); });
    });
    if (opts.marker) {
      const mk = opts.marker, last = opts.series[0] && opts.series[0].points.slice(-1)[0];
      if (last) g += `<line x1="${sx(last[0])}" y1="${sy(last[1])}" x2="${sx(mk.x)}" y2="${sy(mk.y)}" stroke="${css("--mustard")}" stroke-width="2" stroke-dasharray="5 5"/>`;
      g += `<circle cx="${sx(mk.x)}" cy="${sy(mk.y)}" r="8" fill="${css("--mustard")}" stroke="${css("--ink")}" stroke-width="2"/>`;
      dots.push({ x: sx(mk.x), y: sy(mk.y), label: `${esc(mk.label)}: <b>${fmt(mk.y)}</b> ${esc(opts.unit || "")}` });
    }
    host.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || "chart")}">${g}</svg>`);
    const svg = host.querySelector("svg"), tip = tooltip(host);
    const move = (e) => {
      const [px, py] = hostPos(host, e), k = svg.getBoundingClientRect().width / W;
      let best = null, bd = 1e9;
      dots.forEach((d) => { const dd = Math.hypot(d.x * k - px, d.y * k - py); if (dd < bd) { bd = dd; best = d; } });
      if (best && bd < 40) tip.show(best.label, best.x * k, best.y * k); else tip.hide();
    };
    host.onmousemove = move; host.ontouchstart = move; host.onmouseleave = tip.hide;
  }

  /* ---- horizontal bars: opts {items:[{label,value,color?,tip?}], unit, signed} */
  function bars(host, opts) {
    host.innerHTML = ""; host.classList.add("chart");
    const items = opts.items; if (!items.length) { host.innerHTML = '<div class="empty">' + esc(opts.empty || "No data") + "</div>"; return; }
    const rowH = 34, W = 640, labW = 150, m = { t: 8, b: 26, r: 56 };
    const H = items.length * rowH + m.t + m.b;
    const vals = items.map((i) => i.value);
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const span = (hi - lo) || 1;
    const sx = (v) => labW + ((v - lo) / span) * (W - labW - m.r);
    let g = `<line class="ax" x1="${sx(0)}" x2="${sx(0)}" y1="${m.t}" y2="${H - m.b}"/>`;
    const hits = [];
    items.forEach((it, i) => {
      const y = m.t + i * rowH, x0 = sx(Math.min(0, it.value)), w = Math.max(2, Math.abs(sx(it.value) - sx(0)));
      const col = it.color || (opts.signed && it.value < 0 ? css("--red") : css("--green"));
      g += `<text x="${labW - 8}" y="${y + rowH / 2 + 4}" text-anchor="end">${esc(it.label.length > 22 ? it.label.slice(0, 21) + "…" : it.label)}</text>`;
      g += `<rect x="${x0}" y="${y + 6}" width="${w}" height="${rowH - 12}" rx="4" fill="${col}"/>`;
      const tx = it.value >= 0 ? x0 + w + 6 : x0 - 6;
      g += `<text x="${tx}" y="${y + rowH / 2 + 4}" text-anchor="${it.value >= 0 ? "start" : "end"}">${esc(it.text || fmt(it.value) + (opts.unit || ""))}</text>`;
      hits.push({ y: y + rowH / 2, x: x0 + w / 2, label: it.tip || `${esc(it.label)}: <b>${fmt(it.value)}</b>${esc(opts.unit || "")}` });
    });
    host.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || "chart")}">${g}</svg>`);
    const svg = host.querySelector("svg"), tip = tooltip(host);
    const move = (e) => {
      const [, py] = hostPos(host, e), k = svg.getBoundingClientRect().width / W;
      let best = null, bd = 1e9;
      hits.forEach((d) => { const dd = Math.abs(d.y * k - py); if (dd < bd) { bd = dd; best = d; } });
      if (best && bd < rowH * k / 2) tip.show(best.label, best.x * k, best.y * k); else tip.hide();
    };
    host.onmousemove = move; host.ontouchstart = move; host.onmouseleave = tip.hide;
  }

  /* ---- vertical columns (e.g. daily rain): opts {items:[{label,value}], unit} */
  function columns(host, opts) {
    host.innerHTML = ""; host.classList.add("chart");
    const W = 640, H = 200, m = { l: 36, r: 8, t: 14, b: 28 }, items = opts.items;
    if (!items.length) { host.innerHTML = '<div class="empty">' + esc(opts.empty || "No data") + "</div>"; return; }
    const ymax = nice(Math.max(...items.map((i) => i.value), 1) * 1.15), bw = (W - m.l - m.r) / items.length;
    const sy = (v) => H - m.b - (v / ymax) * (H - m.t - m.b);
    let g = "";
    for (let i = 0; i <= 3; i++) { const v = (ymax / 3) * i; g += `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text x="${m.l - 5}" y="${sy(v) + 4}" text-anchor="end">${fmt(v)}</text>`; }
    items.forEach((it, i) => {
      const x = m.l + i * bw + bw * 0.18, w = bw * 0.64, col = it.color || css("--blue");
      g += `<rect x="${x}" y="${sy(it.value)}" width="${w}" height="${Math.max(1, H - m.b - sy(it.value))}" rx="3" fill="${col}"><title>${esc(it.label)}: ${fmt(it.value)}${esc(opts.unit || "")}</title></rect>`;
      g += `<text x="${x + w / 2}" y="${H - 9}" text-anchor="middle">${esc(it.label)}</text>`;
    });
    host.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title || "chart")}">${g}</svg>`);
  }

  /* ---- range gauge: low..high with mid marker. Positions use CSSOM (CSP-safe). */
  function range(host, lo, mid, hi, unit) {
    host.innerHTML = '<div class="range"><div class="trk"></div><div class="rng"></div><div class="mid"></div><span class="lo"></span><span class="hi"></span></div>';
    const pad = (hi - lo) * 0.25 || 1, a = Math.max(0, lo - pad), b = hi + pad, p = (v) => ((v - a) / (b - a)) * 100;
    const r = host.querySelector(".rng"); r.style.left = p(lo) + "%"; r.style.width = p(hi) - p(lo) + "%";
    host.querySelector(".mid").style.left = p(mid) + "%";
    const l = host.querySelector(".lo"), h = host.querySelector(".hi");
    l.style.left = p(lo) + "%"; h.style.left = p(hi) + "%"; l.textContent = fmt(lo); h.textContent = fmt(hi);
    host.setAttribute("aria-label", `${fmt(lo)} – ${fmt(hi)} ${unit || ""}`);
  }

  window.Charts = { line, bars, columns, range, fmt };
})();
