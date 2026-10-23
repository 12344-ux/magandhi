import { observarSesionCliente, revalidarSesionCliente } from '../cliente/cliente-sesion.js';
import {
  listarCarrito,
  cambiarCantidadCarrito,
  quitarDelCarrito,
  mensajeErrorCarrito,
} from './carrito-core.js?v=3';
import { configurarCheckoutCarrito } from './checkout-carrito.js?v=13';
import { sincronizarCuentaCarrito } from '../componentes/cuenta-carrito.js?v=12';
import { iniciarCompraCarrito } from '../compra/compra-core.js?v=3';

const vistas = ['loading', 'session', 'disabled', 'error', 'empty', 'content'];
let uidActual = null;
let sesionActual = null;
let snapshotActual = null;
let generacion = 0;
let operacion = false;
let checkout = { actualizar() {} };

const porId = (id) => document.getElementById(id);
const moneda = (valor) => '$ ' + Math.round(Number(valor)).toLocaleString('es-CO') + ' COP';

function configurarRegreso() {
  const enlace = document.querySelector('[data-co-back]');
  if (!enlace) return;
  enlace.addEventListener('click', (evento) => {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    try {
      const hayPaginaAnteriorDelSitio = history.length > 1
        && document.referrer
        && new URL(document.referrer).origin === window.location.origin;
      if (!hayPaginaAnteriorDelSitio) return;
      evento.preventDefault();
      history.back();
    } catch {
      // El href mantiene un regreso seguro al inicio si el historial no se puede consultar.
    }
  });
}

function estadoCheckout() {
  return { sesion: sesionActual, snapshot: snapshotActual, operacion };
}

function mostrar(nombre) {
  for (const vista of vistas) {
    const elemento = porId(`co-${vista}`);
    if (elemento) elemento.hidden = vista !== nombre;
  }
}

function aviso(texto = '') {
  const elemento = porId('co-notice');
  elemento.textContent = texto;
  elemento.hidden = !texto;
}

function limpiar() {
  snapshotActual = null;
  porId('co-lines').replaceChildren();
  aviso();
  checkout.actualizar();
}

function mensajeCambio(item) {
  if (!item.disponible || item.max_comprable === 0) return 'Este producto fue retirado o se agotó. Retíralo del carrito para continuar.';
  if (item.requiere_ajuste) return `Este producto cambió desde que lo agregaste. Revisa el precio actual y elige una cantidad de 1 a ${item.max_comprable}.`;
  return '';
}

function crearLinea(item, version, pagoBloqueado) {
  const linea = document.createElement('article');
  linea.className = 'co-line';
  linea.dataset.campana = item.campana_id;

  const principal = document.createElement('div');
  principal.className = 'co-line__main';
  const titulo = document.createElement('h3');
  if (!item.retirada) {
    const enlace = document.createElement('a');
    enlace.href = item.slug
      ? `../producto/${encodeURIComponent(item.slug)}/`
      : `../producto/?id=${encodeURIComponent(item.campana_id)}`;
    enlace.textContent = item.nombre;
    titulo.appendChild(enlace);
  } else titulo.textContent = item.nombre;
  const precio = document.createElement('p');
  precio.className = 'co-line__price';
  precio.textContent = item.precio_disponible
    ? `${moneda(item.precio_unitario_actual)} por unidad`
    : 'Precio no disponible';
  principal.append(titulo, precio);

  const subtotal = document.createElement('strong');
  subtotal.className = 'co-line__subtotal';
  subtotal.textContent = item.precio_disponible ? moneda(item.subtotal_actual) : '—';
  linea.append(principal, subtotal);

  const cambio = mensajeCambio(item);
  if (cambio) {
    const advertencia = document.createElement('p');
    advertencia.className = 'co-line__warning';
    advertencia.setAttribute('role', 'status');
    advertencia.textContent = cambio;
    linea.appendChild(advertencia);
  }

  const acciones = document.createElement('div');
  acciones.className = 'co-line__actions';
  const campo = document.createElement('div');
  campo.className = 'co-quantity';
  const idSelect = `co-cantidad-${item.campana_id}`;
  const etiqueta = document.createElement('label');
  etiqueta.htmlFor = idSelect;
  etiqueta.textContent = 'Cantidad';
  const select = document.createElement('select');
  select.id = idSelect;
  select.disabled = pagoBloqueado || !item.disponible || item.max_comprable === 0;

  if (item.requiere_ajuste || item.cantidad > item.max_comprable) {
    const opcion = document.createElement('option');
    opcion.value = '';
    opcion.textContent = 'Elige';
    opcion.selected = true;
    opcion.disabled = true;
    select.appendChild(opcion);
  }
  for (let cantidad = 1; cantidad <= item.max_comprable; cantidad += 1) {
    const opcion = document.createElement('option');
    opcion.value = String(cantidad);
    opcion.textContent = String(cantidad);
    opcion.selected = !item.requiere_ajuste && cantidad === item.cantidad;
    select.appendChild(opcion);
  }
  select.addEventListener('change', () => cambiar(item, Number(select.value), version, linea));
  campo.append(etiqueta, select);

  const retirar = document.createElement('button');
  retirar.type = 'button';
  retirar.className = 'co-remove';
  retirar.textContent = 'Retirar';
  retirar.disabled = pagoBloqueado;
  retirar.addEventListener('click', () => quitar(item, version, linea));
  acciones.append(campo, retirar);
  linea.appendChild(acciones);
  return linea;
}

function pintar(snapshot) {
  snapshotActual = snapshot;
  sincronizarCuentaCarrito(snapshot);
  if (!snapshot.habilitado) {
    porId('co-lines').replaceChildren();
    aviso();
    mostrar('disabled');
    checkout.actualizar();
    return;
  }
  if (snapshot.cantidad_lineas === 0) {
    porId('co-lines').replaceChildren();
    aviso();
    mostrar('empty');
    checkout.actualizar();
    return;
  }
  const pagoBloqueado = snapshot.bloqueo_pago === 'pendiente' || snapshot.bloqueo_pago === 'revision';
  const lineas = document.createDocumentFragment();
  for (const item of snapshot.items) lineas.appendChild(crearLinea(item, snapshot.version, pagoBloqueado));
  porId('co-lines').replaceChildren(lineas);
  porId('co-count').textContent = `${snapshot.cantidad_unidades} ${snapshot.cantidad_unidades === 1 ? 'unidad' : 'unidades'}`;
  const subtotalCompleto = snapshot.items.every((item) => item.precio_disponible);
  const subtotal = snapshot.items.reduce((total, item) =>
    total + (item.precio_disponible ? item.subtotal_actual : 0), 0);
  porId('co-subtotal').textContent = subtotalCompleto ? moneda(subtotal) : 'Por confirmar';
  if (pagoBloqueado) {
    aviso(snapshot.bloqueo_pago === 'revision'
      ? 'Este pago está en revisión. No puedes cambiar el carrito ni iniciar otro pago hasta que termine la confirmación.'
      : 'Hay un pago pendiente. No puedes cambiar el carrito ni iniciar otro pago mientras se confirma.');
  } else {
    aviso(snapshot.items.some((item) => item.requiere_ajuste || !item.disponible || !item.precio_disponible)
      ? 'Algunos productos cambiaron. Revísalos antes de continuar.' : '');
  }
  mostrar('content');
  checkout.actualizar();
}

async function cargar() {
  const uidAlPedir = uidActual;
  const token = ++generacion;
  limpiar();
  mostrar('loading');
  try {
    const snapshot = await listarCarrito();
    if (token !== generacion || uidAlPedir !== uidActual) return false;
    pintar(snapshot);
    return true;
  } catch (error) {
    if (token !== generacion || uidAlPedir !== uidActual) return false;
    if (error?.codigo === 'CO_CARRITO_DESHABILITADO') {
      mostrar('disabled');
      checkout.actualizar();
      return false;
    }
    if (error?.codigo === 'CO_CUENTA_NO_DISPONIBLE') {
      revalidarSesionCliente(true);
      return false;
    }
    porId('co-error-message').textContent = mensajeErrorCarrito(error, 'cargar');
    mostrar('error');
    checkout.actualizar();
    return false;
  }
}

async function ejecutar(linea, tarea, accion, restaurarFoco) {
  if (operacion || !uidActual) return;
  if (snapshotActual?.bloqueo_pago === 'pendiente' || snapshotActual?.bloqueo_pago === 'revision') {
    aviso(snapshotActual.bloqueo_pago === 'revision'
      ? 'Este pago está en revisión. Espera su confirmación antes de cambiar el carrito.'
      : 'Hay un pago pendiente. Espera su confirmación antes de cambiar el carrito.');
    checkout.actualizar();
    return;
  }
  const uidOperacion = uidActual;
  const generacionOperacion = generacion;
  operacion = true;
  checkout.actualizar();
  document.querySelectorAll('#co-lines button, #co-lines select').forEach((control) => {
    control.disabled = true;
  });
  linea.setAttribute('aria-busy', 'true');
  try {
    const snapshot = await tarea();
    if (uidOperacion !== uidActual || generacionOperacion !== generacion) return;
    pintar(snapshot);
    if (typeof restaurarFoco === 'function') restaurarFoco();
  } catch (error) {
    if (uidOperacion !== uidActual || generacionOperacion !== generacion) return;
    const mensaje = mensajeErrorCarrito(error, accion);
    if (error?.codigo === 'CO_CARRITO_DESHABILITADO') {
      mostrar('disabled');
    } else if (error?.codigo === 'CO_CUENTA_NO_DISPONIBLE') {
      revalidarSesionCliente(true);
    } else if (/VERSION|CONFLICT|DESACTUALIZ/.test(String(error?.codigo || '')) ||
        error?.codigo === 'CO_CARRITO_BLOQUEADO') {
      await cargar();
      aviso(mensaje);
    } else {
      pintar(snapshotActual);
      aviso(mensaje);
    }
  } finally {
    operacion = false;
    checkout.actualizar();
  }
}

function cambiar(item, cantidad, version, linea) {
  if (!Number.isSafeInteger(cantidad) || cantidad < 1 || cantidad > item.max_comprable) return;
  ejecutar(
    linea,
    () => cambiarCantidadCarrito(item.campana_id, cantidad, version),
    'actualizar',
    () => document.getElementById(`co-cantidad-${item.campana_id}`)?.focus()
  );
}

function quitar(item, version, linea) {
  ejecutar(
    linea,
    () => quitarDelCarrito(item.campana_id, version),
    'actualizar',
    () => document.getElementById('co-content-title')?.focus()
  );
}

configurarRegreso();

porId('co-retry').addEventListener('click', () => {
  if (uidActual) cargar();
  else revalidarSesionCliente();
});

checkout = configurarCheckoutCarrito({
  obtenerEstado: estadoCheckout,
  recargarCarrito: cargar,
  revalidarSesion: revalidarSesionCliente,
  iniciarFlujo: (estado) => {
    const snapshot = estado?.snapshot;
    const preparada = iniciarCompraCarrito({
      uid: estado?.sesion?.uid,
      carritoId: snapshot?.carrito_id,
      version: snapshot?.version,
      retorno: window.location.href,
    });
    if (!preparada) return false;
    window.location.assign('../compra/');
    return true;
  },
});

observarSesionCliente((sesion) => {
  ++generacion;
  sesionActual = sesion;
  limpiar();
  checkout.cambiarSesion(sesion);
  if (sesion.estado === 'comprobando') {
    uidActual = null;
    mostrar('loading');
    checkout.actualizar();
    return;
  }
  if (sesion.estado !== 'valida') {
    uidActual = null;
    mostrar(sesion.estado === 'sin-sesion' ? 'session' : 'error');
    if (sesion.estado === 'error') porId('co-error-message').textContent = 'No pudimos validar tu cuenta. Inténtalo de nuevo más tarde.';
    checkout.actualizar();
    return;
  }
  uidActual = sesion.uid;
  checkout.actualizar();
  cargar();
});
