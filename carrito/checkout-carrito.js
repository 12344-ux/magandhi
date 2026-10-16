import { supabase } from '../supabase-config.js';

const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';
const CLAVE_PAGO = 'mg_pago_carrito_en_curso';
const ESPERAS_PAGO_MS = [5000, 12000];
const FORMATO_REFERENCIA = /^[A-Za-z0-9_-]{6,64}$/;
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
  if (pagoBloqueado) return { valida: false, mensaje: 'Este carrito ya tiene una intención de pago. Usa el aviso de pago para continuar o consultar su estado.' };
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

function memoriaPagoValida(dato) {
  return !!dato && typeof dato === 'object' && FORMATO_UUID.test(dato.uid || '') &&
    FORMATO_UUID.test(dato.carrito_id || '') &&
    Number.isSafeInteger(dato.carrito_version) && dato.carrito_version >= 0 &&
    Number.isSafeInteger(dato.startedAt) && dato.startedAt > 0 && dato.startedAt <= Date.now() + 60000 &&
    ESTADOS_PAGO.has(dato.lastState) && pagoPublicoValido(dato.payload_publico) &&
    datosWompiValidos(dato.datos_wompi);
}

function leerMemoriaPago() {
  try {
    const dato = JSON.parse(sessionStorage.getItem(CLAVE_PAGO) || 'null');
    if (dato === null) return null;
    if (!memoriaPagoValida(dato)) {
      memoriaDescartadaPorInvalida = true;
      sessionStorage.removeItem(CLAVE_PAGO);
      return null;
    }
    memoriaDescartadaPorInvalida = false;
    return dato;
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

function referenciaDeLaUrl() {
  const parametros = new URLSearchParams(window.location.search);
  const presente = parametros.has('ref');
  const referencia = (parametros.get('ref') || '').trim();
  if (!presente && !parametros.has('env')) return { presente: false, referencia: '', valida: true };
  parametros.delete('ref');
  parametros.delete('env');
  const consulta = parametros.toString();
  try {
    history.replaceState(null, '', window.location.pathname + (consulta ? `?${consulta}` : '') + window.location.hash);
  } catch { /* La referencia se procesa aunque el navegador no permita reemplazar la URL. */ }
  return { presente, referencia, valida: presente && FORMATO_REFERENCIA.test(referencia) };
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
    codigo === 'CARRITO_NO_DISPONIBLE' || codigo === 'CARRITO_YA_PROCESADO' ||
    /VERSION|DESACTUALIZ/.test(codigo) ||
    /NO_DISPONIBLE|RETIRAD|AGOTAD|PRECIO.*CAMBI|CAMBI.*PRECIO/.test(codigo) ||
    /(?:LINEA.*(?:CAMBI|DESACTUALIZ|NO_DISPONIBLE|RETIRAD|PRECIO)|(?:CAMBI|DESACTUALIZ).*LINEA|CARRITO.*CAMBI)/.test(codigo);
}

function mensajeErrorPago(codigo, cuerpo) {
  const maximo = typeof cuerpo?.max_comprable === 'number' ? cuerpo.max_comprable : NaN;
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
  if (!pagoPublicoValido(pago) || !datosWompiValidos(datos)) return false;
  const formulario = document.createElement('form');
  formulario.method = 'GET';
  formulario.action = WOMPI_CHECKOUT_URL;

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
  formulario.submit();
  return true;
}

export function configurarCheckoutCarrito({ obtenerEstado, recargarCarrito, revalidarSesion }) {
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
  let consultandoPago = false;
  let reintentosPago = 0;
  let consultaIniciada = false;
  let temporizadorPago = null;
  let generacionCheckout = 0;
  let generacionConsulta = 0;
  let ultimoUidValido = null;
  let tokenSesionInvalidado = '';
  let bloqueoProcesado = null;
  let retornoUrl = referenciaDeLaUrl();

  function sesionInvalidada() {
    const sesion = obtenerEstado()?.sesion;
    return !!tokenSesionInvalidado && sesion?.sesion?.access_token === tokenSesionInvalidado;
  }

  function pagoBloqueado() {
    const tupla = tuplaCarrito(obtenerEstado());
    if (bloqueoProcesado && mismaTupla(bloqueoProcesado, tupla)) return true;
    return mismaTupla(memoriaPago, tupla) &&
      ['pendiente', 'revision', 'aprobado', 'rechazado'].includes(memoriaPago.lastState);
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
    cancelarConsultas();
  }

  function persistirEstadoPago(estado) {
    if (!memoriaPago || !ESTADOS_PAGO.has(estado)) return;
    let siguiente = estado;
    if (memoriaPago.lastState === 'aprobado') siguiente = 'aprobado';
    else if (memoriaPago.lastState === 'revision' && estado === 'pendiente') siguiente = 'revision';
    else if (memoriaPago.lastState === 'rechazado' && estado === 'pendiente') siguiente = 'rechazado';
    memoriaPago = { ...memoriaPago, lastState: siguiente };
    guardarMemoriaPago(memoriaPago);
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
    const textos = {
      pendiente: ['Estamos confirmando tu pago', 'Dale un momento. No inicies otro pago para este carrito; puedes volver a la misma intención segura.'],
      revision: ['Recibimos tu pago', 'Estamos terminando de confirmar el pedido. No inicies otro pago; te contactaremos si hace falta algo.'],
      aprobado: ['¡Recibimos tu pago!', 'Tu pedido quedó registrado. Este carrito no puede volver a pagarse mientras conserve la misma versión.'],
      rechazado: ['El pago no se completó', 'Puedes volver a abrir la misma intención de pago segura sin crear una nueva.'],
    };
    const solicitado = ESTADOS_PAGO.has(estado) ? estado : 'pendiente';
    persistirEstadoPago(solicitado);
    estadoPago = memoriaPago?.lastState || solicitado;
    const visual = estadoPago === 'revision' ? 'pendiente' : estadoPago;
    tarjetaPago.dataset.estado = visual;
    iconoPago.textContent = estadoPago === 'aprobado' ? '✓' : (estadoPago === 'rechazado' ? '!' : '…');
    tituloPago.textContent = textos[estadoPago][0];
    mensajePago.textContent = textos[estadoPago][1];
    seccionPago.hidden = false;
    reintentarPago.hidden = estadoPago === 'aprobado' || estadoPago === 'rechazado';
    volverPago.hidden = !memoriaPago || !['pendiente', 'rechazado'].includes(estadoPago);
  }

  function activarMemoria(memoria, consultar = true) {
    if (!memoriaPagoValida(memoria)) return;
    const mismaReferencia = referenciaActiva === memoria.payload_publico.referencia;
    memoriaPago = memoria;
    referenciaActiva = memoria.payload_publico.referencia;
    estadoPago = memoria.lastState;
    if (!mismaReferencia) {
      cancelarConsultas();
      referenciaActiva = memoria.payload_publico.referencia;
    }
    pintarEstadoPago(memoria.lastState);
    if (consultar && memoria.lastState !== 'aprobado' && !consultaIniciada &&
        sesionValida(obtenerEstado()?.sesion) && !sesionInvalidada()) {
      consultaIniciada = true;
      consultarPago(referenciaActiva);
    }
  }

  function limpiarMemoriaConTerminal(titulo, mensaje) {
    cancelarConsultas();
    olvidarPago();
    memoriaPago = null;
    referenciaActiva = '';
    bloqueoProcesado = null;
    pintarTerminal(titulo, mensaje);
    actualizar();
  }

  function sincronizarPago() {
    const estado = obtenerEstado();
    if (!sesionValida(estado?.sesion) || sesionInvalidada()) return;

    if (memoriaDescartadaPorInvalida) {
      memoriaDescartadaPorInvalida = false;
      memoriaPago = null;
      referenciaActiva = '';
      pintarTerminal(
        'No pudimos identificar el pago guardado',
        'La referencia o los datos firmados no eran válidos. Limpiamos el bloqueo para que revises el carrito.'
      );
      return;
    }

    if (retornoUrl.presente) {
      const retorno = retornoUrl;
      retornoUrl = { presente: false, referencia: '', valida: true };
      if (!retorno.valida) {
        limpiarMemoriaConTerminal(
          'No pudimos identificar el pago',
          'La referencia de retorno no es válida. El carrito quedó disponible para que revises su estado.'
        );
        return;
      }
      if (!memoriaPago || memoriaPago.uid !== estado.sesion.uid ||
          memoriaPago.payload_publico.referencia !== retorno.referencia) {
        pintarTerminal(
          'No pudimos recuperar el pago',
          'Esta referencia no está asociada a la sesión y al carrito guardados en esta pestaña.'
        );
        return;
      }
    }

    if (!memoriaPago) return;
    if (memoriaPago.uid !== estado.sesion.uid) {
      if (referenciaActiva || !seccionPago.hidden) ocultarPago();
      return;
    }
    activarMemoria(memoriaPago);
  }

  function actualizar() {
    const aptitud = aptitudCheckout(obtenerEstado(), pagoBloqueado(), sesionInvalidada());
    boton.disabled = !aptitud.valida;
    ayuda.textContent = aptitud.mensaje;
    if (!enviando) enviar.disabled = !aptitud.valida;
    reintentarPago.disabled = consultandoPago || sesionInvalidada();
    volverPago.disabled = sesionInvalidada();
    actualizarResumen();
    sincronizarPago();
  }

  function abrirModal() {
    const aptitud = aptitudCheckout(obtenerEstado(), pagoBloqueado(), sesionInvalidada());
    if (!aptitud.valida) {
      actualizar();
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
        limpiarMemoriaConTerminal('No pudimos identificar el pago', 'La referencia guardada no es válida. El carrito quedó desbloqueado.');
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
      limpiarMemoriaConTerminal(
        'No encontramos esta intención de pago',
        'La referencia ya no se puede consultar. Limpiamos el bloqueo para que revises el carrito antes de continuar.'
      );
      return;
    }
    if (errorConsulta || !ESTADOS_PAGO.has(estado)) {
      // Red, 5xx o respuesta desconocida: conserva el último estado, sin desbloquear ni degradar un terminal.
      pintarEstadoPago(memoriaPago?.lastState || 'pendiente');
      actualizar();
      return;
    }

    pintarEstadoPago(estado);
    actualizar();
    if (estadoPago === 'pendiente' && reintentosPago < ESPERAS_PAGO_MS.length) {
      const espera = ESPERAS_PAGO_MS[reintentosPago];
      reintentosPago += 1;
      clearTimeout(temporizadorPago);
      temporizadorPago = setTimeout(() => consultarPago(ref), espera);
    }
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

  function cambiarSesion(sesion) {
    const uidSiguiente = sesionValida(sesion) ? sesion.uid : null;
    const tokenSiguiente = sesion?.sesion?.access_token || '';
    const cambioIdentidad = !!uidSiguiente && !!ultimoUidValido && uidSiguiente !== ultimoUidValido;
    ++generacionCheckout;
    cancelarConsultas();
    if (cambioIdentidad) {
      limpiarFormulario();
      bloqueoProcesado = null;
    }
    if (uidSiguiente && tokenSesionInvalidado && tokenSiguiente && tokenSiguiente !== tokenSesionInvalidado) {
      tokenSesionInvalidado = '';
    }
    if (uidSiguiente) ultimoUidValido = uidSiguiente;
    if (!uidSiguiente || memoriaPago?.uid !== uidSiguiente) ocultarPago();
    else activarMemoria(memoriaPago);
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
    if (evento.shiftKey && document.activeElement === primero) {
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
        },
      });
      const cuerpo = await cuerpoDeRespuesta(error, data);
      const actual = tuplaCarrito(obtenerEstado());

      if (identidad.generacion !== generacionCheckout || !actual || identidad.uid !== actual.uid ||
          identidad.carritoId !== actual.carritoId || identidad.version !== actual.version) return;

      if (error || cuerpo.error) {
        const codigo = codigoPublico(error, cuerpo);
        if (estadoHttp(error) === 401 || codigo === 'SESION_REQUERIDA') {
          await invalidarPorSesion();
          return;
        }
        restaurarEnvio();
        if (codigo === 'CARRITO_YA_PROCESADO') {
          bloqueoProcesado = { uid: identidad.uid, carrito_id: identidad.carritoId, carrito_version: identidad.version };
          await recargarCarrito();
          if (identidad.generacion !== generacionCheckout || identidad.uid !== obtenerEstado()?.sesion?.uid) return;
          memoriaPago = null;
          referenciaActiva = '';
          estadoPago = 'aprobado';
          tarjetaPago.dataset.estado = 'aprobado';
          iconoPago.textContent = '✓';
          tituloPago.textContent = 'Este carrito ya fue procesado';
          mensajePago.textContent = 'Actualizamos el carrito y mantuvimos bloqueado este mismo estado para evitar un pago duplicado.';
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
      if (!pagoPublico) {
        restaurarEnvio();
        mostrarAlerta('No pudimos validar la respuesta del pago. No se abrió ningún cobro; inténtalo de nuevo.');
        return;
      }

      memoriaPago = {
        uid: identidad.uid,
        carrito_id: identidad.carritoId,
        carrito_version: identidad.version,
        startedAt: Date.now(),
        lastState: 'pendiente',
        payload_publico: pagoPublico,
        datos_wompi: datos,
      };
      if (!guardarMemoriaPago(memoriaPago)) {
        memoriaPago = null;
        restaurarEnvio();
        mostrarAlerta('No pudimos guardar de forma segura la intención para el retorno. No se abrió ningún cobro; inténtalo de nuevo.');
        return;
      }

      if (window.mgEvento) window.mgEvento('checkout_iniciado', {});
      activarMemoria(memoriaPago, false);
      irAWompi(pagoPublico, datos);
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
    if (!memoriaPago || memoriaPago.uid !== obtenerEstado()?.sesion?.uid || sesionInvalidada()) return;
    if (!['pendiente', 'rechazado'].includes(memoriaPago.lastState)) return;
    if (memoriaPago.lastState === 'rechazado') {
      memoriaPago = { ...memoriaPago, lastState: 'pendiente' };
      guardarMemoriaPago(memoriaPago);
      pintarEstadoPago('pendiente');
      actualizar();
    }
    irAWompi(memoriaPago.payload_publico, memoriaPago.datos_wompi);
  });

  window.addEventListener('pageshow', (evento) => {
    const modalEstabaAbierto = modal.getAttribute('aria-hidden') === 'false';
    ++generacionCheckout;
    cancelarConsultas();
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('co-modal-open');
    restaurarEnvio(false);
    memoriaPago = leerMemoriaPago();
    referenciaActiva = '';
    estadoPago = '';
    actualizar();
    if ((evento.persisted || retornoUrl.presente || !seccionPago.hidden) && !seccionPago.hidden) {
      requestAnimationFrame(() => seccionPago.focus());
    } else if (modalEstabaAbierto) {
      requestAnimationFrame(() => boton.focus());
    }
  });

  actualizar();
  return { actualizar, cambiarSesion };
}
