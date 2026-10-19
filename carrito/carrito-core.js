import { supabase } from '../supabase-config.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODIGO_CO = /\b(CO_[A-Z0-9_]+)(?::\s*(\d+))?/;

export class ErrorCarrito extends Error {
  constructor(codigo = 'CO_ERROR', opciones = {}) {
    super('No se pudo completar la operación del carrito.');
    this.name = 'ErrorCarrito';
    this.codigo = codigo;
    this.code = codigo;
    this.maxComprable = opciones.maxComprable ?? null;
    this.causa = opciones.causa;
  }
}

function entero(valor, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo;
}

function dinero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
}

function objetoRespuesta(data) {
  if (Array.isArray(data) && data.length === 1) return data[0];
  return data?.snapshot && typeof data.snapshot === 'object' ? data.snapshot : data;
}

export function normalizarSnapshot(data) {
  const valor = objetoRespuesta(data);
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new ErrorCarrito('CO_RESPUESTA_INVALIDA');
  const bloqueoPagoValido = valor.bloqueo_pago === null ||
    valor.bloqueo_pago === 'pendiente' || valor.bloqueo_pago === 'revision';
  if (typeof valor.habilitado !== 'boolean' ||
      !bloqueoPagoValido ||
      !(valor.carrito_id === null || (typeof valor.carrito_id === 'string' && UUID.test(valor.carrito_id))) ||
      !entero(valor.version, 0) || !entero(valor.cantidad_lineas, 0, 20) ||
      !entero(valor.cantidad_unidades, 0) || !Array.isArray(valor.items) ||
      valor.items.length !== valor.cantidad_lineas) {
    throw new ErrorCarrito('CO_RESPUESTA_INVALIDA');
  }

  const items = valor.items.map((item) => {
    const retirada = item?.disponible === false && item?.requiere_ajuste === true &&
      item?.max_comprable === 0 && item?.nombre === null && item?.slug === null &&
      item?.precio_unitario_actual === null && item?.subtotal_actual === null;
    const sinPrecio = !retirada && item?.disponible === false &&
      item?.requiere_ajuste === true && item?.precio_unitario_actual === null &&
      item?.subtotal_actual === null;
    const slugValido = retirada || item?.slug === null || typeof item?.slug === 'string';
    const precio = retirada || sinPrecio ? 0 : dinero(item?.precio_unitario_actual);
    const subtotal = retirada || sinPrecio ? 0 : dinero(item?.subtotal_actual);
    if (!item || typeof item !== 'object' || !UUID.test(String(item.campana_id || '')) ||
        (!retirada && typeof item.nombre !== 'string') || !slugValido ||
        precio === null || !entero(item.cantidad, 1, 20) || subtotal === null ||
        !entero(item.max_comprable, 0, 20) || typeof item.disponible !== 'boolean' ||
        typeof item.requiere_ajuste !== 'boolean') {
      throw new ErrorCarrito('CO_RESPUESTA_INVALIDA');
    }
    return Object.freeze({
      campana_id: item.campana_id,
      nombre: retirada ? 'Producto no disponible' : (item.nombre.trim() || 'Producto'),
      slug: retirada ? '' : String(item.slug || '').trim(),
      retirada,
      precio_disponible: !retirada && !sinPrecio,
      precio_unitario_actual: precio,
      cantidad: item.cantidad,
      subtotal_actual: subtotal,
      max_comprable: item.max_comprable,
      disponible: item.disponible,
      requiere_ajuste: item.requiere_ajuste,
    });
  });

  const unidades = items.reduce((total, item) => total + item.cantidad, 0);
  if (unidades !== valor.cantidad_unidades) throw new ErrorCarrito('CO_RESPUESTA_INVALIDA');

  return Object.freeze({
    habilitado: valor.habilitado,
    carrito_id: valor.carrito_id,
    version: valor.version,
    cantidad_lineas: valor.cantidad_lineas,
    cantidad_unidades: valor.cantidad_unidades,
    bloqueo_pago: valor.bloqueo_pago,
    items: Object.freeze(items),
  });
}

async function convertirError(error, data) {
  const partes = [data?.codigo, data?.error, data?.message, error?.code, error?.message, error?.details, error?.hint]
    .filter((parte) => typeof parte === 'string');
  try {
    const payload = await error?.context?.json();
    if (payload) partes.push(payload.codigo, payload.error, payload.message);
  } catch { /* La mayoría de errores RPC no tiene cuerpo Response. */ }
  const texto = partes.filter(Boolean).join(' ');
  const coincidencia = texto.match(CODIGO_CO);
  const codigo = coincidencia?.[1] || 'CO_ERROR';
  const maxDato = data?.max_comprable;
  const maxComprable = entero(maxDato, 0, 20)
    ? maxDato
    : (coincidencia?.[2] !== undefined && entero(Number(coincidencia[2]), 0, 20) ? Number(coincidencia[2]) : null);
  return new ErrorCarrito(codigo, { maxComprable, causa: error });
}

async function rpc(nombre, argumentos) {
  const { data, error } = await supabase.rpc(nombre, argumentos);
  if (error || data?.error) throw await convertirError(error, data);
  return normalizarSnapshot(data);
}

function campanaValida(campana) {
  const valor = String(campana || '').trim();
  if (!UUID.test(valor)) throw new ErrorCarrito('CO_SOLICITUD_INVALIDA');
  return valor;
}

export function listarCarrito() {
  return rpc('co_carrito_listar');
}

export function agregarAlCarrito(campana, delta) {
  if (!entero(delta, 1, 20)) return Promise.reject(new ErrorCarrito('CO_SOLICITUD_INVALIDA'));
  return rpc('co_carrito_agregar', {
    p_campana_id: campanaValida(campana),
    p_cantidad: delta,
  });
}

export function cambiarCantidadCarrito(campana, cantidad, version) {
  if (!entero(cantidad, 1, 20) || !entero(version, 0)) return Promise.reject(new ErrorCarrito('CO_SOLICITUD_INVALIDA'));
  return rpc('co_carrito_cambiar', {
    p_campana_id: campanaValida(campana),
    p_cantidad: cantidad,
    p_version_esperada: version,
  });
}

export function quitarDelCarrito(campana, version) {
  if (!entero(version, 0)) return Promise.reject(new ErrorCarrito('CO_SOLICITUD_INVALIDA'));
  return rpc('co_carrito_quitar', {
    p_campana_id: campanaValida(campana),
    p_version_esperada: version,
  });
}

export function mensajeErrorCarrito(error, accion = 'actualizar') {
  const codigo = String(error?.codigo || '');
  if (codigo === 'CO_MAX_COMPRABLE' && entero(error?.maxComprable, 0, 20)) {
    return error.maxComprable === 0
      ? 'Este producto ya no está disponible por ahora.'
      : `Ahora puedes elegir hasta ${error.maxComprable} ${error.maxComprable === 1 ? 'unidad' : 'unidades'}. Revisa la cantidad.`;
  }
  if (/NO_DISPONIBLE|RETIRAD|AGOTAD/.test(codigo)) return 'Este producto ya no está disponible por ahora.';
  if (/VERSION|CONFLICT|DESACTUALIZ/.test(codigo)) return 'El carrito cambió en otra pestaña o dispositivo. Ya mostramos su estado más reciente.';
  if (codigo === 'CO_CARRITO_BLOQUEADO') return 'Hay un pago pendiente o en revisión. Actualizamos el carrito; espera su confirmación antes de cambiarlo.';
  if (/LIMITE.*LINEA|MAX.*LINEA/.test(codigo)) return 'Tu carrito alcanzó el máximo de productos distintos. Retira uno para agregar otro.';
  if (/NO_AUTENTIC|SESION|CUENTA/.test(codigo)) return 'Vuelve a iniciar sesión para usar tu carrito.';
  if (/DESHABILIT|NO_HABILIT/.test(codigo)) return 'El carrito no está disponible en este momento.';
  return accion === 'cargar'
    ? 'No pudimos cargar tu carrito. Revisa tu conexión e inténtalo de nuevo.'
    : `No pudimos ${accion} el carrito. Revisa tu conexión e inténtalo de nuevo.`;
}
