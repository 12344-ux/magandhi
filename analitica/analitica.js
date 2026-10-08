// ============================================================
// MAGANDHI · Analítica propia de la tienda (EM7 · Métricas M1)
// ------------------------------------------------------------
// Uso (cualquier página): <script type="module" src="/analitica/analitica.js"></script>
// · Sin Meta, sin Google, sin cookies de terceros. Envía eventos a la Edge
//   Function tienda-eventos SOLO si (1) el back-office encendió la analítica y
//   (2) la persona ACEPTÓ el aviso. Rechazar es igual de fácil que aceptar y no
//   cambia nada de la tienda.
// · Identificador: un número aleatorio guardado en este navegador (mg_vid).
//   Nunca nombre, correo ni teléfono. La URL de procedencia NO se envía: solo
//   su categoría (directo, Instagram, correo, buscador…).
// · API para la página: window.mgEvento(tipo, {slug}) y window.mgCookies()
//   (reabre el aviso para cambiar la decisión).
// Copy PROVISIONAL.
// ============================================================
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';

const FN = SUPABASE_URL + '/functions/v1/tienda-eventos';
const K_DECISION = 'mg_analitica';      // {v:'si'|'no', en:ISO}
const K_VISITANTE = 'mg_vid';
const K_SESION = 'mg_sid';              // sessionStorage: {id, ultimo}
const K_CONFIG = 'mg_analitica_cfg';    // sessionStorage: {activa, t}
const SESION_MIN = 30;
const raiz = new URL('../', import.meta.url);

const leer = (st, k) => { try { return JSON.parse(st.getItem(k) || 'null'); } catch (_) { return null; } };
const guardar = (st, k, v) => { try { st.setItem(k, JSON.stringify(v)); } catch (_) {} };
const azar = (n) => { const b = crypto.getRandomValues(new Uint8Array(n)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };

async function llamar(cuerpo, keepalive) {
  return fetch(FN, {
    method: 'POST', keepalive: !!keepalive,
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(cuerpo)
  });
}

async function configActiva() {
  const c = leer(sessionStorage, K_CONFIG);
  if (c && Date.now() - c.t < 10 * 60 * 1000) return c.activa;
  try {
    const r = await llamar({ modo: 'config' });
    const j = await r.json();
    guardar(sessionStorage, K_CONFIG, { activa: !!j.activa, t: Date.now() });
    return !!j.activa;
  } catch (_) { return false; }
}

// ---------------- Clasificación (sin enviar URLs) ----------------
function dispositivo() {
  const w = Math.min(window.innerWidth || 0, screen.width || 9999);
  const tactil = matchMedia('(pointer: coarse)').matches;
  return w < 768 ? 'movil' : (tactil && w < 1200 ? 'tablet' : 'pc');
}
function origen(params) {
  const fuente = (params.get('utm_source') || '').toLowerCase();
  if (fuente === 'email') return 'email';
  if (/instagram|^ig$/.test(fuente)) return 'instagram';
  if (/facebook|^fb$/.test(fuente)) return 'facebook';
  if (/whatsapp|^wa$/.test(fuente)) return 'whatsapp';
  let h = '';
  try { h = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''; } catch (_) {}
  if (!h) return 'directo';
  if (h === location.hostname || h.endsWith('.' + location.hostname.replace(/^www\./, ''))) return null; // navegación interna
  if (/(^|\.)instagram\.com$|^l\.instagram\.com$/.test(h)) return 'instagram';
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(h)) return 'facebook';
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(h)) return 'whatsapp';
  if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$/.test(h)) return 'buscador';
  return 'otro_sitio';
}
function ruta() {
  let p = location.pathname.replace(/index\.html$/, '');
  const base = raiz.pathname;                       // soporta sitios bajo subcarpeta
  if (base !== '/' && p.startsWith(base)) p = '/' + p.slice(base.length);
  return (p || '/').slice(0, 120);
}

// ---------------- Envío por lotes ----------------
let cola = [], temporizador = null, visitante = null, sesion = null, apagada = false;

function sesionActual() {
  const s = leer(sessionStorage, K_SESION);
  const ahora = Date.now();
  if (s && ahora - s.ultimo < SESION_MIN * 60 * 1000) { s.ultimo = ahora; guardar(sessionStorage, K_SESION, s); return { id: s.id, nueva: false }; }
  const n = { id: azar(12), ultimo: ahora };
  guardar(sessionStorage, K_SESION, n);
  return { id: n.id, nueva: true };
}

function encolar(tipo, extra) {
  if (apagada || !visitante) return;
  const slug = extra && extra.slug && /^[a-z0-9-]{1,120}$/.test(extra.slug) ? extra.slug : undefined;
  cola.push(Object.assign({ tipo, ruta: ruta(), dispositivo: dispositivo(), cuando: new Date().toISOString() }, extra || {}, { slug }));
  if (cola.length >= 30) enviar(false); else { clearTimeout(temporizador); temporizador = setTimeout(() => enviar(false), 1500); }
}

async function enviar(alSalir) {
  clearTimeout(temporizador);
  if (!cola.length || apagada) return;
  const lote = cola.splice(0, 30);
  try {
    const r = await llamar({ modo: 'registrar', visitante, sesion, eventos: lote }, alSalir);
    if (r.status === 409) { apagada = true; guardar(sessionStorage, K_CONFIG, { activa: false, t: Date.now() }); }
  } catch (_) { /* sin conexión: se pierde el lote, no se reintenta en bucle */ }
}

function iniciar() {
  if (visitante) return;
  visitante = localStorage.getItem(K_VISITANTE);
  if (!visitante || !/^[A-Za-z0-9_-]{16,40}$/.test(visitante)) { visitante = azar(16); try { localStorage.setItem(K_VISITANTE, visitante); } catch (_) {} }
  const s = sesionActual(); sesion = s.id;
  const params = new URLSearchParams(location.search);
  const utm = (params.get('utm_campaign') || '').toLowerCase();
  const utmOk = /^[a-z0-9-]{1,60}$/.test(utm) ? utm : undefined;
  const org = origen(params);
  const entrada = s.nueva || (org !== null && org !== 'directo');
  encolar('pagina_vista', { origen: entrada ? (org || 'directo') : undefined, entrada, utm_campaign: utmOk });
  if (/^\/producto\/?$/.test(ruta())) encolar('producto_visto', { slug: (params.get('slug') || '').trim().toLowerCase() });
  if (utmOk && (params.get('utm_source') || '').toLowerCase() === 'email') encolar('llegada_campana', { utm_campaign: utmOk, origen: 'email' });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(true); });
  window.addEventListener('pagehide', () => enviar(true));
}

// API para las páginas: eventos de negocio (clic en Comprar, inicio del pago).
window.mgEvento = (tipo, extra) => { encolar(tipo, extra); if (tipo === 'checkout_iniciado') enviar(true); };

// ---------------- Aviso ----------------
function aviso() {
  if (document.getElementById('mg-aviso-analitica')) return;
  if (!document.querySelector('link[data-an-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('analitica/analitica.css?v=1', raiz).href; l.dataset.anCss = '1';
    document.head.appendChild(l);
  }
  const d = document.createElement('div');
  d.id = 'mg-aviso-analitica'; d.className = 'an-aviso'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Preferencias de analítica');
  d.innerHTML =
    '<p class="an-tit">Tú decides</p>' +
    '<p class="an-txt">Usamos una analítica propia, sin Meta ni Google, para saber qué productos interesan y mejorar la tienda. No usamos tu nombre ni tu correo. ' +
      '<a href="' + new URL('politicas/cookies/', raiz).href + '">Política de cookies</a></p>' +
    '<div class="an-acc"><button type="button" class="an-btn an-no">Rechazar</button><button type="button" class="an-btn an-si">Aceptar</button></div>';
  document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add('visible'));
  const decidir = (v) => {
    guardar(localStorage, K_DECISION, { v, en: new Date().toISOString() });
    d.classList.remove('visible'); setTimeout(() => d.remove(), 250);
    if (v === 'si') iniciar();
    else { visitante = null; cola = []; try { localStorage.removeItem(K_VISITANTE); } catch (_) {} }
  };
  d.querySelector('.an-si').addEventListener('click', () => decidir('si'));
  d.querySelector('.an-no').addEventListener('click', () => decidir('no'));
}
window.mgCookies = async () => { if (await configActiva()) aviso(); };

(async () => {
  if (!(await configActiva())) return;          // apagada: ni aviso ni eventos
  const dec = leer(localStorage, K_DECISION);
  if (dec && dec.v === 'si') iniciar();
  else if (!dec) aviso();
})();
