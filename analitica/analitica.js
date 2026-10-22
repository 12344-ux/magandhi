// ============================================================
// MAGANDHI · Analítica propia de la tienda (EM7 · Métricas M1)
// ------------------------------------------------------------
// Uso (cualquier página): <script type="module" src="/analitica/analitica.js"></script>
// · Sin Meta, sin Google, sin cookies de terceros. Envía eventos a la Edge
//   Function tienda-eventos SOLO si (1) el back-office encendió la analítica y
//   (2) la persona ACEPTÓ la versión vigente de la política. Rechazar es igual
//   de fácil que aceptar y no cambia nada de la tienda.
// · Identificador: un número aleatorio guardado en este navegador (mg_vid).
//   Nunca nombre, correo ni teléfono. La URL de procedencia NO se envía: solo
//   su categoría (directo, Instagram, correo, buscador…).
// · API para la página: window.mgEvento(tipo, {slug}) y window.mgCookies()
//   (reabre el aviso para cambiar la decisión).
// ============================================================
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase-config.js';

const FN = SUPABASE_URL + '/functions/v1/tienda-eventos';
const K_DECISION = 'mg_analitica';      // {v:'si'|'no', en:ISO, politica_version}
const K_VISITANTE = 'mg_vid';
const K_SESION = 'mg_sid';              // sessionStorage: {id, ultimo}
const K_CONFIG = 'mg_analitica_cfg';    // sessionStorage: {activa, politica_version, t}
const K_UTM = 'mg_utm';                 // sessionStorage: campaña de llegada de ESTA visita
const SESION_MIN = 30;
const raiz = new URL('../', import.meta.url);
const TIPOS_EVENTO = new Set([
  'pagina_vista', 'producto_visto', 'llegada_campana',
  'clic_comprar', 'checkout_iniciado',
  'recomendacion_impresion', 'recomendacion_click', 'busqueda_resultados',
]);
const TIPOS_SN1 = new Set(['recomendacion_impresion', 'recomendacion_click', 'busqueda_resultados']);
const SUPERFICIES_SN1 = new Set([
  'home_principal', 'home_descubrimiento', 'categoria',
  'producto_final', 'carrito', 'busqueda',
]);
const RAZONES_SN1 = new Set([
  'coincidencia_nombre', 'coincidencia_categoria', 'coincidencia_contenido',
  'coincidencia_busqueda', 'afinidad_cuenta', 'misma_categoria', 'complemento',
  'alternativa', 'continuacion', 'rutina', 'popular', 'novedad',
  'descubrimiento', 'exploracion',
]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLOT_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const LAYOUT_RE = /^[a-z0-9][a-z0-9_-]{2,79}$/;
const MODELO_RE = /^[a-z0-9][a-z0-9._-]{0,59}$/;
const HASH_RE = /^[a-f0-9]{64}$/;

const leer = (st, k) => { try { return JSON.parse(st.getItem(k) || 'null'); } catch (_) { return null; } };
const guardar = (st, k, v) => { try { st.setItem(k, JSON.stringify(v)); } catch (_) {} };
const azar = (n) => {
  const b = new Uint8Array(n);
  try {
    if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(b);
    else b.forEach((_, indice) => { b[indice] = Math.floor(Math.random() * 256); });
  } catch (_) {
    b.forEach((_, indice) => { b[indice] = Math.floor(Math.random() * 256); });
  }
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

function politicaVersion(valor) {
  if (typeof valor !== 'string' || valor.trim() !== valor) return '';
  const longitud = Array.from(valor).length;
  if (longitud < 1 || longitud > 40 || valor.toLowerCase() === 'pendiente') return '';
  return valor;
}

async function llamar(cuerpo, keepalive, signal) {
  return fetch(FN, {
    method: 'POST', keepalive: !!keepalive, signal,
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify(cuerpo)
  });
}

let configuracionPromesa = null;

// La configuración persistida nunca autoriza por sí sola: la versión activa se
// confirma con la Edge en cada carga. La promesa solo une consultas concurrentes.
async function configuracionActual() {
  if (configuracionPromesa) return configuracionPromesa;
  const tarea = (async () => {
    try {
      const r = await llamar({ modo: 'config' });
      if (!r.ok) throw new Error('No se pudo consultar la configuración de analítica.');
      const j = await r.json();
      const activa = j?.activa === true;
      const version = politicaVersion(j?.politica_version);
      if (activa && !version) throw new Error('La política activa no tiene una versión válida.');
      const configuracion = {
        activa,
        politica_version: activa ? version : '',
        verificada: true,
        t: Date.now(),
      };
      guardar(sessionStorage, K_CONFIG, {
        activa: configuracion.activa,
        politica_version: configuracion.politica_version,
        t: configuracion.t,
      });
      return configuracion;
    } catch (_) {
      return { activa: false, politica_version: '', verificada: false, t: Date.now() };
    }
  })();
  configuracionPromesa = tarea;
  try {
    return await tarea;
  } finally {
    if (configuracionPromesa === tarea) configuracionPromesa = null;
  }
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
function slugProducto(params) {
  const query = (params.get('slug') || '').trim().toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(query)) return query;
  const dataset = (document.body && document.body.dataset.productoSlug || '').trim().toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dataset)) return dataset;
  const match = ruta().match(/^\/producto\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/);
  return match ? match[1] : '';
}

// ---------------- Envío por lotes ----------------
let cola = [], temporizador = null, visitante = null, sesion = null, apagada = true;
let pendientesAceptados = [];
let configuracionVerificada = false;
let politicaVersionActiva = '';
let generacionConsentimiento = 0;
let escuchasSalidaInstaladas = false;
let envioEnCurso = null;
let envioAlSalirPendiente = false;
const enviosActivos = new Set();

function decisionActual() {
  const decision = leer(localStorage, K_DECISION);
  if (!decision || (decision.v !== 'si' && decision.v !== 'no')) return null;
  const version = politicaVersion(decision.politica_version);
  return version ? { ...decision, politica_version: version } : decision;
}

function consentimientoVigente(decision = decisionActual()) {
  return configuracionVerificada && !apagada && !!politicaVersionActiva &&
    decision?.v === 'si' && decision.politica_version === politicaVersionActiva;
}

function detenerAnalitica({ eliminarIdentificadores = false } = {}) {
  clearTimeout(temporizador);
  temporizador = null;
  cola = [];
  pendientesAceptados = [];
  visitante = null;
  sesion = null;
  generacionConsentimiento += 1;
  envioEnCurso = null;
  envioAlSalirPendiente = false;
  enviosActivos.forEach((controlador) => controlador.abort());
  enviosActivos.clear();
  if (!eliminarIdentificadores) return;
  try { localStorage.removeItem(K_VISITANTE); } catch (_) {}
  try { sessionStorage.removeItem(K_SESION); } catch (_) {}
}

function aplicarConfiguracion(configuracion) {
  configuracionVerificada = configuracion?.verificada === true;
  politicaVersionActiva = configuracionVerificada && configuracion.activa === true
    ? politicaVersion(configuracion.politica_version)
    : '';
  apagada = !configuracionVerificada || configuracion.activa !== true || !politicaVersionActiva;
}

function sesionActual() {
  const s = leer(sessionStorage, K_SESION);
  const ahora = Date.now();
  if (s && ahora - s.ultimo < SESION_MIN * 60 * 1000) { s.ultimo = ahora; guardar(sessionStorage, K_SESION, s); return { id: s.id, nueva: false }; }
  const n = { id: azar(12), ultimo: ahora };
  guardar(sessionStorage, K_SESION, n);
  return { id: n.id, nueva: true };
}

function cadenaEvento(valor, maximo, formato) {
  if (typeof valor !== 'string') return undefined;
  const limpia = valor.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, maximo);
  return limpia && (!formato || formato.test(limpia)) ? limpia : undefined;
}

function cadenaEstricta(valor, maximo, formato) {
  if (typeof valor !== 'string') return undefined;
  const limpia = valor.normalize('NFKC').replace(/\s+/g, ' ').trim();
  return limpia && limpia.length <= maximo && (!formato || formato.test(limpia))
    ? limpia
    : undefined;
}

function extraSeguro(tipo, extra) {
  const origenExtra = extra && typeof extra === 'object' && !Array.isArray(extra) ? extra : {};

  if (TIPOS_SN1.has(tipo)) {
    const requestId = cadenaEstricta(origenExtra.request_id, 36, UUID_RE)?.toLowerCase();
    const superficie = cadenaEstricta(origenExtra.superficie, 64);
    const modelo = cadenaEstricta(origenExtra.modelo_version, 60, MODELO_RE);
    if (!requestId || !SUPERFICIES_SN1.has(superficie) || !modelo) return null;

    const salida = {
      request_id: requestId,
      superficie,
      modelo_version: modelo,
    };
    if (tipo === 'busqueda_resultados') {
      const cantidad = origenExtra.cantidad_resultados;
      if (superficie !== 'busqueda' || !Number.isSafeInteger(cantidad) ||
          cantidad < 0 || cantidad > 10000) return null;
      salida.cantidad_resultados = cantidad;
      if (Object.prototype.hasOwnProperty.call(origenExtra, 'consulta_hash')) {
        const hash = cadenaEstricta(origenExtra.consulta_hash, 64, HASH_RE);
        if (!hash) return null;
        salida.consulta_hash = hash;
      }
      return salida;
    }

    const slug = cadenaEstricta(origenExtra.slug, 180, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const slot = cadenaEstricta(origenExtra.slot, 80, SLOT_RE);
    const posicion = origenExtra.posicion;
    const layout = cadenaEstricta(origenExtra.layout_codigo, 80, LAYOUT_RE);
    const razon = cadenaEstricta(origenExtra.razon, 40);
    if (!slug || !slot || !Number.isSafeInteger(posicion) || posicion < 1 || posicion > 100 ||
        !layout || !razon || !RAZONES_SN1.has(razon)) return null;
    salida.slug = slug;
    salida.slot = slot;
    salida.posicion = posicion;
    salida.layout_codigo = layout;
    salida.razon = razon;
    return salida;
  }

  const salida = {};
  const slug = cadenaEvento(origenExtra.slug, 120, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  if (slug) salida.slug = slug;
  if (tipo === 'pagina_vista' || tipo === 'llegada_campana') {
    const org = cadenaEvento(origenExtra.origen, 24, /^(?:directo|instagram|facebook|whatsapp|buscador|email|otro_sitio)$/);
    const utm = cadenaEvento(origenExtra.utm_campaign, 60, /^[a-z0-9-]+$/);
    if (org) salida.origen = org;
    if (utm) salida.utm_campaign = utm;
    if (tipo === 'pagina_vista') salida.entrada = origenExtra.entrada === true;
  }
  return salida;
}

function encolar(tipo, extra) {
  if (!consentimientoVigente() || !visitante || !TIPOS_EVENTO.has(tipo)) return false;
  const extraLimpio = extraSeguro(tipo, extra);
  if (!extraLimpio) return false;
  cola.push({
    tipo,
    ruta: ruta(),
    dispositivo: dispositivo(),
    cuando: new Date().toISOString(),
    ...extraLimpio,
  });
  if (cola.length >= 30) enviar(false); else { clearTimeout(temporizador); temporizador = setTimeout(() => enviar(false), 1500); }
  return true;
}

async function manejarRechazoRegistro(respuesta, versionEnviada) {
  let cuerpo = null;
  try { cuerpo = await respuesta.clone().json(); } catch (_) { /* El cuerpo es opcional. */ }

  const configuracion = await configuracionActual();
  aplicarConfiguracion(configuracion);
  const versionNueva = configuracionVerificada && !apagada
    ? politicaVersionActiva
    : politicaVersion(cuerpo?.politica_version);
  const cambioVigente = respuesta.status === 412 && configuracionVerificada && !apagada &&
    !!versionNueva && versionNueva !== versionEnviada;

  detenerAnalitica({ eliminarIdentificadores: cambioVigente });
  if (cambioVigente) aviso(versionNueva, { actualizacion: true });
}

async function enviar(alSalir) {
  clearTimeout(temporizador);
  temporizador = null;
  if (alSalir) envioAlSalirPendiente = true;
  if (envioEnCurso) return envioEnCurso;
  if (!cola.length || !consentimientoVigente() || !visitante || !sesion) {
    if (!consentimientoVigente()) {
      detenerAnalitica({ eliminarIdentificadores: configuracionVerificada && !apagada });
    }
    envioAlSalirPendiente = false;
    return;
  }

  const ciclo = (async () => {
    while (cola.length && consentimientoVigente() && visitante && sesion) {
      const versionEnviada = politicaVersionActiva;
      const visitanteEnviado = visitante;
      const sesionEnviada = sesion;
      const generacion = generacionConsentimiento;
      const lote = cola.splice(0, 30);
      const mantenerAlSalir = envioAlSalirPendiente;
      envioAlSalirPendiente = false;
      const controlador = new AbortController();
      enviosActivos.add(controlador);
      try {
        const r = await llamar({
          modo: 'registrar',
          visitante: visitanteEnviado,
          sesion: sesionEnviada,
          politica_version: versionEnviada,
          eventos: lote,
        }, mantenerAlSalir, controlador.signal);
        if (generacion !== generacionConsentimiento) return;
        if (r.status === 409 || r.status === 412) {
          await manejarRechazoRegistro(r, versionEnviada);
          return;
        }
        if (!r.ok) {
          cola = [];
          return;
        }
      } catch (_) {
        // Sin acuse del lote anterior no se adelanta otro que pueda contener
        // su clic asociado; se conserva el comportamiento sin reintentos.
        cola = [];
        return;
      } finally {
        enviosActivos.delete(controlador);
      }
      if (generacion !== generacionConsentimiento) return;
    }
  })();
  envioEnCurso = ciclo;
  try {
    await ciclo;
  } finally {
    if (envioEnCurso === ciclo) envioEnCurso = null;
    if (!cola.length) envioAlSalirPendiente = false;
  }
}

function iniciar() {
  if (!consentimientoVigente() || visitante) return;
  visitante = localStorage.getItem(K_VISITANTE);
  if (!visitante || !/^[A-Za-z0-9_-]{16,40}$/.test(visitante)) { visitante = azar(16); try { localStorage.setItem(K_VISITANTE, visitante); } catch (_) {} }
  const s = sesionActual(); sesion = s.id;
  const params = new URLSearchParams(window.__mgBusquedaInicial || location.search);
  const utm = (params.get('utm_campaign') || '').toLowerCase();
  const utmOk = /^[a-z0-9-]{1,60}$/.test(utm) ? utm : undefined;
  // Se recuerda la campaña de llegada durante la visita para que la COMPRA
  // pueda atribuirse con exactitud aunque ocurra dos páginas después.
  if (utmOk) { try { sessionStorage.setItem(K_UTM, utmOk); } catch (_) {} }
  const org = origen(params);
  const entrada = s.nueva || (org !== null && org !== 'directo');
  encolar('pagina_vista', { origen: entrada ? (org || 'directo') : undefined, entrada, utm_campaign: utmOk });
  const productoSlug = slugProducto(params);
  if (productoSlug && /^\/producto\/(?:[a-z0-9-]+\/?)?$/.test(ruta())) {
    encolar('producto_visto', { slug: productoSlug });
  }
  if (utmOk && (params.get('utm_source') || '').toLowerCase() === 'email') encolar('llegada_campana', { utm_campaign: utmOk, origen: 'email' });
  const pendientes = pendientesAceptados.splice(0, pendientesAceptados.length);
  pendientes.forEach((evento) => encolar(evento.tipo, evento.extra));
  if (!escuchasSalidaInstaladas) {
    escuchasSalidaInstaladas = true;
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') enviar(true); });
    window.addEventListener('pagehide', () => enviar(true));
  }
}

// API para las páginas: solo eventos conocidos y campos públicos acotados.
// Los eventos SN1 que ocurran mientras se crea el identificador se conservan
// únicamente con una aceptación que coincida con la versión verificada.
window.mgEvento = (tipo, extra) => {
  if (!TIPOS_EVENTO.has(tipo) || !consentimientoVigente()) return false;
  if (!visitante && TIPOS_SN1.has(tipo)) {
    const extraLimpio = extraSeguro(tipo, extra);
    if (extraLimpio && pendientesAceptados.length < 60) {
      pendientesAceptados.push({ tipo, extra: extraLimpio });
      return true;
    }
    return false;
  }
  const encolado = encolar(tipo, extra);
  if (encolado && tipo === 'checkout_iniciado') enviar(true);
  return encolado;
};

window.addEventListener('magandhi:analitica-interna', (evento) => {
  const detalle = evento.detail;
  if (!detalle || typeof detalle !== 'object' || !TIPOS_SN1.has(detalle.tipo)) return;
  const aceptado = window.mgEvento(detalle.tipo, detalle.extra) === true;
  try { detalle.aceptado = aceptado; } catch (_) { /* Un productor externo puede congelar detail. */ }
});

// ---------------- Aviso ----------------
function escaparHtml(valor) {
  return String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function aviso(version, { actualizacion = false } = {}) {
  const versionVigente = politicaVersion(version);
  if (!versionVigente || !configuracionVerificada || apagada || versionVigente !== politicaVersionActiva) return;
  const existente = document.getElementById('mg-aviso-analitica');
  if (existente?.dataset.politicaVersion === versionVigente) return;
  existente?.remove();
  if (!document.querySelector('link[data-an-css]')) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('analitica/analitica.css?v=1', raiz).href; l.dataset.anCss = '1';
    document.head.appendChild(l);
  }
  const d = document.createElement('div');
  d.id = 'mg-aviso-analitica'; d.className = 'an-aviso'; d.dataset.politicaVersion = versionVigente;
  d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Preferencias de analítica');
  d.innerHTML =
    '<p class="an-tit">' + (actualizacion ? 'Actualizamos nuestra política' : 'Tú decides') + '</p>' +
    '<p class="an-txt">Nuestra analítica propia y opcional mide páginas vistas, productos, resultados de búsqueda y recomendaciones que ves o eliges para mejorar la tienda. No usa Meta ni Google, ni tu nombre, correo o teléfono. Rechazar no afecta tu compra. ' +
      '<a href="' + new URL('politicas/cookies/', raiz).href + '">Política de cookies</a> · versión ' + escaparHtml(versionVigente) + '</p>' +
    '<div class="an-acc"><button type="button" class="an-btn an-no">Rechazar</button><button type="button" class="an-btn an-si">Aceptar</button></div>';
  document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add('visible'));
  const decidir = (v) => {
    if (versionVigente !== politicaVersionActiva || !configuracionVerificada || apagada) {
      d.remove();
      return;
    }
    if (v === 'no') detenerAnalitica({ eliminarIdentificadores: true });
    guardar(localStorage, K_DECISION, {
      v,
      en: new Date().toISOString(),
      politica_version: versionVigente,
    });
    d.classList.remove('visible'); setTimeout(() => d.remove(), 250);
    if (v === 'si') iniciar();
  };
  d.querySelector('.an-si').addEventListener('click', () => decidir('si'));
  d.querySelector('.an-no').addEventListener('click', () => decidir('no'));
}

window.mgCookies = async () => {
  const configuracion = await configuracionActual();
  aplicarConfiguracion(configuracion);
  if (apagada) {
    detenerAnalitica();
    return;
  }
  const decision = decisionActual();
  const actualizacion = !!decision && decision.politica_version !== politicaVersionActiva;
  if (!decision || actualizacion) detenerAnalitica({ eliminarIdentificadores: true });
  aviso(politicaVersionActiva, { actualizacion });
};

(async () => {
  const configuracion = await configuracionActual();
  aplicarConfiguracion(configuracion);
  if (apagada) {
    detenerAnalitica();
    return;
  }
  const decision = decisionActual();
  const decisionVersionada = decision && decision.politica_version === politicaVersionActiva;
  if (decisionVersionada && decision.v === 'si') {
    iniciar();
    return;
  }
  detenerAnalitica({ eliminarIdentificadores: true });
  if (decisionVersionada && decision.v === 'no') return;
  aviso(politicaVersionActiva, { actualizacion: !!decision });
})();


// ---------------------------------------------------------------------------
// window.mgProcedencia() · de dónde viene esta compra
// ---------------------------------------------------------------------------
// La usa la página de producto al iniciar el pago. `utm_campaign` conserva
// compatibilidad descriptiva con Email Marketing; la atribución exacta futura
// pertenece al código propio P4. `mg_vid` permite medir el embudo consentido.
//
// DOS NIVELES, a propósito:
//   · utm_campaign  = etiqueta descriptiva de una campaña propia tomada de la
//     URL. No identifica a nadie, pero el navegador puede copiarla o alterarla:
//     P0 la clasifica como legacy_email_utm, no verificada y no exacta.
//   · mg_vid        = el identificador aleatorio del navegador. SOLO existe si
//     la persona ACEPTÓ la versión activa. Si la rechazó, aquí no hay nada y la
//     compra no lleva identificador: no se crea uno para la ocasión.
// ---------------------------------------------------------------------------
window.mgProcedencia = function () {
  const salida = {};
  try {
    const params = new URLSearchParams(location.search);
    const dela = (params.get('utm_campaign') || '').toLowerCase();
    const guardada = sessionStorage.getItem(K_UTM) || '';
    const utm = /^[a-z0-9-]{1,60}$/.test(dela) ? dela
      : (/^[a-z0-9-]{1,60}$/.test(guardada) ? guardada : '');
    if (utm) salida.utm_campaign = utm;
  } catch (_) { /* sin sessionStorage: se sigue sin utm */ }
  if (!consentimientoVigente()) return salida;
  try {
    // Solo con aceptación vigente: este identificador no se crea aquí nunca.
    const vid = localStorage.getItem(K_VISITANTE) || '';
    if (/^[A-Za-z0-9_-]{16,40}$/.test(vid)) salida.mg_vid = vid;
  } catch (_) { /* sin localStorage: se sigue sin identificador */ }
  return salida;
};
