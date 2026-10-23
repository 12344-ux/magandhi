import { supabase, SUPABASE_URL } from '../supabase-config.js';
import { supabaseConToken, supabasePublico } from '../supabase-publico.js?v=1';
import { filaPerteneceACategoria } from './categorias.js?v=4';
import { resolverSolicitudAcotada } from './solicitud-acotada.js?v=1';

// MAGANDHI · Sistema nervioso SN1
// Cliente público compartido para composición, búsqueda y slots editoriales.

const BUCKET_CAMPANAS = 'campanas';
const CLAVE_SEMILLA = 'mg_sn_semilla_v1';
const MAX_COMPRABLE = 20;
const MAX_LIMITE_COMPOSICION = 36;
const MAX_LIMITE_BUSQUEDA = 60;
const MAX_TOTAL_BUSQUEDA = 10000;
const TAMANO_PAGINA_FALLBACK = 500;
const MAX_EXCLUSIONES_CONTEXTO = 100;
const TIEMPO_MAXIMO_COMPROBAR_SESION_MS = 1200;
const TIEMPO_MAXIMO_RPC_CON_SESION_MS = 3500;
const TIEMPO_MAXIMO_LECTURA_PUBLICA_MS = 8000;
const TIEMPO_MAXIMO_CATALOGO_FALLBACK_MS = 8000;
const FUENTES_LECTURA = new Set(['auto', 'sesion', 'publica', 'catalogo']);
const TIPOS_MODULO = new Set([
  'mosaico',
  'carril_derecha',
  'carril_izquierda',
  'destacado_horizontal',
  'duo_vertical',
  'cuadricula',
]);
const SUPERFICIES = new Set([
  'home_principal',
  'home_descubrimiento',
  'categoria',
  'producto_final',
  'carrito',
  'busqueda',
]);
const ETIQUETAS_RAZON = Object.freeze({
  coincidencia_nombre: 'Coincide con lo que buscas',
  coincidencia_categoria: 'Relacionado con tu búsqueda',
  coincidencia_contenido: 'Coincide con tu búsqueda',
  coincidencia_busqueda: 'Coincide con tu búsqueda',
  afinidad_cuenta: 'Pensado para tus intereses',
  misma_categoria: 'Relacionado con lo que estás viendo',
  complemento: 'Complementa tu selección',
  alternativa: 'Otra opción para ti',
  continuacion: 'Para seguir descubriendo',
  rutina: 'Completa tu rutina',
  popular: 'Popular en MAGANDHI',
  novedad: 'Novedad en MAGANDHI',
  descubrimiento: 'Selección para descubrir',
  exploracion: 'Una idea para explorar',
});
const RAZONES = new Set(Object.keys(ETIQUETAS_RAZON));
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATEGORIA_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MODULO_RE = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const VERSION_RE = /^[a-z0-9][a-z0-9._-]{0,59}$/;
const MODOS_COMPOSICION = new Set(['contextual', 'personalizado']);
const MODOS_BUSQUEDA = new Set(['busqueda', 'categoria', 'exploracion']);
const TRANSLITERACION_BUSQUEDA = Object.freeze({
  'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 't', 'ø': 'o', 'ı': 'i',
});
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS_CATALOGO_SEGURO = [
  'id', 'nombre', 'slug', 'categoria_codigo', 'categoria_nombre',
  'detalle_presentacion', 'precio_venta', 'imagen_banner_path', 'imagenes',
  'sello_elegido', 'agotado', 'aviso_urgencia_activo',
  'aviso_urgencia_cantidad', 'orden', 'max_comprable', 'categoria_codigos',
];
const raizTienda = new URL('../', import.meta.url);
const urlBuscar = new URL('buscar/', raizTienda);
const urlStorage = new URL(SUPABASE_URL);
const prefijoStorage = `/storage/v1/object/public/${BUCKET_CAMPANAS}/`;
const formatoPrecio = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const estadosSlot = new WeakMap();
const instrumentacionesExternas = new WeakMap();
const slotsRegistrados = new Set();
const formulariosRegistrados = new WeakSet();
let secuenciaSlot = 0;
let secuenciaBuscador = 0;
let semillaMemoria = '';
let catalogoPromesa = null;
let productoRecibido = false;
let productoActual = null;
let huellaProducto = '';
let carritoActual = null;
let huellaCarrito = '';
let observadorNuevosSlots = null;
let buscadoresGlobalesListos = false;

class ContratoSNError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ContratoSNError';
  }
}

export class RespuestaSNError extends Error {
  constructor(codigo) {
    super(`SN1 rechazó la solicitud (${codigo}).`);
    this.name = 'RespuestaSNError';
    this.codigo = codigo;
  }
}

function texto(valor, maximo = 240) {
  return typeof valor === 'string'
    ? valor.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, maximo)
    : '';
}

function textoEstricto(valor, maximo, formato, { permitirVacio = false } = {}) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (limpio.length > maximo || (!permitirVacio && !limpio) || (formato && !formato.test(limpio))) {
    return null;
  }
  return limpio;
}

function consultaNormalizada(valor) {
  return texto(valor, 120).toLocaleLowerCase('es');
}

function claveBusqueda(valor) {
  return consultaNormalizada(valor)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/gu, '')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .replace(/ß/g, 'ss')
    .replace(/[łđðþøı]/g, (caracter) => TRANSLITERACION_BUSQUEDA[caracter])
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function consultaSensible(valor) {
  const crudo = texto(valor, 120).toLowerCase();
  if (!crudo) return false;
  const digitos = crudo.replace(/[^0-9]/g, '');
  return /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(crudo) ||
    /(^|[^a-z0-9])@[a-z0-9._-]{2,}/i.test(crudo) ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(crudo) ||
    digitos.length >= 7;
}

function entero(valor, minimo, maximo, respaldo) {
  return Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo ? valor : respaldo;
}

function abortado(signal) {
  return !!signal?.aborted;
}

function errorAbortado() {
  try { return new DOMException('La solicitud fue reemplazada.', 'AbortError'); }
  catch {
    const error = new Error('La solicitud fue reemplazada.');
    error.name = 'AbortError';
    return error;
  }
}

function lanzarSiAbortado(signal) {
  if (abortado(signal)) throw errorAbortado();
}

async function resolverPeticion(peticion, signal, tiempoMaximoMs = TIEMPO_MAXIMO_LECTURA_PUBLICA_MS) {
  lanzarSiAbortado(signal);
  const resultado = await resolverSolicitudAcotada(peticion, { signal, tiempoMaximoMs });
  lanzarSiAbortado(signal);
  return resultado;
}

function rechazoPorSesion(resultado) {
  const estadoHttp = Number(resultado?.status || resultado?.error?.status || 0);
  const codigo = String(resultado?.error?.code || '').toUpperCase();
  const detalle = `${resultado?.error?.message || ''} ${resultado?.error?.details || ''}`.toLowerCase();
  return estadoHttp === 401 || codigo === 'PGRST301' ||
    (/jwt|token|authorization/.test(detalle) && /invalid|expired|missing|malformed/.test(detalle));
}

function requiereReintentoPublico(resultado) {
  return rechazoPorSesion(resultado) || Boolean(resultado?.error) && Number(resultado?.status || 0) === 0;
}

async function haySesionDisponible(signal) {
  try {
    const { data, error } = await resolverPeticion(
      supabase.auth.getSession(),
      signal,
      TIEMPO_MAXIMO_COMPROBAR_SESION_MS,
    );
    return !error && data?.session?.access_token ? data.session : null;
  } catch (error) {
    if (abortado(signal) || error?.name === 'AbortError') throw errorAbortado();
    return false;
  }
}

/**
 * Conserva personalización cuando existe una sesión disponible. En modo auto,
 * una sesión vencida o bloqueada repite solo esta RPC como anon. Las páginas
 * paginadas guardan la fuente elegida y la fijan en sus siguientes lecturas.
 */
async function resolverRpcLectura(
  nombre,
  parametros,
  signal,
  fuente = 'auto',
  sesionUidEsperado = '',
) {
  if (fuente === 'sesion') {
    const sesion = await haySesionDisponible(signal);
    const uid = sesion?.user?.id || '';
    if (!sesion || !UUID_RE.test(sesionUidEsperado) || uid !== sesionUidEsperado) {
      throw new ContratoSNError('La sesión usada para ordenar esta página ya no está disponible.');
    }
    return {
      resultado: await resolverPeticion(
        supabaseConToken(sesion.access_token).rpc(nombre, parametros),
        signal,
        TIEMPO_MAXIMO_RPC_CON_SESION_MS,
      ),
      fuente: 'sesion',
      sesionUid: uid,
    };
  }
  if (fuente === 'publica') {
    return {
      resultado: await resolverPeticion(
        supabasePublico.rpc(nombre, parametros),
        signal,
        TIEMPO_MAXIMO_LECTURA_PUBLICA_MS,
      ),
      fuente: 'publica',
      sesionUid: '',
    };
  }

  const sesion = await haySesionDisponible(signal);
  if (sesion) {
    try {
      const resultado = await resolverPeticion(
        supabaseConToken(sesion.access_token).rpc(nombre, parametros),
        signal,
        TIEMPO_MAXIMO_RPC_CON_SESION_MS,
      );
      if (!requiereReintentoPublico(resultado)) {
        return { resultado, fuente: 'sesion', sesionUid: sesion.user?.id || '' };
      }
    } catch (error) {
      if (abortado(signal) || error?.name === 'AbortError') throw errorAbortado();
    }
  }

  return {
    resultado: await resolverPeticion(
      supabasePublico.rpc(nombre, parametros),
      signal,
      TIEMPO_MAXIMO_LECTURA_PUBLICA_MS,
    ),
    fuente: 'publica',
    sesionUid: '',
  };
}

function crearSemilla() {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((valor) => valor.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }
}

function requestIdLocal() {
  try {
    if (typeof globalThis.crypto?.randomUUID !== 'function') return null;
    const requestId = globalThis.crypto.randomUUID().toLowerCase();
    return UUID_RE.test(requestId) ? requestId : null;
  } catch {
    return null;
  }
}

function semillaDePestana() {
  if (semillaMemoria) return semillaMemoria;
  try {
    const guardada = sessionStorage.getItem(CLAVE_SEMILLA) || '';
    if (/^[a-zA-Z0-9_-]{16,80}$/.test(guardada)) {
      semillaMemoria = guardada;
      return semillaMemoria;
    }
    semillaMemoria = crearSemilla();
    sessionStorage.setItem(CLAVE_SEMILLA, semillaMemoria);
    return semillaMemoria;
  } catch {
    semillaMemoria = crearSemilla();
    return semillaMemoria;
  }
}

function superficieValida(valor) {
  const superficie = texto(valor, 64).toLowerCase();
  if (!SUPERFICIES.has(superficie)) throw new TypeError('La superficie SN1 no es válida.');
  return superficie;
}

function categoriaValida(valor) {
  const categoria = typeof valor === 'string'
    ? valor.normalize('NFKC').trim().toLowerCase()
    : '';
  return categoria.length <= 64 && CATEGORIA_RE.test(categoria) ? categoria : null;
}

function slugValido(valor) {
  const slug = typeof valor === 'string'
    ? valor.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
    : '';
  return slug.length <= 180 && SLUG_RE.test(slug) && !UUID_RE.test(slug) ? slug : null;
}

function codigoModulo(valor) {
  if (typeof valor !== 'string') return '';
  const codigo = valor.normalize('NFKC').trim().toLowerCase();
  return MODULO_RE.test(codigo) ? codigo : '';
}

function slugsDeExclusion(...fuentes) {
  const salida = [];
  const vistos = new Set();
  const agregar = (valor) => {
    if (salida.length >= MAX_EXCLUSIONES_CONTEXTO || valor === null || valor === undefined) return;
    if (Array.isArray(valor) || valor instanceof Set) {
      for (const item of valor) agregar(item);
      return;
    }
    if (typeof valor === 'object') {
      agregar(valor.slug ?? valor.producto_slug);
      return;
    }
    if (typeof valor !== 'string') return;
    const slug = slugValido(valor);
    if (!slug || vistos.has(slug)) return;
    vistos.add(slug);
    salida.push(slug);
  };
  fuentes.forEach(agregar);
  return salida;
}

// El motor solo permite contexto editorial explícito. UID, customer_id, correo,
// ubicación y cualquier otro dato no forman parte del manifiesto público.
function contextoSeguro(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return {};
  const salida = {};
  const slug = slugValido(valor.slug ?? valor.producto_slug);
  const categoria = categoriaValida(valor.categoria ?? valor.categoria_codigo);
  const consulta = texto(valor.consulta, 120);
  const excluir = Array.isArray(valor.excluir) ? slugsDeExclusion(valor.excluir) : [];
  if (slug) salida.slug = slug;
  if (categoria) salida.categoria = categoria;
  if (consulta) salida.consulta = consulta;
  if (excluir.length) salida.excluir = excluir;
  return salida;
}

function listaTextos(valor, maximo = 12) {
  if (!Array.isArray(valor)) return [];
  return valor.map((item) => texto(item, 1000)).filter(Boolean).slice(0, maximo);
}

function focoNormalizado(valor) {
  const numero = typeof valor === 'number'
    ? valor
    : (typeof valor === 'string' && valor.trim() ? Number(valor) : NaN);
  return Number.isFinite(numero) && numero >= 0 && numero <= 1 ? numero : 0.5;
}

function razonCodigo(valor) {
  const codigo = texto(valor, 40).toLowerCase();
  return RAZONES.has(codigo) ? codigo : 'descubrimiento';
}

function etiquetaRazon(valor) {
  return ETIQUETAS_RAZON[razonCodigo(valor)];
}

function normalizarAsset(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const path = texto(valor.path, 1000);
  if (!path) return null;
  const ancho = entero(valor.ancho, 1, 10000, 0);
  const alto = entero(valor.alto, 1, 10000, 0);
  return Object.freeze({
    rol: texto(valor.rol, 32).toLowerCase(),
    path,
    ancho,
    alto,
    foco_x: focoNormalizado(valor.foco_x),
    foco_y: focoNormalizado(valor.foco_y),
    alt: texto(valor.alt, 240),
  });
}

function normalizarProducto(valor) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null;
  const id = texto(valor.id, 120);
  const nombre = texto(valor.nombre, 180);
  const slugEntrada = typeof valor.slug === 'string'
    ? valor.slug.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()
    : '';
  const slug = slugValido(slugEntrada) || '';
  if (!id || !nombre || (slugEntrada && !slug)) return null;

  if (!Object.prototype.hasOwnProperty.call(valor, 'max_comprable')) return null;
  const maxComprable = entero(valor.max_comprable, 0, MAX_COMPRABLE, -1);
  if (maxComprable < 0) return null;

  const precio = Number(valor.precio_venta);
  const codigos = Array.isArray(valor.categoria_codigos)
    ? valor.categoria_codigos.map((item) => texto(item, 100)).filter(Boolean).slice(0, 20)
    : [];
  const categoriaCodigo = texto(valor.categoria_codigo, 100);
  if (categoriaCodigo && !codigos.includes(categoriaCodigo)) codigos.unshift(categoriaCodigo);

  return Object.freeze({
    id,
    nombre,
    slug,
    categoria_codigo: categoriaCodigo,
    categoria_nombre: texto(valor.categoria_nombre, 120),
    categoria_codigos: Object.freeze(codigos),
    detalle_presentacion: texto(valor.detalle_presentacion, 240),
    precio_venta: Number.isFinite(precio) && precio >= 0 ? precio : null,
    imagen_banner_path: texto(valor.imagen_banner_path, 1000),
    imagenes: Object.freeze(listaTextos(valor.imagenes)),
    sello_elegido: valor.sello_elegido === true,
    agotado: valor.agotado === true,
    aviso_urgencia_activo: valor.aviso_urgencia_activo === true,
    aviso_urgencia_cantidad: entero(valor.aviso_urgencia_cantidad, 1, 9999, null),
    max_comprable: maxComprable,
    asset: normalizarAsset(valor.asset),
    razon: razonCodigo(valor.razon),
    orden: Number.isFinite(Number(valor.orden)) ? Number(valor.orden) : 0,
  });
}

function productoDisponible(producto) {
  return !!producto && producto.agotado !== true &&
    Number.isSafeInteger(producto.max_comprable) && producto.max_comprable > 0;
}

function agregarExclusion(conjunto, valor) {
  if (!valor) return;
  if (typeof valor === 'object') {
    agregarExclusion(conjunto, valor.id ?? valor.producto_id ?? valor.campana_id);
    agregarExclusion(conjunto, valor.slug ?? valor.producto_slug);
    return;
  }
  const dato = texto(String(valor), 180).toLowerCase();
  if (dato) conjunto.add(dato);
}

function conjuntoExclusiones(exclusiones, actual) {
  const conjunto = new Set();
  const lista = Array.isArray(exclusiones) || exclusiones instanceof Set
    ? [...exclusiones]
    : (exclusiones ? [exclusiones] : []);
  lista.forEach((valor) => agregarExclusion(conjunto, valor));
  agregarExclusion(conjunto, actual);
  return conjunto;
}

function clavesProducto(producto) {
  const claves = [`id:${producto.id.toLowerCase()}`];
  if (producto.slug) claves.push(`slug:${producto.slug.toLowerCase()}`);
  return claves;
}

function registrarProductoVisto(vistos, producto) {
  const claves = clavesProducto(producto);
  if (claves.some((clave) => vistos.has(clave))) return false;
  claves.forEach((clave) => vistos.add(clave));
  return true;
}

function productoExcluido(producto, exclusiones) {
  return exclusiones.has(producto.id.toLowerCase()) ||
    (!!producto.slug && exclusiones.has(producto.slug.toLowerCase()));
}

function listasDeProductos(valor) {
  if (Array.isArray(valor)) return [valor];
  if (!valor || typeof valor !== 'object') return [];
  if (Array.isArray(valor.productos)) return [valor.productos];
  if (Array.isArray(valor.modulos)) {
    return valor.modulos.map((modulo) => Array.isArray(modulo?.productos) ? modulo.productos : []);
  }
  return [];
}

export function extraerProductos(valor, opciones = {}) {
  const actual = Object.prototype.hasOwnProperty.call(opciones, 'productoActual')
    ? opciones.productoActual
    : productoActual;
  const exclusiones = conjuntoExclusiones(opciones.exclusiones, actual);
  const vistos = new Set();
  const salida = [];
  for (const lista of listasDeProductos(valor)) {
    for (const item of lista) {
      const producto = normalizarProducto(item);
      if (!productoDisponible(producto) || productoExcluido(producto, exclusiones)) continue;
      if (!registrarProductoVisto(vistos, producto)) continue;
      salida.push(producto);
    }
  }
  return salida;
}

function construirConsultaCatalogoSeguro(desde, hasta) {
  return supabasePublico.from('sn_catalogo_seguro_v1')
    .select(CAMPOS_CATALOGO_SEGURO.join(','), { count: 'exact' })
    .order('orden', { ascending: true })
    .order('slug', { ascending: true })
    .range(desde, hasta);
}

async function cargarCatalogoSeguro(signal) {
  if (!catalogoPromesa) {
    const tarea = (async () => {
      const vistos = new Set();
      const productos = [];
      let totalEsperado = null;
      const ahora = () => globalThis.performance?.now?.() ?? Date.now();
      const limite = ahora() + TIEMPO_MAXIMO_CATALOGO_FALLBACK_MS;

      // PostgREST puede truncar silenciosamente una lectura sin rango. Se usan
      // páginas explícitas y count exacto para probar completitud hasta el techo.
      for (let desde = 0; desde <= MAX_TOTAL_BUSQUEDA; desde += TAMANO_PAGINA_FALLBACK) {
        const restante = Math.floor(limite - ahora());
        if (restante <= 0) {
          throw new ContratoSNError('El catálogo seguro SN1 superó el tiempo máximo de lectura.');
        }
        const resultado = await resolverPeticion(
          construirConsultaCatalogoSeguro(
            desde,
            desde + TAMANO_PAGINA_FALLBACK - 1,
          ),
          undefined,
          Math.min(TIEMPO_MAXIMO_LECTURA_PUBLICA_MS, restante),
        );
        if (resultado.error) throw resultado.error;
        if (!Array.isArray(resultado.data) || !Number.isSafeInteger(resultado.count) ||
            resultado.count < 0 || resultado.count > MAX_TOTAL_BUSQUEDA) {
          throw new ContratoSNError('El catálogo seguro SN1 no devolvió una página contable válida.');
        }
        if (totalEsperado === null) totalEsperado = resultado.count;
        else if (resultado.count !== totalEsperado) {
          throw new ContratoSNError('El catálogo seguro SN1 cambió durante la paginación.');
        }
        const filasEsperadas = Math.min(
          TAMANO_PAGINA_FALLBACK,
          Math.max(0, totalEsperado - desde),
        );
        if (resultado.data.length !== filasEsperadas) {
          throw new ContratoSNError('El catálogo seguro SN1 devolvió una página truncada.');
        }

        for (const fila of resultado.data) {
          const producto = normalizarProducto(fila);
          if (!producto || !productoDisponible(producto)) {
            throw new ContratoSNError('El catálogo seguro SN1 devolvió una fila no comprable.');
          }
          if (!registrarProductoVisto(vistos, producto)) {
            throw new ContratoSNError('El catálogo seguro SN1 devolvió productos duplicados.');
          }
          productos.push(producto);
        }
        if (productos.length === totalEsperado) return Object.freeze(productos);
      }

      throw new ContratoSNError('El catálogo seguro SN1 no terminó dentro del máximo público.');
    })();
    catalogoPromesa = tarea;
    const liberar = () => {
      if (catalogoPromesa === tarea) catalogoPromesa = null;
    };
    void tarea.then(liberar, liberar);
  }

  // Cada consumidor puede cancelarse sin abortar la lectura compartida de los
  // demás. La tarea común tiene además su propio límite total de ocho segundos.
  return resolverSolicitudAcotada(catalogoPromesa, {
    signal,
    tiempoMaximoMs: TIEMPO_MAXIMO_CATALOGO_FALLBACK_MS,
  });
}

function validarRaizRespuesta(valor, campos) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    throw new ContratoSNError('SN1 no devolvió un objeto.');
  }
  if (valor.ok === false) {
    const codigo = typeof valor.codigo === 'string'
      ? valor.codigo.normalize('NFKC').trim().toUpperCase()
      : '';
    if (!/^SN_[A-Z0-9_]{1,60}$/.test(codigo)) {
      throw new ContratoSNError('SN1 devolvió un rechazo sin código válido.');
    }
    throw new RespuestaSNError(codigo);
  }
  if (valor.ok !== true) {
    throw new ContratoSNError('SN1 no indicó el estado de la respuesta.');
  }
  for (const campo of campos) {
    if (!Object.prototype.hasOwnProperty.call(valor, campo)) {
      throw new ContratoSNError(`SN1 omitió ${campo}.`);
    }
  }
}

function normalizarComposicion(valor, superficie, opciones) {
  validarRaizRespuesta(valor, ['request_id', 'modelo_version', 'modo', 'superficie', 'modulos']);
  const requestId = textoEstricto(valor.request_id, 36, UUID_RE)?.toLowerCase() || '';
  const modeloVersion = textoEstricto(valor.modelo_version, 60, VERSION_RE) || '';
  const modo = textoEstricto(valor.modo, 60, VERSION_RE) || '';
  const superficieRespuesta = textoEstricto(valor.superficie, 64)?.toLowerCase() || '';
  if (!requestId || !modeloVersion || !MODOS_COMPOSICION.has(modo) ||
      superficieRespuesta !== superficie || !Array.isArray(valor.modulos) ||
      valor.modulos.length > 3) {
    throw new ContratoSNError('La composición SN1 no corresponde a la superficie solicitada.');
  }
  const exclusiones = conjuntoExclusiones(opciones.exclusiones, opciones.productoActual);
  const vistos = new Set();
  const idsModulo = new Set();
  const modulos = [];
  let filasRecibidas = 0;
  for (const modulo of valor.modulos) {
    if (!modulo || typeof modulo !== 'object' || Array.isArray(modulo) ||
        !TIPOS_MODULO.has(modulo.tipo) || !Array.isArray(modulo.productos)) {
      throw new ContratoSNError('SN1 devolvió un módulo inválido.');
    }
    filasRecibidas += modulo.productos.length;
    if (filasRecibidas > opciones.limite) {
      throw new ContratoSNError('SN1 devolvió más módulos o filas que las solicitadas.');
    }
    const id = codigoModulo(modulo.id);
    const titulo = texto(modulo.titulo, 180);
    if (!id || !titulo || idsModulo.has(id)) throw new ContratoSNError('SN1 devolvió un módulo incompleto o repetido.');
    idsModulo.add(id);
    const productos = [];
    for (const crudo of modulo.productos) {
      const producto = normalizarProducto(crudo);
      if (!producto) throw new ContratoSNError('SN1 devolvió una fila de composición inválida.');
      if (!registrarProductoVisto(vistos, producto)) {
        throw new ContratoSNError('SN1 devolvió productos duplicados en la composición.');
      }
      if (!productoDisponible(producto) || productoExcluido(producto, exclusiones)) continue;
      productos.push(producto);
    }
    if (!productos.length) continue;
    modulos.push(Object.freeze({
      id,
      tipo: modulo.tipo,
      titulo,
      subtitulo: texto(modulo.subtitulo, 280),
      productos: Object.freeze(productos),
    }));
  }
  return Object.freeze({
    ok: true,
    request_id: requestId,
    modelo_version: modeloVersion,
    modo,
    superficie,
    modulos: Object.freeze(modulos),
  });
}

function tituloFallback(superficie) {
  if (superficie === 'producto_final') return 'También puedes descubrir';
  if (superficie === 'carrito') return 'Completa tu selección';
  if (superficie === 'busqueda') return 'Explora otras ideas';
  if (superficie === 'categoria') return 'Sigue descubriendo';
  return 'Más para descubrir';
}

async function composicionFallback(superficie, opciones) {
  lanzarSiAbortado(opciones.signal);
  const catalogo = await cargarCatalogoSeguro(opciones.signal);
  lanzarSiAbortado(opciones.signal);
  const exclusiones = conjuntoExclusiones(opciones.exclusiones, opciones.productoActual);
  const productos = catalogo
    .filter((producto) => !productoExcluido(producto, exclusiones))
    .slice(0, opciones.limite);
  const tipo = TIPOS_MODULO.has(opciones.layoutFallback) ? opciones.layoutFallback : 'cuadricula';
  return Object.freeze({
    ok: true,
    request_id: requestIdLocal(),
    modelo_version: 'sn_catalogo_seguro_v1',
    modo: 'fallback_catalogo_seguro',
    superficie,
    modulos: Object.freeze(productos.length ? [Object.freeze({
      id: `fallback-${superficie}`,
      tipo,
      titulo: opciones.tituloFallback || tituloFallback(superficie),
      subtitulo: opciones.subtituloFallback || '',
      productos: Object.freeze(productos),
    })] : []),
  });
}

function opcionesComposicion(entrada, contextoPosicional) {
  const base = typeof entrada === 'string'
    ? { superficie: entrada, contexto: contextoPosicional }
    : (entrada && typeof entrada === 'object' ? entrada : {});
  const limite = entero(base.limite, 1, MAX_LIMITE_COMPOSICION, 12);
  const actual = Object.prototype.hasOwnProperty.call(base, 'productoActual')
    ? base.productoActual
    : productoActual;
  const exclusiones = base.exclusiones || [];
  const contexto = contextoSeguro(base.contexto);
  const excluir = slugsDeExclusion(
    actual,
    contexto.slug,
    exclusiones,
    contexto.excluir,
  );
  if (excluir.length) contexto.excluir = excluir;
  return {
    superficie: superficieValida(base.superficie),
    contexto,
    limite,
    signal: base.signal,
    exclusiones,
    productoActual: actual,
    layoutFallback: base.layoutFallback,
    tituloFallback: texto(base.tituloFallback, 180),
    subtituloFallback: texto(base.subtituloFallback, 280),
  };
}

export async function solicitarComposicion(entrada, contextoPosicional) {
  const opciones = opcionesComposicion(entrada, contextoPosicional);
  let resultado;
  try {
    const lectura = await resolverRpcLectura('sn_recomendar_v1', {
      p_superficie: opciones.superficie,
      p_contexto: opciones.contexto,
      p_semilla: semillaDePestana(),
      p_limite: opciones.limite,
    }, opciones.signal);
    resultado = lectura.resultado;
  } catch (error) {
    if (abortado(opciones.signal) || error?.name === 'AbortError') throw errorAbortado();
    return composicionFallback(opciones.superficie, opciones);
  }
  if (!resultado || typeof resultado !== 'object' || resultado.error) {
    return composicionFallback(opciones.superficie, opciones);
  }
  try {
    return normalizarComposicion(resultado.data, opciones.superficie, opciones);
  } catch (error) {
    if (error instanceof RespuestaSNError && error.codigo === 'SN_APAGADO') {
      return composicionFallback(opciones.superficie, opciones);
    }
    throw error;
  }
}

function normalizarBusqueda(valor, opciones, fuenteCliente, sesionUid) {
  validarRaizRespuesta(valor, ['modelo_version', 'modo', 'consulta', 'total', 'productos']);
  const modeloVersion = textoEstricto(valor.modelo_version, 60, VERSION_RE) || '';
  const modo = textoEstricto(valor.modo, 60, VERSION_RE) || '';
  const consultaNulaPermitida = valor.consulta === null && opciones.consulta === '';
  const consultaRespuesta = consultaNulaPermitida
    ? ''
    : textoEstricto(valor.consulta, 120, null, { permitirVacio: true });
  const consultaIndexable = claveBusqueda(consultaRespuesta);
  const modoEsperado = consultaIndexable
    ? 'busqueda'
    : (opciones.categoria ? 'categoria' : 'exploracion');
  if (!modeloVersion || !MODOS_BUSQUEDA.has(modo) || modo !== modoEsperado ||
      consultaRespuesta === null ||
      claveBusqueda(consultaRespuesta) !== claveBusqueda(opciones.consulta) ||
      !Array.isArray(valor.productos) || valor.productos.length > opciones.limite ||
      !Number.isSafeInteger(valor.total) || valor.total < 0 || valor.total > MAX_TOTAL_BUSQUEDA) {
    throw new ContratoSNError('SN1 devolvió resultados de búsqueda inválidos.');
  }
  const filasEsperadas = Math.min(opciones.limite, Math.max(0, valor.total - opciones.desde));
  if (valor.productos.length !== filasEsperadas) {
    throw new ContratoSNError('SN1 devolvió filas incoherentes con el total y el desplazamiento.');
  }
  const exclusiones = conjuntoExclusiones(opciones.exclusiones, opciones.productoActual);
  const vistos = new Set();
  const productos = [];
  for (const crudo of valor.productos) {
    const producto = normalizarProducto(crudo);
    if (!producto) throw new ContratoSNError('SN1 devolvió una fila de búsqueda inválida.');
    if (!registrarProductoVisto(vistos, producto)) {
      throw new ContratoSNError('SN1 devolvió productos duplicados en la búsqueda.');
    }
    if (!productoDisponible(producto)) {
      throw new ContratoSNError('SN1 devolvió una fila no comprable en la búsqueda.');
    }
    if (opciones.categoria && !filaPerteneceACategoria(producto, opciones.categoria)) {
      throw new ContratoSNError('SN1 devolvió una fila ajena a la categoría solicitada.');
    }
    if (productoExcluido(producto, exclusiones)) continue;
    productos.push(producto);
  }
  return Object.freeze({
    ok: true,
    modelo_version: modeloVersion,
    modo,
    consulta: consultaRespuesta,
    total: valor.total,
    fuente_cliente: fuenteCliente,
    sesion_uid: fuenteCliente === 'sesion' && UUID_RE.test(sesionUid) ? sesionUid : '',
    productos: Object.freeze(productos),
  });
}

function opcionesBusqueda(entrada, categoriaPosicional) {
  const base = typeof entrada === 'string'
    ? { consulta: entrada, categoria: categoriaPosicional }
    : (entrada && typeof entrada === 'object' ? entrada : {});
  return {
    consulta: texto(base.consulta, 120),
    categoria: categoriaValida(base.categoria),
    limite: entero(base.limite, 1, MAX_LIMITE_BUSQUEDA, 12),
    desde: entero(base.desde, 0, MAX_TOTAL_BUSQUEDA, 0),
    signal: base.signal,
    fuenteCliente: FUENTES_LECTURA.has(base.fuenteCliente) ? base.fuenteCliente : 'auto',
    sesionUid: typeof base.sesionUid === 'string' && UUID_RE.test(base.sesionUid)
      ? base.sesionUid.toLowerCase()
      : '',
    exclusiones: base.exclusiones || [],
    productoActual: Object.prototype.hasOwnProperty.call(base, 'productoActual')
      ? base.productoActual
      : productoActual,
  };
}

async function busquedaFallback(opciones) {
  lanzarSiAbortado(opciones.signal);
  const catalogo = await cargarCatalogoSeguro(opciones.signal);
  lanzarSiAbortado(opciones.signal);
  const termino = claveBusqueda(opciones.consulta);
  const exclusiones = conjuntoExclusiones(opciones.exclusiones, opciones.productoActual);
  const filtrados = catalogo.filter((producto) => {
    if (productoExcluido(producto, exclusiones)) return false;
    if (opciones.categoria && !filaPerteneceACategoria(producto, opciones.categoria)) return false;
    if (!termino) return true;
    const bolsa = claveBusqueda([
      producto.nombre,
      producto.detalle_presentacion,
      producto.categoria_nombre,
      producto.categoria_codigo,
      ...producto.categoria_codigos,
    ].filter(Boolean).join(' '));
    return termino.split(' ').every((parte) => bolsa.includes(parte));
  });
  const total = Math.min(filtrados.length, MAX_TOTAL_BUSQUEDA);
  return Object.freeze({
    ok: true,
    modelo_version: 'sn_catalogo_seguro_v1',
    modo: 'fallback_catalogo_seguro',
    consulta: opciones.consulta,
    total,
    fuente_cliente: 'catalogo',
    sesion_uid: '',
    productos: Object.freeze(filtrados.slice(
      opciones.desde,
      Math.min(total, opciones.desde + opciones.limite),
    )),
  });
}

export async function buscarProductos(entrada = {}, categoriaPosicional) {
  const opciones = opcionesBusqueda(entrada, categoriaPosicional);
  // La misma frontera prudente del servidor se aplica antes de cualquier RPC o
  // fallback: una caída nunca convierte PII en búsqueda local ni telemetría.
  if (consultaSensible(opciones.consulta)) {
    throw new RespuestaSNError('SN_CONSULTA_SENSIBLE');
  }
  if (opciones.fuenteCliente === 'catalogo') return busquedaFallback(opciones);

  let lectura;
  try {
    lectura = await resolverRpcLectura('sn_buscar_v1', {
      p_consulta: opciones.consulta,
      p_categoria: opciones.categoria,
      p_semilla: semillaDePestana(),
      p_limite: opciones.limite,
      p_desde: opciones.desde,
    }, opciones.signal, opciones.fuenteCliente, opciones.sesionUid);
  } catch (error) {
    if (abortado(opciones.signal) || error?.name === 'AbortError') throw errorAbortado();
    if (opciones.fuenteCliente !== 'auto') throw error;
    return busquedaFallback(opciones);
  }

  const { resultado, fuente, sesionUid } = lectura;
  if (!resultado || typeof resultado !== 'object' || resultado.error) {
    if (opciones.fuenteCliente !== 'auto') {
      throw resultado?.error || new ContratoSNError('SN1 no devolvió una respuesta de búsqueda.');
    }
    return busquedaFallback(opciones);
  }
  try {
    return normalizarBusqueda(resultado.data, opciones, fuente, sesionUid);
  } catch (error) {
    if (error instanceof RespuestaSNError && error.codigo === 'SN_APAGADO' &&
        opciones.fuenteCliente === 'auto') {
      return busquedaFallback(opciones);
    }
    throw error;
  }
}

function pathSeguro(path) {
  const valor = texto(path, 1000);
  if (!valor) return '';
  if (/^https:\/\//i.test(valor)) {
    try {
      const candidata = new URL(valor);
      if (candidata.origin !== urlStorage.origin || candidata.username || candidata.password ||
          candidata.port || !candidata.pathname.startsWith(prefijoStorage)) return '';
      return candidata.href;
    } catch { return ''; }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(valor)) return '';
  const segmentos = valor.split('/');
  if (!segmentos.length) return '';
  for (const segmento of segmentos) {
    let decodificado;
    try { decodificado = decodeURIComponent(segmento); } catch { return ''; }
    if (!segmento || decodificado === '.' || decodificado === '..' || /[\\/]/.test(decodificado)) return '';
  }
  const { data } = supabasePublico.storage.from(BUCKET_CAMPANAS).getPublicUrl(valor);
  return data?.publicUrl || '';
}

function pathConVarianteLiviana(path) {
  const punto = path.lastIndexOf('.');
  const barra = path.lastIndexOf('/');
  if (punto <= barra + 1 || punto === path.length - 1) return '';
  const base = path.slice(0, punto);
  return base.endsWith('-sm') ? path : `${base}-sm.${path.slice(punto + 1)}`;
}

function pathLiviana(pathGrande) {
  const path = texto(pathGrande, 1000);
  if (!path) return '';
  if (/^https:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const pathname = pathConVarianteLiviana(url.pathname);
      if (!pathname) return '';
      url.pathname = pathname;
      return url.href;
    } catch { return ''; }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return '';
  return pathConVarianteLiviana(path);
}

function candidatosImagen(producto) {
  const mastersConLiviana = [
    producto.asset?.path,
    ...(Array.isArray(producto.imagenes) ? producto.imagenes : []),
  ];
  const entradas = [];
  for (const master of mastersConLiviana) entradas.push(pathLiviana(master), master);
  // El banner histórico no promete una pareja -sm; probarla primero causaría
  // un 404 sistemático antes de cada imagen válida.
  entradas.push(producto.imagen_banner_path);

  const vistos = new Set();
  const salida = [];
  for (const entrada of entradas) {
    const url = pathSeguro(entrada);
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    salida.push(url);
  }
  return salida;
}

function hrefProducto(producto) {
  if (producto.slug) return new URL(`producto/${encodeURIComponent(producto.slug)}/`, raizTienda).href;
  const url = new URL('producto/', raizTienda);
  url.searchParams.set('id', producto.id);
  return url.href;
}

function precioProducto(valor) {
  return typeof valor === 'number' && Number.isFinite(valor)
    ? `$ ${formatoPrecio.format(Math.round(valor))}`
    : '';
}

function crear(tag, clase, contenido) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (contenido !== undefined) nodo.textContent = contenido;
  return nodo;
}

function tamanoAsset(producto) {
  if (producto.asset?.ancho > 0 && producto.asset?.alto > 0) {
    const proporcion = producto.asset.ancho / producto.asset.alto;
    if (proporcion >= 0.4 && proporcion <= 2.4) {
      return { ancho: producto.asset.ancho, alto: producto.asset.alto };
    }
  }
  const rol = producto.asset?.rol;
  if (rol === 'vertical') return { ancho: 800, alto: 1000 };
  if (rol === 'horizontal') return { ancho: 960, alto: 540 };
  if (rol === 'panoramico') return { ancho: 1000, alto: 500 };
  return { ancho: 800, alto: 800 };
}

export function crearTarjetaProducto(productoEntrada, opciones = {}) {
  const producto = normalizarProducto(productoEntrada);
  if (!productoDisponible(producto)) return null;

  const enlace = crear('a', 'sn-card');
  enlace.href = hrefProducto(producto);
  enlace.dataset.snProductoId = producto.id;
  if (producto.slug) enlace.dataset.snProductoSlug = producto.slug;
  if (producto.asset?.rol) enlace.dataset.snAssetRol = producto.asset.rol;
  enlace.setAttribute('aria-label', `Ver ${producto.nombre}`);

  const media = crear('div', 'sn-card__media');
  const tamano = tamanoAsset(producto);
  media.style.aspectRatio = `${tamano.ancho} / ${tamano.alto}`;
  const candidatos = candidatosImagen(producto);
  if (candidatos.length) {
    const imagen = document.createElement('img');
    imagen.src = candidatos[0];
    imagen.alt = producto.asset?.alt || producto.nombre;
    imagen.loading = 'lazy';
    imagen.decoding = 'async';
    imagen.width = tamano.ancho;
    imagen.height = tamano.alto;
    imagen.style.objectPosition = `${(producto.asset?.foco_x ?? 0.5) * 100}% ${(producto.asset?.foco_y ?? 0.5) * 100}%`;
    let indice = 0;
    imagen.addEventListener('error', () => {
      indice += 1;
      if (indice < candidatos.length) {
        imagen.src = candidatos[indice];
        return;
      }
      const vacio = crear('span', 'sn-card__placeholder', 'MAGANDHI');
      vacio.setAttribute('aria-hidden', 'true');
      media.replaceChildren(vacio);
    });
    media.appendChild(imagen);
  } else {
    const vacio = crear('span', 'sn-card__placeholder', 'MAGANDHI');
    vacio.setAttribute('aria-hidden', 'true');
    media.appendChild(vacio);
  }

  const cuerpo = crear('div', 'sn-card__body');
  const categoria = texto(producto.categoria_nombre || producto.categoria_codigo, 120);
  if (categoria) cuerpo.appendChild(crear('span', 'sn-card__category', categoria));
  const nivel = opciones.nivelTitulo === 2 ? 'h2' : 'h3';
  cuerpo.appendChild(crear(nivel, 'sn-card__title', producto.nombre));
  if (producto.detalle_presentacion) {
    cuerpo.appendChild(crear('span', 'sn-card__detail', producto.detalle_presentacion));
  }
  if (producto.razon && opciones.mostrarRazon !== false) {
    cuerpo.appendChild(crear('span', 'sn-card__reason', etiquetaRazon(producto.razon)));
  }
  const precio = precioProducto(producto.precio_venta);
  if (precio) {
    const precioNodo = crear('span', 'sn-card__price', precio);
    precioNodo.appendChild(crear('small', '', ' COP'));
    cuerpo.appendChild(precioNodo);
  }
  enlace.append(media, cuerpo);
  return enlace;
}

function emitirEvento(tipo, extra) {
  if (typeof window.mgEvento === 'function') {
    return window.mgEvento(tipo, extra) === true;
  }
  const detalle = { tipo, extra, aceptado: false };
  window.dispatchEvent(new CustomEvent('magandhi:analitica-interna', { detail: detalle }));
  return detalle.aceptado === true;
}

function metadatosEvento(respuesta, modulo, posicion, producto) {
  const requestId = texto(respuesta.request_id, 120).toLowerCase();
  const superficie = texto(respuesta.superficie, 64).toLowerCase();
  const moduloId = codigoModulo(modulo?.id);
  const slug = slugValido(producto.slug);
  if (!UUID_RE.test(requestId) || !SUPERFICIES.has(superficie) || !moduloId || !slug ||
      !Number.isSafeInteger(posicion) || posicion < 1 || posicion > 100) return null;
  return {
    request_id: requestId,
    superficie,
    slug,
    slot: moduloId,
    posicion,
    layout_codigo: moduloId,
    modelo_version: respuesta.modelo_version,
    razon: razonCodigo(producto.razon),
  };
}

function emitirImpresionPendiente(estado, tarjeta) {
  const metadatos = estado.impresionesPendientes.get(tarjeta);
  if (!metadatos || !emitirEvento('recomendacion_impresion', metadatos)) return false;
  estado.impresionesPendientes.delete(tarjeta);
  estado.observadorImpresiones?.unobserve(tarjeta);
  return true;
}

function emitirClicRecomendacion(estado, tarjeta, metadatos) {
  // Se reemite de forma idempotente antes de cada clic. Esto también rearma la
  // correlación si la persona cambió su decisión o aceptó una nueva política
  // después de que la tarjeta ya había registrado una impresión anterior.
  if (!emitirEvento('recomendacion_impresion', metadatos)) return;
  estado.impresionesPendientes.delete(tarjeta);
  estado.observadorImpresiones?.unobserve(tarjeta);
  emitirEvento('recomendacion_click', metadatos);
}

function registrarImpresion(estado, tarjeta, metadatos) {
  if (!metadatos) return;
  // Se registra aunque IntersectionObserver no exista: un clic puede consumir
  // esta impresión pendiente de forma idempotente antes de emitir el clic.
  estado.impresionesPendientes.set(tarjeta, metadatos);
  if (typeof IntersectionObserver !== 'function') return;
  if (!estado.observadorImpresiones) {
    estado.observadorImpresiones = new IntersectionObserver((entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting || entrada.intersectionRatio < 0.5) continue;
        emitirImpresionPendiente(estado, entrada.target);
      }
    }, { threshold: [0.5] });
  }
  estado.observadorImpresiones.observe(tarjeta);
}

// Permite conservar un layout histórico (como la vitrina del home) sin perder
// la medición homogénea del manifiesto. Cada tarjeta se vincula por id/slug al
// módulo real; si la relación no es unívoca, no se emite telemetría.
export function instrumentarRecomendaciones(contenedor, respuesta) {
  if (!(contenedor instanceof Element) || !respuesta || typeof respuesta !== 'object') return () => {};
  const anterior = instrumentacionesExternas.get(contenedor);
  anterior?.observadorImpresiones?.disconnect();
  anterior?.controlador?.abort();

  const controlador = new AbortController();
  const estado = {
    controlador,
    observadorImpresiones: null,
    impresionesPendientes: new Map(),
  };
  instrumentacionesExternas.set(contenedor, estado);

  const porId = new Map();
  const porSlug = new Map();
  const registrar = (mapa, clave, referencia) => {
    if (!clave) return;
    mapa.set(clave, mapa.has(clave) ? null : referencia);
  };
  if (Array.isArray(respuesta.modulos)) {
    respuesta.modulos.forEach((modulo) => {
      if (!codigoModulo(modulo?.id) || !Array.isArray(modulo.productos)) return;
      modulo.productos.forEach((producto, indice) => {
        const referencia = { modulo, producto, posicion: indice + 1 };
        registrar(porId, texto(producto?.id, 120).toLowerCase(), referencia);
        registrar(porSlug, slugValido(producto?.slug), referencia);
      });
    });
  }

  const tarjetas = [...contenedor.querySelectorAll('[data-sn-producto-id],[data-sn-producto-slug]')];
  tarjetas.forEach((tarjeta) => {
    const referencias = [];
    const id = texto(tarjeta.dataset.snProductoId, 120).toLowerCase();
    const slug = slugValido(tarjeta.dataset.snProductoSlug);
    if (id) referencias.push(porId.get(id));
    if (slug) referencias.push(porSlug.get(slug));
    if (!referencias.length || referencias.some((referencia) => !referencia)) return;
    const referencia = referencias[0];
    if (referencias.some((item) => item !== referencia) || !productoDisponible(referencia.producto)) return;
    const metadatos = metadatosEvento(
      respuesta,
      referencia.modulo,
      referencia.posicion,
      referencia.producto,
    );
    if (!metadatos) return;
    tarjeta.addEventListener('click', () => {
      emitirClicRecomendacion(estado, tarjeta, metadatos);
    }, {
      signal: controlador.signal,
    });
    registrarImpresion(estado, tarjeta, metadatos);
  });
  return () => {
    controlador.abort();
    estado.observadorImpresiones?.disconnect();
    estado.impresionesPendientes.clear();
    if (instrumentacionesExternas.get(contenedor) === estado) instrumentacionesExternas.delete(contenedor);
  };
}

function encabezadoModulo(modulo) {
  const cabecera = crear('header', 'sn-module__header');
  const textos = crear('div', 'sn-module__headings');
  textos.appendChild(crear('h2', 'sn-module__title', modulo.titulo));
  if (modulo.subtitulo) textos.appendChild(crear('p', 'sn-module__subtitle', modulo.subtitulo));
  cabecera.appendChild(textos);
  return cabecera;
}

function botonCarril(direccion, viewport, modulo) {
  const anterior = direccion < 0;
  const boton = crear('button', `sn-module__arrow sn-module__arrow--${anterior ? 'prev' : 'next'}`, anterior ? '‹' : '›');
  boton.type = 'button';
  boton.setAttribute('aria-label', anterior ? `Ver anteriores en ${modulo.titulo}` : `Ver siguientes en ${modulo.titulo}`);
  boton.addEventListener('click', () => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    viewport.scrollBy({
      left: direccion * Math.max(240, viewport.clientWidth * 0.82),
      behavior: reducido ? 'auto' : 'smooth',
    });
  });
  return boton;
}

function renderizarModulo(modulo, respuesta, estado) {
  const seccion = crear('section', `sn-module sn-module--${modulo.tipo}`);
  seccion.dataset.snModulo = modulo.id;
  seccion.setAttribute('aria-label', modulo.titulo);
  const cabecera = encabezadoModulo(modulo);
  const pista = crear('div', 'sn-module__track');
  let posicion = 0;
  for (const producto of modulo.productos) {
    posicion += 1;
    const tarjeta = crearTarjetaProducto(producto);
    if (!tarjeta) continue;
    const metadatos = metadatosEvento(respuesta, modulo, posicion, producto);
    if (metadatos) {
      tarjeta.addEventListener('click', () => {
        emitirClicRecomendacion(estado, tarjeta, metadatos);
      });
      registrarImpresion(estado, tarjeta, metadatos);
    }
    pista.appendChild(tarjeta);
  }
  if (!pista.children.length) return null;

  if (modulo.tipo === 'carril_derecha' || modulo.tipo === 'carril_izquierda') {
    const controles = crear('div', 'sn-module__controls');
    const viewport = crear('div', 'sn-module__viewport');
    viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', `${modulo.titulo}, carril de productos`);
    viewport.appendChild(pista);
    const previo = botonCarril(-1, viewport, modulo);
    const siguiente = botonCarril(1, viewport, modulo);
    controles.append(previo, siguiente);
    cabecera.appendChild(controles);
    seccion.append(cabecera, viewport);
  } else {
    seccion.append(cabecera, pista);
  }
  return seccion;
}

function limpiarEstadoVisual(slot, estado) {
  estado.observadorImpresiones?.disconnect();
  estado.observadorImpresiones = null;
  estado.impresionesPendientes = new Map();
  slot.replaceChildren();
}

function renderizarSlot(slot, respuesta, estado) {
  limpiarEstadoVisual(slot, estado);
  const fragmento = document.createDocumentFragment();
  for (const modulo of respuesta.modulos) {
    const nodo = renderizarModulo(modulo, respuesta, estado);
    if (nodo) fragmento.appendChild(nodo);
  }
  if (!fragmento.childNodes.length) {
    slot.hidden = true;
    return;
  }
  slot.appendChild(fragmento);
  slot.hidden = false;
}

function estadoDelSlot(slot) {
  let estado = estadosSlot.get(slot);
  if (estado) return estado;
  const idDeclarado = texto(slot.dataset.snSlot, 80).replace(/[^a-zA-Z0-9_-]/g, '');
  estado = {
    slotId: idDeclarado || `sn-slot-${++secuenciaSlot}`,
    generacion: 0,
    controlador: null,
    promesa: null,
    intentado: false,
    ultimaRespuesta: null,
    observadorEspera: null,
    observadorImpresiones: null,
    impresionesPendientes: new Map(),
  };
  estadosSlot.set(slot, estado);
  slotsRegistrados.add(slot);
  return estado;
}

function nodosProducto(selector) {
  if (!selector) return [];
  try { return [...document.querySelectorAll(selector)]; }
  catch { return []; }
}

function exclusionesDelSlot(slot) {
  const exclusiones = [];
  nodosProducto(slot.dataset.snExcluirSelector).forEach((nodo) => {
    if (nodo === slot || slot.contains(nodo)) return;
    const id = nodo.dataset?.snProductoId;
    const slug = nodo.dataset?.snProductoSlug;
    if (id || slug) exclusiones.push({ id, slug });
  });
  if (productoActual) exclusiones.push(productoActual);
  if (Array.isArray(carritoActual?.snapshot?.items) && slot.dataset.snSuperficie === 'carrito') {
    carritoActual.snapshot.items.forEach((item) => exclusiones.push(item?.campana_id));
  }
  return exclusiones;
}

function contextoDelSlot(slot) {
  const contexto = {};
  const categoria = categoriaValida(slot.dataset.snCategoria);
  const consulta = texto(slot.dataset.snConsulta, 120);
  if (categoria) contexto.categoria = categoria;
  if (consulta) contexto.consulta = consulta;
  if (slot.dataset.snSuperficie === 'producto_final' && productoActual?.disponible) {
    contexto.slug = productoActual.slug;
    if (productoActual.categoria) contexto.categoria = productoActual.categoria;
  }
  return contextoSeguro(contexto);
}

function carritoConContenido() {
  const snapshot = carritoActual?.snapshot;
  return carritoActual?.visible === true && snapshot?.habilitado === true &&
    Number(snapshot.cantidad_lineas) > 0 && Array.isArray(snapshot.items) && snapshot.items.length > 0;
}

function objetivoEspera(slot) {
  const selector = slot.dataset.snEsperaSelector;
  if (!selector) return null;
  try { return document.querySelector(selector); }
  catch { return null; }
}

function debeEsperar(slot, estado) {
  if (slot.hasAttribute('data-sn-espera-producto') &&
      (!productoRecibido || !productoActual?.disponible)) return true;
  if (slot.hasAttribute('data-sn-espera-carrito') && !carritoConContenido()) return true;
  const objetivo = objetivoEspera(slot);
  if (objetivo?.getAttribute('aria-busy') === 'true') {
    if (!estado.observadorEspera && typeof MutationObserver === 'function') {
      estado.observadorEspera = new MutationObserver(() => {
        if (objetivo.getAttribute('aria-busy') === 'true') return;
        estado.observadorEspera?.disconnect();
        estado.observadorEspera = null;
        montarSlot(slot, { forzar: true });
      });
      estado.observadorEspera.observe(objetivo, { attributes: true, attributeFilter: ['aria-busy'] });
    }
    return true;
  }
  estado.observadorEspera?.disconnect();
  estado.observadorEspera = null;
  return false;
}

async function montarSlot(slot, { forzar = false } = {}) {
  if (!(slot instanceof Element) || !slot.matches('[data-sn-slot]')) return null;
  const estado = estadoDelSlot(slot);
  if (slot.dataset.snDisabled === 'true') {
    estado.controlador?.abort();
    estado.generacion += 1;
    estado.promesa = null;
    estado.intentado = false;
    estado.ultimaRespuesta = null;
    estado.observadorEspera?.disconnect();
    estado.observadorEspera = null;
    limpiarEstadoVisual(slot, estado);
    slot.removeAttribute('aria-busy');
    slot.hidden = true;
    return null;
  }
  if (debeEsperar(slot, estado)) {
    const deshabilitado = slot.dataset.snDisabled === 'true';
    const productoSinDisponibilidad = slot.hasAttribute('data-sn-espera-producto') &&
      productoRecibido && !productoActual?.disponible;
    if (deshabilitado ||
        (slot.hasAttribute('data-sn-espera-carrito') && !carritoConContenido()) ||
        productoSinDisponibilidad) {
      estado.controlador?.abort();
      estado.generacion += 1;
      estado.promesa = null;
      estado.intentado = false;
      estado.ultimaRespuesta = null;
      limpiarEstadoVisual(slot, estado);
    }
    slot.hidden = true;
    return null;
  }
  if (estado.promesa && !forzar) return estado.promesa;
  if (estado.intentado && !forzar) return estado.ultimaRespuesta;
  if (forzar) estado.controlador?.abort();
  estado.intentado = true;

  let superficie;
  try { superficie = superficieValida(slot.dataset.snSuperficie || slot.dataset.snSlot); }
  catch {
    slot.hidden = true;
    return null;
  }
  const controlador = new AbortController();
  estado.controlador = controlador;
  const generacion = ++estado.generacion;
  slot.setAttribute('aria-busy', 'true');
  const limite = entero(Number(slot.dataset.snLimite), 1, MAX_LIMITE_COMPOSICION, 12);
  const layoutFallback = TIPOS_MODULO.has(slot.dataset.snLayout) ? slot.dataset.snLayout : undefined;

  const tarea = solicitarComposicion({
    superficie,
    contexto: contextoDelSlot(slot),
    limite,
    signal: controlador.signal,
    exclusiones: exclusionesDelSlot(slot),
    productoActual,
    layoutFallback,
    tituloFallback: slot.dataset.snTitulo,
    subtituloFallback: slot.dataset.snSubtitulo,
  }).then((respuesta) => {
    if (generacion !== estado.generacion || controlador.signal.aborted || !slot.isConnected) return null;
    renderizarSlot(slot, respuesta, estado);
    estado.ultimaRespuesta = respuesta;
    return respuesta;
  }).catch((error) => {
    if (error?.name !== 'AbortError' && generacion === estado.generacion) {
      limpiarEstadoVisual(slot, estado);
      slot.hidden = true;
      console.warn('No se pudo montar un slot SN1:', error);
    }
    return null;
  }).finally(() => {
    if (generacion === estado.generacion) {
      slot.removeAttribute('aria-busy');
      estado.promesa = null;
    }
  });
  estado.promesa = tarea;
  return tarea;
}

function slotsEn(raiz) {
  if (!raiz) return [];
  const salida = [];
  if (raiz instanceof Element && raiz.matches('[data-sn-slot]')) salida.push(raiz);
  if (typeof raiz.querySelectorAll === 'function') salida.push(...raiz.querySelectorAll('[data-sn-slot]'));
  return [...new Set(salida)];
}

export function montarSlots(raiz = document, opciones = {}) {
  const tareas = slotsEn(raiz).map((slot) => montarSlot(slot, opciones));
  return Promise.all(tareas);
}

function refrescarSlots(filtro) {
  for (const slot of [...slotsRegistrados]) {
    if (!slot.isConnected) {
      slotsRegistrados.delete(slot);
      continue;
    }
    if (filtro(slot)) montarSlot(slot, { forzar: true });
  }
}

function detalleProductoSeguro(detalle) {
  const id = texto(detalle?.id, 120);
  const slug = slugValido(detalle?.slug);
  const categoria = categoriaValida(detalle?.categoria ?? detalle?.categoria_codigo) ||
    categoriaValida(detalle?.categoria_nombre);
  const max = entero(detalle?.max_comprable, 0, MAX_COMPRABLE, -1);
  const agotado = detalle?.agotado === true || max === 0;
  if (!id || !slug) return null;
  return { id, slug, categoria, agotado, max_comprable: max, disponible: !agotado && max > 0 };
}

window.addEventListener('magandhi:producto', (evento) => {
  productoRecibido = true;
  const siguiente = detalleProductoSeguro(evento.detail);
  const huella = siguiente
    ? `${siguiente.id}|${siguiente.slug}|${siguiente.categoria || ''}|${siguiente.disponible}`
    : 'sin-producto';
  if (huella === huellaProducto) return;
  huellaProducto = huella;
  productoActual = siguiente;
  refrescarSlots((slot) => slot.dataset.snSuperficie === 'producto_final');
});

window.addEventListener('magandhi:carrito', (evento) => {
  const detalle = evento.detail && typeof evento.detail === 'object' ? evento.detail : null;
  const snapshot = detalle?.snapshot;
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const huella = detalle?.visible === true && snapshot?.habilitado === true
    ? `${snapshot.version || 0}|${snapshot.cantidad_lineas || 0}|${items.map((item) => `${item.campana_id}:${item.cantidad}`).join(',')}`
    : 'sin-contenido';
  carritoActual = detalle ? { visible: detalle.visible === true, snapshot: detalle.snapshot || null } : null;
  if (huella === huellaCarrito) return;
  huellaCarrito = huella;
  refrescarSlots((slot) => slot.dataset.snSuperficie === 'carrito');
});

function posicionarSugerencias(estado) {
  const { lista, entrada } = estado;
  const propiedades = ['top', 'left', 'right', 'width', 'max-height', 'transform'];
  if (!window.matchMedia('(max-width: 720px)').matches) {
    propiedades.forEach((propiedad) => lista.style.removeProperty(propiedad));
    return;
  }
  const viewport = window.visualViewport;
  const anchoViewport = viewport?.width || window.innerWidth;
  const altoViewport = viewport?.height || window.innerHeight;
  const origenX = viewport?.offsetLeft || 0;
  const origenY = viewport?.offsetTop || 0;
  const margen = 12;
  const separacion = 8;
  const rect = entrada.getBoundingClientRect();
  const limiteSuperior = origenY + margen;
  const limiteInferior = origenY + altoViewport - margen;
  const alturaInterior = Math.max(1, limiteInferior - limiteSuperior);
  const maximoDeseado = Math.min(390, Math.max(1, altoViewport * 0.65), alturaInterior);
  const espacioAbajo = Math.max(0, limiteInferior - rect.bottom - separacion);
  const espacioArriba = Math.max(0, rect.top - separacion - limiteSuperior);
  const abrirArriba = espacioAbajo < Math.min(160, maximoDeseado) && espacioArriba > espacioAbajo;
  const espacioElegido = abrirArriba ? espacioArriba : espacioAbajo;
  const maxHeight = Math.max(1, Math.min(
    maximoDeseado,
    espacioElegido >= 80 ? espacioElegido : alturaInterior,
  ));
  const topPropuesto = abrirArriba
    ? rect.top - separacion - maxHeight
    : rect.bottom + separacion;
  const top = Math.min(
    Math.max(limiteSuperior, topPropuesto),
    Math.max(limiteSuperior, limiteInferior - maxHeight),
  );

  lista.style.top = `${Math.round(top)}px`;
  lista.style.left = `${Math.round(origenX + margen)}px`;
  lista.style.right = 'auto';
  lista.style.width = `${Math.max(0, Math.floor(anchoViewport - margen * 2))}px`;
  lista.style.maxHeight = `${Math.floor(maxHeight)}px`;
  lista.style.transform = 'none';
}

function cerrarSugerencias(estado, { limpiarEstado = true } = {}) {
  estado.indice = -1;
  estado.lista.replaceChildren();
  estado.lista.hidden = true;
  estado.entrada.setAttribute('aria-expanded', 'false');
  estado.entrada.removeAttribute('aria-activedescendant');
  if (limpiarEstado && estado.estado) estado.estado.textContent = '';
}

function cancelarSugerencias(estado) {
  clearTimeout(estado.temporizador);
  estado.controlador?.abort();
  estado.controlador = null;
  estado.generacion += 1;
  cerrarSugerencias(estado);
}

function activarSugerencia(estado, indice) {
  const opciones = [...estado.lista.querySelectorAll('[role="option"]')];
  if (!opciones.length) return;
  estado.indice = (indice + opciones.length) % opciones.length;
  opciones.forEach((opcion, posicion) => {
    const activa = posicion === estado.indice;
    opcion.setAttribute('aria-selected', String(activa));
    if (activa) {
      estado.entrada.setAttribute('aria-activedescendant', opcion.id);
      opcion.scrollIntoView({ block: 'nearest' });
    }
  });
}

function pintarSugerencias(estado, productos) {
  estado.lista.replaceChildren();
  productos.slice(0, 5).forEach((producto, indice) => {
    const opcion = crear('a', 'sn-suggestion');
    opcion.href = hrefProducto(producto);
    opcion.id = `${estado.lista.id}-opcion-${indice + 1}`;
    opcion.setAttribute('role', 'option');
    opcion.tabIndex = -1;
    opcion.setAttribute('aria-selected', 'false');
    opcion.appendChild(crear('span', 'sn-suggestion__name', producto.nombre));
    const detalle = texto(producto.categoria_nombre || producto.detalle_presentacion, 120);
    if (detalle) opcion.appendChild(crear('span', 'sn-suggestion__detail', detalle));
    opcion.addEventListener('mousemove', () => activarSugerencia(estado, indice));
    estado.lista.appendChild(opcion);
  });
  const cantidad = estado.lista.children.length;
  estado.lista.hidden = cantidad === 0;
  estado.entrada.setAttribute('aria-expanded', String(cantidad > 0));
  if (cantidad > 0) posicionarSugerencias(estado);
  if (estado.estado) estado.estado.textContent = cantidad
    ? `${cantidad} ${cantidad === 1 ? 'sugerencia disponible' : 'sugerencias disponibles'}`
    : 'No encontramos sugerencias.';
}

function navegarBusqueda(consulta, categoria) {
  const destino = new URL(urlBuscar.href);
  destino.searchParams.set('q', texto(consulta, 120));
  const categoriaSegura = categoriaValida(categoria);
  if (categoriaSegura) destino.searchParams.set('categoria', categoriaSegura);
  window.location.assign(destino.href);
}

function prepararBuscador(formulario) {
  if (formulariosRegistrados.has(formulario)) return;
  const entrada = formulario.querySelector('input[type="search"]');
  if (!entrada) return;
  formulariosRegistrados.add(formulario);
  formulario.action = urlBuscar.href;
  formulario.method = 'get';
  if (!entrada.name) entrada.name = 'q';
  const estadoTexto = formulario.querySelector('[data-buscador-estado]');
  const lista = crear('div', 'sn-suggestions');
  lista.id = `sn-sugerencias-${++secuenciaBuscador}`;
  lista.setAttribute('role', 'listbox');
  lista.setAttribute('aria-label', 'Sugerencias de productos');
  lista.hidden = true;
  formulario.appendChild(lista);
  entrada.setAttribute('role', 'combobox');
  entrada.setAttribute('aria-autocomplete', 'list');
  entrada.setAttribute('aria-haspopup', 'listbox');
  entrada.setAttribute('aria-controls', lista.id);
  entrada.setAttribute('aria-expanded', 'false');

  const estado = {
    formulario,
    entrada,
    estado: estadoTexto,
    lista,
    indice: -1,
    temporizador: null,
    controlador: null,
    generacion: 0,
  };
  formulario.__snBuscador = estado;

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const consulta = texto(entrada.value, 120);
    if (!consulta) {
      cancelarSugerencias(estado);
      entrada.focus();
      return;
    }
    cancelarSugerencias(estado);
    navegarBusqueda(consulta, formulario.dataset.buscadorCategoria);
  });

  entrada.addEventListener('input', () => {
    clearTimeout(estado.temporizador);
    estado.controlador?.abort();
    cerrarSugerencias(estado, { limpiarEstado: false });
    estado.indice = -1;
    entrada.removeAttribute('aria-activedescendant');
    const consulta = texto(entrada.value, 120);
    const categoria = categoriaValida(formulario.dataset.buscadorCategoria);
    if (consulta.length < 2) {
      cerrarSugerencias(estado);
      return;
    }
    const generacion = ++estado.generacion;
    estado.temporizador = window.setTimeout(async () => {
      const controlador = new AbortController();
      estado.controlador = controlador;
      if (estado.estado) estado.estado.textContent = 'Buscando sugerencias…';
      try {
        const respuesta = await buscarProductos({
          consulta,
          categoria,
          limite: 5,
          desde: 0,
          signal: controlador.signal,
          productoActual: null,
        });
        if (generacion !== estado.generacion || texto(entrada.value, 120) !== consulta ||
            categoriaValida(formulario.dataset.buscadorCategoria) !== categoria) return;
        pintarSugerencias(estado, respuesta.productos);
      } catch (error) {
        if (error?.name !== 'AbortError' && generacion === estado.generacion) cerrarSugerencias(estado);
      }
    }, 280);
  });

  entrada.addEventListener('keydown', (evento) => {
    if (evento.key === 'Tab') {
      cancelarSugerencias(estado);
      return;
    }
    const opciones = [...lista.querySelectorAll('[role="option"]')];
    if (evento.key === 'Escape' && !lista.hidden) {
      evento.preventDefault();
      cancelarSugerencias(estado);
      return;
    }
    if (!opciones.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(evento.key)) return;
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      activarSugerencia(estado, estado.indice + 1);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      activarSugerencia(estado, estado.indice < 0 ? opciones.length - 1 : estado.indice - 1);
    } else if (estado.indice >= 0) {
      evento.preventDefault();
      window.location.assign(opciones[estado.indice].href);
    }
  });

  entrada.addEventListener('focus', () => {
    if (lista.children.length && texto(entrada.value, 120).length >= 2) {
      lista.hidden = false;
      entrada.setAttribute('aria-expanded', 'true');
      posicionarSugerencias(estado);
    }
  });

  formulario.addEventListener('focusout', (evento) => {
    if (evento.relatedTarget instanceof Node && formulario.contains(evento.relatedTarget)) return;
    queueMicrotask(() => {
      if (!formulario.contains(document.activeElement)) cancelarSugerencias(estado);
    });
  });
}

export function configurarBuscadores(raiz = document) {
  if (raiz instanceof Element && raiz.matches('[data-buscador-catalogo]')) prepararBuscador(raiz);
  raiz.querySelectorAll?.('[data-buscador-catalogo]').forEach(prepararBuscador);
  if (!buscadoresGlobalesListos) {
    buscadoresGlobalesListos = true;
    document.addEventListener('pointerdown', (evento) => {
      document.querySelectorAll('[data-buscador-catalogo]').forEach((formulario) => {
        const estado = formulario.__snBuscador;
        if (estado && !formulario.contains(evento.target)) cancelarSugerencias(estado);
      });
    });
    const reposicionarAbiertos = () => {
      document.querySelectorAll('[data-buscador-catalogo]').forEach((formulario) => {
        const estado = formulario.__snBuscador;
        if (estado && !estado.lista.hidden) posicionarSugerencias(estado);
      });
    };
    window.addEventListener('resize', reposicionarAbiertos, { passive: true });
    window.addEventListener('scroll', reposicionarAbiertos, { passive: true, capture: true });
    window.visualViewport?.addEventListener('resize', reposicionarAbiertos, { passive: true });
    window.visualViewport?.addEventListener('scroll', reposicionarAbiertos, { passive: true });
  }
}

function iniciarMontajeAutomatico() {
  montarSlots();
  configurarBuscadores(document);
  if (typeof MutationObserver === 'function' && document.documentElement && !observadorNuevosSlots) {
    observadorNuevosSlots = new MutationObserver((cambios) => {
      for (const cambio of cambios) {
        cambio.addedNodes.forEach((nodo) => {
          if (!(nodo instanceof Element)) return;
          montarSlots(nodo);
          configurarBuscadores(nodo);
        });
      }
    });
    observadorNuevosSlots.observe(document.documentElement, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciarMontajeAutomatico, { once: true });
} else {
  queueMicrotask(iniciarMontajeAutomatico);
}
