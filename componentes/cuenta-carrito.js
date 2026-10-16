import { observarSesionCliente } from '../cliente/cliente-sesion.js';
import { listarCarrito } from '../carrito/carrito-core.js';

const slots = [...document.querySelectorAll('[data-cuenta-carrito]')];
const observadores = new Set();
let generacion = 0;
let uidActual = null;
let estado = Object.freeze({ visible: false, uid: null, snapshot: null, error: false });

const ICONO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';

function anunciar() {
  for (const observar of observadores) {
    try { observar(estado); } catch (error) { console.error('Error al observar el carrito:', error); }
  }
  window.dispatchEvent(new CustomEvent('magandhi:carrito', { detail: estado }));
}

function limpiar(error = false) {
  estado = Object.freeze({ visible: false, uid: null, snapshot: null, error });
  for (const slot of slots) {
    slot.hidden = true;
    slot.replaceChildren();
  }
  anunciar();
}

function etiqueta(unidades) {
  if (unidades === 0) return 'Carrito, sin productos';
  return `Carrito, ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`;
}

function pintar(snapshot) {
  if (!uidActual || !snapshot?.habilitado) {
    limpiar(false);
    return;
  }
  estado = Object.freeze({ visible: true, uid: uidActual, snapshot, error: false });
  for (const slot of slots) {
    const enlace = document.createElement('a');
    enlace.className = 'cc-carrito';
    enlace.href = slot.dataset.carritoHref || '../carrito/';
    enlace.setAttribute('aria-label', etiqueta(snapshot.cantidad_unidades));
    enlace.innerHTML = ICONO + '<span class="cc-carrito__texto">Carrito</span>';

    const badge = document.createElement('span');
    badge.className = 'cc-carrito__badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = String(snapshot.cantidad_unidades);
    badge.hidden = snapshot.cantidad_unidades === 0;
    enlace.appendChild(badge);

    slot.replaceChildren(enlace);
    slot.hidden = false;
  }
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
  limpiar(error);
}

export async function refrescarCuentaCarrito() {
  const uidAlPedir = uidActual;
  const token = ++generacion;
  if (!uidAlPedir) {
    limpiar(false);
    return null;
  }
  try {
    const snapshot = await listarCarrito();
    if (token !== generacion || uidAlPedir !== uidActual) return null;
    pintar(snapshot);
    return snapshot;
  } catch (error) {
    if (token === generacion && uidAlPedir === uidActual) limpiar(true);
    throw error;
  }
}

observarSesionCliente((sesion) => {
  ++generacion;
  if (sesion.estado !== 'valida') {
    uidActual = null;
    limpiar(sesion.estado === 'error');
    return;
  }
  if (uidActual !== sesion.uid) limpiar(false);
  uidActual = sesion.uid;
  refrescarCuentaCarrito().catch(() => { /* Falla cerrada: el slot permanece oculto. */ });
});
