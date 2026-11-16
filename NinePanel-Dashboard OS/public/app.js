
/* Proveedor Quality Dashboard — Nine-Panel KPI
   Vanilla JS, no dependencies. Light theme.
   Enteraction: tooltips, filtro por región, range 6M/12M/Quarter, drill-down in modal. */

"use strict";

const $ = (id) => document.getElementById(id);

/* ---------- colors ---------- */
const C = {
  acento: "#C8102E",
  ok: "#4A4A4A",
  aviso: "#9A6A00",
  mal: "#C8102E",
  eu: "#4A4A4A",
  na: "#8A8D91",
  eje: "#9A9A9A",
  linea: "#E6E7E8",
  tenue: "#D2D4D5",
  claims: "#C8102E",
  copq: "#C8102E",
  ppap: { "Full approved": "#4A4A4A", "En process": "#8A8D91", "Expiring": "#9A6A00", "Expired": "#C8102E" },
};

const ESTADO = { datos: null, rango: "12", region: "all", ultimoFoco: null, focoOTD: null, scorecardFoco: false, modalHistorial: [], modalActual: null, focoFlotante: null };

const MES_NUM = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };

/* ---------- quarters / ordering ---------- */
const trimestreDe = (et) => { const n = MES_NUM[String(et || "").slice(0, 3)]; return n ? Math.ceil(n / 3) : 0; };
const quarterActivo = () => ESTADO.rango === "quarter";

function aniosSerie(puntos) {
  const anios = new Array((puntos || []).length);
  let anio = new Date().getFullYear();
  for (let i = (puntos || []).length - 1; i >= 0; i--) {
    anios[i] = anio;
    const mesDe = (x) => MES_NUM[String((x && (x.et || x.mes)) || "").slice(0, 3)];
    const actual = mesDe(puntos[i]);
    const previo = i > 0 ? mesDe(puntos[i - 1]) : null;
    if (actual && previo && previo > actual) anio--;
  }
  return anios;
}

function gruposTrimestre(puntos) {
  const anios = aniosSerie(puntos);
  const grupos = [];
  (puntos || []).forEach((p, i) => {
    const q = trimestreDe(p && (p.et || p.mes));
    const clave = q + ":" + anios[i];
    const ult = grupos[grupos.length - 1];
    if (ult && ult.clave === clave) ult.fin = i;
    else grupos.push({ q, anio: anios[i], ini: i, fin: i, clave });
  });
  return grupos;
}

function bandasTrimestre(puntos, xDe, { W, top, base }) {
  if (!quarterActivo() || !puntos || puntos.length < 3) return "";
  const grupos = gruposTrimestre(puntos);
  if (grupos.length < 2) return "";
  const borde = (i) => (i <= 0 ? 0 : i >= puntos.length ? W : (xDe(i - 1) + xDe(i)) / 2);
  let s = "";
  grupos.forEach((g, gi) => {
    const izq = borde(g.ini), der = borde(g.fin + 1), ancho = Math.max(0, der - izq);
    if (ancho <= 0) return;
    if (gi % 2 === 0) s += `<rect x="${izq.toFixed(1)}" y="${top}" width="${ancho.toFixed(1)}" height="${base - top}" fill="${C.linea}" opacity="0.22"/>`;
    if (gi > 0) s += `<line x1="${izq.toFixed(1)}" y1="${top}" x2="${izq.toFixed(1)}" y2="${base}" stroke="${C.eje}" stroke-width="1" stroke-dasharray="2 3" opacity="0.55"/>`;
    if (ancho >= 44) {
      const cx = Math.max(12, Math.min(W - 12, izq + ancho / 2));
      const yq = Math.max(9, top - 4);
      s += `<text class="eje trimestre" x="${cx.toFixed(1)}" y="${yq}" text-anchor="middle">Q${g.q}</text>`;
    }
  });
  return s;
}

/* ---------- utils ---------- */
const miles = (n) => Number(n).toLocaleString("en-US");
const f1 = (n) => Number(n).toFixed(1);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function serie(arr) {
  const r = ESTADO.rango;
  if (r === "6") return arr.slice(-6);
  return arr.slice();
}
function ordenCalendario(puntos) {
  const lista = (puntos || []).slice();
  if (lista.length < 2) return lista;
  const mesDe = (x) => MES_NUM[String((x && (x.et || x.mes)) || "").slice(0, 3)] || 0;
  if (mesDe(lista[0]) !== 12) return lista;
  return lista.slice(1).concat(lista.slice(0, 1));
}
function serieGrafica(arr) { return ordenCalendario(serie(arr)); }
function fechaCorta(iso) { return new Date(iso + "T00:00:00").toLocaleFechaString("en-US", { day: "2-digit", month: "short", year: "numeric" }); }
function diasHasta(iso) { const hoy = new Date(); hoy.setHours(0,0,0,0); return Math.round((new Date(iso + "T00:00:00") - hoy) / 86400000); }

function chipRating(r) {
  const cls = r === "A" ? "ok" : r === "B" ? "aviso" : "mal";
  return `<span class="chip ${cls}">Rating ${escape(r)}</span>`;
}
function chipEstado(estado) {
  const cls = estado === "Completed" ? "ok" : estado === "In progress" ? "aviso" : "neutro";
  return `<span class="chip ${cls}">${escape(estado)}</span>`;
}

function deltaMes(actual, anterior, { unidad = "", decimales = 1, invertir = false } = {}) {
  const dif = actual - anterior;
  if (!isFinite(dif)) return null;
  if (Math.abs(dif) < 0.05) return { texto: "= no change vs. prev. month", tono: "neutro" };
  const signo = dif > 0 ? "+" : "−";
  const num = Math.abs(dif).toFixed(decimales);
  const bueno = invertir ? dif < 0 : dif > 0;
  return { texto: `${signo}${num}${unidad} vs. prev. month`, tono: bueno ? "ok" : "mal" };
}
function deltaMeta(actual, objetivo, { unidad = " pp", invertir = false } = {}) {
  const dif = actual - objetivo;
  if (!isFinite(dif)) return null;
  if (Math.abs(dif) < 0.05) return { texto: "on target", tono: "neutro" };
  const signo = dif > 0 ? "+" : "−";
  const bueno = invertir ? dif < 0 : dif > 0;
  return { texto: `${signo}${Math.abs(dif).toFixed(1)}${unidad} vs. target`, tono: bueno ? "ok" : "mal" };
}
function spanDelta(d) { return d ? `<span class="delta ${d.tono}">${escape(d.texto)}</span>` : ""; }

/* ---------- UI helpers ---------- */
function kpi(valor, etiqueta, tono = "", opts = {}) {
  const panel = opts.panel, key = opts.key, tip = opts.tip, delta = opts.delta;
  const clickable = panel && key !== undefined;
  const attrs = clickable
    ? ` class="kpi${tono ? " " + tono : ""} clickable" data-accion="item" data-panel="${panel}" data-key="${escape(key)}" data-tip="${escape(tip || etiqueta)}" tabindex="0" role="button"`
    : ` class="kpi${tono ? " " + tono : ""}"${tip ? ` data-tip="${escape(tip)}"` : ""}`;
  return `<div${attrs}><div class="valor">${escape(valor)}</div><div class="etiqueta">${escape(etiqueta)}</div>${spanDelta(delta)}</div>`;
}
function cajaKpis(items) { return `<div class="kpi-fila">${items.filter(Boolean).join("")}</div>`; }
function bloque(titulo, contenido) { return `<div class="bloque"><div class="bloque-t">${escape(titulo)}</div>${contenido}</div>`; }
function miniBarra(pct, color = C.acento) {
  const p = clamp(pct, 0, 100);
  return `<div class="mini-barra"><div class="progreso"><div class="relleno" style="width:${p}%; background:${color}"></div></div><span>${f1(p)}%</span></div>`;
}
function tablaHTML(headers, filas, clases = [], opts = {}) {
  const { panel = null, keys = null } = opts;
  const head = headers.map((h) => `<th>${escape(String(h))}</th>`).join("");
  const rows = filas.map((row, i) => {
    const cls = clases[i] ? ` class="${clases[i]}"` : "";
    const key = keys && keys[i] != null ? String(keys[i]) : null;
    const clickable = panel && key !== null;
    const attrs = clickable
      ? ` class="fila-click${clases[i] ? " " + clases[i] : ""}" data-accion="item" data-panel="${panel}" data-key="${escape(key)}" tabindex="0" role="button"`
      : cls;
    const tds = row.map((c, j) => `<td${j > 0 && (typeof c === "number" || /^\d/.test(String(c))) ? ' class="num-tab"' : ""}>${c}</td>`).join("");
    return `<tr${attrs}>${tds}</tr>`;
  }).join("");
  return `<div class="tabla-wrap"><table class="focus detalle-tabla"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* ---------- charts ---------- */
function lineaSVG(puntos, opts = {}) {
  const { objetivo = null, color = C.acento, panel = 0, interactivo = true, unidad = "%", guia = false, ejeX = true } = opts;
  const W = 520, H = 118, base = 94, top = quarterActivo() ? 30 : 18;
  const vals = puntos.map((p) => p.v);
  if (!vals.length) return `<svg class="grafica" viewBox="0 0 ${W} ${H}"></svg>`;
  const min = Math.min(...vals, objetivo ?? Enfinity) - 0.6;
  const max = Math.max(...vals, objetivo ?? -Enfinity) + 0.6;
  const rango = max - min || 1;
  const paso = W / Math.max(puntos.length - 1, 1);
  const y = (v) => base - ((v - min) / rango) * (base - top);
  const pts = puntos.map((p, i) => `${(i * paso).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  let s = bandasTrimestre(puntos, (i) => i * paso, { W, top, base });
  if (objetivo != null) {
    const yy = y(objetivo);
    const labelY = clamp(yy - 4, top + 9, base - 2);
    s += `<line x1="0" y1="${yy.toFixed(1)}" x2="${W}" y2="${yy.toFixed(1)}" stroke="${C.ok}" stroke-dasharray="5 4" stroke-width="1.2"/>`;
    s += `<text class="eje" x="4" y="${labelY.toFixed(1)}" text-anchor="start" fill="${C.ok}">Target ${objetivo}%</text>`;
  }
  s += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  puntos.forEach((p, i) => {
    const cx = (i * paso).toFixed(1), cy = y(p.v).toFixed(1);
    const ultimo = i === puntos.length - 1;
    const col = p.color || color;
    const tip = `${p.et}: ${Number(p.v).toFixed(1)}${unidad}`;
    const attrs = ` data-tip="${escape(tip)}"` + (interactivo ? ` data-accion="item" data-panel="${panel}" data-key="${escape(p.et)}" tabindex="0" role="button" aria-label="${escape(tip)}"` : "");
    s += `<g class="punto"${attrs}>`;
    if (interactivo) s += `<circle cx="${cx}" cy="${cy}" r="11" fill="transparent"/>`;
    s += `<circle class="marca" cx="${cx}" cy="${cy}" r="${ultimo ? 4.2 : 2.8}" fill="${ultimo ? "#fff" : col}" stroke="${col}" stroke-width="1.6"/>`;
    if (ultimo) s += `<text class="eje" x="${cx}" y="${(Number(cy) - 9).toFixed(1)}" text-anchor="middle" fill="#1f2022" font-weight="700">${Number(p.v).toFixed(1)}${unidad}</text>`;
    if (ejeX) s += `<text class="eje" x="${cx}" y="${base + 12}" text-anchor="middle">${escape(p.et)}</text>`;
    s += `</g>`;
  });
  if (guia) s += `<g class="guia" style="display:none"><line x1="0" y1="${top}" x2="0" y2="${base}" stroke="${C.acento}" stroke-width="1" stroke-dasharray="3 3"/></g>`;
  return `<svg class="grafica" viewBox="0 0 ${W} ${H}"${guia ? ' data-guia="1"' : ""} role="img" aria-label="line chart">${s}</svg>`;
}

function barrasSVG(datos, opts = {}) {
  const { panel = 0, interactivo = true, unidad = "", click } = opts;
  const W = 520, H = 118, base = 100, top = quarterActivo() ? 30 : 14;
  const max = Math.max(...datos.map((d) => d.v), 1);
  const n = datos.length || 1;
  const ancho = Math.min(42, (W / n) * 0.58);
  const paso = W / n;
  let s = bandasTrimestre(datos, (i) => i * paso + paso / 2, { W, top, base });
  datos.forEach((d, i) => {
    const h = (d.v / max) * (base - top);
    const x = i * paso + (paso - ancho) / 2;
    const y = base - h;
    const key = click ? click(d) : d.et;
    const tip = `${d.et}: ${d.v}${unidad}`;
    const attrs = ` data-tip="${escape(tip)}"` + (interactivo ? ` data-accion="item" data-panel="${panel}" data-key="${escape(key)}" tabindex="0" role="button" aria-label="${escape(tip)}"` : "");
    s += `<g class="barra"${attrs}>`;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ancho.toFixed(1)}" height="${h.toFixed(1)}" rx="4" fill="${d.color || C.acento}" opacity="0.9"/>`;
    s += `<text class="eje" x="${(x + ancho / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle" fill="#1f2022" font-weight="600">${d.v}${unidad}</text>`;
    s += `<text class="eje" x="${(x + ancho / 2).toFixed(1)}" y="${base + 12}" text-anchor="middle">${escape(d.et)}</text>`;
    s += `</g>`;
  });
  return `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="bar chart">${s}</svg>`;
}

function barrasAgrupadasSVG(grupos, opts = {}) {
  const { panel = 0, unidad = "" } = opts;
  const W = 520, H = 118, base = 100, top = quarterActivo() ? 30 : 14;
  const max = Math.max(1, ...grupos.flatMap((g) => g.series.map((s) => s.v)));
  const n = grupos.length || 1, m = grupos[0] ? grupos[0].series.length : 1;
  const paso = W / n;
  const bw = Math.min(14, (paso * 0.58) / m);
  let s = bandasTrimestre(grupos, (i) => i * paso + paso / 2, { W, top, base });
  grupos.forEach((g, i) => {
    const x0 = i * paso + (paso - bw * m) / 2;
    g.series.forEach((ser, j) => {
      const h = (ser.v / max) * (base - top);
      const x = x0 + j * bw, y = base - h;
      const tip = `${g.et} · ${ser.nombre}: ${ser.v}${unidad}`;
      s += `<g class="barra" data-tip="${escape(tip)}" data-accion="item" data-panel="${panel}" data-key="${escape(g.et)}" tabindex="0" role="button" aria-label="${escape(tip)}">`;
      s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${ser.color}" opacity="0.9"/></g>`;
    });
    s += `<text class="eje" x="${(i * paso + paso / 2).toFixed(1)}" y="${base + 12}" text-anchor="middle">${escape(g.et)}</text>`;
  });
  return `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="grouped bar chart">${s}</svg>`;
}

function barrasHorizontalesSVG(datos, opts = {}) {
  const { panel = 0, meta = 100 } = opts;
  const W = 520, H = 138, etiquetaX = 30, barraX = 58, barraW = 372, barraH = 12, rowH = 22, y0 = 26;
  let s = `<line x1="${barraX}" y1="6" x2="${barraX}" y2="${H - 4}" stroke="${C.linea}" stroke-width="1"/>`;
  for (const p of [25, 50, 75, 100]) {
    const x = barraX + (p / meta) * barraW;
    s += `<line x1="${x.toFixed(1)}" y1="8" x2="${x.toFixed(1)}" y2="${H - 4}" stroke="${C.linea}" stroke-width="1" stroke-dasharray="3 4"/>`;
    s += `<text class="eje" x="${x.toFixed(1)}" y="${H - 1}" text-anchor="middle">${p}%</text>`;
  }
  datos.forEach((d, i) => {
    const y = y0 + i * rowH;
    const w = (clamp(d.v, 0, meta) / meta) * barraW;
    const color = d.v >= 90 ? C.ok : d.v >= 75 ? C.aviso : C.mal;
    const q = quarterActivo() ? `Q${trimestreDe(d.et)}` : "";
    const tip = `${d.et}${q ? " · " + q : ""}: ${d.completadas}/${d.total} auditorías · ${f1(d.v)}%`;
    s += `<g class="barra" data-tip="${escape(tip)}" data-accion="item" data-panel="${panel}" data-key="${escape(d.et)}" tabindex="0" role="button" aria-label="${escape(tip)}">`;
    s += `<rect x="${barraX}" y="${y}" width="${barraW}" height="${barraH}" rx="5" fill="#ececed"/>`;
    s += `<rect x="${barraX}" y="${y}" width="${Math.max(w, 2).toFixed(1)}" height="${barraH}" rx="5" fill="${color}" opacity="0.9"/>`;
    s += `<text class="eje" x="${etiquetaX}" y="${y + 9}" text-anchor="middle" fill="#1f2022" font-weight="600">${escape(d.et)}</text>`;
    if (q) s += `<text class="eje" x="${etiquetaX + 28}" y="${y + 9}" text-anchor="start" fill="#6f7377" font-size="8">${q}</text>`;
    s += `<text class="eje" x="${(barraX + w + 6).toFixed(1)}" y="${y + 9}" text-anchor="start" fill="#1f2022">${f1(d.v)}%</text>`;
    s += `</g>`;
  });
  return `<svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="monthly audit completitud">${s}</svg>`;
}
function donutSVG(porciones, opts = {}) {
  const { centro = "", subcentro = "", panel = 0, interactivo = true } = opts;
  const total = porciones.reduce((s, p) => s + p.v, 0) || 1;
  const cx = 90, cy = 90, r = 62, circ = 2 * Math.PI * r;
  let offset = 0;
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ececed" stroke-width="16"/>`;
  porciones.forEach((p) => {
    const len = (p.v / total) * circ;
    const tip = `${p.et}: ${p.v}%`;
    const attrs = ` data-tip="${escape(tip)}"` + (interactivo ? ` data-accion="item" data-panel="${panel}" data-key="${escape(p.et)}" tabindex="0" role="button" aria-label="${escape(tip)}"` : "");
    s += `<circle class="seg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"${attrs}/>`;
    offset += len;
  });
  s += `<text x="${cx}" y="${cy - 2}" text-anchor="middle" fill="#1f2022" font-size="18" font-weight="800">${escape(centro)}</text>`;
  s += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#6f7377" font-size="10">${escape(subcentro)}</text>`;
  return `<svg class="grafica" viewBox="0 0 180 180" role="img" aria-label="distribution chart">${s}</svg>`;
}

function gaugeSVG(pct, { color = C.ok } = {}) {
  const d = "M 15 105 A 90 90 0 0 1 205 105";
  const p = clamp(pct, 0, 100);
  return `<svg class="grafica" viewBox="0 0 220 122" role="img" aria-label="gauge" style="max-width:230px">` +
    `<path d="${d}" fill="none" stroke="#ececed" stroke-width="14" stroke-linecap="round" pathLength="100"/>` +
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="${p.toFixed(1)} ${(100 - p).toFixed(1)}"/>` +
    `<text x="110" y="92" text-anchor="middle" fill="#1f2022" font-size="26" font-weight="800">${f1(p)}%</text>` +
    `</svg>`;
}

/* ---------- panel renderers ---------- */
function pintarEncabezado(d) {
  $("pill-ppm").textContent = `${miles(Math.round(d.general.ppm))} PPM`;
  const t = new Date(d.meta.actualizado);
  $("hora").textContent = "actualizado " + t.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function p1FocusSuppliers(d) {
  const filtros = [["all", "All"], ["EU", "EU"], ["NA", "NA"]];
  const bar = filtros.map(([k, l]) => `<button type="button" class="filtro${ESTADO.region === k ? " activo" : ""}" data-accion="region" data-region="${k}" aria-pressed="${ESTADO.region === k}">${l}</button>`).join("");
  const lista = d.focusSuppliers.filter((s) => ESTADO.region === "all" || s.region === ESTADO.region);
  const filas = lista.map((s) => {
    const cls = s.rating === "A" ? "ok" : s.rating === "B" ? "aviso" : "mal";
    const tip = `${s.nombre} · ${s.region} · ${s.ppm} PPM · ${s.claimsAbiertos} open claims · ${s.motivo}`;
    return `<tr class="fila-click" data-accion="item" data-panel="1" data-key="${escape(s.nombre)}" data-tip="${escape(tip)}" tabindex="0" role="button">` +
      `<td><span class="dot" style="background:${s.region === "EU" ? C.eu : C.na}"></span>${escape(s.nombre)}</td>` +
      `<td><span class="tag-reg">${s.region}</span></td><td>${chipRating(s.rating)}</td>` +
      `<td class="num-tab">${miles(s.ppm)}</td><td class="num-tab">${s.claimsAbiertos}</td>` +
      `<td class="${cls}">${escape(s.tendencia)}</td><td class="motivo">${escape(s.motivo)}</td></tr>`;
  }).join("");
  $("c1").innerHTML =
    `<div class="filtros">${bar}<span class="filtros-nota">filtro por región</span></div>` +
    `<table class="focus"><thead><tr><th>Proveedor</th><th></th><th>Rating</th><th class="num-tab">PPM</th><th class="num-tab">Claims</th><th>Trend</th><th>Focus reason</th></tr></thead><tbody>${filas}</tbody></table>` +
    `<span class="etiqueta-pilar">PPM overall: ${miles(Math.round(d.general.ppm))} · target ${d.general.ppmObjetivo} · clic en una fila</span>`;
}

function p2Claims(d) {
  const c = d.claims;
  const mes = c.porMes[c.porMes.length - 1];
  const anterior = c.porMes[c.porMes.length - 2];
  const dClaims = anterior ? deltaMes(mes.total, anterior.total, { decimales: 0, invertir: true }) : null;
  const totalYtd = c.porMes.reduce((s, m) => s + m.total, 0);
  const niveles = [
    { et: "L1", key: "Level 1", v: mes.l1, color: C.mal },
    { et: "L2", key: "Level 2", v: mes.l2, color: C.aviso },
    { et: "L3", key: "Level 3", v: mes.l3, color: C.tenue },
  ];
  $("c2").innerHTML =
    `<div class="kpi-fila">` +
    kpi(mes.total, `claims ${mes.mes}`, "acento", { panel: 2, key: mes.mes, delta: dClaims }) +
    kpi(totalYtd, "YTD", "", { panel: 2, key: mes.mes }) +
    `</div>` +
    barrasSVG(niveles, { panel: 2, unidad: " claims", click: (d) => d.key }) +
    `<span class="etiqueta-pilar">Histograma L1/L2/L3 del mes actual · clic en un nivel para ver su tendencia anual</span>`;
}

function p3Scorecard(d) {
  const s = d.scorecard;
  const foco = ESTADO.scorecardFoco;
  const base = foco
    ? (() => { const conteo = { A: 0, B: 0, C: 0 }; d.focusSuppliers.forEach((fs) => { if (conteo[fs.rating] != null) conteo[fs.rating]++; }); return conteo; })()
    : s.porRating;
  const total = foco ? d.focusSuppliers.length : s.totalProveedores;
  const porciones = ["A", "B", "C"].map((r) => {
    const count = foco ? base[r] : base[r];
    const pct = foco ? Math.round((count / (total || 1)) * 1000) / 10 : Number(base[r]);
    return { et: r, v: pct, count: foco ? count : Math.round((pct / 100) * total), color: r === "A" ? C.ok : r === "B" ? C.aviso : C.mal };
  });
  const pctA = porciones.find((p) => p.et === "A").v;
  const rows = porciones.map((p) => `<div class="leyenda-item estatico"><span class="dot" style="background:${p.color}"></span><span><strong>${p.et}:</strong> ${p.count} / ${f1(p.v)}%</span></div>`).join("");
  const tabs = `<div class="tabs-mini" role="group" aria-label="Scorecard scope">` +
    `<button type="button" data-accion="score-foco" data-foco="0" aria-pressed="${!foco}">Full base · ${s.totalProveedores}</button>` +
    `<button type="button" data-accion="score-foco" data-foco="1" aria-pressed="${foco}">Top focus · ${d.focusSuppliers.length}</button></div>`;
  $("c3").innerHTML =
    tabs +
    `<div class="donut-wrap scorecard-wrap">${donutSVG(porciones, { centro: total, subcentro: foco ? "focus" : "suppliers", panel: 3 })}` +
    `<div class="donut-notas"><div class="leyenda col scorecard-breakdown">${rows}</div>` +
    `<div class="target-pill ${pctA >= s.objetivoA ? "ok" : "aviso"}">≥ ${s.objetivoA}% TARGET A</div>` +
    `</div></div>` +
    `<span class="etiqueta-pilar">Overview by rating · click a segment for detail</span>`;
}

function p4OTD(d) {
  const o = d.otd;
  const sel = ESTADO.focoOTD;
  const fuente = sel ? ((o.porProveedor || []).find((x) => x.proveedor === sel) || {}).porMes || [] : o.porMes;
  const crono = serie(fuente).map((m) => ({ et: m.mes, v: m.valor }));
  const puntos = ordenCalendario(crono);
  const actual = crono.length ? crono[crono.length - 1].v : o.actual;
  const promedio = puntos.reduce((a, p) => a + p.v, 0) / (puntos.length || 1);
  const dOTD = crono.length > 1 ? deltaMes(crono[crono.length - 1].v, crono[crono.length - 2].v, { unidad: " pts" }) : null;
  const cumple = actual >= o.objetivo;
  const chips = [`<button type="button" class="filtro${!sel ? " activo" : ""}" data-accion="foco-otd" data-foco="" aria-pressed="${!sel}">All</button>`,
    ...(d.focusSuppliers || []).map((s) => { const activo = sel === s.nombre; return `<button type="button" class="filtro${activo ? " activo" : ""}" data-accion="foco-otd" data-foco="${escape(s.nombre)}" aria-pressed="${activo}">${escape(s.nombre.replace("Proveedor ", "S."))}</button>`; })
  ].join("");
  const strip = puntos.map((p) => { const ok = p.v >= o.objetivo; const tip = `${p.et}: ${f1(p.v)}% · ${ok ? "target met" : "target missed"}`; return `<button type="button" class="mes ${ok ? "ok" : "aviso"}" data-accion="item" data-panel="4" data-key="${escape(p.et)}" data-tip="${escape(tip)}" title="${escape(tip)}">${escape(p.et)}</button>`; }).join("");
  $("c4").innerHTML =
    `<div class="filtros">${chips}</div>` +
    `<div class="kpi-fila">` +
    kpi(`${f1(actual)}%`, sel ? sel.replace("Supplier ", "S. ") : "OTD actual", cumple ? "ok" : "aviso", { panel: 4, key: sel || "OTD", delta: dOTD }) +
    kpi(`${o.objetivo}%`, "target", "", { panel: 4, key: "OTD" }) +
    kpi(`${f1(promedio)}%`, "promedio", "", { panel: 4, key: "OTD" }) +
    `</div>` +
    lineaSVG(puntos, { objetivo: o.objetivo, color: C.acento, panel: 4, guia: true, ejeX: false }) +
    `<div class="mes-strip">${strip}</div>` +
    `<span class="etiqueta-pilar">${sel ? "tendencia individual" : "consolidado todos los proveedores"} · guía vertical sigue el mouse</span>`;
}

function p5COPQ(d) {
  const c = d.copq;
  const crono = serie(c.porMes);
  const datos = ordenCalendario(crono).map((m) => ({ et: m.mes, v: m.keur }));
  const dCopq = crono.length > 1 ? deltaMes(crono[crono.length - 1].keur, crono[crono.length - 2].keur, { decimales: 0, unidad: " kEUR", invertir: true }) : null;
  const topNames = ["Supplier D", "Supplier B", "Supplier G", "Others"];
  const baseTop = c.top || [];
  const topList = topNames.map((name, i) => {
    const found = baseTop.find((t) => t.proveedor === name) || baseTop[i] || { proveedor: name, keur: Math.max(10, Math.round(c.ytdKeur * (0.28 - i * 0.06))) };
    return { proveedor: name, keur: found.keur };
  });
  const maxK = Math.max(...topList.map((t) => t.keur), 1);
  const top = topList.map((t) => {
    const pct = Math.round((t.keur / maxK) * 100);
    const tip = `${t.proveedor}: ${t.keur} kEUR YTD`;
    return `<li data-tip="${escape(tip)}" data-accion="item" data-panel="5" data-key="${escape(t.proveedor)}" tabindex="0" role="button" aria-label="${escape(tip)}">` +
      `<span>${escape(t.proveedor)}</span><span class="der">${t.keur} kEUR</span></li>` +
      `<li class="barra-item" aria-hidden="true"><div class="progreso"><div class="relleno" style="width:${pct}%; background:${C.acento}"></div></div></li>`;
  }).join("");
  $("c5").innerHTML =
    `<div class="kpi-fila">` +
    kpi(`${miles(c.ytdKeur)}`, "kEUR YTD", "acento", { panel: 5, key: "trend", delta: dCopq }) +
    kpi("-20%", "TARGET YOY", "ok", { panel: 5, key: "trend" }) +
    `</div>` +
    barrasSVG(datos, { panel: 5, unidad: "", click: (d) => d.et }) +
    `<ul class="top-lista">${top}</ul>` +
    `<span class="etiqueta-pilar">Pillar ${c.pilar} · containment & failure cost · ${crono.length}-month trend</span>`;
}

function p6Chargeback(d) {
  const c = d.chargeback;
  const crono = serie(c.porMes);
  const datos = ordenCalendario(crono).map((m) => ({ et: m.mes, series: [{ nombre: "Charged", v: m.charged, color: C.tenue }, { nombre: "Recovered", v: m.recovered, color: C.acento }] }));
  const cumple = c.tasa >= c.objetivo;
  const dRec = crono.length > 1 ? deltaMes(crono[crono.length - 1].tasa, crono[crono.length - 2].tasa, { unidad: " pp" }) : null;
  $("c6").innerHTML =
    `<div class="kpi-fila">` +
    kpi(`${miles(c.cobradoKeur)}`, "cobrado kEUR", "", { panel: 6, key: "Charged" }) +
    kpi(`${miles(c.recuperadoKeur)}`, "recuperado kEUR", "ok", { panel: 6, key: "Recovered" }) +
    kpi(`${f1(c.tasa)}%`, "recovery", cumple ? "ok" : "aviso", { panel: 6, key: "recovery", delta: dRec }) +
    `</div>` +
    barrasAgrupadasSVG(datos, { panel: 6, unidad: " kEUR" }) +
    `<div class="leyenda"><button type="button" class="leyenda-item" data-accion="item" data-panel="6" data-key="Charged"><span class="dot" style="background:${C.tenue}"></span>Cobrado</button>` +
    `<button type="button" class="leyenda-item" data-accion="item" data-panel="6" data-key="Recovered"><span class="dot" style="background:${C.acento}"></span>Recuperado</button></div>` +
    `<span class="etiqueta-pilar">Pillar ${c.pilar} · comparativo mensual cobrado vs. recuperado · clic en Cobrado/Recuperado para ver listas de proveedores</span>`;
}

function p7PPAP(d) {
  const p = d.ppap;
  const porciones = (p.statusShare || []).map((s) => ({ et: s.estado, v: s.pct, color: C.ppap[s.estado] || C.eje }));
  const leyenda = porciones.map((s) => `<button type="button" class="leyenda-item" data-accion="item" data-panel="7" data-key="${escape(s.et)}"><span class="dot" style="background:${s.color}"></span><span>${escape(s.et)}: <strong>${s.v}%</strong></span></button>`).join("");
  $("c7").innerHTML =
    `<div class="kpi-fila">` +
    kpi(`${f1(p.aTiempo)}%`, "on time", p.aTiempo >= 90 ? "ok" : "aviso", { panel: 7, key: "on time" }) +
    `</div>` +
    `<div class="donut-wrap ppap-wrap">${donutSVG(porciones, { centro: `${f1(p.aTiempo)}%`, subcentro: "on time", panel: 7 })}` +
    `<div class="donut-notas"><div class="leyenda col">${leyenda}</div></div></div>` +
    `<div class="target-pill ${p.aTiempo >= 90 ? "ok" : "aviso"}" style="margin-top:4px">≥ 90% TARGET</div>` +
    `<span class="etiqueta-pilar">Click a status for supplier list</span>`;
}

function p8Readiness(d) {
  const r = d.readiness;
  const pending = r.hitosTotales - r.hitosCumplidos;
  $("c8").innerHTML =
    `<div class="kpi-fila">` +
    kpi(r.proyectos, "proyectos", "", { panel: 8, key: "APQP" }) +
    kpi(`${r.hitosCumplidos}/${r.hitosTotales}`, "APQP milestones", "ok", { panel: 8, key: "APQP", delta: { texto: `${pending} pending`, tono: pending ? "aviso" : "ok" } }) +
    `</div>` +
    `<div class="gauge-caja" data-tip="APQP: ${r.hitosCumplidos}/${r.hitosTotales} (${f1(r.pct)}%)" data-accion="item" data-panel="8" data-key="APQP" tabindex="0" role="button">${gaugeSVG(r.pct, { color: C.ok })}</div>` +
    `<span class="etiqueta-pilar">Pillar ${r.pilar} · click for supplier/project status lists</span>`;
}

function p9Audits(d) {
  const a = d.auditorias;
  const crono = serie(a.porMes || []);
  const datos = ordenCalendario(crono).map((m) => ({ et: m.mes, v: m.pct, total: m.total, completadas: m.completadas }));
  const dAud = crono.length > 1 ? deltaMes(crono[crono.length - 1].pct, crono[crono.length - 2].pct, { unidad: " pts" }) : null;
  $("c9").innerHTML =
    `<div class="kpi-fila">` +
    kpi(a.planeadas, "auditorías 12M", "", { panel: 9, key: "summary" }) +
    kpi(a.completadas, "completadas", "ok", { panel: 9, key: "summary" }) +
    kpi(`${f1(a.pct)}%`, "completitud", a.pct >= 90 ? "ok" : "aviso", { panel: 9, key: "summary", delta: dAud }) +
    `</div>` +
    barrasHorizontalesSVG(datos, { panel: 9, meta: 100 }) +
    `<span class="etiqueta-pilar">completadas / auditorías per month · click a month for supplier breakdown</span>`;
}

function pintarPie(d) {
  const targets = ["L1 SCAR = 0", "L2/L3 SCAR ≤ 0.50", "Scorecard A ≥ 70%", "PPAP on-time ≥ 90%", "COPQ -20% YoY", "OTD ≥ 95%"];
  $("targets").innerHTML = targets.map((t) => `<span class="chip neutro target-chip">${escape(t)}</span>`).join("");
  const nota = $("nota-panel9"); if (nota) nota.textContent = "";
}

const PINTORES = { 1: p1FocusSuppliers, 2: p2Claims, 3: p3Scorecard, 4: p4OTD, 5: p5COPQ, 6: p6Chargeback, 7: p7PPAP, 8: p8Readiness, 9: p9Audits };
const TITULOS = { 1: "Top Focus Suppliers", 2: "Proveedor Claims", 3: "Proveedor Scorecard", 4: "On-time Delivery", 5: "COPQ · Containment", 6: "Chargeback Recovery", 7: "Proveedor PPAP Requalification", 8: "Proveedor Project Readiness", 9: "Proveedor Audits Estado" };

/* ---------- details ---------- */
function detalle1(d, key) {
  const s = (d.focusSuppliers || []).find((x) => x.nombre === key) || d.focusSuppliers[0];
  if (!s) return { titulo: "Focus Suppliers", sub: "", html: "" };
  return {
    titulo: `Proveedor · ${s.nombre}`,
    sub: `${s.region} · ${s.rating} · ${s.tendencia}`,
    html: cajaKpis([kpi(miles(s.ppm), "PPM", s.ppm > d.general.ppmObjetivo ? "aviso" : "ok"), kpi(s.claimsAbiertos, "open claims", s.claimsAbiertos ? "aviso" : "ok"), kpi(s.rating, "rating"), kpi(s.region, "region")]) +
      bloque("Focus reason", `<p class="insight">${escape(s.motivo)}</p>`) +
      bloque("Trend", `<p class="insight">${escape(s.tendencia)}</p>`) +
      `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
  };
}

function detalle2(d, key) {
  const c = d.claims;
  const meses = c.porMes || [];
  const mes = meses.find((m) => m.mes === key) || meses[meses.length - 1];
  const nivelKey = { "Level 1": "l1", "Level 2": "l2", "Level 3": "l3" }[key];
  if (nivelKey) {
    const crono = serie(meses);
    const datos = ordenCalendario(crono).map((m) => ({ et: m.mes, v: m[nivelKey] }));
    return {
      titulo: `Claims · ${key}`,
      sub: "Tendencia anual/mensual por nivel",
      html: cajaKpis([kpi(mes[nivelKey], "current month"), kpi(crono.reduce((a, m) => a + m[nivelKey], 0), "range total")]) +
        bloque("Tendencia mensual", barrasSVG(datos, { panel: 2, unidad: "", interactivo: true, click: (x) => x.et })) +
        `<p class="insight">Haz clic en la barra de un mes para ver el detalle mensual. Usa Volver para regresar.</p>`,
    };
  }
  if (mes) {
    const niveles = [{ et: "L1", v: mes.l1, color: C.mal }, { et: "L2", v: mes.l2, color: C.aviso }, { et: "L3", v: mes.l3, color: C.tenue }];
    return {
      titulo: `Claims · ${mes.mes}`,
      sub: "Detalle mensual (L1/L2/L3)",
      html: cajaKpis([kpi(mes.total, "total claims"), kpi(mes.l1, "L1", "aviso"), kpi(mes.l2, "L2", "aviso"), kpi(mes.l3, "L3")]) +
        bloque("Breakdown by level", barrasSVG(niveles, { interactivo: false, unidad: " claims" })) +
        bloque("Mess", tablaHTML(["Mes", "Total", "L1", "L2", "L3"], ordenCalendario(meses).map((m) => [m.mes, m.total, m.l1, m.l2, m.l3]), [], { panel: 2, keys: ordenCalendario(meses).map((m) => m.mes) })) +
        `<p class="insight">Haz clic en otro mes para ver su detalle. Usa Volver para regresar al reporte general.</p>`,
    };
  }
  return { titulo: "Proveedor Claims", sub: "", html: `<p class="insight">No data.</p>` };
}

function detalle3(d, key) {
  const s = d.scorecard;
  const porciones = [{ et: "A", v: s.porRating.A, color: C.ok }, { et: "B", v: s.porRating.B, color: C.aviso }, { et: "C", v: s.porRating.C, color: C.mal }];
  const sel = porciones.find((p) => p.et === key) || porciones[0];
  return {
    titulo: `Scorecard · Rating ${sel.et}`,
    sub: `${sel.v}% of suppliers`,
    html: cajaKpis([kpi(`${sel.v}%`, `rating ${sel.et}`), kpi(s.totalProveedores, "total suppliers"), kpi(`≥ ${s.objetivoA}%`, "target A")]) +
      bloque("Distribución", `<div class="donut-wrap">${donutSVG(porciones, { centro: s.totalProveedores, subcentro: "suppliers", interactivo: false })}</div>`) +
      bloque("Por rating", tablaHTML(["Rating", "Share"], porciones.map((p) => [p.et, `${p.v}%`]), [], { panel: 3, keys: porciones.map((p) => p.et) })) +
      `<p class="insight">Haz clic en un rating para ver el detalle. Usa Volver para regresar al reporte general.</p>`,
  };
}

function detalle4(d, key) {
  const o = d.otd;
  const prov = (o.porProveedor || []).find((x) => x.proveedor === key);
  const cronoBase = prov ? (prov.porMes || []).slice() : (o.porMes || []).slice();
  const puntos = ordenCalendario(cronoBase);
  const promedio = puntos.reduce((a, p) => a + p.valor, 0) / (puntos.length || 1);
  const debajo = puntos.filter((p) => p.valor < o.objetivo);
  const mes = puntos.find((p) => p.mes === key);

  if (prov) {
    const cur = puntos[puntos.length - 1];
    return {
      titulo: `On-time Delivery · ${prov.proveedor}`,
      sub: `Tendencia individual · target ${o.objetivo}%`,
      html: cajaKpis([kpi(`${f1(cur ? cur.valor : o.actual)}%`, "OTD actual", (cur ? cur.valor : o.actual) >= o.objetivo ? "ok" : "aviso"), kpi(`${o.objetivo}%`, "target"), kpi(`${f1(promedio)}%`, "promedio"), kpi(debajo.length, "meses bajo target", debajo.length ? "aviso" : "ok")]) +
        bloque("Serie mensual vs. target", lineaSVG(puntos.map((p) => ({ et: p.mes, v: p.valor })), { objetivo: o.objetivo, panel: 4, interactivo: true, ejeX: false }) + `<div class="mes-strip">${puntos.map((p)=>`<button type="button" class="mes ${p.valor>=o.objetivo?"ok":"aviso"}" data-accion="item" data-panel="4" data-key="${escape(p.mes)}">${escape(p.mes)}</button>`).join("")}</div>`) +
        bloque("Cumplimiento por mes (zoom)", tablaHTML(["Mes", "OTD", "Target", "Cumplimiento"], puntos.map((p) => [p.mes, `${f1(p.valor)}%`, `${o.objetivo}%`, p.valor >= o.objetivo ? '<span class="chip ok">Meta cumplida</span>' : '<span class="chip mal">Meta no cumplida</span>']), puntos.map((p) => p.valor >= o.objetivo ? "fila-ok" : "fila-mal"), { panel: 4, keys: puntos.map((p) => p.mes) })) +
        `<p class="insight">Haz clic en un mes para ver el detalle. La tabla resalta meses según cumplimiento de meta. Usa Volver para regresar al reporte general.</p>`,
    };
  }
  if (mes) {
    return {
      titulo: `OTD · ${mes.mes}`,
      sub: `${mes.valor >= o.objetivo ? "Target met" : "Below target"} · target ${o.objetivo}%`,
      html: cajaKpis([kpi(`${f1(mes.valor)}%`, "OTD", mes.valor >= o.objetivo ? "ok" : "aviso"), kpi(`${o.objetivo}%`, "target"), kpi(`${f1(mes.valor - o.objetivo)} pp`, "gap", mes.valor >= o.objetivo ? "ok" : "aviso")]) +
        bloque("Serie mensual vs. target", lineaSVG(puntos.map((p) => ({ et: p.mes, v: p.valor, color: p.mes === mes.mes ? C.acento : C.tenue })), { objetivo: o.objetivo, panel: 4, interactivo: true, ejeX: false }) + `<div class="mes-strip">${puntos.map((p)=>`<button type="button" class="mes ${p.valor>=o.objetivo?"ok":"aviso"}${p.mes===mes.mes?" activo":""}" data-accion="item" data-panel="4" data-key="${escape(p.mes)}">${escape(p.mes)}</button>`).join("")}</div>`) +
        `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
    };
  }
  return {
    titulo: "On-time Delivery",
    sub: `Consolidado · target ${o.objetivo}%`,
    html: cajaKpis([kpi(`${f1(o.actual)}%`, "OTD actual", o.actual >= o.objetivo ? "ok" : "aviso"), kpi(`${o.objetivo}%`, "target"), kpi(`${f1(promedio)}%`, "promedio"), kpi(debajo.length, "meses bajo target", debajo.length ? "aviso" : "ok")]) +
      bloque("Serie mensual vs. target", lineaSVG(puntos.map((p) => ({ et: p.mes, v: p.valor })), { objetivo: o.objetivo, panel: 4, interactivo: true, ejeX: false }) + `<div class="mes-strip">${puntos.map((p)=>`<button type="button" class="mes ${p.valor>=o.objetivo?"ok":"aviso"}" data-accion="item" data-panel="4" data-key="${escape(p.mes)}">${escape(p.mes)}</button>`).join("")}</div>`) +
      bloque("Cumplimiento por mes (zoom)", tablaHTML(["Mes", "OTD", "Target", "Cumplimiento"], puntos.map((p) => [p.mes, `${f1(p.valor)}%`, `${o.objetivo}%`, p.valor >= o.objetivo ? '<span class="chip ok">Meta cumplida</span>' : '<span class="chip mal">Meta no cumplida</span>']), puntos.map((p) => p.valor >= o.objetivo ? "fila-ok" : "fila-mal"), { panel: 4, keys: puntos.map((p) => p.mes) })) +
      bloque("Por proveedor", tablaHTML(["Proveedor", "OTD"], (o.porProveedor || []).map((p) => [p.proveedor, `${f1(p.valor)}%`]), [], { panel: 4, keys: (o.porProveedor || []).map((p) => p.proveedor) })) +
      `<p class="insight">Haz clic en un proveedor o mes para ver el detalle. La tabla resalta meses según cumplimiento de meta. Usa Volver para regresar.</p>`,
  };
}

function detalle5(d, key) {
  const c = d.copq;
  const meses = c.porMes || [];
  const mes = meses.find((m) => m.mes === key);
  if (mes) {
    return {
      titulo: `COPQ · ${mes.mes}`,
      sub: "Mesly containment detail",
      html: cajaKpis([kpi(`${mes.keur} kEUR`, "cost"), kpi(c.incidentes, "incidents YTD")]) +
        bloque("Tendencia mensual", barrasSVG(ordenCalendario(meses).map((m) => ({ et: m.mes, v: m.keur })), { panel: 5, click: (x) => x.et })) +
        `<p class="insight">Click another month for detail. Usa Volver para regresar al reporte general.</p>`,
    };
  }
  return {
    titulo: "COPQ · Containment",
    sub: `Pillar ${c.pilar}`,
    html: cajaKpis([kpi(`${miles(c.ytdKeur)} kEUR`, "YTD"), kpi(c.incidentes, "incidents")]) +
      bloque("Principales contribuyentes", tablaHTML(["Proveedor", "kEUR YTD"], (c.top || []).map((t) => [t.proveedor, t.keur]), [], { panel: 5, keys: (c.top || []).map((t) => t.proveedor) })) +
      bloque("Tendencia mensual", barrasSVG(ordenCalendario(meses).map((m) => ({ et: m.mes, v: m.keur })), { panel: 5, click: (x) => x.et })) +
      `<p class="insight">Haz clic en un mes o contribuyente para ver el detalle. Usa Volver para regresar.</p>`,
  };
}

function detalle6(d, key) {
  const c = d.chargeback;
  const gap = c.cobradoKeur - c.recuperadoKeur;
  const meses = ordenCalendario(c.porMes || []);
  const provs = c.proveedores || [];
  if (key === "Recovered") {
    const filas = provs.filter((p) => p.recovered > 0).map((p) => [escape(p.proveedor), `${miles(p.charged)} kEUR`, `${miles(p.recovered)} kEUR`, `${f1((p.recovered / (p.charged || 1)) * 100)}%`, p.responded ? "Respondió" : "Pendiente"]);
    return {
      titulo: "Chargeback · Proveedores recuperados",
      sub: "Comparativa clara: recuperado vs cobrado por proveedor",
      html: cajaKpis([kpi(`${miles(c.recuperadoKeur)} kEUR`, "recovered", "ok"), kpi(`${miles(gap)} kEUR`, "pending", "aviso"), kpi(`${f1(c.tasa)}%`, "recovery", c.tasa >= c.objetivo ? "ok" : "aviso")]) +
        bloque("Proveedores recuperados vs cobrado", tablaHTML(["Proveedor", "Charged", "Recovered", "% recuperación", "Respuesta"], filas)) +
        `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
    };
  }
  if (key === "Charged" || key === "recovery") {
    const filas = provs.map((p) => [escape(p.proveedor), `${miles(p.charged)} kEUR`, `${miles(p.recovered)} kEUR`, p.responded ? "Respondió" : "Pendiente", p.responded ? "OK" : "Open"]);
    return {
      titulo: "Chargeback · Proveedores cobrados",
      sub: "Proveedores cobrados y su estado de respuesta",
      html: cajaKpis([kpi(`${miles(c.cobradoKeur)} kEUR`, "charged"), kpi(`${miles(c.recuperadoKeur)} kEUR`, "recovered", "ok"), kpi(provs.filter((p) => p.responded).length, "responded", "ok"), kpi(provs.filter((p) => !p.responded).length, "pending", "aviso")]) +
        bloque("Proveedores cobrados / estado de respuesta", tablaHTML(["Proveedor", "Charged", "Recovered", "Respuesta", "Estado"], filas)) +
        `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
    };
  }
  return {
    titulo: "Chargeback Recovery",
    sub: `Pillar ${c.pilar} · recovered ${miles(c.recuperadoKeur)} of ${miles(c.cobradoKeur)} kEUR`,
    html: cajaKpis([kpi(`${miles(c.cobradoKeur)} kEUR`, "charged", "", { panel: 6, key: "Charged" }), kpi(`${miles(c.recuperadoKeur)} kEUR`, "recovered", "ok", { panel: 6, key: "Recovered" }), kpi(`${miles(gap)} kEUR`, "pending", gap ? "aviso" : "ok"), kpi(`${f1(c.tasa)}%`, "recovery", c.tasa >= c.objetivo ? "ok" : "aviso")]) +
      bloque("Charged vs. Recovery by month", tablaHTML(["Mes", "Charged kEUR", "Recovery kEUR", "Tasa"], meses.map((m) => [m.mes, miles(m.charged), miles(m.recovered), `${f1(m.tasa)}%`]))) +
      bloque("Listas de proveedores (clic en Cobrado/Recuperado)", tablaHTML(["Proveedor", "Charged", "Recovered", "Respuesta", "Estado"], provs.slice(0, 8).map((p) => [escape(p.proveedor), `${miles(p.charged)} kEUR`, `${miles(p.recovered)} kEUR`, p.responded ? "Respondió" : "Pendiente", p.responded ? "OK" : "Open"]))) +
      `<p class="insight">Haz clic en Cobrado o Recuperado para ver las listas completas y una comparativa más clara. Usa Volver para regresar.</p>`,
  };
}

function detalle7(d, key) {
  const p = d.ppap;
  const estados = p.statusShare || [];
  const porEstado = p.porEstado || [];
  const sel = porEstado.find((g) => g.estado === key) || estados.find((e) => e.estado === key);
  if (sel) {
    const nombre = sel.estado || key;
    const grupo = porEstado.find((g) => g.estado === nombre);
    const provs = grupo ? grupo.proveedores || [] : [];
    const share = (estados.find((e) => e.estado === nombre) || {}).pct || 0;
    const sem = nombre === "Expired" ? "mal" : nombre === "Full approved" ? "ok" : "aviso";
    return {
      titulo: `PPAP · ${nombre}`,
      sub: `${share}% of suppliers · ${provs.length} suppliers`,
      html: cajaKpis([kpi(`${share}%`, "status share", sem), kpi(provs.length, "suppliers"), kpi(`${f1(p.aTiempo)}%`, "on time", p.aTiempo >= 90 ? "ok" : "aviso")]) +
        bloque("Proveedores en este estado", tablaHTML(["Proveedor", "PPAP status"], provs.map((s) => [escape(s), nombre]))) +
        `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
    };
  }
  return {
    titulo: "Proveedor PPAP Requalification",
    sub: `${f1(p.aTiempo)}% on time`,
    html: cajaKpis([kpi(`${f1(p.aTiempo)}%`, "on time", p.aTiempo >= 90 ? "ok" : "aviso"), kpi("90%", "target"), kpi(estados.length, "statuses")]) +
      bloque("Detalle por estado", tablaHTML(["Estado", "% suppliers", "Proveedors"], (porEstado.length ? porEstado : estados).map((g) => { const nombre = g.estado; const share = (estados.find((e) => e.estado === nombre) || {}).pct || g.pct || 0; const n = (g.proveedores || []).length; return [nombre, `${share}%`, n || "—"]; }), [], { panel: 7, keys: (porEstado.length ? porEstado : estados).map((g) => g.estado) })) +
      `<p class="insight">Haz clic en un estado para ver su lista de proveedores. Usa Volver para regresar.</p>`,
  };
}

function detalle8(d, key) {
  const r = d.readiness;
  const pending = r.hitosTotales - r.hitosCumplidos;
  const provs = r.proveedores || [];
  const estados = ["On track", "At risk", "Delayed"];
  if (estados.includes(key)) {
    const lista = provs.filter((p) => p.estado === key);
    return {
      titulo: `Readiness · ${key}`,
      sub: `${lista.length} suppliers/proyectos`,
      html: cajaKpis([kpi(lista.length, "items"), kpi(`${f1(r.pct)}%`, "readiness global"), kpi(pending, "hitos pendientes", pending ? "aviso" : "ok")]) +
        bloque("Lista de proveedores/proyectos", tablaHTML(["Proveedor", "Project", "Hitos", "Estado"], lista.map((p) => [escape(p.proveedor), escape(p.proyecto), p.hitos, p.estado]))) +
        `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
    };
  }
  return {
    titulo: "Proveedor Project Readiness",
    sub: `Pillar ${r.pilar} · APQP milestones ${r.hitosCumplidos}/${r.hitosTotales}`,
    html: cajaKpis([kpi(r.proyectos, "proyectos"), kpi(r.hitosCumplidos, "hitos cumplidos", "ok"), kpi(pending, "hitos pendientes", pending ? "aviso" : "ok"), kpi(`${f1(r.pct)}%`, "readiness", r.pct >= 85 ? "ok" : "aviso")]) +
      bloque("Por estado", tablaHTML(["Estado", "Proveedors/Proyectos"], estados.map((e) => [e, provs.filter((p) => p.estado === e).length]), [], { panel: 8, keys: estados })) +
      bloque("Lista de proveedores/proyectos", tablaHTML(["Proveedor", "Project", "Hitos", "Estado"], provs.map((p) => [escape(p.proveedor), escape(p.proyecto), p.hitos, p.estado]))) +
      `<p class="insight">Haz clic en un estado para ver su lista. Usa Volver para regresar.</p>`,
  };
}

function detalle9(d, key) {
  const a = d.auditorias;
  const mes = (a.porMes || []).find((m) => m.mes === key);
  if (mes) {
    const filas = (mes.proveedores || []).map((p) => [escape(p.proveedor), escape(p.tipo), chipEstado(p.estado), fechaCorta(p.fecha)]);
    return {
      titulo: `Audits · ${mes.mes}`,
      sub: `${mes.completadas}/${mes.total} completadas (${f1(mes.pct)}%)`,
      html: cajaKpis([kpi(mes.total, "auditorías"), kpi(mes.completadas, "completadas", "ok"), kpi(mes.total - mes.completadas, "pending", mes.total - mes.completadas ? "aviso" : "ok"), kpi(`${f1(mes.pct)}%`, "completitud", mes.pct >= 90 ? "ok" : "aviso")]) +
        bloque("Desglose de proveedores", tablaHTML(["Proveedor", "Tipo", "Estado", "Fecha"], filas)) +
        `<p class="insight">Usa Volver para regresar al reporte general.</p>`,
    };
  }
  const mesesOrden = ordenCalendario(a.porMes || []);
  return {
    titulo: "Proveedor Audits Estado",
    sub: `${a.periodo} · ${a.planeadas} auditorías · ${a.completadas} completadas · ${f1(a.pct)}% completitud`,
    html: cajaKpis([kpi(a.planeadas, "planeadas"), kpi(a.completadas, "completadas", "ok"), kpi(`${f1(a.pct)}%`, "completitud", a.pct >= 90 ? "ok" : "aviso")]) +
      bloque("Completitud por mes", tablaHTML(["Mes", "Audits", "Completed", "Completion"], mesesOrden.map((m) => [m.mes, m.total, m.completadas, `${f1(m.pct)}%`]), [], { panel: 9, keys: mesesOrden.map((m) => m.mes) })) +
      bloque("Próximas auditorías", tablaHTML(["Proveedor", "Tipo", "Fecha", "En"], (a.proximas || []).map((x) => [x.proveedor, x.tipo, fechaCorta(x.fecha), `${Math.max(0, diasHasta(x.fecha))} días`]))) +
      `<p class="insight">Click a month for supplier breakdown. Usa Volver para regresar.</p>`,
  };
}

const DETALLES = { 1: detalle1, 2: detalle2, 3: detalle3, 4: detalle4, 5: detalle5, 6: detalle6, 7: detalle7, 8: detalle8, 9: detalle9 };

/* ---------- modal / floating ---------- */
function abrirModal(panel, key, opts = {}) {
  if (!ESTADO.datos) return;
  const fn = DETALLES[panel];
  if (!fn) return;
  const { push = true } = opts;
  const modal = $("modal");
  if (push && !modal.hidden && ESTADO.modalActual) ESTADO.modalHistorial.push(ESTADO.modalActual);
  else if (push && modal.hidden) ESTADO.modalHistorial = [];
  const flot = $("panel-flotante");
  if (flot && !flot.hidden) cerrarPanelFlotante();
  ESTADO.modalActual = { panel, key: key || "" };
  const info = fn(ESTADO.datos, key || "");
  ocultarTip();
  $("modal-excel").dataset.panel = String(panel);
  $("modal-titulo").textContent = info.titulo;
  $("modal-sub").textContent = info.sub || "";
  $("modal-cuerpo").innerHTML = info.html;
  const btnVolver = $("modal-volver");
  if (btnVolver) btnVolver.hidden = ESTADO.modalHistorial.length === 0;
  modal.hidden = false;
  document.body.classList.add("sin-scroll");
  if (ESTADO.ultimoFoco == null) ESTADO.ultimoFoco = document.activeElement;
  modal.querySelector(".modal-caja").scrollTop = 0;
  (btnVolver && !btnVolver.hidden ? btnVolver : $("modal-cerrar")).focus();
}
function volverModal() {
  if (!ESTADO.modalHistorial.length) return;
  const prev = ESTADO.modalHistorial.pop();
  abrirModal(prev.panel, prev.key, { push: false });
}
function cerrarModal() {
  const modal = $("modal");
  if (modal.hidden) return;
  modal.hidden = true;
  ESTADO.modalHistorial = [];
  ESTADO.modalActual = null;
  if ($("panel-flotante").hidden) document.body.classList.remove("sin-scroll");
  if (ESTADO.ultimoFoco && ESTADO.ultimoFoco.focus) ESTADO.ultimoFoco.focus();
  ESTADO.ultimoFoco = null;
}

function abrirPanelFlotante(n) {
  const fn = PINTORES[n];
  if (!fn || !ESTADO.datos) return;
  cerrarModal();
  ocultarTip();
  $("panel-flotante-titulo").textContent = TITULOS[n] || "Panel " + n;
  const cuerpo = $("panel-flotante-cuerpo");
  cuerpo.dataset.panel = String(n);
  cuerpo.innerHTML = $("c" + n).innerHTML || "";
  $("panel-flotante-excel").dataset.panel = String(n);
  $("panel-flotante-detalle").dataset.panel = String(n);
  $("panel-flotante").hidden = false;
  document.body.classList.add("sin-scroll");
}
function cerrarPanelFlotante() {
  const cont = $("panel-flotante");
  if (!cont || cont.hidden) return;
  cont.hidden = true;
  $("panel-flotante-cuerpo").innerHTML = "";
  if ($("modal").hidden) document.body.classList.remove("sin-scroll");
}

/* ---------- tooltip ---------- */
const TIP = $("tip");
let tipTimer;
function ocultarTip() { TIP.hidden = true; }
function mostrarTip(texto, x, y) {
  clearTimeout(tipTimer);
  TIP.textContent = texto;
  TIP.hidden = false;
  const w = TIP.offsetWidth || 180, h = TIP.offsetHeight || 40;
  const izq = Math.min(x + 14, window.innerWidth - w - 12);
  const arriba = Math.min(y + 14, window.innerHeight - h - 12);
  TIP.style.left = Math.max(8, izq) + "px";
  TIP.style.top = Math.max(8, arriba) + "px";
}
document.addEventListener("mouseover", (e) => {
  const el = e.target.closest("[data-tip]");
  if (el) mostrarTip(el.dataset.tip, e.clientX, e.clientY); else ocultarTip();
});
document.addEventListener("mousemove", (e) => { if (!TIP.hidden) mostrarTip(TIP.textContent, e.clientX, e.clientY); });
document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); mostrarTip(el.dataset.tip, r.left + r.width / 2, r.top); } });
document.addEventListener("focusout", () => ocultarTip());

/* ---------- Excel (.xlsx, ZIP+SpreadsheetML, sin dependencias) ---------- */
function xlsxCol(n) { let s = ""; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function xlsxCell(ref, v) {
  if (v === null || v === undefined || v === "") return `<c r="${ref}"/>`;
  if (typeof v === "number" && isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
  const t = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${t}</t></is></c>`;
}
function xlsxSheetXml(rows, { autofilter } = {}) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>';
  let maxCol = 1;
  rows.forEach((row, ri) => {
    maxCol = Math.max(maxCol, row.length);
    xml += `<row r="${ri + 1}">`;
    row.forEach((v, ci) => { xml += xlsxCell(xlsxCol(ci + 1) + (ri + 1), v); });
    xml += `</row>`;
  });
  xml += `</sheetData>`;
  if (autofilter && rows.length >= 2) xml += `<autoFilter ref="A${autofilter.from || 1}:${xlsxCol(maxCol)}${rows.length}"/>`;
  xml += `</worksheet>`;
  return xml;
}
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function strBytes(s) { return new TextEncoder().encode(s); }
function u16(v, o, n) { v.setUint16(o, n, true); }
function u32(v, o, n) { v.setUint32(o, n, true); }
function crearXlsx(sheets) {
  const files = [];
  const names = sheets.map(s => s.name);
  const enc = (s) => strBytes(s);
  files.push({ name: "[Content_Types].xml", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`) });
  files.push({ name: "_rels/.rels", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) });
  files.push({ name: "xl/_rels/workbook.xml.rels", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) });
  files.push({ name: "xl/workbook.xml", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${String(n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`) });
  files.push({ name: "xl/styles.xml", data: enc(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`) });
  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(xlsxSheetXml(s.rows, s.opts || {})) }));
  const chunks = []; let offset = 0; const central = [];
  files.forEach(f => {
    const nameBytes = enc(f.name); const crc = crc32(f.data);
    const lh = new Uint8Array(30 + nameBytes.length); const lv = new DataView(lh.buffer);
    u32(lv, 0, 0x04034b50); u16(lv, 4, 20); u16(lv, 6, 0); u16(lv, 8, 0); u16(lv, 10, 0); u16(lv, 12, 0);
    u32(lv, 14, crc); u32(lv, 18, f.data.length); u32(lv, 22, f.data.length); u16(lv, 26, nameBytes.length); u16(lv, 28, 0);
    lh.set(nameBytes, 30);
    chunks.push(lh, f.data);
    const ch = new Uint8Array(46 + nameBytes.length); const cv = new DataView(ch.buffer);
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u16(cv, 8, 0); u16(cv, 10, 0); u16(cv, 12, 0); u16(cv, 14, 0);
    u32(cv, 16, crc); u32(cv, 20, f.data.length); u32(cv, 24, f.data.length); u16(cv, 28, nameBytes.length); u16(cv, 30, 0); u16(cv, 32, 0); u16(cv, 34, 0); u16(cv, 36, 0); u32(cv, 38, 0); u32(cv, 42, offset);
    ch.set(nameBytes, 46); central.push(ch);
    offset += lh.length + f.data.length;
  });
  const cdStart = offset; let cdSize = 0; central.forEach(c => { chunks.push(c); cdSize += c.length; });
  const eocd = new Uint8Array(22); const ev = new DataView(eocd.buffer);
  u32(ev, 0, 0x06054b50); u16(ev, 4, 0); u16(ev, 6, 0); u16(ev, 8, files.length); u16(ev, 10, files.length); u32(ev, 12, cdSize); u32(ev, 16, cdStart); u16(ev, 20, 0);
  chunks.push(eocd);
  return new Blob(chunks, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
function metaExport(n, filtros) {
  return [
    ["Panel", n, TITULOS[n] || ""],
    ["Generado", new Date().toLocaleString("es-MX")],
    ["Rango", ESTADO.rango === "quarter" ? "Quarter (Q1-Q4, 12 meses)" : (ESTADO.rango + "M")],
    ["Orden", "Ene→Dic"],
    ...(filtros || []),
    []
  ];
}
function descargarPanel(n) {
  if (!ESTADO.datos) return;
  const d = ESTADO.datos;
  const sheets = [];
  if (n === 1) {
    const lista = d.focusSuppliers.filter((s) => ESTADO.region === "all" || s.region === ESTADO.region);
    const filtros = [["Filtro región", ESTADO.region]];
    const rows = [...metaExport(n, filtros), ["Proveedor", "Región", "Rating", "PPM", "Claims abiertos", "Tendencia", "Motivo foco"], ...lista.map(s => [s.nombre, s.region, s.rating, s.ppm, s.claimsAbiertos, s.tendencia, s.motivo]), [], ["Total proveedores", lista.length], ["PPM overall", Math.round(d.general.ppm)], ["Objetivo PPM", d.general.ppmObjetivo]];
    sheets.push({ name: "Top Focus", rows, opts: { autofilter: { from: metaExport(n, filtros).length + 1 } } });
  } else if (n === 2) {
    const meses = ordenCalendario(serie(d.claims.porMes || []));
    const rows = [...metaExport(n), ["Mes", "Total", "L1", "L2", "L3"], ...meses.map(m => [m.mes, m.total, m.l1, m.l2, m.l3]), [], ["Totales", meses.reduce((a,m)=>a+m.total,0), meses.reduce((a,m)=>a+m.l1,0), meses.reduce((a,m)=>a+m.l2,0), meses.reduce((a,m)=>a+m.l3,0)], ["0 km", d.claims.ceroKm], ["Campo", d.claims.campo]];
    sheets.push({ name: "Claims", rows, opts: { autofilter: { from: metaExport(n).length + 1 } } });
  } else if (n === 3) {
    const foco = ESTADO.scorecardFoco; const s = d.scorecard;
    const base = foco ? (() => { const c = { A: 0, B: 0, C: 0 }; d.focusSuppliers.forEach(fs => { if (c[fs.rating] != null) c[fs.rating]++; }); return c; })() : s.porRating;
    const total = foco ? d.focusSuppliers.length : s.totalProveedores;
    const porciones = ["A", "B", "C"].map(r => { const count = foco ? base[r] : Math.round((Number(base[r]) / 100) * total); const pct = foco ? Math.round((count / (total || 1)) * 1000) / 10 : Number(base[r]); return [r, count, pct]; });
    const filtros = [["Vista", foco ? "Top focus" : "Base completa"]];
    const rows = [...metaExport(n, filtros), ["Rating", "Proveedores", "Porcentaje %"], ...porciones, [], ["Total proveedores", total], ["Objetivo A %", s.objetivoA]];
    sheets.push({ name: "Scorecard", rows, opts: { autofilter: { from: metaExport(n, filtros).length + 1 } } });
  } else if (n === 4) {
    const sel = ESTADO.focoOTD; const o = d.otd;
    const fuente = sel ? ((o.porProveedor || []).find(x => x.proveedor === sel) || {}).porMes || [] : o.porMes;
    const puntos = ordenCalendario(serie(fuente || []));
    const prom = puntos.length ? puntos.reduce((a,p)=>a+p.valor,0)/puntos.length : 0;
    const debajo = puntos.filter(p => p.valor < o.objetivo).length;
    const filtros = [["Proveedor OTD", sel || "Consolidado (todos)"]];
    const rows = [...metaExport(n, filtros), ["Mes", "OTD %", "Objetivo %", "Cumple"], ...puntos.map(p => [p.mes, p.valor, o.objetivo, p.valor >= o.objetivo ? "Sí" : "No"]), [], ["Promedio %", Number(prom.toFixed(2))], ["Meses bajo objetivo", debajo], ["Objetivo %", o.objetivo]];
    sheets.push({ name: "OTD", rows, opts: { autofilter: { from: metaExport(n, filtros).length + 1 } } });
  } else if (n === 5) {
    const meses = ordenCalendario(serie(d.copq.porMes || []));
    const total = meses.reduce((a,m)=>a+(Number(m.keur)||0),0);
    const rows = [...metaExport(n), ["Mes", "COPQ kEUR"], ...meses.map(m => [m.mes, m.keur]), [], ["Total kEUR", Number(total.toFixed(2))], ["Promedio kEUR", meses.length ? Number((total/meses.length).toFixed(2)) : 0]];
    sheets.push({ name: "COPQ", rows, opts: { autofilter: { from: metaExport(n).length + 1 } } });
  } else if (n === 6) {
    const c = d.chargeback; const provs = c.proveedores || [];
    const meses = ordenCalendario(serie(c.porMes || []));
    sheets.push({ name: "Resumen mensual", rows: [...metaExport(n), ["Mes","Cobrado kEUR","Recuperado kEUR","Tasa %"], ...meses.map(m=>[m.mes,m.charged,m.recovered,m.tasa]), [], ["Totales", meses.reduce((a,m)=>a+Number(m.charged||0),0), meses.reduce((a,m)=>a+Number(m.recovered||0),0), ""]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
    sheets.push({ name: "Cobrado", rows: [...metaExport(n), ["Proveedor","Cobrado kEUR","Recuperado kEUR","Respuesta","Estado"], ...provs.map(p=>[p.proveedor,p.charged,p.recovered,p.responded?"Respondió":"Pendiente",p.responded?"OK":"Abierto"]), [], ["Total cobrado kEUR", provs.reduce((a,p)=>a+Number(p.charged||0),0)]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
    sheets.push({ name: "Recuperado", rows: [...metaExport(n), ["Proveedor","Cobrado kEUR","Recuperado kEUR","Pendiente kEUR","% recuperación","Respuesta"], ...provs.map(p=>{ const pend=Math.max(0,Number(p.charged||0)-Number(p.recovered||0)); const pct=p.charged?Number(((Number(p.recovered||0)/Number(p.charged||1))*100).toFixed(1)):0; return [p.proveedor,p.charged,p.recovered,Number(pend.toFixed(2)),pct,p.responded?"Respondió":"Pendiente"]; }), [], ["Total recuperado kEUR", provs.reduce((a,p)=>a+Number(p.recovered||0),0)], ["Total pendiente kEUR", Number(provs.reduce((a,p)=>a+Math.max(0,Number(p.charged||0)-Number(p.recovered||0)),0).toFixed(2))]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
  } else if (n === 7) {
    const p = d.ppap;
    sheets.push({ name: "Resumen PPAP", rows: [...metaExport(n), ["Estado","% proveedores"], ...(p.statusShare||[]).map(s=>[s.estado,s.pct]), [], ["% a tiempo", p.aTiempo]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
    const det = [["Proveedor","Estado"]]; (p.porEstado||[]).forEach(g => (g.proveedores||[]).forEach(s => det.push([s, g.estado])));
    sheets.push({ name: "Proveedores por estado", rows: [...metaExport(n), ...det, [], ["Total registros", Math.max(0, det.length - 1)]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
  } else if (n === 8) {
    const r = d.readiness; const provs = r.proveedores || [];
    sheets.push({ name: "Resumen", rows: [...metaExport(n), ["Indicador","Valor"], ["Proyectos", r.proyectos], ["Hitos totales", r.hitosTotales], ["Hitos cumplidos", r.hitosCumplidos], ["% readiness", r.pct], ["Pilar", r.pilar]] });
    sheets.push({ name: "Proveedores/proyectos", rows: [...metaExport(n), ["Proveedor","Proyecto","Hitos","Estado"], ...provs.map(p=>[p.proveedor,p.proyecto,p.hitos,p.estado]), [], ["Total", provs.length]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
  } else if (n === 9) {
    const a = d.auditorias; const meses = ordenCalendario(serie(a.porMes || []));
    const totalPlan = meses.reduce((s,m)=>s+Number(m.total||0),0); const totalComp = meses.reduce((s,m)=>s+Number(m.completadas||0),0);
    const resumen = [...metaExport(n), ["Mes","Auditorías","Completadas","% completitud"], ...meses.map(m=>[m.mes,m.total,m.completadas,m.pct]), [], ["Total planeadas", totalPlan], ["Total completadas", totalComp], ["% global", totalPlan ? Number(((totalComp/totalPlan)*100).toFixed(1)) : 0]];
    const detalle = [["Mes","Proveedor","Tipo","Estado","Fecha"]]; meses.forEach(m => (m.proveedores||[]).forEach(p => detalle.push([m.mes, p.proveedor, p.tipo, p.estado, p.fecha])));
    sheets.push({ name: "Resumen mensual", rows: resumen, opts: { autofilter: { from: metaExport(n).length + 1 } } });
    sheets.push({ name: "Detalle proveedores", rows: [...metaExport(n), ...detalle, [], ["Total registros", Math.max(0, detalle.length - 1)]], opts: { autofilter: { from: metaExport(n).length + 1 } } });
  } else {
    sheets.push({ name: "Datos", rows: metaExport(n).concat([["Sin datos"]]) });
  }
  const blob = crearXlsx(sheets.length ? sheets : [{ name: "Datos", rows: [["Sin datos"]] }]);
  const ael = document.createElement("a");
  ael.href = URL.createObjectURL(blob);
  ael.download = `panel-${n}-${(TITULOS[n] || "export").replace(/[^a-z0-9]+/gi, "-")}.xlsx`;
  document.body.appendChild(ael); ael.click(); ael.remove();
}

/* ---------- events ---------- */
document.addEventListener("click", (e) => {
  const accionEl = e.target.closest("[data-accion]");
  const accion = accionEl ? accionEl.dataset.accion : null;
  if (accion === "region") { ESTADO.region = accionEl.dataset.region; pintarPanel(1); return; }
  if (accion === "rango") {
    ESTADO.rango = accionEl.dataset.rango;
    document.querySelectorAll('[data-accion="rango"]').forEach((b) => b.setAttribute("aria-pressed", String(b === accionEl)));
    pintarTodo();
    return;
  }
  if (accion === "score-foco") { ESTADO.scorecardFoco = accionEl.dataset.foco === "1"; pintarPanel(3); return; }
  if (accion === "foco-otd") { ESTADO.focoOTD = accionEl.dataset.foco || null; pintarPanel(4); return; }
  if (accion === "refrescar") { cargar(); return; }
  if (accion === "panel") { abrirModal(Number(accionEl.dataset.panel)); return; }
  if (accion === "panel-desde-flotante") { const n = Number($("panel-flotante-cuerpo").dataset.panel); cerrarPanelFlotante(); abrirModal(n); return; }
  if (accion === "item") { abrirModal(Number(accionEl.dataset.panel), accionEl.dataset.key); return; }
  if (accion === "cerrar-modal" || e.target.id === "modal") { cerrarModal(); return; }
  if (accion === "cerrar-flotante" || e.target.id === "panel-flotante") { cerrarPanelFlotante(); return; }
  if (accion === "volver-modal") { volverModal(); return; }
  if (accion === "exportar-panel") { const n = Number(accionEl.dataset.panel || $("panel-flotante-cuerpo").dataset.panel || $("modal-excel").dataset.panel || 0); if (n) descargarPanel(n); return; }
  const panelEl = e.target.closest(".panel");
  if (panelEl && !e.target.closest("button,a,.filtro,[data-tip],[tabindex],.panel-controles") && $("modal").hidden) {
    const n = Number(panelEl.id.replace("p", ""));
    if (n) abrirPanelFlotante(n);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (!$("modal").hidden) cerrarModal(); else if (!$("panel-flotante").hidden) cerrarPanelFlotante(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.closest("[data-accion='item']")) {
    e.preventDefault();
    const el = e.target.closest("[data-accion='item']");
    abrirModal(Number(el.dataset.panel), el.dataset.key);
  }
});

/* ---------- OTD mouse guide ---------- */
document.addEventListener("mousemove", (e) => {
  document.querySelectorAll('svg[data-guia="1"]').forEach((svg) => {
    const r = svg.getBoundingClientRect();
    const g = svg.querySelector(".guia");
    if (!g) return;
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      const x = ((e.clientX - r.left) / r.width) * 520;
      g.style.display = ""; g.setAttribute("transform", `translate(${x},0)`); g.querySelector("line").setAttribute("x1", 0); g.querySelector("line").setAttribute("x2", 0);
    } else g.style.display = "none";
  });
});

/* ---------- decorate panels ---------- */
document.querySelectorAll(".panel").forEach((panel) => {
  const h2 = panel.querySelector("h2");
  const n = Number(panel.id.replace("p", ""));
  if (!h2 || !n) return;
  if (h2.querySelector(".panel-controles")) return;
  const controles = document.createElement("div");
  controles.className = "panel-controles";
  const btnExcel = document.createElement("button");
  btnExcel.type = "button"; btnExcel.className = "panel-detalle panel-excel"; btnExcel.dataset.accion = "exportar-panel"; btnExcel.dataset.panel = String(n);
  btnExcel.title = "Download this panel as Excel"; btnExcel.setAttribute("aria-label", "Download panel " + n + " as Excel"); btnExcel.innerHTML = '<span aria-hidden="true">⤓</span>';
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "panel-detalle"; btn.dataset.accion = "panel"; btn.dataset.panel = String(n);
  btn.title = "Open panel detail"; btn.setAttribute("aria-label", "Open detail for panel " + n); btn.innerHTML = '<span aria-hidden="true">⤢</span> Detail';
  controles.appendChild(btnExcel); controles.appendChild(btn); h2.appendChild(controles);
});

/* ---------- init ---------- */
function normalizarDatos(d) { return d; }
function pintarPanel(n) { const f = PINTORES[n]; if (f && ESTADO.datos) f(ESTADO.datos); }
function pintarTodo() {
  if (!ESTADO.datos) return;
  pintarEncabezado(ESTADO.datos);
  Object.keys(PINTORES).forEach((n) => pintarPanel(Number(n)));
  pintarPie(ESTADO.datos);
}
async function cargar() {
  try {
    const r = await fetch("/api/datos", { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    ESTADO.datos = normalizarDatos(await r.json());
    try { pintarTodo(); } catch (e) { console.error("paint error", e); }
    setTimeout(() => { try { if (ESTADO.datos) pintarTodo(); } catch (e) {} }, 50);
  } catch (e) {
    document.querySelector(".grid9").insertAdjacentHTML("afterbegin", `<div class="panel" style="grid-column:1/-1; border-color:#f3c6c2"><h2>No se pudieron cargar los datos</h2><p style="color:var(--texto-suave)">Verifica que el servidor siga corriendo e intenta de nuevo. Detalle: ${escape(e.message)}</p></div>`);
  }
}
cargar();
