import '../scripts/atribucion-promocional.js?v=1';
import { configurarBuscadores } from './motor-tienda.js?v=3';
import { observarSesionCliente } from '../cliente/cliente-sesion.js';
import { listarCarrito } from '../carrito/carrito-core.js?v=3';
import { crearControlMisCompras } from './mis-compras.js?v=5';
import { crearControlFavoritos } from './mis-favoritos.js?v=1';
import { supabase } from '../supabase-config.js';

const slots = [...document.querySelectorAll('[data-cuenta-carrito]')];
const observadores = new Set();
let generacion = 0;
let uidActual = null;
let sesionActual = Object.freeze({ estado: 'comprobando', uid: null, sesion: null, codigo: '' });
let estado = Object.freeze({ visible: false, uid: null, snapshot: null, error: false });
let centro = null;
let botonQueAbrio = null;
let rutasCentro = null;
const DESTINO_COMPRAS = '/carrito/?cuenta=compras';
const CLAVE_DESTINO_CUENTA = 'mg_destino_cuenta';
const CLAVE_HISTORIAL_CUENTA = '__magandhiCuenta';
const mediaCuentaMovil = window.matchMedia('(max-width: 520px)');
let abrirComprasPorDeepLink = false;
let pantallaCentro = 'compras';
let secuenciaHistorialCentro = 0;
let historialCentro = { instancia: '', profundidad: 0 };
let omitirSiguientePopstate = false;

try {
  const url = new URL(window.location.href);
  if (url.searchParams.get('cuenta') === 'compras') {
    abrirComprasPorDeepLink = true;
    let persistido = false;
    try {
      sessionStorage.setItem(CLAVE_DESTINO_CUENTA, DESTINO_COMPRAS);
      persistido = true;
    } catch { /* Si storage falla, la URL conserva el destino. */ }
    if (persistido) {
      url.searchParams.delete('cuenta');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }
  } else {
    try { abrirComprasPorDeepLink = sessionStorage.getItem(CLAVE_DESTINO_CUENTA) === DESTINO_COMPRAS; } catch { /* Sin memoria, no se inventa destino. */ }
  }
} catch { /* El centro sigue disponible aunque la URL no pueda normalizarse. */ }

const ICONO_CARRITO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
const ICONO_CUENTA_MENU = '<svg class="cc-menu-icon" viewBox="0 0 48 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 6h12M2 12h12M2 18h12"/><circle cx="34" cy="7.5" r="4.5"/><path d="M25 22c.7-5 4-7.5 9-7.5S42.3 17 43 22"/></svg>';
const ICONO_ATRAS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>';
const ICONO_CERRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

const ICONOS_VISTA = {
  compras: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/></svg>',
  favoritos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  opiniones: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="m12 7 1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.1-2.2 1.1.4-2.4-1.7-1.7 2.4-.3z"/></svg>',
  pqrs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v13H7l-3 3z"/><path d="M8 8h8M8 12h5"/></svg>',
  eliminar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 10v7M14 10v7"/></svg>',
};

function anunciar() {
  for (const observar of observadores) {
    try { observar(estado); } catch (error) { console.error('Error al observar el carrito:', error); }
  }
  window.dispatchEvent(new CustomEvent('magandhi:carrito', { detail: estado }));
}

function rutasDelSlot(slot) {
  return {
    inicio: slot.dataset.inicioHref || '../',
    cuenta: slot.dataset.cuentaHref || '../cuenta/',
    carrito: slot.dataset.carritoHref || '../carrito/',
    politicas: slot.dataset.politicasHref || '../politicas/',
    cookies: slot.dataset.cookiesHref || '../politicas/cookies/',
    pqrs: slot.dataset.pqrsHref || 'mailto:contacto@magandhi.com?subject=PQRS%20MAGANDHI',
    whatsapp: slot.dataset.whatsappHref || 'https://wa.me/573132451188',
  };
}

function etiquetaCarrito(unidades) {
  if (unidades === 0) return 'Carrito, sin productos';
  return `Carrito, ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;
}

function crearEnlaceCarrito(slot) {
  if (!estado.visible || !estado.snapshot) return null;
  const enlace = document.createElement('a');
  enlace.className = 'cc-action cc-action--cart';
  enlace.href = rutasDelSlot(slot).carrito;
  enlace.setAttribute('aria-label', etiquetaCarrito(estado.snapshot.cantidad_unidades));
  enlace.innerHTML = ICONO_CARRITO + '<span class="cc-action__label">Carrito</span>';

  const badge = document.createElement('span');
  badge.className = 'cc-carrito__badge';
  badge.setAttribute('aria-hidden', 'true');
  badge.textContent = String(estado.snapshot.cantidad_unidades);
  badge.hidden = estado.snapshot.cantidad_unidades === 0;
  enlace.appendChild(badge);
  return enlace;
}

function urlCuenta(slot, tab) {
  const base = rutasDelSlot(slot).cuenta;
  const separador = base.includes('?') ? '&' : '?';
  const retorno = abrirComprasPorDeepLink ? `&return_to=${encodeURIComponent(DESTINO_COMPRAS)}` : '';
  return `${base}${separador}tab=${encodeURIComponent(tab)}${retorno}`;
}

function crearAccionesInvitado(slot) {
  const crear = document.createElement('a');
  crear.className = 'cc-auth-action cc-auth-action--secondary';
  crear.href = urlCuenta(slot, 'register');
  crear.textContent = 'Crear cuenta';

  const ingresar = document.createElement('a');
  ingresar.className = 'cc-auth-action cc-auth-action--primary';
  ingresar.href = urlCuenta(slot, 'login');
  ingresar.textContent = 'Ingresar';
  return [crear, ingresar];
}

function crearAccesoRecuperacion(slot) {
  const enlace = document.createElement('a');
  enlace.className = 'cc-auth-action cc-auth-action--secondary';
  enlace.href = urlCuenta(slot, 'login');
  enlace.textContent = 'Revisar sesión';
  return enlace;
}

function crearBotonCentro(slot) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'cc-action cc-action--account';
  boton.dataset.ccAccountButton = '';
  boton.setAttribute('aria-label', 'Abrir mi cuenta');
  boton.setAttribute('aria-haspopup', 'dialog');
  boton.setAttribute('aria-expanded', 'false');
  boton.setAttribute('aria-controls', 'cc-account-center');
  boton.innerHTML = ICONO_CUENTA_MENU + '<span class="cc-action__label cc-action__label--account">Mi cuenta</span>';
  boton.addEventListener('click', () => abrirCentroDesdeBoton(
    boton,
    rutasDelSlot(slot),
    mediaCuentaMovil.matches ? 'hub' : 'compras'
  ));
  return boton;
}

// Presentación: la barra móvil y el CSS adaptan la cabecera según la sesión.
function anunciarSesion() {
  if (document.documentElement.dataset.mgSesion === sesionActual.estado) return;
  document.documentElement.dataset.mgSesion = sesionActual.estado;
  window.dispatchEvent(new CustomEvent('magandhi:sesion', { detail: { estado: sesionActual.estado } }));
}

function pintarSlots() {
  anunciarSesion();
  for (const slot of slots) {
    const botonExistente = slot.querySelector('[data-cc-account-button]');
    slot.replaceChildren();
    if (sesionActual.estado === 'sin-sesion') {
      slot.append(...crearAccionesInvitado(slot));
      slot.hidden = false;
      continue;
    }
    if (sesionActual.estado === 'error') {
      slot.append(crearAccesoRecuperacion(slot));
      slot.hidden = false;
      continue;
    }
    if (sesionActual.estado !== 'valida') {
      slot.hidden = true;
      continue;
    }
    const carrito = crearEnlaceCarrito(slot);
    const botonCentro = botonExistente || crearBotonCentro(slot);
    const elementos = carrito ? [carrito, botonCentro] : [botonCentro];
    slot.replaceChildren(...elementos);
    slot.hidden = false;
  }
  actualizarIndicadoresCompras(controlCompras.estado());
}

function actualizarIndicadoresCompras(compras) {
  const cantidad = compras?.procesos || 0;
  document.querySelectorAll('[data-cc-account-button]').forEach((boton) => {
    boton.setAttribute('aria-label', cantidad > 0
      ? `Abrir mi cuenta, ${cantidad} ${cantidad === 1 ? 'compra en proceso' : 'compras en proceso'}`
      : 'Abrir mi cuenta');
    let punto = boton.querySelector('[data-cc-purchases-dot]');
    if (cantidad > 0 && !punto) {
      punto = document.createElement('span');
      punto.className = 'cc-purchases-dot';
      punto.dataset.ccPurchasesDot = '';
      punto.setAttribute('aria-hidden', 'true');
      boton.appendChild(punto);
    } else if (cantidad === 0) punto?.remove();
  });
  const badge = centro?.querySelector('[data-cc-purchases-badge]');
  if (badge) {
    badge.textContent = cantidad > 0 ? String(cantidad) : '';
    badge.hidden = cantidad === 0;
    badge.setAttribute('aria-label', cantidad > 0
      ? `${cantidad} ${cantidad === 1 ? 'compra en proceso' : 'compras en proceso'}`
      : 'Sin compras en proceso');
  }
  const aviso = document.querySelector('[data-cc-cart-purchases]');
  if (!aviso) return;
  aviso.hidden = cantidad === 0;
  const texto = aviso.querySelector('[data-cc-cart-purchases-text]');
  if (texto && cantidad > 0) texto.textContent = cantidad === 1
    ? 'Tienes una compra en proceso. Revísala en Mis compras'
    : `Tienes ${cantidad} compras en proceso. Revísalas en Mis compras`;
  const boton = aviso.querySelector('[data-cc-cart-purchases-open]');
  if (boton && !boton.dataset.ccReady) {
    boton.dataset.ccReady = 'true';
    boton.addEventListener('click', () => abrirCentroCuenta('compras'));
  }
}

const controlCompras = crearControlMisCompras({
  supabase,
  obtenerSesion: () => sesionActual,
  obtenerRutas: () => rutasCentro || (slots[0] ? rutasDelSlot(slots[0]) : null),
  alCambiar: actualizarIndicadoresCompras,
});
const controlFavoritos = crearControlFavoritos();

function limpiarCarrito(error = false) {
  estado = Object.freeze({ visible: false, uid: uidActual, snapshot: null, error });
  pintarSlots();
  anunciar();
}

function pintar(snapshot) {
  if (!uidActual || !snapshot?.habilitado) {
    limpiarCarrito(false);
    return;
  }
  estado = Object.freeze({ visible: true, uid: uidActual, snapshot, error: false });
  pintarSlots();
  anunciar();
}

export function observarEstadoCarrito(observador) {
  if (typeof observador !== 'function') return () => {};
  observadores.add(observador);
  observador(estado);
  return () => observadores.delete(observador);
}

export function sincronizarCuentaCarrito(snapshot) {
  if (!uidActual || !snapshot) return false;
  ++generacion;
  pintar(snapshot);
  return estado.visible;
}

export function ocultarCuentaCarrito(error = false) {
  ++generacion;
  limpiarCarrito(error);
}

export async function refrescarCuentaCarrito() {
  const uidAlPedir = uidActual;
  const token = ++generacion;
  if (!uidAlPedir) {
    limpiarCarrito(false);
    return null;
  }
  try {
    const snapshot = await listarCarrito();
    if (token !== generacion || uidAlPedir !== uidActual) return null;
    pintar(snapshot);
    return snapshot;
  } catch (error) {
    if (token === generacion && uidAlPedir === uidActual) limpiarCarrito(true);
    throw error;
  }
}

function plantillaVacia(tipo) {
  const contenidos = {
    favoritos: {
      kicker: 'Tu selección', titulo: 'Favoritos', icono: ICONOS_VISTA.favoritos,
      texto: 'Guarda los productos que quieras recordar y vuelve a ellos cuando sea el momento.',
      vacio: 'Tu lista de favoritos está esperando', detalle: 'La función para guardar productos se conectará en la siguiente etapa.',
    },
    opiniones: {
      kicker: 'Tu experiencia', titulo: 'Mis opiniones', icono: ICONOS_VISTA.opiniones,
      texto: 'Consulta las opiniones que has compartido sobre tus compras verificadas.',
      vacio: 'Aquí vivirán tus opiniones', detalle: 'En la siguiente etapa conectaremos tus opiniones verificadas y los productos que ya puedas calificar.',
    },
  };
  const dato = contenidos[tipo] || contenidos.favoritos;
  return `
    <div class="cc-view-head">
      <span class="cc-view-kicker">${dato.kicker}</span>
      <h2 id="cc-view-title">${dato.titulo}</h2>
      <p>${dato.texto}</p>
    </div>
    <div class="cc-empty-state">
      <span class="cc-empty-state__icon">${dato.icono}</span>
      <h3>${dato.vacio}</h3>
      <p>${dato.detalle}</p>
    </div>`;
}

function plantillaPqrs() {
  return `
    <div class="cc-view-head">
      <span class="cc-view-kicker">Estamos para escucharte</span>
      <h2 id="cc-view-title">PQRS</h2>
      <p>Cuéntanos si tienes una petición, queja, reclamo o sugerencia. Te responderá el equipo MAGANDHI.</p>
    </div>
    <div class="cc-contact-grid">
      <a class="cc-contact-card" data-cc-pqrs href="#">
        <span class="cc-contact-card__icon">${ICONOS_VISTA.pqrs}</span>
        <span><strong>Escribir por correo</strong><small>Deja el detalle de tu solicitud.</small></span>
        <span aria-hidden="true">→</span>
      </a>
      <a class="cc-contact-card" data-cc-whatsapp href="#" target="_blank" rel="noopener">
        <span class="cc-contact-card__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/></svg></span>
        <span><strong>Hablar por WhatsApp</strong><small>Atención directa de nuestro equipo.</small></span>
        <span aria-hidden="true">→</span>
      </a>
    </div>`;
}

function plantillaEliminar() {
  return `
    <div class="cc-view-head">
      <span class="cc-view-kicker cc-view-kicker--danger">Privacidad y control</span>
      <h2 id="cc-view-title">Eliminar cuenta</h2>
      <p>Esta acción requerirá verificar tu identidad y explicar con claridad qué información debe conservarse por obligaciones de compra.</p>
    </div>
    <div class="cc-danger-card">
      <span class="cc-danger-card__icon">${ICONOS_VISTA.eliminar}</span>
      <div><h3>La eliminación todavía no está habilitada</h3><p>Estamos construyendo el proceso seguro antes de permitir una acción irreversible. Tu sesión y tus datos no se modificarán desde esta pantalla.</p></div>
      <button type="button" disabled>Eliminar mi cuenta</button>
    </div>`;
}

function asegurarCentro() {
  if (centro) return centro;
  const raiz = document.createElement('div');
  raiz.className = 'cc-center';
  raiz.id = 'cc-account-center';
  raiz.hidden = true;
  raiz.innerHTML = `
    <section class="cc-center__dialog" role="dialog" aria-modal="true" aria-labelledby="cc-center-title">
      <header class="cc-center__top">
        <button class="cc-center__back" type="button" aria-label="Volver a las opciones de mi cuenta" hidden>${ICONO_ATRAS}</button>
        <div class="cc-center__identity"><span>Tu espacio</span><h1 id="cc-center-title" tabindex="-1">Mi cuenta MAGANDHI</h1></div>
        <button class="cc-center__close" type="button" aria-label="Cerrar mi cuenta">${ICONO_CERRAR}</button>
      </header>
      <div class="cc-center__layout">
        <nav class="cc-center__nav" aria-label="Secciones de mi cuenta">
          <span class="cc-nav-group">Tu cuenta</span>
          <a class="cc-nav-item" data-cc-home href="#"><span class="cc-nav-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></svg></span>Inicio</a>
          <button class="cc-nav-item" type="button" data-cc-view="compras">${ICONOS_VISTA.compras}<span>Mis compras</span><span class="cc-nav-purchase-badge" data-cc-purchases-badge aria-label="Compras en proceso" hidden></span><span class="cc-nav-arrow" aria-hidden="true">›</span></button>
          <button class="cc-nav-item" type="button" data-cc-view="favoritos">${ICONOS_VISTA.favoritos}<span>Favoritos</span><span class="cc-nav-arrow" aria-hidden="true">›</span></button>
          <button class="cc-nav-item" type="button" data-cc-view="opiniones">${ICONOS_VISTA.opiniones}<span>Mis opiniones</span><span class="cc-nav-arrow" aria-hidden="true">›</span></button>
          <span class="cc-nav-group cc-nav-group--secondary">Ayuda y privacidad</span>
          <button class="cc-nav-item" type="button" data-cc-view="pqrs">${ICONOS_VISTA.pqrs}<span>PQRS</span><span class="cc-nav-arrow" aria-hidden="true">›</span></button>
          <a class="cc-nav-item" data-cc-politicas href="#"><span class="cc-nav-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></svg></span>Políticas</a>
          <a class="cc-nav-item" data-cc-cookies href="#"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 13.2A9 9 0 1 1 10.8 3.5a4.7 4.7 0 0 0 6.1 6.1 4.7 4.7 0 0 0 3.6 3.6z"/><circle cx="8" cy="12" r=".7" fill="currentColor"/><circle cx="12" cy="17" r=".7" fill="currentColor"/></svg><span>Cookies</span></a>
          <span class="cc-nav-separator" aria-hidden="true"></span>
          <button class="cc-nav-item" type="button" data-cc-logout><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg><span>Cerrar sesión</span></button>
          <p class="cc-session-alert" data-cc-session-alert role="alert" hidden></p>
          <button class="cc-nav-item cc-nav-item--danger" type="button" data-cc-view="eliminar">${ICONOS_VISTA.eliminar}<span>Eliminar cuenta</span><span class="cc-nav-arrow" aria-hidden="true">›</span></button>
        </nav>
        <div class="cc-center__content" data-cc-content role="region"></div>
      </div>
    </section>`;
  document.body.appendChild(raiz);
  centro = raiz;
  actualizarIndicadoresCompras(controlCompras.estado());

  raiz.querySelector('.cc-center__close').addEventListener('click', () => cerrarCentro());
  raiz.querySelector('.cc-center__back').addEventListener('click', volverAlHubMovil);
  raiz.addEventListener('mousedown', (evento) => {
    if (evento.target === raiz) cerrarCentro();
  });
  raiz.querySelectorAll('[data-cc-view]').forEach((boton) => {
    boton.addEventListener('click', () => navegarVistaCentro(boton.dataset.ccView));
  });
  raiz.querySelector('[data-cc-logout]').addEventListener('click', cerrarSesion);
  document.addEventListener('keydown', manejarTecladoCentro);
  return centro;
}

function actualizarRutasCentro() {
  if (!centro || !rutasCentro) return;
  centro.querySelector('[data-cc-home]').href = rutasCentro.inicio;
  centro.querySelector('[data-cc-politicas]').href = rutasCentro.politicas;
  centro.querySelector('[data-cc-cookies]').href = rutasCentro.cookies;
  centro.querySelectorAll('[data-cc-pqrs]').forEach((enlace) => { enlace.href = rutasCentro.pqrs; });
  centro.querySelectorAll('[data-cc-whatsapp]').forEach((enlace) => { enlace.href = rutasCentro.whatsapp; });
  centro.querySelectorAll('[data-cc-shop]').forEach((enlace) => { enlace.href = `${rutasCentro.inicio}#descubrir`; });
}

function historialEsPropio(valor = history.state) {
  return valor?.[CLAVE_HISTORIAL_CUENTA]?.instancia === historialCentro.instancia && !!historialCentro.instancia;
}

function estadoHistorialCuenta(pantalla, vista = '', nivel = 1) {
  const base = history.state && typeof history.state === 'object' && !Array.isArray(history.state)
    ? history.state
    : {};
  return {
    ...base,
    [CLAVE_HISTORIAL_CUENTA]: {
      instancia: historialCentro.instancia,
      pantalla,
      vista,
      nivel,
    },
  };
}

function iniciarHistorialMovil(pantalla, vista = '') {
  if (!mediaCuentaMovil.matches) return pantalla;
  historialCentro = {
    instancia: `cc-${Date.now().toString(36)}-${++secuenciaHistorialCentro}`,
    profundidad: 0,
  };
  try {
    history.pushState(estadoHistorialCuenta('hub', '', 1), '', window.location.href);
    historialCentro.profundidad = 1;
    if (pantalla === 'vista') {
      try {
        history.pushState(estadoHistorialCuenta('vista', vista, 2), '', window.location.href);
        historialCentro.profundidad = 2;
      } catch {
        return 'hub';
      }
    }
  } catch {
    historialCentro = { instancia: '', profundidad: 0 };
  }
  return pantalla;
}

function registrarVistaEnHistorial(vista) {
  if (!mediaCuentaMovil.matches || !centro || centro.hidden || !historialEsPropio()) return false;
  const actual = history.state?.[CLAVE_HISTORIAL_CUENTA];
  if (actual?.pantalla === 'vista' && actual.vista === vista) return true;
  try {
    const nivel = Math.max(2, Number(actual?.nivel || historialCentro.profundidad) + 1);
    history.pushState(estadoHistorialCuenta('vista', vista, nivel), '', window.location.href);
    historialCentro.profundidad = nivel;
    return true;
  } catch {
    return false;
  }
}

function limpiarHistorialSinCerrar() {
  const pasos = historialEsPropio() ? historialCentro.profundidad : 0;
  historialCentro = { instancia: '', profundidad: 0 };
  if (!pasos) return;
  omitirSiguientePopstate = true;
  try { history.go(-pasos); } catch { omitirSiguientePopstate = false; }
  window.setTimeout(() => { omitirSiguientePopstate = false; }, 1200);
}

function mostrarHub(enfocarTitulo = true) {
  asegurarCentro();
  pantallaCentro = 'hub';
  centro.dataset.ccScreen = 'hub';
  controlCompras.desmontar();
  controlFavoritos.desmontar();
  centro.querySelectorAll('[data-cc-view]').forEach((boton) => {
    boton.classList.remove('is-active');
    boton.removeAttribute('aria-current');
  });
  centro.querySelector('[data-cc-content]').replaceChildren();
  centro.querySelector('.cc-center__back').hidden = true;
  actualizarRutasCentro();
  centro.querySelector('.cc-center__nav').scrollTop = 0;
  if (enfocarTitulo) requestAnimationFrame(() => centro.querySelector('#cc-center-title')?.focus());
}

function mostrarVista(vista = 'compras', enfocarTitulo = true) {
  asegurarCentro();
  const permitidas = new Set(['compras', 'favoritos', 'opiniones', 'pqrs', 'eliminar']);
  const seleccion = permitidas.has(vista) ? vista : 'compras';
  pantallaCentro = seleccion;
  centro.dataset.ccScreen = 'vista';
  centro.querySelector('.cc-center__back').hidden = !mediaCuentaMovil.matches;
  centro.querySelectorAll('[data-cc-view]').forEach((boton) => {
    const activa = boton.dataset.ccView === seleccion;
    boton.classList.toggle('is-active', activa);
    if (activa) boton.setAttribute('aria-current', 'page');
    else boton.removeAttribute('aria-current');
  });
  const contenido = centro.querySelector('[data-cc-content]');
  controlCompras.desmontar();
  controlFavoritos.desmontar();
  if (seleccion === 'compras') {
    contenido.replaceChildren();
    controlCompras.montar(contenido);
  } else if (seleccion === 'favoritos') {
    contenido.replaceChildren();
    controlFavoritos.montar(contenido);
  } else {
    contenido.innerHTML = seleccion === 'pqrs'
      ? plantillaPqrs()
      : seleccion === 'eliminar' ? plantillaEliminar() : plantillaVacia(seleccion);
  }
  actualizarRutasCentro();
  contenido.scrollTop = 0;
  const titulo = contenido.querySelector('#cc-view-title');
  if (titulo) titulo.tabIndex = -1;
  if (enfocarTitulo) requestAnimationFrame(() => titulo?.focus());
}

function navegarVistaCentro(vista) {
  if (mediaCuentaMovil.matches && centro && !centro.hidden) registrarVistaEnHistorial(vista);
  mostrarVista(vista);
}

function volverAlHubMovil() {
  if (!mediaCuentaMovil.matches || pantallaCentro === 'hub') return;
  const actual = history.state?.[CLAVE_HISTORIAL_CUENTA];
  if (historialEsPropio() && actual?.pantalla === 'vista') {
    history.back();
    return;
  }
  mostrarHub();
}

function abrirCentroDesdeBoton(boton, rutas, vista = 'compras') {
  if (sesionActual.estado !== 'valida') return false;
  const raiz = asegurarCentro();
  botonQueAbrio = boton || null;
  rutasCentro = rutas;
  const pantallaSolicitada = mediaCuentaMovil.matches && vista === 'hub' ? 'hub' : 'vista';
  const pantallaEfectiva = mediaCuentaMovil.matches
    ? iniciarHistorialMovil(pantallaSolicitada, vista === 'hub' ? '' : vista)
    : pantallaSolicitada;
  if (pantallaEfectiva === 'hub') mostrarHub(false);
  else mostrarVista(vista === 'hub' ? 'compras' : vista, false);
  raiz.hidden = false;
  document.body.classList.add('cc-center-open');
  boton?.setAttribute('aria-expanded', 'true');
  actualizarIndicadoresCompras(controlCompras.estado());
  requestAnimationFrame(() => raiz.querySelector('#cc-center-title')?.focus());
  return true;
}

export function abrirCentroCuenta(vista = 'compras', mensaje = '') {
  if (vista !== 'compras' || sesionActual.estado !== 'valida') return false;
  if (mensaje) controlCompras.mostrarAviso(mensaje);
  const boton = document.querySelector('[data-cc-account-button]');
  const slot = boton?.closest('[data-cuenta-carrito]') || slots[0];
  if (!slot) return false;
  return abrirCentroDesdeBoton(boton, rutasDelSlot(slot), vista);
}

export function invalidarComprasCuenta() {
  window.dispatchEvent(new CustomEvent('magandhi:compras-invalidar'));
}

function cerrarCentro({ limpiarHistorial = true } = {}) {
  if (!centro || centro.hidden) return;
  const pasos = limpiarHistorial && historialEsPropio() ? historialCentro.profundidad : 0;
  controlCompras.desmontar();
  controlFavoritos.desmontar();
  centro.hidden = true;
  centro.removeAttribute('data-cc-screen');
  document.body.classList.remove('cc-center-open');
  historialCentro = { instancia: '', profundidad: 0 };
  pantallaCentro = 'compras';
  if (botonQueAbrio?.isConnected) {
    botonQueAbrio.setAttribute('aria-expanded', 'false');
    botonQueAbrio.focus();
  }
  botonQueAbrio = null;
  if (pasos) {
    try { history.go(-pasos); } catch { /* El centro ya quedó cerrado de forma segura. */ }
  }
}

function manejarPopstateCentro(evento) {
  if (omitirSiguientePopstate) {
    omitirSiguientePopstate = false;
    return;
  }
  if (!centro || centro.hidden || !historialCentro.instancia) return;
  const destino = evento.state?.[CLAVE_HISTORIAL_CUENTA];
  if (destino?.instancia !== historialCentro.instancia) {
    cerrarCentro({ limpiarHistorial: false });
    return;
  }
  historialCentro.profundidad = Number.isInteger(destino.nivel) ? destino.nivel : 1;
  if (destino.pantalla === 'vista') mostrarVista(destino.vista, true);
  else mostrarHub(true);
}

function manejarCambioModoCuenta(evento) {
  if (!centro || centro.hidden) return;
  if (evento.matches) {
    const eraHub = pantallaCentro === 'hub';
    const vista = eraHub ? '' : pantallaCentro;
    const efectiva = iniciarHistorialMovil(eraHub ? 'hub' : 'vista', vista);
    if (efectiva === 'hub') mostrarHub(false);
    else {
      centro.dataset.ccScreen = 'vista';
      centro.querySelector('.cc-center__back').hidden = false;
    }
    return;
  }
  limpiarHistorialSinCerrar();
  if (pantallaCentro === 'hub') mostrarVista('compras', false);
  else centro.querySelector('.cc-center__back').hidden = true;
}

async function cerrarSesion(evento) {
  const boton = evento.currentTarget;
  if (boton.disabled) return;
  const alerta = centro?.querySelector('[data-cc-session-alert]');
  boton.disabled = true;
  boton.querySelector('span').textContent = 'Cerrando sesión…';
  if (alerta) alerta.hidden = true;
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    window.location.reload();
  } catch {
    boton.disabled = false;
    boton.querySelector('span').textContent = 'Cerrar sesión';
    if (alerta) {
      alerta.textContent = 'No pudimos cerrar tu sesión. Inténtalo de nuevo.';
      alerta.hidden = false;
    }
  }
}

function manejarTecladoCentro(evento) {
  if (!centro || centro.hidden) return;
  if (evento.key === 'Escape') {
    evento.preventDefault();
    cerrarCentro();
    return;
  }
  if (evento.key !== 'Tab') return;
  const controles = [...centro.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')]
    .filter((elemento) => elemento.offsetParent !== null);
  if (!controles.length) return;
  const primero = controles[0];
  const ultimo = controles[controles.length - 1];
  const tituloCentro = centro.querySelector('#cc-center-title');
  if (!centro.contains(document.activeElement)) {
    evento.preventDefault();
    (evento.shiftKey ? ultimo : primero).focus();
  } else if (evento.shiftKey && (document.activeElement === primero || document.activeElement === tituloCentro)) {
    evento.preventDefault();
    ultimo.focus();
  } else if (!evento.shiftKey && document.activeElement === ultimo) {
    evento.preventDefault();
    primero.focus();
  }
}

function configurarBuscadoresCuenta() {
  configurarBuscadores(document);
}

window.addEventListener('popstate', manejarPopstateCentro);
if (typeof mediaCuentaMovil.addEventListener === 'function') {
  mediaCuentaMovil.addEventListener('change', manejarCambioModoCuenta);
} else {
  mediaCuentaMovil.addListener(manejarCambioModoCuenta);
}

window.addEventListener('magandhi:compras-invalidar', () => {
  controlCompras.invalidar();
});

// La barra inferior móvil abre el mismo centro «Mi cuenta» que la cabecera.
window.addEventListener('magandhi:abrir-cuenta', (evento) => {
  const detalle = evento.detail;
  const slot = slots[0];
  if (!detalle || !slot) return;
  detalle.abierto = abrirCentroDesdeBoton(
    detalle.origen || null,
    rutasDelSlot(slot),
    mediaCuentaMovil.matches ? 'hub' : 'compras'
  );
});

observarSesionCliente((sesion) => {
  ++generacion;
  sesionActual = sesion;
  controlCompras.cambiarSesion(sesion);
  if (sesion.estado !== 'valida') {
    uidActual = null;
    estado = Object.freeze({ visible: false, uid: null, snapshot: null, error: sesion.estado === 'error' });
    cerrarCentro();
    pintarSlots();
    anunciar();
    return;
  }
  if (uidActual !== sesion.uid) {
    uidActual = sesion.uid;
    estado = Object.freeze({ visible: false, uid: uidActual, snapshot: null, error: false });
  }
  pintarSlots();
  refrescarCuentaCarrito().catch(() => { /* La cuenta sigue accesible aunque falle la lectura del carrito. */ });
  if (abrirComprasPorDeepLink) {
    abrirComprasPorDeepLink = false;
    try { sessionStorage.removeItem(CLAVE_DESTINO_CUENTA); } catch { /* El destino ya se consumió en memoria. */ }
    queueMicrotask(() => abrirCentroCuenta('compras'));
  }
});

configurarBuscadoresCuenta();
