import { supabase } from '../supabase-config.js';
import { observarSesionCliente } from '../cliente/cliente-sesion.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CODIGO_FV = /\b(FV_[A-Z0-9_]+)\b/;
const observadores = new Set();
const mutaciones = new Set();
let generacionSesion = 0;
let secuenciaCarga = 0;
let sesionActual = Object.freeze({ estado: 'comprobando', uid: null, sesion: null, codigo: '' });
let favoritos = Object.freeze([]);
let cargados = false;
let cargando = false;
let errorCarga = false;
let promesaCarga = null;
let estado = null;

export class ErrorFavoritos extends Error {
  constructor(codigo = 'FV_ERROR', causa = null) {
    super('No se pudo completar la operación de favoritos.');
    this.name = 'ErrorFavoritos';
    this.codigo = codigo;
    this.code = codigo;
    this.causa = causa;
  }
}

function texto(valor, maximo, requerido = true) {
  if (valor === null || valor === undefined) return requerido ? null : '';
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if ((requerido && !limpio) || limpio.length > maximo) return null;
  return limpio;
}

function fechaIso(valor) {
  if (typeof valor !== 'string' || valor.length > 50 || !Number.isFinite(Date.parse(valor))) return null;
  return valor;
}

function precio(valor) {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0 ? valor : null;
}

function maxComprable(valor) {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= 0 && valor <= 20
    ? valor
    : null;
}

function listaImagenes(valor) {
  if (!Array.isArray(valor)) return Object.freeze([]);
  const salida = valor
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item && item.length <= 1000)
    .slice(0, 40);
  return Object.freeze(salida);
}

function falloContrato() {
  return new ErrorFavoritos('FV_RESPUESTA_INVALIDA');
}

function normalizarFavorito(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw falloContrato();
  const campanaId = texto(valor.campana_id, 36);
  const creado = fechaIso(valor.creado);
  if (!campanaId || !UUID.test(campanaId) || !creado) {
    throw falloContrato();
  }

  const retirado = valor.nombre === null && valor.slug === null && valor.precio_venta === null &&
    valor.imagenes === null && valor.imagen_banner_path === null && valor.max_comprable === 0 &&
    valor.disponible === false;
  if (retirado) {
    return Object.freeze({
      campana_id: campanaId,
      creado,
      nombre: 'Producto no disponible',
      slug: '',
      precio_venta: null,
      imagenes: Object.freeze([]),
      imagen_banner_path: '',
      max_comprable: 0,
      disponible: false,
      retirado: true,
    });
  }

  const nombre = texto(valor.nombre, 1000);
  const slug = texto(valor.slug, 180);
  const precioActual = precio(valor.precio_venta);
  const imagenes = listaImagenes(valor.imagenes);
  const bannerEntrada = texto(valor.imagen_banner_path, 1000, false);
  const banner = bannerEntrada === null ? '' : bannerEntrada;
  const maximo = maxComprable(valor.max_comprable);
  if (!nombre || !slug || !SLUG.test(slug) || precioActual === null ||
      maximo === null || typeof valor.disponible !== 'boolean' ||
      valor.disponible !== (precioActual > 0 && maximo > 0)) {
    const nombreParcial = texto(valor.nombre, 1000, false);
    return Object.freeze({
      campana_id: campanaId,
      creado,
      nombre: nombreParcial || 'Producto no disponible',
      slug: '',
      precio_venta: precioActual,
      imagenes,
      imagen_banner_path: banner,
      max_comprable: 0,
      disponible: false,
      retirado: true,
    });
  }
  return Object.freeze({
    campana_id: campanaId,
    creado,
    nombre,
    slug,
    precio_venta: precioActual,
    imagenes,
    imagen_banner_path: banner,
    max_comprable: maximo,
    disponible: valor.disponible,
    retirado: false,
  });
}

export function normalizarFavoritos(data) {
  const lista = data && typeof data === 'object' && !Array.isArray(data) ? data.favoritos : null;
  if (!Array.isArray(lista)) throw falloContrato();
  const vistos = new Set();
  const salida = lista.map((item) => {
    const favorito = normalizarFavorito(item);
    if (vistos.has(favorito.campana_id)) throw falloContrato();
    vistos.add(favorito.campana_id);
    return favorito;
  });
  return Object.freeze(salida);
}

async function convertirError(error, data) {
  const partes = [data?.codigo, data?.error, data?.message, error?.code, error?.message, error?.details, error?.hint]
    .filter((parte) => typeof parte === 'string');
  try {
    const payload = await error?.context?.json();
    if (payload) partes.push(payload.codigo, payload.error, payload.message);
  } catch { /* Las RPC normalmente no exponen un cuerpo Response. */ }
  const coincidencia = partes.filter(Boolean).join(' ').match(CODIGO_FV);
  return new ErrorFavoritos(coincidencia?.[1] || 'FV_ERROR', error);
}

function estadoPublico() {
  const autenticada = sesionActual.estado === 'valida' && UUID.test(sesionActual.uid || '');
  const fase = !autenticada
    ? (sesionActual.estado === 'comprobando' ? 'comprobando' : 'sin-sesion')
    : (!cargados && cargando ? 'cargando' : (!cargados && errorCarga ? 'error' : 'listo'));
  return Object.freeze({
    fase,
    autenticada,
    uid: autenticada ? sesionActual.uid : null,
    favoritos,
    cargando,
    cargados,
    error: errorCarga,
    mutando: Object.freeze([...mutaciones]),
  });
}

function publicar() {
  estado = estadoPublico();
  for (const observar of observadores) {
    try { observar(estado); } catch (error) { console.error('Error al observar favoritos:', error); }
  }
  window.dispatchEvent(new CustomEvent('magandhi:favoritos', { detail: estado }));
}

function sesionValida() {
  return sesionActual.estado === 'valida' && UUID.test(sesionActual.uid || '') &&
    !!sesionActual.sesion?.user?.email_confirmed_at;
}

function campanaValida(campana) {
  const valor = String(campana || '').trim();
  if (!UUID.test(valor)) throw new ErrorFavoritos('FV_SOLICITUD_INVALIDA');
  return valor;
}

export function favoritoGuardado(campana) {
  const id = String(campana || '').trim();
  return favoritos.some((item) => item.campana_id === id);
}

export function observarFavoritos(observador) {
  if (typeof observador !== 'function') return () => {};
  observadores.add(observador);
  observador(estado || estadoPublico());
  return () => observadores.delete(observador);
}

export async function refrescarFavoritos() {
  if (!sesionValida() || mutaciones.size > 0) return null;
  if (promesaCarga) return promesaCarga;
  const uidAlPedir = sesionActual.uid;
  const tokenSesion = generacionSesion;
  const tokenCarga = ++secuenciaCarga;
  cargando = true;
  errorCarga = false;
  publicar();
  const tarea = (async () => {
    try {
      const { data, error } = await supabase.rpc('fv_favoritos_listar');
      if (error || data?.error) throw await convertirError(error, data);
      const lista = normalizarFavoritos(data);
      if (tokenSesion !== generacionSesion || tokenCarga !== secuenciaCarga || uidAlPedir !== sesionActual.uid) return null;
      favoritos = lista;
      cargados = true;
      errorCarga = false;
      return favoritos;
    } catch (error) {
      if (tokenSesion !== generacionSesion || tokenCarga !== secuenciaCarga || uidAlPedir !== sesionActual.uid) return null;
      favoritos = Object.freeze([]);
      cargados = false;
      errorCarga = true;
      throw error instanceof ErrorFavoritos ? error : await convertirError(error, null);
    } finally {
      if (tokenSesion === generacionSesion && tokenCarga === secuenciaCarga) {
        cargando = false;
        promesaCarga = null;
        publicar();
      }
    }
  })();
  promesaCarga = tarea;
  return tarea;
}

export async function establecerFavorito(campana, favorito) {
  const id = campanaValida(campana);
  if (typeof favorito !== 'boolean') throw new ErrorFavoritos('FV_SOLICITUD_INVALIDA');
  if (!sesionValida()) throw new ErrorFavoritos('FV_SESION_REQUERIDA');
  if (promesaCarga) await promesaCarga;
  if (!sesionValida()) throw new ErrorFavoritos('FV_SESION_REQUERIDA');
  if (mutaciones.has(id) || mutaciones.size > 0) return null;
  const uidAlPedir = sesionActual.uid;
  const tokenSesion = generacionSesion;
  ++secuenciaCarga;
  mutaciones.add(id);
  publicar();
  try {
    const { data, error } = await supabase.rpc('fv_favorito_establecer', {
      p_campana_id: id,
      p_favorito: favorito,
    });
    if (error || data?.error) throw await convertirError(error, data);
    const lista = normalizarFavoritos(data);
    if (tokenSesion !== generacionSesion || uidAlPedir !== sesionActual.uid) return null;
    favoritos = lista;
    cargados = true;
    errorCarga = false;
    return favoritos;
  } catch (error) {
    if (tokenSesion !== generacionSesion || uidAlPedir !== sesionActual.uid) return null;
    favoritos = Object.freeze([]);
    cargados = false;
    cargando = false;
    errorCarga = true;
    throw error instanceof ErrorFavoritos ? error : await convertirError(error, null);
  } finally {
    if (tokenSesion === generacionSesion && uidAlPedir === sesionActual.uid) {
      mutaciones.delete(id);
      publicar();
    }
  }
}

export function mensajeErrorFavoritos(error, accion = 'actualizar') {
  const codigo = String(error?.codigo || '');
  if (/SESION|CUENTA/.test(codigo)) return 'Vuelve a iniciar sesión para usar tus favoritos.';
  if (/CAMPANA|NO_DISPONIBLE/.test(codigo)) return 'Este producto ya no está disponible para guardarlo.';
  if (/SOLICITUD|RESPUESTA/.test(codigo)) return 'No pudimos identificar este producto. Recarga la página e inténtalo de nuevo.';
  return accion === 'cargar'
    ? 'No pudimos cargar tus favoritos. Revisa tu conexión e inténtalo de nuevo.'
    : 'No pudimos actualizar tus favoritos. Revisa tu conexión e inténtalo de nuevo.';
}

observarSesionCliente((sesion) => {
  const uidAnterior = sesionActual.estado === 'valida' ? sesionActual.uid : null;
  const uidSiguiente = sesion.estado === 'valida' ? sesion.uid : null;
  const cambioIdentidad = uidSiguiente !== uidAnterior;
  sesionActual = sesion;

  if (cambioIdentidad) {
    ++generacionSesion;
    ++secuenciaCarga;
    promesaCarga = null;
    mutaciones.clear();
    favoritos = Object.freeze([]);
    cargados = false;
    cargando = false;
    errorCarga = false;
  }

  publicar();
  if (uidSiguiente && cambioIdentidad) {
    refrescarFavoritos().catch(() => { /* La interfaz ofrece reintento sin inventar estado. */ });
  }
});
