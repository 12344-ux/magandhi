import '../scripts/atribucion-promocional.js?v=1';

const CLAVE_HISTORIAL = '__magandhiPoliticas';
const RUTA_CENTRO = '/politicas/';
const RUTAS = new Set([
  RUTA_CENTRO,
  '/politicas/datos/',
  '/politicas/cookies/',
  '/politicas/terminos/',
  '/politicas/envios/',
  '/politicas/devoluciones/',
]);

let peticionActual = null;
let secuencia = 0;
const estadoVivo = document.createElement('p');
estadoVivo.className = 'pol-live';
estadoVivo.setAttribute('role', 'status');
estadoVivo.setAttribute('aria-live', 'polite');
estadoVivo.setAttribute('aria-atomic', 'true');
document.body.appendChild(estadoVivo);

function pathnameCanonico(valor) {
  const limpio = valor.replace(/\/index\.html$/, '/');
  return limpio.endsWith('/') ? limpio : `${limpio}/`;
}

function urlPolitica(valor) {
  let url;
  try { url = valor instanceof URL ? valor : new URL(valor, window.location.href); } catch { return null; }
  if (url.origin !== window.location.origin || !RUTAS.has(pathnameCanonico(url.pathname))) return null;
  return url;
}

function estadoFusionado(ruta, desdeHub) {
  const base = history.state && typeof history.state === 'object' && !Array.isArray(history.state)
    ? history.state
    : {};
  return {
    ...base,
    [CLAVE_HISTORIAL]: {
      ruta,
      desdeHub: desdeHub === true,
    },
  };
}

function actualizarHistoria(url, modo, desdeHub) {
  if (modo === 'ninguno') return true;
  const destino = `${url.pathname}${url.search}${url.hash}`;
  try {
    if (modo === 'reemplazar') history.replaceState(estadoFusionado(url.pathname, desdeHub), '', destino);
    else history.pushState(estadoFusionado(url.pathname, desdeHub), '', destino);
    return true;
  } catch {
    return false;
  }
}

function actualizarMetadatos(documento) {
  const titulo = documento.querySelector('title')?.textContent?.trim();
  const descripcion = documento.querySelector('meta[name="description"]')?.content;
  if (titulo) document.title = titulo;
  if (descripcion) {
    const actual = document.querySelector('meta[name="description"]');
    if (actual) actual.content = descripcion;
  }
}

function activarTransicion() {
  document.body.classList.remove('pol-app--transition');
  void document.body.offsetWidth;
  document.body.classList.add('pol-app--transition');
  window.setTimeout(() => document.body.classList.remove('pol-app--transition'), 280);
}

function enfocarDocumento(url, anunciar = true) {
  const lector = document.querySelector('.pol-doc');
  if (!lector) return;
  lector.scrollTop = 0;
  let destino = null;
  if (url.hash && !url.hash.startsWith('#mg_promo=')) {
    try { destino = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch { destino = null; }
  }
  requestAnimationFrame(() => {
    if (destino) destino.scrollIntoView({ block: 'start' });
    const titulo = lector.querySelector('h1');
    if (titulo) {
      titulo.tabIndex = -1;
      try { titulo.focus({ preventScroll: !!destino }); } catch { titulo.focus(); }
    }
    if (anunciar && titulo) estadoVivo.textContent = `${titulo.textContent.trim()} cargada.`;
  });
}

function aplicarDocumento(documento, url, { modo, desdeHub, anunciar }) {
  const lectorNuevo = documento.querySelector('.pol-doc');
  const navNueva = documento.querySelector('.pol-nav');
  const cuerpoNuevo = documento.body;
  const lectorActual = document.querySelector('.pol-doc');
  const navActual = document.querySelector('.pol-nav');
  if (!lectorNuevo || !navNueva || !cuerpoNuevo || !lectorActual || !navActual) return false;

  const esIndice = cuerpoNuevo.classList.contains('pol-app--indice');
  document.body.classList.toggle('pol-app--indice', esIndice);
  document.body.classList.toggle('pol-app--documento', !esIndice);
  document.body.dataset.polDoc = cuerpoNuevo.dataset.polDoc || (esIndice ? 'indice' : 'documento');
  navActual.replaceWith(document.importNode(navNueva, true));
  lectorActual.replaceWith(document.importNode(lectorNuevo, true));
  actualizarMetadatos(documento);

  if (!actualizarHistoria(url, modo, desdeHub)) return false;
  activarTransicion();
  enfocarDocumento(url, anunciar);
  return true;
}

async function obtenerDocumento(url, token) {
  peticionActual?.abort();
  const control = new AbortController();
  peticionActual = control;
  const lector = document.querySelector('.pol-doc');
  lector?.setAttribute('aria-busy', 'true');
  estadoVivo.textContent = 'Cargando documento…';
  try {
    const respuesta = await fetch(url.href, {
      signal: control.signal,
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });
    if (!respuesta.ok) throw new Error('POL_HTTP');
    const html = await respuesta.text();
    if (token !== secuencia) return null;
    const documento = new DOMParser().parseFromString(html, 'text/html');
    if (!documento.querySelector('.pol-doc') || !documento.querySelector('.pol-nav') ||
        documento.querySelector('meta[name="politica-version"]')?.content !== 'borrador-0') {
      throw new Error('POL_DOCUMENTO_INVALIDO');
    }
    return documento;
  } finally {
    if (token === secuencia) {
      peticionActual = null;
      document.querySelector('.pol-doc')?.removeAttribute('aria-busy');
    }
  }
}

async function navegar(url, { modo = 'agregar', desdeHub = false, anunciar = true } = {}) {
  const politica = urlPolitica(url);
  if (!politica) {
    window.location.assign(url.href || String(url));
    return;
  }
  const token = ++secuencia;
  try {
    const documento = await obtenerDocumento(politica, token);
    if (!documento || token !== secuencia) return;
    if (!aplicarDocumento(documento, politica, { modo, desdeHub, anunciar })) {
      window.location.assign(politica.href);
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    window.location.assign(politica.href);
  }
}

function clicNavegacion(evento) {
  if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
  const enlace = evento.target.closest('a[href]');
  if (!enlace || enlace.target || enlace.hasAttribute('download')) return;
  const url = urlPolitica(enlace.href);
  if (!url) return;
  const actual = pathnameCanonico(window.location.pathname);
  if (pathnameCanonico(url.pathname) === actual) return;
  evento.preventDefault();
  const desdeHub = document.body.classList.contains('pol-app--indice');
  void navegar(url, { modo: 'agregar', desdeHub });
}

function volverAlCentro(evento) {
  evento.preventDefault();
  const estado = history.state?.[CLAVE_HISTORIAL];
  if (estado?.desdeHub === true) {
    history.back();
    return;
  }
  void navegar(new URL(RUTA_CENTRO, window.location.origin), {
    modo: 'reemplazar',
    desdeHub: false,
  });
}

function inicializarHistoria() {
  const actual = urlPolitica(window.location.href);
  if (!actual) return;
  try {
    history.replaceState(estadoFusionado(actual.pathname, false), '', `${actual.pathname}${actual.search}${actual.hash}`);
  } catch { /* La navegación tradicional continúa disponible. */ }
}

inicializarHistoria();
document.addEventListener('click', clicNavegacion);
document.querySelector('[data-pol-back]')?.addEventListener('click', volverAlCentro);
window.addEventListener('popstate', () => {
  const actual = urlPolitica(window.location.href);
  if (actual) void navegar(actual, { modo: 'ninguno', anunciar: true });
});
