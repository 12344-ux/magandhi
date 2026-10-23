import { supabase, SUPABASE_URL } from '../supabase-config.js';
import { supabasePublico } from '../supabase-publico.js?v=1';
import { resolverSolicitudAcotada } from '../componentes/solicitud-acotada.js?v=1';
import { listarCarrito } from '../carrito/carrito-core.js?v=3';
import { observarSesionCliente, obtenerSesionCliente } from '../cliente/cliente-sesion.js';
import { codigoAtribucionParaIntencion } from '../scripts/atribucion-promocional.js?v=1';

export const VERSION_COMPRA = 1;
const CLAVE_BORRADOR = 'mg_compra_borrador_v1';
const CLAVE_PAGO_DIRECTO = 'mg_pago_en_curso';
const CLAVE_PAGO_CARRITO = 'mg_pago_carrito_en_curso';
const TTL_BORRADOR = 2 * 60 * 60 * 1000;
const MAX_FUTURO = 60 * 1000;
const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCIA = /^[A-Za-z0-9_-]{6,64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ErrorCompra extends Error {
  constructor(codigo, mensaje, opciones = {}) {
    super(mensaje);
    this.name = 'ErrorCompra';
    this.codigo = codigo;
    this.causa = opciones.causa;
  }
}

export function moneda(valor) {
  return '$ ' + Math.round(Number(valor)).toLocaleString('es-CO') + ' COP';
}

function entero(valor, minimo, maximo = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo;
}

function rutaRetornoSegura(valor, fallback = '/') {
  try {
    const url = new URL(valor || fallback, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname.startsWith('/compra/')) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

function origenValido(origen) {
  if (!origen || typeof origen !== 'object') return false;
  if (origen.tipo === 'directo') {
    return typeof origen.producto === 'string' && origen.producto.length > 0 && origen.producto.length <= 200 &&
      entero(origen.cantidad, 1, 20) && typeof origen.retorno === 'string';
  }
  return origen.tipo === 'carrito' && UUID.test(origen.uid || '') && UUID.test(origen.carritoId || '') &&
    entero(origen.version, 0) && typeof origen.retorno === 'string';
}

function datosPersonalesGuardadosValidos(datos) {
  return datos === null || validarDatosPersonales(datos).valido;
}

function entregaGuardadaValida(entrega) {
  return entrega === null || validarEntrega(entrega).valido;
}

function resumenGuardadoValido(resumen) {
  if (resumen === null) return true;
  return !!resumen && typeof resumen === 'object' && typeof resumen.fingerprint === 'string' &&
    resumen.fingerprint.length > 0 && Array.isArray(resumen.items) && resumen.items.length > 0 &&
    resumen.items.every((item) => item && typeof item.nombre === 'string' && entero(item.cantidad, 1, 20) &&
      Number.isFinite(item.subtotal) && item.subtotal >= 0) && Number.isFinite(resumen.total) && resumen.total >= 0 &&
    entero(resumen.unidades, 1) && Number.isSafeInteger(resumen.confirmadoEn);
}

function borradorValido(borrador, instante = Date.now()) {
  return !!borrador && typeof borrador === 'object' && borrador.version === VERSION_COMPRA &&
    Number.isSafeInteger(borrador.iniciadoEn) && Number.isSafeInteger(borrador.actualizadoEn) &&
    borrador.iniciadoEn > 0 && borrador.iniciadoEn <= instante + MAX_FUTURO &&
    borrador.actualizadoEn >= borrador.iniciadoEn && borrador.actualizadoEn <= instante + MAX_FUTURO &&
    instante - borrador.actualizadoEn <= TTL_BORRADOR && origenValido(borrador.origen) &&
    datosPersonalesGuardadosValidos(borrador.datos) && entregaGuardadaValida(borrador.entrega) &&
    resumenGuardadoValido(borrador.resumen);
}

function guardarBorrador(borrador) {
  const siguiente = { ...borrador, actualizadoEn: Date.now() };
  if (!borradorValido(siguiente)) throw new ErrorCompra('BORRADOR_INVALIDO', 'No pudimos guardar esta compra. Vuelve al producto o al carrito e inténtalo de nuevo.');
  try {
    sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(siguiente));
  } catch (error) {
    throw new ErrorCompra('ALMACENAMIENTO_NO_DISPONIBLE', 'Tu navegador no permitió conservar la compra entre pasos. Revisa la configuración de privacidad e inténtalo de nuevo.', { causa: error });
  }
  return siguiente;
}

export function leerBorrador() {
  try {
    const borrador = JSON.parse(sessionStorage.getItem(CLAVE_BORRADOR) || 'null');
    if (!borradorValido(borrador)) {
      sessionStorage.removeItem(CLAVE_BORRADOR);
      return null;
    }
    return borrador;
  } catch {
    try { sessionStorage.removeItem(CLAVE_BORRADOR); } catch { /* Sin almacenamiento. */ }
    return null;
  }
}

export function olvidarBorrador() {
  try { sessionStorage.removeItem(CLAVE_BORRADOR); } catch { /* El borrador ya no es recuperable. */ }
}

function crearBorrador(origen) {
  const ahora = Date.now();
  return guardarBorrador({
    version: VERSION_COMPRA,
    iniciadoEn: ahora,
    actualizadoEn: ahora,
    origen,
    resumen: null,
    datos: null,
    entrega: null,
  });
}

export function iniciarCompraDirecta({ producto, cantidad, retorno = '/' }) {
  const identificador = String(producto || '').trim();
  const unidades = Number(cantidad);
  if (!identificador || identificador.length > 200 || !entero(unidades, 1, 20)) return false;
  try {
    crearBorrador({ tipo: 'directo', producto: identificador, cantidad: unidades, retorno: rutaRetornoSegura(retorno) });
    return true;
  } catch {
    return false;
  }
}

export function iniciarCompraCarrito({ uid, carritoId, version, retorno = '/carrito/' }) {
  const origen = {
    tipo: 'carrito',
    uid: String(uid || '').trim(),
    carritoId: String(carritoId || '').trim(),
    version: Number(version),
    retorno: rutaRetornoSegura(retorno, '/carrito/'),
  };
  if (!origenValido(origen)) return false;
  try {
    crearBorrador(origen);
    return true;
  } catch {
    return false;
  }
}

export function normalizarTelefonoColombiano(valor) {
  let digitos = String(valor || '').replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('57')) digitos = digitos.slice(2);
  return /^\d{10}$/.test(digitos) ? digitos : '';
}

export function validarDatosPersonales(entrada = {}) {
  const datos = {
    nombre: String(entrada.nombre || '').replace(/\s+/g, ' ').trim(),
    correo: String(entrada.correo || '').trim(),
    telefono: normalizarTelefonoColombiano(entrada.telefono),
  };
  const campos = {
    nombre: datos.nombre.length >= 2 && datos.nombre.length <= 120,
    correo: datos.correo.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo),
    telefono: /^\d{10}$/.test(datos.telefono),
  };
  return { datos, campos, valido: Object.values(campos).every(Boolean) };
}

export function validarEntrega(entrada = {}) {
  const datos = {
    departamento: String(entrada.departamento || '').trim(),
    ciudad: String(entrada.ciudad || '').replace(/\s+/g, ' ').trim(),
    direccion: String(entrada.direccion || '').replace(/\s+/g, ' ').trim(),
    detalles: String(entrada.detalles || '').replace(/\s+/g, ' ').trim(),
  };
  const campos = {
    departamento: datos.departamento.length > 0 && datos.departamento.length <= 80,
    ciudad: datos.ciudad.length >= 2 && datos.ciudad.length <= 80,
    direccion: datos.direccion.length >= 3 && datos.direccion.length <= 120,
    detalles: datos.detalles.length <= 70,
  };
  return { datos, campos, valido: Object.values(campos).every(Boolean) };
}

export function guardarDatosPersonales(entrada) {
  const validacion = validarDatosPersonales(entrada);
  if (!validacion.valido) return null;
  const borrador = leerBorrador();
  if (!borrador?.resumen) return null;
  return guardarBorrador({ ...borrador, datos: validacion.datos, entrega: borrador.entrega });
}

export function guardarEntrega(entrada) {
  const validacion = validarEntrega(entrada);
  if (!validacion.valido) return null;
  const borrador = leerBorrador();
  if (!borrador?.resumen || !validarDatosPersonales(borrador.datos).valido) return null;
  return guardarBorrador({ ...borrador, entrega: validacion.datos });
}

function normalizarMaximoProducto(fila) {
  if (entero(fila?.max_comprable, 0, 20)) return fila.max_comprable;
  return fila?.agotado ? 0 : 1;
}

function errorColumnaMaximo(error) {
  const texto = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(' ');
  return /max_comprable/i.test(texto) && /(column|columna|schema cache|does not exist|no existe|42703|PGRST204)/i.test(texto);
}

function imagenPublica(fila) {
  const rutas = Array.isArray(fila?.imagenes) ? fila.imagenes : [];
  const entrada = String(rutas.find((ruta) => typeof ruta === 'string' && ruta.trim()) || fila?.imagen_banner_path || '').trim();
  if (!entrada) return '';
  try {
    const storage = new URL(SUPABASE_URL);
    if (/^https?:\/\//i.test(entrada)) {
      const url = new URL(entrada);
      const prefijo = '/storage/v1/object/public/campanas/';
      return url.protocol === 'https:' && url.hostname === storage.hostname && url.port === '' && url.pathname.startsWith(prefijo) ? url.href : '';
    }
    const ruta = entrada.split('/').filter(Boolean).map(encodeURIComponent).join('/');
    return `${SUPABASE_URL}/storage/v1/object/public/campanas/${ruta}`;
  } catch {
    return '';
  }
}

async function consultarProducto(identificador) {
  const esSlug = SLUG.test(identificador.toLowerCase());
  const esUuid = UUID.test(identificador);
  if (!esSlug && !esUuid) throw new ErrorCompra('PRODUCTO_INVALIDO', 'No pudimos identificar el producto seleccionado.');
  const campo = esSlug ? 'slug' : 'id';
  const base = ['id', 'nombre', 'slug', 'precio_venta', 'agotado', 'imagenes', 'imagen_banner_path'];
  const consultar = (campos) => resolverSolicitudAcotada(
    supabasePublico.from('catalogo_publico').select(campos.join(',')).eq(campo, identificador).maybeSingle(),
    { tiempoMaximoMs: 8000 },
  );
  let resultado = await consultar(base.concat('max_comprable'));
  if (resultado.error && errorColumnaMaximo(resultado.error)) {
    resultado = await consultar(base);
  }
  if (resultado.error) throw new ErrorCompra('PRODUCTO_CONSULTA', 'No pudimos confirmar el producto. Revisa tu conexión e inténtalo de nuevo.', { causa: resultado.error });
  if (!resultado.data) throw new ErrorCompra('PRODUCTO_NO_DISPONIBLE', 'Este producto ya no está disponible.');
  return resultado.data;
}

async function sesionClienteLista() {
  const actual = obtenerSesionCliente();
  if (actual.estado !== 'comprobando') return actual;
  return new Promise((resolve) => {
    let detener = () => {};
    detener = observarSesionCliente((estado) => {
      if (estado.estado === 'comprobando') return;
      queueMicrotask(detener);
      resolve(estado);
    });
  });
}

export async function validarIdentidadBorrador(borrador = leerBorrador()) {
  if (!borradorValido(borrador)) return false;
  if (borrador.origen.tipo !== 'carrito') return true;
  const sesion = await sesionClienteLista();
  const coincide = sesion.estado === 'valida' && sesion.uid === borrador.origen.uid;
  if (!coincide) olvidarBorrador();
  return coincide;
}

function carritoComprable(snapshot) {
  return !!snapshot?.habilitado && !!snapshot.carrito_id && snapshot.cantidad_lineas > 0 &&
    !['pendiente', 'revision'].includes(snapshot.bloqueo_pago) &&
    snapshot.items.every((item) => item.disponible && item.precio_disponible && !item.requiere_ajuste &&
      item.max_comprable >= 1 && item.cantidad <= item.max_comprable);
}

function fingerprintResumen(tipo, meta, items) {
  const lineas = items.map((item) => [item.id, item.cantidad, Number(item.precioUnitario), Number(item.subtotal)]);
  return JSON.stringify([tipo, meta.carritoId || meta.productoId || '', meta.version ?? '', lineas]);
}

export async function cargarResumen(borrador = leerBorrador()) {
  if (!borradorValido(borrador)) throw new ErrorCompra('SIN_BORRADOR', 'Esta compra venció o no existe. Vuelve al producto o al carrito para comenzar de nuevo.');

  if (borrador.origen.tipo === 'directo') {
    const fila = await consultarProducto(borrador.origen.producto);
    const maximo = normalizarMaximoProducto(fila);
    const cantidad = borrador.origen.cantidad;
    const precio = Number(fila.precio_venta);
    if (!Number.isFinite(precio) || precio < 0) throw new ErrorCompra('PRECIO_NO_DISPONIBLE', 'No pudimos confirmar el precio de este producto.');
    if (maximo < 1 || fila.agotado) throw new ErrorCompra('PRODUCTO_AGOTADO', 'Este producto se agotó y ya no puede comprarse por ahora.');
    if (cantidad > maximo) throw new ErrorCompra('MAX_COMPRABLE', `La disponibilidad cambió. Ahora puedes comprar hasta ${maximo} ${maximo === 1 ? 'unidad' : 'unidades'}.`);
    const item = {
      id: fila.id,
      nombre: String(fila.nombre || 'Producto').trim(),
      cantidad,
      precioUnitario: precio,
      subtotal: precio * cantidad,
      imagen: imagenPublica(fila),
    };
    const meta = { producto: String(fila.slug || fila.id), productoId: fila.id };
    return {
      tipo: 'directo',
      titulo: 'Compra directa',
      items: [item],
      unidades: cantidad,
      total: item.subtotal,
      meta,
      fingerprint: fingerprintResumen('directo', meta, [item]),
    };
  }

  const sesion = await sesionClienteLista();
  if (sesion.estado !== 'valida' || sesion.uid !== borrador.origen.uid) {
    throw new ErrorCompra('SESION_REQUERIDA', 'Inicia sesión con la misma cuenta para continuar con este carrito.');
  }
  const snapshot = await listarCarrito();
  if (!carritoComprable(snapshot)) {
    const mensaje = snapshot?.bloqueo_pago
      ? 'Este carrito tiene un pago pendiente o en revisión. Consulta Mis compras antes de iniciar otro.'
      : 'El carrito cambió o contiene productos que debes revisar antes de pagar.';
    throw new ErrorCompra('CARRITO_NO_COMPRABLE', mensaje);
  }
  const items = snapshot.items.map((item) => ({
    id: item.campana_id,
    nombre: item.nombre,
    cantidad: item.cantidad,
    precioUnitario: item.precio_unitario_actual,
    subtotal: item.subtotal_actual,
    imagen: '',
  }));
  const meta = { uid: sesion.uid, email: sesion.sesion?.user?.email || '', carritoId: snapshot.carrito_id, version: snapshot.version };
  return {
    tipo: 'carrito',
    titulo: 'Productos del carrito',
    items,
    unidades: snapshot.cantidad_unidades,
    total: items.reduce((total, item) => total + item.subtotal, 0),
    meta,
    fingerprint: fingerprintResumen('carrito', meta, items),
  };
}

export function confirmarResumen(resumen) {
  const borrador = leerBorrador();
  if (!borrador || !resumen?.fingerprint || !Array.isArray(resumen.items) || !resumen.items.length) return null;
  const origen = resumen.tipo === 'carrito'
    ? { ...borrador.origen, uid: resumen.meta.uid, carritoId: resumen.meta.carritoId, version: resumen.meta.version }
    : { ...borrador.origen, producto: resumen.meta.producto };
  const guardado = {
    fingerprint: resumen.fingerprint,
    items: resumen.items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      subtotal: item.subtotal,
      imagen: item.imagen || '',
    })),
    total: resumen.total,
    unidades: resumen.unidades,
    confirmadoEn: Date.now(),
  };
  return guardarBorrador({ ...borrador, origen, resumen: guardado });
}

async function cuerpoRespuesta(error, data) {
  let cuerpo = data;
  if (error?.context && typeof error.context.json === 'function') {
    try { cuerpo = await error.context.json(); } catch { /* Se conserva data. */ }
  }
  return cuerpo && typeof cuerpo === 'object' ? cuerpo : {};
}

function codigoRespuesta(error, cuerpo) {
  const partes = [cuerpo?.codigo, cuerpo?.code, cuerpo?.error, cuerpo?.message, error?.code, error?.message]
    .filter((valor) => typeof valor === 'string');
  return (partes.find((valor) => /^[A-Z][A-Z0-9_]+$/.test(valor.trim())) || partes.join(' ')).toUpperCase();
}

function mensajePago(codigo) {
  if (/MAX_COMPRABLE|AGOTAD|NO_DISPONIBLE|RETIRAD|PRECIO|VERSION|DESACTUALIZ|CARRITO.*CAMBI/.test(codigo)) {
    return 'La disponibilidad o el precio cambió. Vuelve al resumen para revisar la compra actualizada.';
  }
  if (/CARRITO_BLOQUEADO|INTENCION_NO_REABRIBLE|CARRITO_YA_PROCESADO/.test(codigo)) {
    return 'Esta compra ya tiene un proceso de pago. Revísalo en Mis compras antes de iniciar otro.';
  }
  if (/SESION|JWT|NO_AUTENTIC|CUENTA/.test(codigo)) return 'Tu sesión cambió. Inicia sesión de nuevo antes de continuar.';
  if (/CONFIG|SECRETO|FIRMA|LLAVE|MONEDA/.test(codigo)) return 'No podemos preparar el cobro en este momento. Es un problema nuestro, no tuyo; inténtalo más tarde.';
  return 'No pudimos iniciar el pago. Revisa tu conexión e inténtalo de nuevo.';
}

function pagoValido(pago, tipo) {
  if (!pago || typeof pago !== 'object') return false;
  let retorno;
  try { retorno = new URL(pago.url_redireccion); } catch { return false; }
  const expiracionValida = pago.expira_en === undefined || (
    typeof pago.expira_en === 'string' && Number.isFinite(Date.parse(pago.expira_en)) && Date.parse(pago.expira_en) > Date.now()
  );
  const rutaValida = tipo === 'carrito'
    ? retorno.pathname === '/carrito/'
    : /^\/producto\/(?:index\.html|[^/]+\/)?$/.test(retorno.pathname);
  return typeof pago.llave_publica === 'string' && pago.llave_publica.trim() && pago.moneda === 'COP' &&
    typeof pago.monto_en_centavos === 'string' && /^(?!0)\d{1,18}$/.test(pago.monto_en_centavos) &&
    typeof pago.referencia === 'string' && REFERENCIA.test(pago.referencia) &&
    typeof pago.firma_integridad === 'string' && /^[a-fA-F0-9]{64}$/.test(pago.firma_integridad) &&
    expiracionValida && retorno.protocol === 'https:' && retorno.hostname === 'magandhi.com' && retorno.port === '' &&
    rutaValida && retorno.searchParams.get('ref') === pago.referencia;
}

function descriptorCarrito(cuerpo, resumen) {
  const checkout = cuerpo?.checkout;
  if (!checkout || checkout.recargar !== true) return null;
  if (checkout.tipo === 'compra' && REFERENCIA.test(checkout.referencia || '') && checkout.referencia === cuerpo.referencia) {
    return { tipo: 'compra', version: resumen.meta.version };
  }
  if (checkout.tipo === 'carrito' && UUID.test(checkout.id || '') && entero(checkout.version, 0) && checkout.id === resumen.meta.carritoId) {
    return { tipo: 'carrito', version: checkout.version };
  }
  return null;
}

function datosWompi(borrador) {
  return {
    nombre: borrador.datos.nombre,
    correo: borrador.datos.correo,
    telefono: borrador.datos.telefono,
    departamento: borrador.entrega.departamento,
    ciudad: borrador.entrega.ciudad,
    direccion: borrador.entrega.direccion,
    detalles: borrador.entrega.detalles,
  };
}

function guardarMemoriaPago(tipo, pago, resumen, datos, descriptor) {
  try {
    if (tipo === 'directo') {
      sessionStorage.setItem(CLAVE_PAGO_DIRECTO, JSON.stringify({ ref: pago.referencia, prod: resumen.meta.producto.toLowerCase(), ts: Date.now() }));
      return true;
    }
    const memoria = {
      checkout_tipo: descriptor.tipo,
      uid: resumen.meta.uid,
      carrito_id: resumen.meta.carritoId,
      carrito_version: descriptor.tipo === 'carrito' ? descriptor.version : resumen.meta.version,
      referencia: pago.referencia,
      startedAt: Date.now(),
      lastState: 'pendiente',
      ...(descriptor.tipo === 'carrito' ? { payload_publico: pago, datos_wompi: datos } : {}),
    };
    sessionStorage.setItem(CLAVE_PAGO_CARRITO, JSON.stringify(memoria));
    return true;
  } catch {
    return tipo === 'directo' || descriptor?.tipo === 'compra';
  }
}

function enviarAWompi(pago, datos) {
  const formulario = document.createElement('form');
  formulario.method = 'GET';
  formulario.action = WOMPI_CHECKOUT_URL;
  formulario.dataset.wompiTemporal = 'true';
  const campos = {
    'public-key': pago.llave_publica,
    currency: pago.moneda,
    'amount-in-cents': pago.monto_en_centavos,
    reference: pago.referencia,
    'signature:integrity': pago.firma_integridad,
    'redirect-url': pago.url_redireccion,
    'customer-data:email': datos.correo,
    'customer-data:full-name': datos.nombre,
    'customer-data:phone-number': datos.telefono,
    'customer-data:phone-number-prefix': '+57',
    'shipping-address:address-line-1': datos.direccion,
    'shipping-address:city': datos.ciudad,
    'shipping-address:region': datos.departamento,
    'shipping-address:phone-number': datos.telefono,
    'shipping-address:name': datos.nombre,
    'shipping-address:country': 'CO',
  };
  if (pago.expira_en) campos['expiration-time'] = pago.expira_en;
  if (datos.detalles) campos['shipping-address:address-line-2'] = datos.detalles;
  for (const [nombre, valor] of Object.entries(campos)) {
    const campo = document.createElement('input');
    campo.type = 'hidden';
    campo.name = nombre;
    campo.value = String(valor);
    formulario.appendChild(campo);
  }
  document.body.appendChild(formulario);
  formulario.submit();
}

export async function crearPagoDesdeBorrador() {
  const borrador = leerBorrador();
  if (!borrador?.resumen || !validarDatosPersonales(borrador.datos).valido || !validarEntrega(borrador.entrega).valido) {
    throw new ErrorCompra('PASOS_INCOMPLETOS', 'Completa todos los pasos antes de pagar.');
  }
  const resumen = await cargarResumen(borrador);
  if (resumen.fingerprint !== borrador.resumen.fingerprint) {
    throw new ErrorCompra('RESUMEN_CAMBIO', 'La disponibilidad o el precio cambió. Vuelve al resumen para revisar la compra actualizada.');
  }
  const datos = datosWompi(borrador);
  const direccionCompleta = datos.detalles ? `${datos.direccion} · ${datos.detalles}` : datos.direccion;
  const procedencia = typeof window.mgProcedencia === 'function' ? window.mgProcedencia() : {};
  let atribucionCodigo;
  try { atribucionCodigo = await codigoAtribucionParaIntencion(); } catch { atribucionCodigo = undefined; }
  const cuerpoSolicitud = {
    ...(resumen.tipo === 'carrito'
      ? { carrito: { id: resumen.meta.carritoId, version: resumen.meta.version } }
      : { producto: resumen.meta.producto, cantidad: resumen.unidades }),
    comprador: {
      nombre: datos.nombre,
      correo: datos.correo,
      telefono: datos.telefono,
      direccion: direccionCompleta,
      ciudad: datos.ciudad,
      departamento: datos.departamento,
      pais: 'CO',
    },
    utm_campaign: procedencia.utm_campaign,
    mg_vid: procedencia.mg_vid,
    atribucion_codigo: atribucionCodigo,
  };

  let respuesta;
  try {
    respuesta = await supabase.functions.invoke('crear-intencion-pago', { body: cuerpoSolicitud });
  } catch (error) {
    throw new ErrorCompra('RED_PAGO', 'No pudimos conectar para procesar tu pago. Revisa tu conexión e inténtalo de nuevo.', { causa: error });
  }
  const cuerpo = await cuerpoRespuesta(respuesta.error, respuesta.data);
  if (respuesta.error || cuerpo.error) {
    const codigo = codigoRespuesta(respuesta.error, cuerpo);
    throw new ErrorCompra(codigo || 'PAGO_ERROR', mensajePago(codigo), { causa: respuesta.error });
  }
  if (!pagoValido(cuerpo, resumen.tipo)) {
    throw new ErrorCompra('RESPUESTA_PAGO_INVALIDA', 'No pudimos validar la respuesta del pago. No se abrió ningún cobro; inténtalo de nuevo.');
  }
  const descriptor = resumen.tipo === 'carrito' ? descriptorCarrito(cuerpo, resumen) : null;
  if (resumen.tipo === 'carrito' && !descriptor) {
    throw new ErrorCompra('CHECKOUT_INVALIDO', 'No pudimos validar la compra creada. No se abrió ningún cobro; revisa Mis compras.');
  }
  if (!guardarMemoriaPago(resumen.tipo, cuerpo, resumen, datos, descriptor)) {
    throw new ErrorCompra('MEMORIA_PAGO', 'No pudimos preparar un retorno seguro desde Wompi. No se abrió ningún cobro; inténtalo de nuevo.');
  }
  if (window.mgEvento) window.mgEvento('checkout_iniciado', resumen.tipo === 'directo' ? { slug: resumen.meta.producto } : {});
  olvidarBorrador();
  enviarAWompi(cuerpo, datos);
  return true;
}
