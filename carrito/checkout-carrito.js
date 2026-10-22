import { supabase } from '../supabase-config.js';
import { abrirCentroCuenta, invalidarComprasCuenta } from '../componentes/cuenta-carrito.js?v=8';
import { codigoAtribucionParaIntencion } from '../scripts/atribucion-promocional.js?v=1';

const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';
const CLAVE_PAGO = 'mg_pago_carrito_en_curso';
const TTL_MEMORIA_PAGO_MS = 6 * 60 * 60 * 1000;
const ESPERAS_PAGO_MS = [5000, 12000];
const FORMATO_REFERENCIA = /^[A-Za-z0-9_-]{6,64}$/;
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ESTADOS_PAGO = new Set(['pendiente', 'revision', 'aprobado', 'rechazado']);
let memoriaDescartadaPorInvalida = false;

const porId = (id) => document.getElementById(id);
const moneda = (valor) => '$ ' + Math.round(Number(valor)).toLocaleString('es-CO') + ' COP';

function sesionValida(sesion) {
  return sesion?.estado === 'valida' && !!sesion.uid &&
    !!sesion.sesion?.user?.email_confirmed_at;
}

function tuplaCarrito(estado) {
  const uid = estado?.sesion?.uid;
  const carritoId = estado?.snapshot?.carrito_id;
  const version = estado?.snapshot?.version;
  if (!uid || !FORMATO_UUID.test(carritoId || '') || !Number.isSafeInteger(version) || version < 0) return null;
  return { uid, carritoId, version };
}

function mismaTupla(memoria, tupla) {
  return !!memoria && !!tupla && memoria.uid === tupla.uid &&
    memoria.carrito_id === tupla.carritoId && memoria.carrito_version === tupla.version;
}

function aptitudCheckout(estado, pagoBloqueado, sesionInvalidada) {
  if (!sesionValida(estado?.sesion)) return { valida: false, mensaje: 'Inicia sesión para continuar al pago.' };
  if (sesionInvalidada) return { valida: false, mensaje: 'Tu sesión debe validarse de nuevo antes de continuar al pago.' };
  if (pagoBloqueado) return { valida: false, mensaje: 'Hay un pago pendiente o en revisión. Espera la confirmación antes de cambiar el carrito o iniciar otro pago.' };
  if (estado?.operacion) return { valida: false, mensaje: 'Espera a que termine la actualización del carrito.' };
  const snapshot = estado?.snapshot;
  if (!snapshot) return { valida: false, mensaje: 'Estamos comprobando el estado actual del carrito.' };
  if (!snapshot.habilitado) return { valida: false, mensaje: 'El carrito no está habilitado en este momento.' };
  if (!snapshot.carrito_id || snapshot.cantidad_lineas === 0 || snapshot.items.length === 0) {
    return { valida: false, mensaje: 'Agrega al menos un producto para continuar.' };
  }
  const lineaInvalida = snapshot.items.some((item) =>
    !item.disponible || !item.precio_disponible || item.requiere_ajuste ||
    item.max_comprable < 1 || item.cantidad > item.max_comprable
  );
  if (lineaInvalida) return { valida: false, mensaje: 'Revisa las líneas marcadas antes de continuar.' };
  return { valida: true, mensaje: 'El total final se confirmará de forma segura en el servidor.' };
}

function correoValido(valor) {
  return valor.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

function normalizarTelefonoColombiano(valor) {
  let digitos = valor.replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('57')) digitos = digitos.slice(2);
  return /^\d{10}$/.test(digitos) ? digitos : '';
}

function documentoValido(valor) {
  return valor.length >= 5 && valor.length <= 30 && /^[A-Za-z0-9.-]+$/.test(valor);
}

function pagoPublicoValido(pago) {
  if (!pago || typeof pago !== 'object') return false;
  let retorno;
  try { retorno = new URL(pago.url_redireccion); } catch { return false; }
  return typeof pago.llave_publica === 'string' && pago.llave_publica.trim().length > 0 &&
    pago.moneda === 'COP' &&
    typeof pago.monto_en_centavos === 'string' && /^(?!0)\d{1,18}$/.test(pago.monto_en_centavos) &&
    typeof pago.referencia === 'string' && FORMATO_REFERENCIA.test(pago.referencia) &&
    typeof pago.expira_en === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(pago.expira_en) &&
    Number.isFinite(Date.parse(pago.expira_en)) &&
    typeof pago.firma_integridad === 'string' && /^[a-fA-F0-9]{64}$/.test(pago.firma_integridad) &&
    retorno.protocol === 'https:' && retorno.hostname === 'magandhi.com' &&
    retorno.port === '' && retorno.pathname === '/carrito/' &&
    retorno.searchParams.get('ref') === pago.referencia;
}

function extraerPagoPublico(pago) {
  if (!pagoPublicoValido(pago)) return null;
  return {
    referencia: pago.referencia,
    monto_en_centavos: pago.monto_en_centavos,
    moneda: pago.moneda,
    expira_en: pago.expira_en,
    firma_integridad: pago.firma_integridad,
    llave_publica: pago.llave_publica.trim(),
    url_redireccion: pago.url_redireccion,
  };
}

function datosWompiValidos(datos) {
  if (!datos || typeof datos !== 'object') return false;
  const documentoVacio = !datos.tipoDocumento && !datos.numeroDocumento;
  const documentoCompleto = ['CC', 'CE', 'NIT', 'PP', 'TI'].includes(datos.tipoDocumento) &&
    documentoValido(datos.numeroDocumento || '');
  return typeof datos.nombre === 'string' && datos.nombre.length >= 2 && datos.nombre.length <= 120 &&
    typeof datos.correo === 'string' && correoValido(datos.correo) &&
    typeof datos.telefono === 'string' && /^\d{10}$/.test(datos.telefono) &&
    typeof datos.departamento === 'string' && datos.departamento.length > 0 && datos.departamento.length <= 80 &&
    typeof datos.ciudad === 'string' && datos.ciudad.length >= 2 && datos.ciudad.length <= 80 &&
    typeof datos.direccion === 'string' && datos.direccion.length >= 3 && datos.direccion.length <= 120 &&
    typeof datos.detalles === 'string' && datos.detalles.length <= 70 &&
    (documentoVacio || documentoCompleto);
}

function referenciaMemoria(memoria) {
  const referencia = memoria?.referencia || memoria?.payload_publico?.referencia || '';
  return typeof referencia === 'string' && FORMATO_REFERENCIA.test(referencia) ? referencia : '';
}

function tipoMemoriaPago(memoria) {
  if (memoria?.checkout_tipo === 'compra' || memoria?.checkout_tipo === 'carrito') return memoria.checkout_tipo;
  // Las memorias C4 publicadas antes del discriminador se reconocen por su
  // payload de reapertura; las ya minimizadas también pertenecen a C4.
  return memoria && typeof memoria === 'object' ? 'carrito' : '';
}

function baseMemoriaPagoValida(dato) {
  return !!dato && typeof dato === 'object' &&
    (dato.checkout_tipo === undefined || ['carrito', 'compra'].includes(dato.checkout_tipo)) && FORMATO_UUID.test(dato.uid || '') &&
    FORMATO_UUID.test(dato.carrito_id || '') &&
    Number.isSafeInteger(dato.carrito_version) && dato.carrito_version >= 0 &&
    Number.isSafeInteger(dato.startedAt) && dato.startedAt > 0 && dato.startedAt <= Date.now() + 60000 &&
    Date.now() - dato.startedAt <= TTL_MEMORIA_PAGO_MS &&
    ['pendiente', 'revision', 'aprobado'].includes(dato.lastState) && !!referenciaMemoria(dato);
}

function memoriaPendienteCompleta(memoria) {
  return tipoMemoriaPago(memoria) === 'carrito' && baseMemoriaPagoValida(memoria) && memoria.lastState === 'pendiente' &&
    pagoPublicoValido(memoria.payload_publico) && datosWompiValidos(memoria.datos_wompi) &&
    referenciaMemoria(memoria) === memoria.payload_publico.referencia;
}

function memoriaPagoValida(dato) {
  if (!baseMemoriaPagoValida(dato)) return false;
  if (dato.lastState === 'pendiente') {
    if (tipoMemoriaPago(dato) === 'compra') {
      return dato.payload_publico === undefined && dato.datos_wompi === undefined;
    }
    return memoriaPendienteCompleta(dato);
  }
  return dato.lastState === 'revision' || dato.lastState === 'aprobado';
}

function minimizarMemoriaPago(memoria, estado = memoria?.lastState) {
  const referencia = referenciaMemoria(memoria);
  if (!memoria || !referencia || !['revision', 'aprobado'].includes(estado)) return null;
  return {
    checkout_tipo: tipoMemoriaPago(memoria),
    uid: memoria.uid,
    carrito_id: memoria.carrito_id,
    carrito_version: memoria.carrito_version,
    referencia,
    lastState: estado,
    startedAt: memoria.startedAt,
  };
}

function leerMemoriaPago() {
  try {
    const dato = JSON.parse(sessionStorage.getItem(CLAVE_PAGO) || 'null');
    if (dato === null) return null;
    if (dato?.lastState === 'rechazado') {
      memoriaDescartadaPorInvalida = true;
      sessionStorage.removeItem(CLAVE_PAGO);
      return null;
    }
    if (!memoriaPagoValida(dato)) {
      memoriaDescartadaPorInvalida = true;
      sessionStorage.removeItem(CLAVE_PAGO);
      return null;
    }
    const memoria = dato.lastState === 'pendiente' ? dato : minimizarMemoriaPago(dato);
    if (!memoria) {
      memoriaDescartadaPorInvalida = true;
      sessionStorage.removeItem(CLAVE_PAGO);
      return null;
    }
    if (memoria !== dato) sessionStorage.setItem(CLAVE_PAGO, JSON.stringify(memoria));
    memoriaDescartadaPorInvalida = false;
    return memoria;
  } catch {
    memoriaDescartadaPorInvalida = true;
    try { sessionStorage.removeItem(CLAVE_PAGO); } catch { /* No hay memoria utilizable. */ }
    return null;
  }
}

function guardarMemoriaPago(memoria) {
  if (!memoriaPagoValida(memoria)) return false;
  try {
    sessionStorage.setItem(CLAVE_PAGO, JSON.stringify(memoria));
    return true;
  } catch {
    return false;
  }
}

function olvidarPago() {
  try { sessionStorage.removeItem(CLAVE_PAGO); } catch { /* Sin almacenamiento, no hay nada más que limpiar. */ }
}

function limpiarFormulariosWompi() {
  document.querySelectorAll('form[data-wompi-temporal="true"]').forEach((formulario) => formulario.remove());
}

function referenciaDeLaUrl() {
  const parametros = new URLSearchParams(window.location.search);
  const presente = parametros.has('ref');
  const referencia = (parametros.get('ref') || '').trim();
  if (!presente && !parametros.has('env')) return { presente: false, referencia: '', valida: true };
  parametros.delete('ref');
  parametros.delete('env');
  const consulta = parametros.toString();
  try {
    history.replaceState(history.state, '', window.location.pathname + (consulta ? `?${consulta}` : '') + window.location.hash);
  } catch { /* La referencia se procesa aunque el navegador no permita reemplazar la URL. */ }
  return { presente, referencia, valida: presente && FORMATO_REFERENCIA.test(referencia) };
}

function checkoutCarritoDeRespuesta(cuerpo) {
  const checkout = cuerpo?.checkout;
  if (!checkout || typeof checkout !== 'object' || checkout.recargar !== true) return null;
  if (checkout.tipo === 'compra') {
    if (!FORMATO_REFERENCIA.test(checkout.referencia || '')) return null;
    return { tipo: 'compra', referencia: checkout.referencia };
  }
  if (checkout.tipo !== 'carrito' || !FORMATO_UUID.test(checkout.id || '') ||
      !Number.isSafeInteger(checkout.version) || checkout.version < 0) return null;
  return { tipo: 'carrito', carritoId: checkout.id, version: checkout.version };
}

function checkoutCoincideConMemoria(checkout, memoria, referencia) {
  if (!checkout) return false;
  if (checkout.tipo === 'compra') return checkout.referencia === referencia;
  if (!memoria || referenciaMemoria(memoria) !== referencia) return true;
  return memoria.carrito_id === checkout.carritoId && memoria.carrito_version === checkout.version;
}

async function cuerpoDeRespuesta(error, data) {
  let cuerpo = data;
  if (error?.context && typeof error.context.json === 'function') {
    try { cuerpo = await error.context.json(); } catch { /* Se conserva data si no hay JSON público. */ }
  }
  return cuerpo && typeof cuerpo === 'object' ? cuerpo : {};
}

function codigoPublico(error, cuerpo) {
  const partes = [cuerpo?.codigo, cuerpo?.code, cuerpo?.error, cuerpo?.message, error?.code, error?.message]
    .filter((valor) => typeof valor === 'string');
  const texto = partes.join(' ');
  const codigo = partes.find((valor) => /^[A-Z][A-Z0-9_]+$/.test(valor.trim()));
  return (codigo || texto.match(/\b(?:CO_)?[A-Z][A-Z0-9_]{2,}\b/)?.[0] || '').trim().toUpperCase();
}

function estadoHttp(error) {
  const estado = Number(error?.context?.status ?? error?.status);
  return Number.isInteger(estado) ? estado : 0;
}

function errorExigeRecarga(codigo) {
  return codigo === 'MAX_COMPRABLE' || codigo === 'CO_MAX_COMPRABLE' ||
    codigo === 'CO_CARRITO_BLOQUEADO' ||
    codigo === 'CARRITO_NO_DISPONIBLE' || codigo === 'CARRITO_YA_PROCESADO' ||
    /VERSION|DESACTUALIZ/.test(codigo) ||
    /NO_DISPONIBLE|RETIRAD|AGOTAD|PRECIO.*CAMBI|CAMBI.*PRECIO/.test(codigo) ||
    /(?:LINEA.*(?:CAMBI|DESACTUALIZ|NO_DISPONIBLE|RETIRAD|PRECIO)|(?:CAMBI|DESACTUALIZ).*LINEA|CARRITO.*CAMBI)/.test(codigo);
}

function mensajeErrorPago(codigo, cuerpo) {
  const maximo = typeof cuerpo?.max_comprable === 'number' ? cuerpo.max_comprable : NaN;
  if (codigo === 'CO_CARRITO_BLOQUEADO') return 'Hay un pago pendiente o en revisión. Actualizamos el carrito para mostrar su estado autoritativo.';
  if (/MAX_COMPRABLE/.test(codigo)) {
    if (Number.isSafeInteger(maximo) && maximo === 0) return 'Un producto se agotó mientras completabas tus datos. Revisa el carrito antes de continuar.';
    if (Number.isSafeInteger(maximo) && maximo > 0) return `La disponibilidad cambió: ahora una línea admite máximo ${maximo} ${maximo === 1 ? 'unidad' : 'unidades'}. Revisa el carrito.`;
    return 'Cambió el máximo disponible de una línea. Revisa las cantidades antes de continuar.';
  }
  if (/VERSION|DESACTUALIZ|LINEA.*CAMBI|CAMBI.*LINEA|CARRITO.*CAMBI/.test(codigo)) {
    return 'El carrito cambió mientras completabas tus datos. Ya cargamos su estado más reciente; revísalo antes de continuar.';
  }
  if (/NO_DISPONIBLE|RETIRAD|AGOTAD|PRECIO/.test(codigo)) {
    return 'Una línea ya no se puede comprar como estaba. Ya cargamos el carrito actualizado para que la revises.';
  }
  if (/VACIO|NO_ENCONTRAD/.test(codigo)) return 'El carrito ya no tiene líneas disponibles para pagar. Revisa su estado actual.';
  if (/DESHABILIT|NO_HABILIT/.test(codigo)) return 'El carrito no está disponible para pagos en este momento.';
  if (/NO_AUTENTIC|SESION|CUENTA|JWT/.test(codigo)) return 'Tu sesión cambió. Vuelve a iniciar sesión antes de continuar al pago.';
  if (/LIMITE.*MONTO|MONTO.*MAX|EXCEDE.*MONTO/.test(codigo)) return 'El total supera el máximo permitido para un solo pago. Escríbenos y te ayudamos a completar la compra.';
  if (/LIMITE.*LINEA|MAX.*LINEA/.test(codigo)) return 'El carrito supera el máximo de productos distintos permitido para un pago. Revisa las líneas.';
  if (/CONFIG|SECRETO|FIRMA|LLAVE|MONEDA/.test(codigo)) return 'No podemos preparar el cobro en este momento. Es un problema nuestro, no tuyo; inténtalo más tarde.';
  if (/SOLICITUD|BODY|METODO|INVALID/.test(codigo)) return 'Algo salió mal al preparar tu pago. Recarga la página e inténtalo de nuevo.';
  return 'No pudimos iniciar tu pago en este momento. Revisa tu conexión e inténtalo de nuevo.';
}

function irAWompi(pago, datos) {
  if (!pagoPublicoValido(pago) || !datosWompiValidos(datos) ||
      Date.parse(pago.expira_en) <= Date.now()) return false;
  const formulario = document.createElement('form');
  formulario.method = 'GET';
  formulario.action = WOMPI_CHECKOUT_URL;
  formulario.dataset.wompiTemporal = 'true';
  formulario.setAttribute('autocomplete', 'off');

  const campos = {
    'public-key': pago.llave_publica,
    currency: pago.moneda,
    'amount-in-cents': pago.monto_en_centavos,
    reference: pago.referencia,
    'expiration-time': pago.expira_en,
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
  if (datos.detalles) campos['shipping-address:address-line-2'] = datos.detalles;
  if (datos.tipoDocumento && datos.numeroDocumento) {
    campos['customer-data:legal-id-type'] = datos.tipoDocumento;
    campos['customer-data:legal-id'] = datos.numeroDocumento;
  }

  for (const [nombre, valor] of Object.entries(campos)) {
    const campo = document.createElement('input');
    campo.type = 'hidden';
    campo.name = nombre;
    campo.value = valor;
    formulario.appendChild(campo);
  }
  document.body.appendChild(formulario);
  try {
    formulario.submit();
    return true;
  } catch {
    return false;
  } finally {
    formulario.remove();
  }
}

export function configurarCheckoutCarrito({ obtenerEstado, recargarCarrito, revalidarSesion, iniciarFlujo }) {
  const boton = porId('co-checkout');
  const ayuda = porId('co-checkout-help');
  const modal = porId('co-modal-checkout');
  const cerrar = porId('co-modal-close');
  const formulario = porId('co-checkout-form');
  const enviar = porId('co-form-submit');
  const textoEnviar = porId('co-form-submit-text');
  const alerta = porId('co-form-alert');
  const resumen = porId('co-form-total');
  const seccionPago = porId('co-payment-return');
  const tarjetaPago = porId('co-payment-card');
  const iconoPago = porId('co-payment-icon');
  const tituloPago = porId('co-payment-title');
  const mensajePago = porId('co-payment-message');
  const reintentarPago = porId('co-payment-retry');
  const volverPago = porId('co-payment-resume');

  if (!boton || !modal || !cerrar || !formulario || !enviar || !volverPago) {
    return { actualizar() {}, cambiarSesion() {} };
  }

  let focoAnterior = null;
  let enviando = false;
  let memoriaPago = leerMemoriaPago();
  let referenciaActiva = '';
  let estadoPago = '';
  let tipoCheckoutActivo = tipoMemoriaPago(memoriaPago);
  const referencias404Reintentadas = new Set();
  let consultandoPago = false;
  let reintentosPago = 0;
  let consultaIniciada = false;
  let temporizadorPago = null;
  let temporizadorMemoriaPago = null;
  let generacionCheckout = 0;
  let generacionConsulta = 0;
  let ultimoUidValido = null;
  let tokenSesionInvalidado = '';
  let retornoUrl = referenciaDeLaUrl();
  let referenciaRetornoPendiente = '';
  let requiereRecargaPago = tipoMemoriaPago(memoriaPago) === 'carrito' || memoriaDescartadaPorInvalida;
  let promesaRecargaPago = null;

  function sesionInvalidada() {
    const sesion = obtenerEstado()?.sesion;
    return !!tokenSesionInvalidado && sesion?.sesion?.access_token === tokenSesionInvalidado;
  }

  function pagoBloqueado() {
    if (requiereRecargaPago) return true;
    const estado = obtenerEstado();
    const bloqueoServidor = estado?.snapshot?.bloqueo_pago;
    if (bloqueoServidor === 'pendiente' || bloqueoServidor === 'revision') return true;
    const tupla = tuplaCarrito(estado);
    return tipoMemoriaPago(memoriaPago) === 'carrito' && mismaTupla(memoriaPago, tupla) &&
      (memoriaPago.lastState === 'pendiente' || memoriaPago.lastState === 'revision');
  }

  function cancelarConsultas() {
    ++generacionConsulta;
    clearTimeout(temporizadorPago);
    temporizadorPago = null;
    consultandoPago = false;
    consultaIniciada = false;
    reintentosPago = 0;
    reintentarPago.disabled = false;
    reintentarPago.textContent = 'Consultar de nuevo';
  }

  function mostrarAlerta(mensaje = '') {
    alerta.textContent = mensaje;
    alerta.hidden = !mensaje;
  }

  function totalActual(snapshot) {
    return snapshot?.items?.reduce((total, item) => total + item.subtotal_actual, 0) || 0;
  }

  function actualizarResumen() {
    const snapshot = obtenerEstado()?.snapshot;
    if (!snapshot) {
      resumen.textContent = 'Estamos actualizando el total del carrito.';
      return;
    }
    resumen.textContent = `${snapshot.cantidad_unidades} ${snapshot.cantidad_unidades === 1 ? 'unidad' : 'unidades'} · Total actual ${moneda(totalActual(snapshot))}. El servidor lo confirmará antes del pago.`;
  }

  function restaurarEnvio(actualizarAhora = true) {
    enviando = false;
    formulario.removeAttribute('aria-busy');
    cerrar.disabled = false;
    textoEnviar.textContent = 'Ir al pago seguro';
    if (actualizarAhora) actualizar();
  }

  function ponerEnviando() {
    enviando = true;
    formulario.setAttribute('aria-busy', 'true');
    cerrar.disabled = true;
    enviar.disabled = true;
    textoEnviar.textContent = 'Procesando…';
  }

  function ocultarPago() {
    seccionPago.hidden = true;
    referenciaActiva = '';
    estadoPago = '';
    tipoCheckoutActivo = '';
    cancelarConsultas();
  }

  function memoriaDeReferencia(referencia = referenciaActiva) {
    return referenciaMemoria(memoriaPago) === referencia ? memoriaPago : null;
  }

  function persistirEstadoPago(estado) {
    if (!ESTADOS_PAGO.has(estado)) return estado;
    if (estado === 'rechazado') {
      olvidarPago();
      memoriaPago = null;
      cancelarTemporizadorMemoria();
      limpiarDatosTemporalesPago();
      return estado;
    }

    const memoria = memoriaDeReferencia();
    if (!memoria) return estado;
    let siguiente = estado;
    if (memoria.lastState === 'aprobado') siguiente = 'aprobado';
    else if (memoria.lastState === 'revision' && estado === 'pendiente') siguiente = 'revision';

    if (siguiente === 'revision' || siguiente === 'aprobado') {
      memoriaPago = minimizarMemoriaPago(memoria, siguiente);
      if (!memoriaPago || !guardarMemoriaPago(memoriaPago)) olvidarPago();
      limpiarDatosTemporalesPago();
    } else {
      memoriaPago = { ...memoria, referencia: referenciaMemoria(memoria), lastState: siguiente };
      guardarMemoriaPago(memoriaPago);
    }
    programarCaducidadMemoria();
    return siguiente;
  }

  function pintarTerminal(titulo, mensaje) {
    estadoPago = 'terminal';
    tarjetaPago.dataset.estado = 'rechazado';
    iconoPago.textContent = '!';
    tituloPago.textContent = titulo;
    mensajePago.textContent = mensaje;
    seccionPago.hidden = false;
    reintentarPago.hidden = true;
    volverPago.hidden = true;
  }

  function pintarEstadoPago(estado) {
    const esCompra = tipoCheckoutActivo === 'compra';
    const textos = esCompra ? {
      pendiente: ['Estamos confirmando tu pago', 'Consulta esta compra en Mis compras. Tu carrito está disponible para seguir comprando.'],
      revision: ['Tu pago está en revisión', 'Tu banco o MAGANDHI está terminando la confirmación. Consulta el seguimiento en Mis compras.'],
      aprobado: ['¡Recibimos tu pago!', 'Tu pedido quedó registrado. Consulta su seguimiento en Mis compras.'],
      rechazado: ['El pago no se completó', 'La compra quedó registrada como no completada. Tu carrito permanece disponible.'],
    } : {
      pendiente: ['Estamos confirmando tu pago', 'Dale un momento. No inicies otro pago para este carrito; si esta pestaña conserva la intención, puedes volver al mismo pago seguro.'],
      revision: ['Tu pago está en revisión', 'No puedes cambiar el carrito ni iniciar otro pago mientras terminamos la confirmación. Te contactaremos si hace falta algo.'],
      aprobado: ['¡Recibimos tu pago!', 'Tu pedido quedó registrado. Actualizamos el carrito con el estado confirmado por el servidor.'],
      rechazado: ['El pago no se completó', 'Actualizamos el carrito. Puedes editarlo o iniciar un pago nuevo; esta referencia rechazada no volverá a abrirse.'],
    };
    const solicitado = ESTADOS_PAGO.has(estado) ? estado : 'pendiente';
    estadoPago = persistirEstadoPago(solicitado);
    const visual = estadoPago === 'revision' ? 'pendiente' : estadoPago;
    tarjetaPago.dataset.estado = visual;
    iconoPago.textContent = estadoPago === 'aprobado' ? '✓' : (estadoPago === 'rechazado' ? '!' : '…');
    tituloPago.textContent = textos[estadoPago][0];
    mensajePago.textContent = textos[estadoPago][1];
    seccionPago.hidden = false;
    reintentarPago.hidden = estadoPago === 'aprobado' || estadoPago === 'rechazado';
    const memoriaReabrible = memoriaDeReferencia();
    volverPago.textContent = esCompra ? 'Revisar en Mis compras' : 'Volver al pago seguro';
    volverPago.hidden = esCompra
      ? estadoPago === 'aprobado' || estadoPago === 'rechazado'
      : !memoriaPendienteCompleta(memoriaReabrible) || estadoPago !== 'pendiente';
  }

  function activarMemoria(memoria, consultar = true) {
    if (!memoriaPagoValida(memoria)) return;
    const referencia = referenciaMemoria(memoria);
    const mismaReferencia = referenciaActiva === referencia;
    memoriaPago = memoria;
    tipoCheckoutActivo = tipoMemoriaPago(memoria);
    referenciaActiva = referencia;
    estadoPago = memoria.lastState;
    programarCaducidadMemoria();
    if (!mismaReferencia) {
      cancelarConsultas();
      referenciaActiva = referencia;
    }
    pintarEstadoPago(memoria.lastState);
    if (consultar && memoria.lastState !== 'aprobado' && !consultaIniciada &&
        sesionValida(obtenerEstado()?.sesion) && !sesionInvalidada()) {
      consultaIniciada = true;
      consultarPago(referenciaActiva);
    }
  }

  function olvidarMemoriaDeReferencia(referencia) {
    if (referenciaMemoria(memoriaPago) !== referencia) return;
    olvidarPago();
    memoriaPago = null;
    cancelarTemporizadorMemoria();
  }

  function limpiarMemoriaConTerminal(titulo, mensaje, referencia = referenciaActiva) {
    cancelarConsultas();
    olvidarMemoriaDeReferencia(referencia);
    limpiarDatosTemporalesPago();
    requiereRecargaPago = true;
    if (referenciaRetornoPendiente === referencia) referenciaRetornoPendiente = '';
    referenciaActiva = '';
    pintarTerminal(titulo, mensaje);
    actualizar();
  }

  function prepararPagoTrasRecarga() {
    if (!requiereRecargaPago) return Promise.resolve(true);
    if (promesaRecargaPago) return promesaRecargaPago;
    const estado = obtenerEstado();
    if (!sesionValida(estado?.sesion) || sesionInvalidada()) return Promise.resolve(false);
    const uid = estado.sesion.uid;
    const generacion = generacionCheckout;
    const tarea = Promise.resolve().then(async () => {
      let recargado = false;
      try { recargado = await recargarCarrito() === true; } catch { recargado = false; }
      if (!recargado || generacion !== generacionCheckout || uid !== obtenerEstado()?.sesion?.uid ||
          !sesionValida(obtenerEstado()?.sesion) || sesionInvalidada()) return false;
      requiereRecargaPago = false;
      return true;
    });
    promesaRecargaPago = tarea;
    tarea.finally(() => {
      if (promesaRecargaPago !== tarea) return;
      promesaRecargaPago = null;
      if (requiereRecargaPago && generacion !== generacionCheckout &&
          sesionValida(obtenerEstado()?.sesion) && !sesionInvalidada()) {
        queueMicrotask(actualizar);
      }
    });
    return tarea;
  }

  function sincronizarPago() {
    const estado = obtenerEstado();
    if (!sesionValida(estado?.sesion) || sesionInvalidada()) return;
    if (requiereRecargaPago) {
      prepararPagoTrasRecarga().then((recargado) => {
        if (recargado) actualizar();
      });
      return;
    }

    if (memoriaDescartadaPorInvalida) {
      memoriaDescartadaPorInvalida = false;
      memoriaPago = null;
      cancelarTemporizadorMemoria();
      limpiarDatosTemporalesPago();
      referenciaActiva = '';
      if (!retornoUrl.presente && !referenciaRetornoPendiente) {
        pintarTerminal(
          'No pudimos identificar el pago guardado',
          'La intención guardada venció o sus datos no eran válidos. El servidor conserva la autoridad sobre el estado del carrito.'
        );
        return;
      }
    }

    if (retornoUrl.presente) {
      const retorno = retornoUrl;
      retornoUrl = { presente: false, referencia: '', valida: true };
      if (tipoCheckoutActivo === 'compra') {
        invalidarComprasCuenta();
        abrirCentroCuenta('compras');
      }
      if (!retorno.valida) {
        limpiarMemoriaConTerminal(
          'No pudimos identificar el pago',
          'La referencia de retorno no es válida. Revisa el estado actual del carrito antes de continuar.'
        );
        return;
      }
      referenciaRetornoPendiente = retorno.referencia;
    }

    if (referenciaRetornoPendiente) {
      if (referenciaActiva !== referenciaRetornoPendiente) {
        cancelarConsultas();
        referenciaActiva = referenciaRetornoPendiente;
      }
      pintarEstadoPago(memoriaDeReferencia()?.lastState || 'pendiente');
      if (!consultaIniciada) {
        consultaIniciada = true;
        consultarPago(referenciaActiva);
      }
      return;
    }

    if (!memoriaPago) return;
    if (memoriaPago.uid !== estado.sesion.uid) {
      olvidarPago();
      memoriaPago = null;
      cancelarTemporizadorMemoria();
      limpiarDatosTemporalesPago();
      if (referenciaActiva || !seccionPago.hidden) ocultarPago();
      return;
    }
    activarMemoria(memoriaPago);
  }

  function actualizarControles() {
    const estado = obtenerEstado();
    const bloqueadoPago = pagoBloqueado();
    const aptitud = aptitudCheckout(estado, bloqueadoPago, sesionInvalidada());
    boton.disabled = !aptitud.valida;
    ayuda.textContent = aptitud.mensaje;
    if (!enviando) enviar.disabled = !aptitud.valida;
    reintentarPago.disabled = consultandoPago || sesionInvalidada();
    volverPago.disabled = sesionInvalidada();
    const itemsPorCampana = new Map(
      (estado?.snapshot?.items || []).map((item) => [item.campana_id, item])
    );
    document.querySelectorAll('#co-lines .co-line').forEach((linea) => {
      const item = itemsPorCampana.get(linea.dataset.campana);
      const retirar = linea.querySelector('.co-remove');
      const cantidad = linea.querySelector('select');
      if (retirar) retirar.disabled = bloqueadoPago || !item;
      if (cantidad) {
        cantidad.disabled = bloqueadoPago || !item?.disponible || item.max_comprable <= 0;
      }
    });
    actualizarResumen();
  }

  function actualizar() {
    actualizarControles();
    sincronizarPago();
  }

  function abrirModal() {
    const estado = obtenerEstado();
    const aptitud = aptitudCheckout(estado, pagoBloqueado(), sesionInvalidada());
    if (!aptitud.valida) {
      actualizar();
      return;
    }
    if (typeof iniciarFlujo === 'function') {
      try {
        if (iniciarFlujo(estado) !== false) return;
      } catch (error) {
        console.error('No se pudo abrir la experiencia de compra:', error);
      }
      ayuda.textContent = 'No pudimos preparar la compra en este navegador. Recarga la página e inténtalo de nuevo.';
      return;
    }
    mostrarAlerta();
    actualizarResumen();
    const correo = porId('co-c-correo');
    const correoSesion = obtenerEstado()?.sesion?.sesion?.user?.email;
    if (correo && !correo.value && typeof correoSesion === 'string') correo.value = correoSesion;
    focoAnterior = document.activeElement;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('co-modal-open');
    porId('co-c-nombre')?.focus();
  }

  function cerrarModal(devolverFoco = true) {
    if (enviando) return;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('co-modal-open');
    restaurarEnvio();
    if (!devolverFoco) return;
    if (focoAnterior && typeof focoAnterior.focus === 'function') focoAnterior.focus();
    else boton.focus();
  }

  async function invalidarPorSesion() {
    const sesion = obtenerEstado()?.sesion;
    tokenSesionInvalidado = sesion?.sesion?.access_token || '__sesion_local_invalida__';
    ++generacionCheckout;
    cancelarConsultas();
    restaurarEnvio();
    mostrarAlerta('Tu sesión dejó de ser válida. Vuelve a iniciar sesión antes de continuar.');
    actualizar();
    try { await revalidarSesion?.(true); } catch { /* La interfaz permanece invalidada y cerrada. */ }
  }

  async function consultarPago(ref) {
    if (consultandoPago || !FORMATO_REFERENCIA.test(ref) || ref !== referenciaActiva ||
        !sesionValida(obtenerEstado()?.sesion) || sesionInvalidada()) {
      if (ref && !FORMATO_REFERENCIA.test(ref)) {
        limpiarMemoriaConTerminal('No pudimos identificar el pago', 'La referencia guardada no es válida. Revisa el estado actual del carrito.');
      }
      return;
    }
    const uidAlConsultar = obtenerEstado().sesion.uid;
    const generacionEstado = generacionCheckout;
    const tokenConsulta = generacionConsulta;
    consultandoPago = true;
    reintentarPago.disabled = true;
    reintentarPago.textContent = 'Consultando…';
    let estado = '';
    let errorConsulta = null;
    let cuerpo = {};
    try {
      const respuesta = await supabase.functions.invoke('estado-pago', { body: { referencia: ref } });
      errorConsulta = respuesta.error;
      cuerpo = await cuerpoDeRespuesta(respuesta.error, respuesta.data);
      if (!respuesta.error && typeof respuesta.data?.estado === 'string') estado = respuesta.data.estado.toLowerCase();
      else if (typeof cuerpo.estado === 'string') estado = cuerpo.estado.toLowerCase();
    } catch (error) {
      errorConsulta = error;
    }

    if (generacionEstado !== generacionCheckout || tokenConsulta !== generacionConsulta ||
        uidAlConsultar !== obtenerEstado()?.sesion?.uid || ref !== referenciaActiva) return;
    consultandoPago = false;
    reintentarPago.disabled = false;
    reintentarPago.textContent = 'Consultar de nuevo';

    const codigo = codigoPublico(errorConsulta, cuerpo);
    const http = estadoHttp(errorConsulta);
    if (http === 401 || codigo === 'SESION_REQUERIDA') {
      await invalidarPorSesion();
      return;
    }
    if (http === 404) {
      const memoriaLocal = memoriaDeReferencia(ref);
      if (tipoCheckoutActivo === 'compra' && memoriaLocal && !referencias404Reintentadas.has(ref)) {
        referencias404Reintentadas.add(ref);
        consultaIniciada = false;
        try { await revalidarSesion?.(true); } catch { /* El observador de sesión conserva el estado seguro. */ }
        return;
      }
      if (tipoCheckoutActivo === 'compra') {
        cancelarConsultas();
        olvidarMemoriaDeReferencia(ref);
        limpiarDatosTemporalesPago();
        if (referenciaRetornoPendiente === ref) referenciaRetornoPendiente = '';
        referenciaActiva = '';
        invalidarComprasCuenta();
        const mensaje = 'No pudimos confirmar esta compra desde el retorno del pago. Revisa su estado en Mis compras; no necesitas crear otra.';
        pintarTerminal('Revisa el estado de tu compra', mensaje);
        abrirCentroCuenta('compras', mensaje);
        actualizarControles();
        return;
      }
      limpiarMemoriaConTerminal(
        'No encontramos esta intención de pago',
        'La referencia ya no se puede consultar. Revisa el estado actual del carrito antes de iniciar otro pago.',
        ref
      );
      return;
    }
    if (errorConsulta || !ESTADOS_PAGO.has(estado)) {
      // Red, 5xx o respuesta desconocida: conserva el último estado local sin alterar el carrito.
      pintarEstadoPago(memoriaDeReferencia(ref)?.lastState || 'pendiente');
      actualizar();
      return;
    }

    const checkout = checkoutCarritoDeRespuesta(cuerpo);
    if (!checkout || !checkoutCoincideConMemoria(checkout, memoriaPago, ref)) {
      if (referenciaRetornoPendiente === ref) referenciaRetornoPendiente = '';
      pintarTerminal(
        'No pudimos validar este pago',
        'La respuesta no identifica un checkout válido. No modificamos el carrito; solicita ayuda si el problema continúa.'
      );
      actualizarControles();
      return;
    }

    tipoCheckoutActivo = checkout.tipo;
    if (memoriaPago && referenciaMemoria(memoriaPago) === ref && tipoMemoriaPago(memoriaPago) !== checkout.tipo) {
      pintarTerminal('No pudimos validar este pago', 'La respuesta no coincide con el tipo de checkout guardado. No modificamos el carrito.');
      actualizarControles();
      return;
    }
    if (estado !== 'pendiente' && checkout.tipo === 'carrito') requiereRecargaPago = true;
    if (checkout.tipo === 'compra') invalidarComprasCuenta();
    pintarEstadoPago(estado);
    if (estado === 'pendiente') {
      actualizar();
      if (reintentosPago < ESPERAS_PAGO_MS.length) {
        const espera = ESPERAS_PAGO_MS[reintentosPago];
        reintentosPago += 1;
        clearTimeout(temporizadorPago);
        temporizadorPago = setTimeout(() => consultarPago(ref), espera);
      }
      return;
    }

    clearTimeout(temporizadorPago);
    temporizadorPago = null;
    reintentosPago = 0;
    consultaIniciada = true;

    const recargado = await prepararPagoTrasRecarga();
    if (generacionEstado !== generacionCheckout || tokenConsulta !== generacionConsulta ||
        uidAlConsultar !== obtenerEstado()?.sesion?.uid || ref !== referenciaActiva) return;
    if (referenciaRetornoPendiente === ref) referenciaRetornoPendiente = '';
    pintarEstadoPago(estado);
    actualizar();
    if (recargado) requestAnimationFrame(() => seccionPago.focus());
  }

  function datosFormulario() {
    const valor = (id) => (porId(id)?.value || '').trim();
    return {
      nombre: valor('co-c-nombre'),
      correo: valor('co-c-correo'),
      telefono: normalizarTelefonoColombiano(valor('co-c-telefono')),
      departamento: valor('co-c-departamento'),
      ciudad: valor('co-c-ciudad'),
      direccion: valor('co-c-direccion'),
      detalles: valor('co-c-detalles'),
      tipoDocumento: valor('co-c-tipo-doc'),
      numeroDocumento: valor('co-c-num-doc'),
    };
  }

  function marcarError(id, invalido) {
    const control = porId(id);
    const contenedor = control?.closest('.co-field');
    const errorId = `${id}-error`;
    contenedor?.classList.toggle('co-field--error', invalido);
    control?.setAttribute('aria-invalid', invalido ? 'true' : 'false');
    if (invalido) control?.setAttribute('aria-errormessage', errorId);
    else control?.removeAttribute('aria-errormessage');
    return invalido ? control : null;
  }

  function validarDatos(datos) {
    const documentoCompleto = !!datos.tipoDocumento && !!datos.numeroDocumento;
    const documentoVacio = !datos.tipoDocumento && !datos.numeroDocumento;
    const validos = {
      'co-c-nombre': datos.nombre.length >= 2 && datos.nombre.length <= 120,
      'co-c-correo': correoValido(datos.correo),
      'co-c-telefono': /^\d{10}$/.test(datos.telefono),
      'co-c-departamento': datos.departamento.length > 0 && datos.departamento.length <= 80,
      'co-c-ciudad': datos.ciudad.length >= 2 && datos.ciudad.length <= 80,
      'co-c-direccion': datos.direccion.length >= 3 && datos.direccion.length <= 120,
      'co-c-tipo-doc': documentoVacio || documentoCompleto,
      'co-c-num-doc': documentoVacio || (documentoCompleto && documentoValido(datos.numeroDocumento)),
    };
    let primerError = null;
    for (const [id, valido] of Object.entries(validos)) {
      const control = marcarError(id, !valido);
      if (control && !primerError) primerError = control;
    }
    if (primerError) {
      if (!documentoVacio && !documentoCompleto) mostrarAlerta('Para incluir el documento, elige el tipo y escribe el número. También puedes dejar ambos campos vacíos.');
      primerError.focus();
      return false;
    }
    porId('co-c-telefono').value = datos.telefono;
    return true;
  }

  function limpiarFormulario() {
    formulario.reset();
    formulario.querySelectorAll('input, select').forEach((control) => {
      control.closest('.co-field')?.classList.remove('co-field--error');
      control.setAttribute('aria-invalid', 'false');
      control.removeAttribute('aria-errormessage');
      if (control.tagName === 'SELECT') control.dataset.vacio = control.value ? 'false' : 'true';
    });
    mostrarAlerta();
  }

  function limpiarDatosTemporalesPago() {
    limpiarFormulariosWompi();
    limpiarFormulario();
  }

  function cancelarTemporizadorMemoria() {
    clearTimeout(temporizadorMemoriaPago);
    temporizadorMemoriaPago = null;
  }

  function caducarMemoriaLocal() {
    if (!memoriaPago) return false;
    const esCompra = tipoMemoriaPago(memoriaPago) === 'compra';
    cancelarTemporizadorMemoria();
    cancelarConsultas();
    olvidarPago();
    memoriaPago = null;
    limpiarDatosTemporalesPago();
    referenciaActiva = '';
    referenciaRetornoPendiente = '';
    requiereRecargaPago = !esCompra;
    if (esCompra) {
      tipoCheckoutActivo = 'compra';
      invalidarComprasCuenta();
      pintarTerminal(
        'Consulta el estado de tu compra',
        'La ayuda local para este retorno venció. Mis compras conserva el estado confirmado; no necesitas crear otra compra.'
      );
    } else {
      pintarTerminal(
        'La recuperación local del pago venció',
        'Eliminamos los datos temporales y estamos consultando el estado autoritativo del carrito antes de permitir otro pago.'
      );
    }
    actualizar();
    return true;
  }

  function programarCaducidadMemoria() {
    cancelarTemporizadorMemoria();
    if (!memoriaPago) return;
    const restante = memoriaPago.startedAt + TTL_MEMORIA_PAGO_MS - Date.now();
    if (restante <= 0) {
      caducarMemoriaLocal();
      return;
    }
    temporizadorMemoriaPago = setTimeout(() => {
      temporizadorMemoriaPago = null;
      revalidarCaducidadMemoria();
    }, restante);
  }

  function revalidarCaducidadMemoria() {
    limpiarFormulariosWompi();
    if (!memoriaPago) return false;
    if (Date.now() - memoriaPago.startedAt < TTL_MEMORIA_PAGO_MS) {
      programarCaducidadMemoria();
      return false;
    }
    return caducarMemoriaLocal();
  }

  function cambiarSesion(sesion) {
    const uidSiguiente = sesionValida(sesion) ? sesion.uid : null;
    const tokenSiguiente = sesion?.sesion?.access_token || '';
    const cambioIdentidad = !!uidSiguiente && !!ultimoUidValido && uidSiguiente !== ultimoUidValido;
    ++generacionCheckout;
    cancelarConsultas();
    if (cambioIdentidad) limpiarFormulario();
    if (uidSiguiente && tokenSesionInvalidado && tokenSiguiente && tokenSiguiente !== tokenSesionInvalidado) {
      tokenSesionInvalidado = '';
    }
    if (uidSiguiente) ultimoUidValido = uidSiguiente;
    if (uidSiguiente && memoriaPago && memoriaPago.uid !== uidSiguiente) {
      olvidarPago();
      memoriaPago = null;
      cancelarTemporizadorMemoria();
      limpiarDatosTemporalesPago();
      referenciaRetornoPendiente = '';
    }
    if (!uidSiguiente || memoriaPago?.uid !== uidSiguiente) ocultarPago();
    else if (!requiereRecargaPago) activarMemoria(memoriaPago);
    if (!uidSiguiente) {
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('co-modal-open');
      restaurarEnvio();
    }
    actualizar();
  }

  boton.addEventListener('click', abrirModal);
  cerrar.addEventListener('click', () => cerrarModal());
  modal.addEventListener('click', (evento) => {
    if (evento.target === modal) cerrarModal();
  });
  document.addEventListener('keydown', (evento) => {
    if (modal.getAttribute('aria-hidden') !== 'false') return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrarModal();
      return;
    }
    if (evento.key !== 'Tab') return;
    const controles = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]')]
      .filter((control) => control.offsetParent !== null);
    if (!controles.length) return;
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (!modal.contains(document.activeElement)) {
      evento.preventDefault();
      (evento.shiftKey ? ultimo : primero).focus();
    } else if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  });

  formulario.querySelectorAll('input, select').forEach((control) => {
    control.setAttribute('aria-invalid', 'false');
    control.addEventListener(control.tagName === 'SELECT' ? 'change' : 'input', () => {
      control.closest('.co-field')?.classList.remove('co-field--error');
      control.setAttribute('aria-invalid', 'false');
      control.removeAttribute('aria-errormessage');
      if (control.tagName === 'SELECT') control.dataset.vacio = control.value ? 'false' : 'true';
    });
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (enviando) return;
    mostrarAlerta();
    const datos = datosFormulario();
    if (!validarDatos(datos)) return;

    const estado = obtenerEstado();
    const aptitud = aptitudCheckout(estado, pagoBloqueado(), sesionInvalidada());
    if (!aptitud.valida) {
      mostrarAlerta(aptitud.mensaje);
      actualizar();
      return;
    }

    const snapshot = estado.snapshot;
    const identidad = {
      uid: estado.sesion.uid,
      carritoId: snapshot.carrito_id,
      version: snapshot.version,
      generacion: ++generacionCheckout,
    };
    const direccionCompleta = datos.detalles ? `${datos.direccion} · ${datos.detalles}` : datos.direccion;
    const procedencia = typeof window.mgProcedencia === 'function' ? window.mgProcedencia() : {};
    ponerEnviando();
    let atribucionCodigo;
    try { atribucionCodigo = await codigoAtribucionParaIntencion(); } catch { atribucionCodigo = undefined; }

    try {
      const { data, error } = await supabase.functions.invoke('crear-intencion-pago', {
        body: {
          carrito: { id: identidad.carritoId, version: identidad.version },
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
        },
      });
      const cuerpo = await cuerpoDeRespuesta(error, data);

      // La Edge C5 puede separar/versionar el carrito antes de responder. Solo
      // la identidad y la generación de esta solicitud deben seguir vigentes;
      // la versión visible del carrito ya no tiene que coincidir.
      if (identidad.generacion !== generacionCheckout ||
          identidad.uid !== obtenerEstado()?.sesion?.uid ||
          !sesionValida(obtenerEstado()?.sesion)) return;

      if (error || cuerpo.error) {
        const codigo = codigoPublico(error, cuerpo);
        if (estadoHttp(error) === 401 || codigo === 'SESION_REQUERIDA') {
          await invalidarPorSesion();
          return;
        }
        restaurarEnvio();
        if (codigo === 'INTENCION_NO_REABRIBLE') {
          invalidarComprasCuenta();
          Promise.resolve().then(() => recargarCarrito()).catch(() => {});
          const mensaje = 'Esta compra ya existe o cambió de estado. Revísala en Mis compras; no necesitas crear otra.';
          cerrarModal(false);
          abrirCentroCuenta('compras', mensaje);
          return;
        }
        if (codigo === 'CARRITO_YA_PROCESADO') {
          requiereRecargaPago = true;
          memoriaPago = null;
          olvidarPago();
          cancelarTemporizadorMemoria();
          limpiarDatosTemporalesPago();
          const recargado = await prepararPagoTrasRecarga();
          if (identidad.generacion !== generacionCheckout || identidad.uid !== obtenerEstado()?.sesion?.uid) return;
          referenciaActiva = '';
          estadoPago = 'aprobado';
          tarjetaPago.dataset.estado = 'aprobado';
          iconoPago.textContent = '✓';
          tituloPago.textContent = 'Este carrito ya fue procesado';
          mensajePago.textContent = recargado
            ? 'Actualizamos el carrito con el estado procesado por el servidor para evitar un pago duplicado.'
            : 'El servidor indicó que este carrito ya fue procesado. Seguiremos bloqueando otro pago hasta poder actualizarlo.';
          seccionPago.hidden = false;
          reintentarPago.hidden = true;
          volverPago.hidden = true;
          cerrarModal(false);
          seccionPago.focus();
          actualizar();
          return;
        }
        if (errorExigeRecarga(codigo)) await recargarCarrito();
        if (identidad.generacion !== generacionCheckout || identidad.uid !== obtenerEstado()?.sesion?.uid) return;
        mostrarAlerta(mensajeErrorPago(codigo, cuerpo));
        actualizar();
        return;
      }

      const pagoPublico = extraerPagoPublico(cuerpo);
      const checkoutPreparado = checkoutCarritoDeRespuesta(cuerpo);
      const checkoutValido = checkoutPreparado && (
        (checkoutPreparado.tipo === 'carrito' && checkoutPreparado.carritoId === identidad.carritoId) ||
        (checkoutPreparado.tipo === 'compra' && checkoutPreparado.referencia === pagoPublico?.referencia)
      );
      if (!pagoPublico || !checkoutValido) {
        restaurarEnvio();
        mostrarAlerta('No pudimos validar la respuesta del pago. No se abrió ningún cobro; inténtalo de nuevo.');
        return;
      }

      tipoCheckoutActivo = checkoutPreparado.tipo;
      memoriaPago = {
        checkout_tipo: checkoutPreparado.tipo,
        uid: identidad.uid,
        carrito_id: identidad.carritoId,
        carrito_version: checkoutPreparado.tipo === 'carrito' ? checkoutPreparado.version : identidad.version,
        referencia: pagoPublico.referencia,
        startedAt: Date.now(),
        lastState: 'pendiente',
        ...(checkoutPreparado.tipo === 'carrito' ? { payload_publico: pagoPublico, datos_wompi: datos } : {}),
      };
      const memoriaGuardada = guardarMemoriaPago(memoriaPago);
      if (!memoriaGuardada && checkoutPreparado.tipo === 'carrito') {
        memoriaPago = null;
        restaurarEnvio();
        mostrarAlerta('No pudimos guardar de forma segura la intención para el retorno. No se abrió ningún cobro; inténtalo de nuevo.');
        return;
      }
      if (!memoriaGuardada) memoriaPago = null;

      if (window.mgEvento) window.mgEvento('checkout_iniciado', {});
      if (memoriaPago) activarMemoria(memoriaPago, false);
      if (checkoutPreparado.tipo === 'compra') {
        invalidarComprasCuenta();
        // La memoria C5 solo optimiza el retorno. El cobro usa la respuesta
        // firmada y la cesta sucesora se sincroniza siempre en paralelo.
        Promise.resolve().then(() => recargarCarrito()).catch(() => {});
      }
      if (!irAWompi(pagoPublico, datos)) {
        restaurarEnvio();
        if (checkoutPreparado.tipo === 'compra') {
          const mensaje = 'La compra quedó creada, pero no pudimos abrir Wompi. Continúa desde Mis compras; no necesitas crear otra.';
          cerrarModal(false);
          abrirCentroCuenta('compras', mensaje);
        } else {
          mostrarAlerta('No pudimos abrir la ventana de pago segura. Usa “Volver al pago seguro” para intentarlo de nuevo.');
        }
      }
    } catch (error) {
      if (identidad.generacion !== generacionCheckout || identidad.uid !== obtenerEstado()?.sesion?.uid) return;
      console.error('No se pudo iniciar el pago del carrito:', error);
      restaurarEnvio();
      mostrarAlerta('No pudimos conectar para procesar tu pago. Revisa tu conexión e inténtalo de nuevo.');
    }
  });

  reintentarPago.addEventListener('click', () => {
    if (!referenciaActiva || sesionInvalidada()) return;
    clearTimeout(temporizadorPago);
    reintentosPago = 0;
    consultarPago(referenciaActiva);
  });

  volverPago.addEventListener('click', () => {
    revalidarCaducidadMemoria();
    if (tipoCheckoutActivo === 'compra') {
      invalidarComprasCuenta();
      abrirCentroCuenta('compras');
      return;
    }
    const memoria = memoriaDeReferencia();
    if (!memoriaPendienteCompleta(memoria) || memoria.uid !== obtenerEstado()?.sesion?.uid || sesionInvalidada()) return;
    if (estadoPago !== 'pendiente') return;
    if (!irAWompi(memoria.payload_publico, memoria.datos_wompi)) {
      volverPago.hidden = true;
      mensajePago.textContent = 'Esta ventana de pago venció. Estamos actualizando el carrito para que puedas iniciar una nueva de forma segura.';
      clearTimeout(temporizadorPago);
      reintentosPago = 0;
      consultarPago(referenciaActiva);
    }
  });

  window.addEventListener('pageshow', async (evento) => {
    const modalEstabaAbierto = modal.getAttribute('aria-hidden') === 'false';
    const tokenPageshow = ++generacionCheckout;
    cancelarConsultas();
    cancelarTemporizadorMemoria();
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('co-modal-open');
    restaurarEnvio(false);
    limpiarDatosTemporalesPago();
    memoriaPago = leerMemoriaPago();
    tipoCheckoutActivo = tipoMemoriaPago(memoriaPago);
    referenciaActiva = '';
    estadoPago = '';
    requiereRecargaPago = requiereRecargaPago || tipoMemoriaPago(memoriaPago) === 'carrito' || memoriaDescartadaPorInvalida;
    programarCaducidadMemoria();

    let preparado = true;
    if (requiereRecargaPago && sesionValida(obtenerEstado()?.sesion) && !sesionInvalidada()) {
      boton.disabled = true;
      enviar.disabled = true;
      ayuda.textContent = 'Estamos actualizando el carrito antes de comprobar el pago.';
      preparado = await prepararPagoTrasRecarga();
    }
    if (tokenPageshow !== generacionCheckout) return;
    actualizar();
    if (!preparado) return;
    if ((evento.persisted || retornoUrl.presente || !!referenciaRetornoPendiente || !!memoriaPago || !seccionPago.hidden) && !seccionPago.hidden) {
      requestAnimationFrame(() => seccionPago.focus());
    } else if (modalEstabaAbierto) {
      requestAnimationFrame(() => boton.focus());
    }
  });

  function revalidarMemoriaPorCicloDeVida() {
    limpiarFormulariosWompi();
    if (revalidarCaducidadMemoria()) return;
    programarCaducidadMemoria();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidarMemoriaPorCicloDeVida();
  });
  window.addEventListener('focus', revalidarMemoriaPorCicloDeVida);

  programarCaducidadMemoria();
  actualizar();
  return { actualizar, cambiarSesion };
}
