// Modo "Señas": aprender el alfabeto con porcentaje de acierto, grabar señas propias,
// practicar frases y traducir señas a voz.

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = v => Math.hypot(v.x, v.y, v.z);
const dist = (a, b) => len(sub(a, b));
const angle = (u, v) => Math.acos(clamp((u.x * v.x + u.y * v.y + u.z * v.z) / (len(u) * len(v) || 1), -1, 1)) * 180 / Math.PI;
const bend = (w, a, b, c) => angle(sub(w[b], w[a]), sub(w[c], w[b]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const avg = a => a.reduce((s, v) => s + v, 0) / (a.length || 1);

// Rasgos de la forma de la mano, todos entre 0 y 1 (no dependen de la distancia ni de qué mano sea).
const KEYS = ["i", "m", "r", "p", "out", "across", "ti", "tm", "spread"];
export function shapeFeatures(w) {
  const pw = dist(w[5], w[17]); // ancho de la palma
  const curl = (a, b, c, d) => clamp((bend(w, 0, a, b) + bend(w, a, b, c) + bend(w, b, c, d)) / 200);
  return {
    i: curl(5, 6, 7, 8), m: curl(9, 10, 11, 12), r: curl(13, 14, 15, 16), p: curl(17, 18, 19, 20),
    out: clamp(dist(w[4], w[5]) / pw / 1.3),        // pulgar separado de la mano
    across: clamp(1.3 - dist(w[4], w[17]) / pw),    // pulgar cruzado sobre la palma
    ti: clamp(dist(w[4], w[8]) / pw / 1.5),         // distancia punta pulgar – punta índice
    tm: clamp(dist(w[4], w[12]) / pw / 1.5),        // distancia punta pulgar – punta medio
    spread: clamp(angle(sub(w[6], w[5]), sub(w[10], w[9])) / 30), // índice y medio separados
  };
}

// Formas base del alfabeto manual (letras estáticas). i/m/r/p: 0 = dedo estirado, 1 = doblado.
const LETRAS = {
  A: { desc: "Puño cerrado con el pulgar estirado al lado del índice.", ideal: { i: 1, m: 1, r: 1, p: 1, across: 0.3 } },
  B: { desc: "Cuatro dedos estirados y juntos; pulgar doblado sobre la palma.", ideal: { i: 0, m: 0, r: 0, p: 0, across: 0.8, spread: 0 } },
  C: { desc: "Mano curvada en forma de C, como sosteniendo un vaso.", ideal: { i: 0.45, m: 0.45, r: 0.45, p: 0.45, ti: 0.5, across: 0.2 } },
  D: { desc: "Índice hacia arriba; los demás dedos curvados tocan la punta del pulgar.", ideal: { i: 0, m: 0.6, r: 0.6, p: 0.6, tm: 0.1 } },
  E: { desc: "Todos los dedos doblados con las puntas sobre el pulgar, que cruza la palma.", ideal: { i: 0.9, m: 0.9, r: 0.9, p: 0.9, across: 0.8 } },
  F: { desc: "Pulgar e índice forman un círculo; medio, anular y meñique estirados.", ideal: { i: 0.6, m: 0, r: 0, p: 0, ti: 0 } },
  I: { desc: "Meñique estirado hacia arriba; los demás dedos en puño.", ideal: { i: 1, m: 1, r: 1, p: 0, across: 0.7 } },
  L: { desc: "Pulgar e índice estirados formando una L; los demás doblados.", ideal: { i: 0, m: 1, r: 1, p: 1, out: 1, across: 0 } },
  O: { desc: "Todos los dedos curvados tocando la punta del pulgar, formando una O.", ideal: { i: 0.6, m: 0.6, r: 0.6, p: 0.6, ti: 0.05 } },
  U: { desc: "Índice y medio estirados y juntos; los demás doblados.", ideal: { i: 0, m: 0, r: 1, p: 1, spread: 0, across: 0.7 } },
  V: { desc: "Índice y medio estirados y separados en V.", ideal: { i: 0, m: 0, r: 1, p: 1, spread: 1 } },
  W: { desc: "Índice, medio y anular estirados y separados; meñique doblado.", ideal: { i: 0, m: 0, r: 0, p: 1, spread: 0.7 } },
  Y: { desc: "Pulgar y meñique estirados; los demás doblados.", ideal: { i: 1, m: 1, r: 1, p: 0, out: 1, across: 0 } },
};
const LECCIONES = [
  { nombre: "Vocales", letras: ["A", "E", "I", "O", "U"] },
  { nombre: "B C D F", letras: ["B", "C", "D", "F"] },
  { nombre: "L V W Y", letras: ["L", "V", "W", "Y"] },
];
const DEDO = { i: "índice", m: "medio", r: "anular", p: "meñique" };

function hintFor(k, d) {
  if (DEDO[k]) return d > 0 ? `Dobla más el ${DEDO[k]}` : `Estira el ${DEDO[k]}`;
  return {
    out: d > 0 ? "Separa el pulgar de la mano" : "Acerca el pulgar a la mano",
    across: d > 0 ? "Cruza el pulgar sobre la palma" : "Saca el pulgar de la palma",
    ti: d > 0 ? "Separa las puntas del pulgar y el índice" : "Junta las puntas del pulgar y el índice",
    tm: d > 0 ? "Separa las puntas del pulgar y el medio" : "Junta las puntas del pulgar y el medio",
    spread: d > 0 ? "Separa el índice del medio" : "Junta el índice y el medio",
  }[k];
}

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-CO"; u.rate = 0.95;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}

// Compara una seña grabada con otra (Dynamic Time Warping: tolera que vayas más rápido o lento).
function toSeq(frames) {
  const mx = avg(frames.map(f => f.x)), my = avg(frames.map(f => f.y));
  return frames.map(f => [...KEYS.map(k => f.s[k]), (f.x - mx) * 2, (f.y - my) * 2]);
}
function dtwScore(a, b) {
  if (!a.length || !b.length) return 0;
  const dv = (u, v) => avg(u.map((x, i) => Math.abs(x - v[i])));
  let prev = new Float64Array(b.length + 1).fill(Infinity); prev[0] = 0;
  for (let i = 1; i <= a.length; i++) {
    const cur = new Float64Array(b.length + 1).fill(Infinity);
    for (let j = 1; j <= b.length; j++)
      cur[j] = dv(a[i - 1], b[j - 1]) + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    prev = cur;
  }
  const d = prev[b.length] / (a.length + b.length);
  return Math.round(100 * clamp(1 - (d - 0.04) / 0.2));
}

// Junta letras seguidas en una palabra: [H,O,L,A,amigo] => "HOLA amigo"
function textoDe(items) {
  const out = []; let word = "";
  for (const it of items) {
    if (it.tipo === "letra") word += it.nombre;
    else { if (word) out.push(word); word = ""; out.push(it.nombre); }
  }
  if (word) out.push(word);
  return out.join(" ");
}

export function initSenas({ root, overlay, isMirror }) {
  let calib = store.get("senas.calib", {});        // tus versiones grabadas de cada letra
  let progreso = store.get("senas.progreso", {});  // mejor % por letra
  let senas = store.get("senas.propias", []);      // [{nombre, frames}]
  let frases = store.get("senas.frases", []);      // [{items}]
  let panel = "aprender", busy = false, recorder = null, lastFrameAt = 0;

  root.innerHTML = `
  <div class="row" id="sTabs">
    <button data-sub="aprender" class="secondary active">Aprender</button>
    <button data-sub="misSenas" class="secondary">Mis señas</button>
    <button data-sub="frases" class="secondary">Frases</button>
    <button data-sub="traductor" class="secondary">Traductor</button>
  </div>

  <div data-panel="aprender" class="stack">
    <div class="row" id="lecciones"></div>
    <div class="card center"><div id="letra" class="big-letter">A</div><div id="letraDesc" class="help"></div></div>
    <div class="bar"><div id="barFill"></div></div>
    <div id="letraScore" class="center strong">—</div>
    <div id="letraHint" class="help center"></div>
    <div class="row">
      <button id="saltar" class="secondary">Saltar ⏭</button>
      <button id="calibrar" class="secondary">📌 Grabar mi versión</button>
      <button id="restaurar" class="secondary" hidden>↺ Original</button>
    </div>
    <div id="leccionRes" class="center strong"></div>
  </div>

  <div data-panel="misSenas" class="stack" hidden>
    <p class="help">Graba palabras en señas (por ejemplo copiando a tu profesor o un video de LSC).
      Después la app te califica cuando las repites y las reconoce en el traductor. Cada grabación dura 2 segundos.</p>
    <div class="row"><input id="senaNombre" placeholder="Nombre (ej: Hola)"><button id="grabarSena">⏺ Grabar</button></div>
    <div id="listaSenas" class="stack"></div>
  </div>

  <div data-panel="frases" class="stack" hidden>
    <p class="help">Toca las letras y señas en orden para armar una frase. Luego practícala: la app te
      califica cada seña, te da el % de acierto y dice la frase en voz alta.</p>
    <div id="chips" class="chips"></div>
    <div id="fraseNueva" class="card center strong">—</div>
    <div class="row"><button id="guardarFrase">Guardar frase</button><button id="limpiarFrase" class="secondary">Limpiar</button></div>
    <div id="listaFrases" class="stack"></div>
    <div id="fraseRes" class="stack"></div>
  </div>

  <div data-panel="traductor" class="stack" hidden>
    <p class="help">Haz señas frente a la cámara: las letras (mantenlas 1 segundo) y tus señas grabadas
      se van escribiendo. Toca 🔊 para que el celular diga la frase.</p>
    <div class="row">
      <label><input type="checkbox" id="tLetras" checked> Letras</label>
      <label><input type="checkbox" id="tSenas" checked> Mis señas</label>
    </div>
    <div id="tTexto" class="card big-text">&nbsp;</div>
    <div class="row">
      <button id="tDecir">🔊 Decir</button>
      <button id="tEspacio" class="secondary">␣</button>
      <button id="tBorrar" class="secondary">⌫</button>
      <button id="tLimpiar" class="secondary">🗑</button>
    </div>
  </div>`;

  const $ = id => root.querySelector("#" + id);
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  root.querySelectorAll("#sTabs button").forEach(b => b.onclick = () => {
    if (busy) return;
    panel = b.dataset.sub;
    root.querySelectorAll("#sTabs button").forEach(x => x.classList.toggle("active", x === b));
    root.querySelectorAll("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== panel);
    if (panel === "frases") renderChips();
    overlay.textContent = "";
  });

  // ---------- Grabación ----------
  function frameData(res) {
    if (!res.worldLandmarks?.length) return null;
    const lm = res.landmarks[0];
    return { s: shapeFeatures(res.worldLandmarks[0]), x: isMirror() ? 1 - lm[0].x : lm[0].x, y: lm[0].y };
  }
  async function countdown(n) {
    for (let i = n; i > 0; i--) { overlay.textContent = `Prepárate… ${i}`; await sleep(700); }
  }
  function record(ms) {
    overlay.textContent = "🔴 Grabando…";
    return new Promise(resolve => {
      recorder = { frames: [], end: performance.now() + ms, resolve };
      setTimeout(() => { if (recorder) { const r = recorder; recorder = null; r.resolve(r.frames); } }, ms + 600);
    });
  }
  function cameraOn() {
    if (performance.now() - lastFrameAt < 1000) return true;
    alert("Primero pulsa “Iniciar cámara”.");
    return false;
  }
  const round = f => ({ s: Object.fromEntries(KEYS.map(k => [k, +f.s[k].toFixed(3)])), x: +f.x.toFixed(3), y: +f.y.toFixed(3) });

  // ---------- Aprender ----------
  let lec = 0, pos = 0, resultados = [], attemptBest = 0, holdStart = 0, scores = [], advancing = false;
  function renderLecciones() {
    $("lecciones").innerHTML = LECCIONES.map((l, i) =>
      `<button data-lec="${i}" class="secondary ${i === lec ? "active" : ""}">${l.nombre}</button>`).join("");
    $("lecciones").querySelectorAll("button").forEach(b => b.onclick = () => { if (!busy) startLeccion(+b.dataset.lec); });
  }
  function startLeccion(i) {
    lec = i; pos = 0; resultados = []; $("leccionRes").textContent = "";
    renderLecciones(); showLetra();
  }
  const letraActual = () => LECCIONES[lec].letras[pos];
  function showLetra() {
    const L = letraActual();
    attemptBest = 0; holdStart = 0; scores = []; advancing = false;
    $("letra").textContent = L;
    const best = progreso[L] ? ` · Tu mejor: ${progreso[L]}%` : "";
    $("letraDesc").textContent = LETRAS[L].desc + (calib[L] ? " (usando tu versión grabada)" : "") + best;
    $("restaurar").hidden = !calib[L];
    $("letraHint").textContent = "";
  }
  function letterScore(s, L) {
    const ideal = calib[L] || LETRAS[L].ideal;
    let sum = 0, n = 0, wk = null, wd = 0;
    for (const k in ideal) {
      const d = ideal[k] - s[k]; sum += Math.abs(d); n++;
      if (Math.abs(d) > Math.abs(wd)) { wd = d; wk = k; }
    }
    return { score: Math.round(100 * clamp(1 - (sum / n) * 2)), hint: Math.abs(wd) > 0.15 ? hintFor(wk, wd) : "" };
  }
  function siguiente(ok) {
    const L = letraActual(), score = Math.round(attemptBest);
    resultados.push({ L, score, ok });
    progreso[L] = Math.max(progreso[L] || 0, score); store.set("senas.progreso", progreso);
    pos++;
    if (pos < LECCIONES[lec].letras.length) return showLetra();
    const pct = Math.round(avg(resultados.map(r => r.score)));
    const aciertos = resultados.filter(r => r.ok).length;
    $("leccionRes").innerHTML = `Lección terminada: ${aciertos}/${resultados.length} letras · <b>${pct}% de acierto</b><br>` +
      resultados.map(r => `${r.ok ? "✅" : "❌"} ${r.L} ${r.score}%`).join(" · ");
    overlay.textContent = `🏁 ${pct}% de acierto`;
    speak(`Lección terminada. Acierto ${pct} por ciento`);
    pos = 0; showLetra();
  }
  function aprenderFrame(f, now) {
    if (advancing) return;
    if (!f) { overlay.textContent = `Haz la letra ${letraActual()}`; holdStart = 0; return; }
    const { score, hint } = letterScore(f.s, letraActual());
    scores.push(score); if (scores.length > 6) scores.shift();
    const sm = avg(scores);
    attemptBest = Math.max(attemptBest, sm);
    $("barFill").style.width = sm + "%";
    $("barFill").style.background = sm >= 80 ? "var(--ok)" : sm >= 55 ? "var(--warn)" : "var(--bad)";
    $("letraScore").textContent = `Acierto: ${Math.round(sm)}%`;
    $("letraHint").textContent = sm >= 80 ? "¡Así! Mantén la posición…" : hint;
    overlay.textContent = `${letraActual()} · ${Math.round(sm)}%`;
    if (sm >= 80) {
      holdStart ||= now;
      if (now - holdStart > 1000) {
        advancing = true;
        overlay.textContent = `✅ ¡Bien! ${letraActual()}`;
        speak(letraActual()); navigator.vibrate?.(60);
        setTimeout(() => siguiente(true), 1200);
      }
    } else holdStart = 0;
  }
  $("saltar").onclick = () => { if (!busy && !advancing) siguiente(false); };
  $("calibrar").onclick = async () => {
    if (busy || !cameraOn()) return;
    busy = true;
    const L = letraActual();
    await countdown(3);
    const frames = await record(1000);
    busy = false;
    if (frames.length < 5) { overlay.textContent = "No vi bien la mano, intenta otra vez"; return; }
    calib[L] = Object.fromEntries(KEYS.map(k => [k, avg(frames.map(f => f.s[k]))]));
    store.set("senas.calib", calib);
    overlay.textContent = `📌 Guardada tu versión de ${L}`;
    showLetra();
  };
  $("restaurar").onclick = () => { delete calib[letraActual()]; store.set("senas.calib", calib); showLetra(); };

  // ---------- Mis señas ----------
  function renderSenas() {
    $("listaSenas").innerHTML = senas.length ? senas.map((s, i) => `
      <div class="card row item"><span class="grow strong">${esc(s.nombre)}</span>
        <button data-act="practicar" data-i="${i}">Practicar</button>
        <button data-act="decir" data-i="${i}" class="secondary">🔊</button>
        <button data-act="borrar" data-i="${i}" class="secondary">🗑</button></div>`).join("")
      : `<p class="help">Aún no tienes señas grabadas.</p>`;
    $("listaSenas").querySelectorAll("button").forEach(b => b.onclick = () => accionSena(b.dataset.act, +b.dataset.i));
  }
  async function accionSena(act, i) {
    if (busy) return;
    const s = senas[i];
    if (act === "decir") return speak(s.nombre);
    if (act === "borrar") {
      if (!confirm(`¿Borrar la seña “${s.nombre}”?`)) return;
      senas.splice(i, 1); store.set("senas.propias", senas); return renderSenas();
    }
    if (!cameraOn()) return;
    busy = true;
    await countdown(3);
    const frames = await record(2000);
    busy = false;
    const score = dtwScore(toSeq(frames), toSeq(s.frames));
    overlay.textContent = `${score >= 70 ? "✅" : "❌"} ${s.nombre}: ${score}%`;
    if (score >= 70) speak(s.nombre);
  }
  $("grabarSena").onclick = async () => {
    const nombre = $("senaNombre").value.trim();
    if (!nombre) return alert("Escribe el nombre de la seña.");
    if (busy || !cameraOn()) return;
    busy = true;
    await countdown(3);
    const frames = await record(2000);
    busy = false;
    if (frames.length < 10) { overlay.textContent = "No vi bien la mano, intenta otra vez"; return; }
    senas.push({ nombre, frames: frames.map(round) });
    store.set("senas.propias", senas);
    $("senaNombre").value = "";
    overlay.textContent = `💾 Seña “${nombre}” guardada`;
    renderSenas();
  };

  // ---------- Frases ----------
  let nueva = [];
  function renderChips() {
    const items = [...Object.keys(LETRAS).map(n => ({ tipo: "letra", nombre: n })), ...senas.map(s => ({ tipo: "sena", nombre: s.nombre }))];
    $("chips").innerHTML = items.map((it, i) => `<button class="chip ${it.tipo}" data-i="${i}">${esc(it.nombre)}</button>`).join("");
    $("chips").querySelectorAll("button").forEach(b => b.onclick = () => { nueva.push(items[+b.dataset.i]); renderNueva(); });
    renderNueva(); renderFrases();
  }
  const renderNueva = () => $("fraseNueva").textContent = nueva.length ? textoDe(nueva) : "—";
  $("limpiarFrase").onclick = () => { nueva = []; renderNueva(); };
  $("guardarFrase").onclick = () => {
    if (!nueva.length) return;
    frases.push({ items: nueva }); store.set("senas.frases", frases);
    nueva = []; renderNueva(); renderFrases();
  };
  function renderFrases() {
    $("listaFrases").innerHTML = frases.map((f, i) => `
      <div class="card row item"><span class="grow strong">${esc(textoDe(f.items))}</span>
        <button data-act="practicar" data-i="${i}">Practicar</button>
        <button data-act="decir" data-i="${i}" class="secondary">🔊</button>
        <button data-act="borrar" data-i="${i}" class="secondary">🗑</button></div>`).join("");
    $("listaFrases").querySelectorAll("button").forEach(b => b.onclick = () => accionFrase(b.dataset.act, +b.dataset.i));
  }
  async function accionFrase(act, i) {
    if (busy) return;
    const f = frases[i];
    if (act === "decir") return speak(textoDe(f.items));
    if (act === "borrar") { frases.splice(i, 1); store.set("senas.frases", frases); return renderFrases(); }
    if (!cameraOn()) return;
    busy = true;
    const res = [];
    $("fraseRes").innerHTML = "";
    for (const [k, it] of f.items.entries()) {
      overlay.textContent = `Seña ${k + 1}/${f.items.length}: ${it.nombre}`;
      await sleep(1200);
      await countdown(2);
      let score = 0;
      if (it.tipo === "letra") {
        const frames = await record(1500);
        const s = frames.map(fr => letterScore(fr.s, it.nombre).score).sort((a, b) => b - a);
        score = Math.round(avg(s.slice(0, Math.max(1, Math.ceil(s.length / 2))))); // mitad mejor de la grabación
      } else {
        const sena = senas.find(s => s.nombre === it.nombre);
        const frames = await record(2000);
        score = sena ? dtwScore(toSeq(frames), toSeq(sena.frames)) : 0;
      }
      res.push({ nombre: it.nombre, score });
      overlay.textContent = `${score >= 70 ? "✅" : "❌"} ${it.nombre}: ${score}%`;
      $("fraseRes").innerHTML = res.map(r => `<div class="card row"><span class="grow">${r.score >= 70 ? "✅" : "❌"} ${esc(r.nombre)}</span><b>${r.score}%</b></div>`).join("");
    }
    busy = false;
    const pct = Math.round(avg(res.map(r => r.score)));
    $("fraseRes").insertAdjacentHTML("afterbegin", `<div class="center strong">Acierto de la frase: ${pct}%</div>`);
    overlay.textContent = `🏁 ${pct}% · ${textoDe(f.items)}`;
    speak(`${textoDe(f.items)}. Acierto ${pct} por ciento`);
  }

  // ---------- Traductor ----------
  let texto = [], buf = [], frameCount = 0, lastSign = 0, letraCand = null, letraDesde = 0, armado = true;
  const renderTexto = () => $("tTexto").textContent = textoDe(texto) || " ";
  $("tDecir").onclick = () => speak(textoDe(texto));
  $("tEspacio").onclick = () => { texto.push({ tipo: "sena", nombre: "" }); renderTexto(); };
  $("tBorrar").onclick = () => { texto.pop(); renderTexto(); };
  $("tLimpiar").onclick = () => { texto = []; renderTexto(); };
  function traductorFrame(f, now) {
    if (!f) { buf = []; letraCand = null; armado = true; overlay.textContent = "Muestra tu mano"; return; }
    buf.push(f); if (buf.length > 90) buf.shift();
    // Señas grabadas (con movimiento)
    if ($("tSenas").checked && senas.length && ++frameCount % 5 === 0 && now - lastSign > 1500) {
      let best = null;
      for (const s of senas) {
        if (buf.length < s.frames.length * 0.8) continue;
        const score = dtwScore(toSeq(buf.slice(-s.frames.length)), toSeq(s.frames));
        if (!best || score > best.score) best = { s, score };
      }
      if (best && best.score >= 75) {
        texto.push({ tipo: "sena", nombre: best.s.nombre }); renderTexto();
        speak(best.s.nombre); lastSign = now; buf = []; armado = false;
        overlay.textContent = `🤟 ${best.s.nombre} (${best.score}%)`;
        return;
      }
    }
    // Letras (mantener la forma ~1 segundo)
    if (!$("tLetras").checked || now - lastSign < 1000) return;
    let bestL = null;
    for (const L in LETRAS) {
      const { score } = letterScore(f.s, L);
      if (!bestL || score > bestL.score) bestL = { L, score };
    }
    if (bestL.score < 82) { letraCand = null; armado = true; overlay.textContent = "…"; return; }
    if (bestL.L !== letraCand) { letraCand = bestL.L; letraDesde = now; armado = true; }
    overlay.textContent = `${bestL.L} · ${bestL.score}%`;
    if (armado && now - letraDesde > 900) {
      texto.push({ tipo: "letra", nombre: bestL.L }); renderTexto();
      navigator.vibrate?.(30); armado = false;
    }
  }

  renderLecciones(); showLetra(); renderSenas(); renderTexto();

  return {
    onFrame(res, now) {
      lastFrameAt = now;
      const f = frameData(res);
      if (recorder) {
        if (f) recorder.frames.push(f);
        if (now >= recorder.end) { const r = recorder; recorder = null; r.resolve(r.frames); }
        return;
      }
      if (busy) return;
      if (panel === "aprender") aprenderFrame(f, now);
      else if (panel === "traductor") traductorFrame(f, now);
      else if (panel === "misSenas" || panel === "frases") overlay.textContent = f ? "Listo para grabar" : "Muestra tu mano";
    },
  };
}
