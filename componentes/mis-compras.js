const WOMPI_CHECKOUT_URL = 'https://checkout.wompi.co/p/';
const FORMATO_REFERENCIA = /^[A-Za-z0-9_-]{6,64}$/;
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FORMATO_UUID_CANONICO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FIRMA = /^[a-fA-F0-9]{64}$/;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const POLLING_MS = 15000;
const DEDUPLICACION_MS = 1200;
const MAX_LINEAS = 100;
const HOST_STORAGE = 'bxlzipwxyxdtffnuizbz.supabase.co';

const ESTADOS = Object.freeze({
  pendiente_pago: ['proceso', 'Pendiente de pago'],
  confirmando_pago: ['proceso', 'Confirmando con tu banco'],
  verificacion: ['proceso', 'Estamos verificando tu pago'],
  aprobada: ['realizada', 'Compra realizada'],
  vencida: ['no_completada', 'Pago vencido'],
  anulada: ['no_completada', 'Pedido anulado'],
  no_completada: ['no_completada', 'Pago no completado'],
});
const ESTADOS_LOGISTICOS = Object.freeze({
  recibido: 'Pedido recibido',
  preparando: 'Preparando tu pedido',
  en_camino: 'En camino',
  entregado: 'Entregado',
  anulado: 'Anulado',
});
const ESTADOS_PAGO = new Set(['pendiente', 'revision', 'aprobado', 'rechazado']);
const FILTROS = Object.freeze({
  todas: 'Todas',
  proceso: 'En proceso',
  realizada: 'Realizadas',
  no_completada: 'No completadas',
});

function falloContrato() {
  const error = new Error('La respuesta de compras no cumple el contrato público.');
  error.codigo = 'MC_RESPUESTA_INVALIDA';
  return error;
}

function objetoPlano(valor) {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
}

function primero(objeto, claves) {
  for (const clave of claves) {
    if (Object.prototype.hasOwnProperty.call(objeto, clave)) return objeto[clave];
  }
  return undefined;
}

function texto(valor, maximo, requerido = true) {
  if (valor === null || valor === undefined) return requerido ? null : '';
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if ((requerido && !limpio) || limpio.length > maximo) return null;
  return limpio;
}

function fechaIso(valor, requerida = true) {
  if (valor === null || valor === undefined || valor === '') return requerida ? null : '';
  if (typeof valor !== 'string' || !FECHA_ISO.test(valor) || !Number.isFinite(Date.parse(valor))) return null;
  return valor;
}

function entero(valor, minimo, maximo) {
  return typeof valor === 'number' && Number.isSafeInteger(valor) && valor >= minimo && valor <= maximo;
}

function totalPesos(compra) {
  const total = primero(compra, ['total_cop']);
  return entero(total, 0, 999999999999999) ? total : null;
}

function urlMagandhi(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor !== 'string' || valor.length > 2048) return '';
  let url;
  try { url = new URL(valor, 'https://magandhi.com/'); } catch { return ''; }
  const hostValido = url.hostname === 'magandhi.com' || url.hostname.endsWith('.magandhi.com');
  if (url.protocol !== 'https:' || url.port || !hostValido || url.username || url.password) return '';
  if (tipo === 'producto' && url.pathname !== '/producto/' && !url.pathname.startsWith('/producto/')) return '';
  return url.href;
}

function imagenReferencia(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor !== 'string' || valor.length > 1024 || valor.includes('\\') || valor.split('/').includes('..')) return '';
  if (!/^https?:\/\//i.test(valor)) return /^[A-Za-z0-9/_ .-]+$/.test(valor) ? valor : '';
  let url;
  try { url = new URL(valor); } catch { return ''; }
  const magandhi = url.hostname === 'magandhi.com' || url.hostname.endsWith('.magandhi.com');
  return url.protocol === 'https:' && !url.port && !url.username && !url.password &&
    (magandhi || url.hostname === HOST_STORAGE) ? url.href : '';
}

function normalizarLinea(valor) {
  if (!objetoPlano(valor)) throw falloContrato();
  const nombre = texto(valor.nombre, 180);
  const cantidad = valor.cantidad;
  const subtotal = valor.subtotal;
  const id = valor.id;
  const slug = texto(valor.slug, 180, false);
  if (!nombre || !entero(cantidad, 1, 999999) || !entero(subtotal, 0, 999999999999999) ||
      (id !== null && id !== undefined && (!texto(id, 36) || !FORMATO_UUID_CANONICO.test(id))) ||
      slug === null || (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) ||
      typeof valor.puede_opinar !== 'boolean') throw falloContrato();
  const destino = id ? urlMagandhi(slug
    ? `https://magandhi.com/producto/${encodeURIComponent(slug)}/`
    : `https://magandhi.com/producto/?id=${encodeURIComponent(id)}`, 'producto') : '';
  return Object.freeze({
    nombre,
    cantidad,
    subtotal,
    imagen: imagenReferencia(valor.imagen),
    destino,
    puede_opinar: valor.puede_opinar === true,
  });
}

function normalizarTimeline(valor) {
  if (valor === undefined || valor === null) return Object.freeze([]);
  if (!Array.isArray(valor) || valor.length > 100) throw falloContrato();
  return Object.freeze(valor.map((paso) => {
    if (!objetoPlano(paso)) throw falloContrato();
    const estado = texto(primero(paso, ['estado', 'etapa']), 30);
    const cuando = fechaIso(paso.fecha_iso, false);
    if (!estado || !ESTADOS_LOGISTICOS[estado] || cuando === null) throw falloContrato();
    return Object.freeze({ estado, etiqueta: ESTADOS_LOGISTICOS[estado], cuando });
  }));
}

function normalizarCompra(valor) {
  if (!objetoPlano(valor)) throw falloContrato();
  const referencia = texto(valor.referencia, 64);
  const clasificacion = texto(valor.clasificacion, 30);
  const estado = texto(valor.estado, 30);
  const configuracion = ESTADOS[estado || ''];
  const creadaEn = fechaIso(valor.creado_iso);
  const realizada = clasificacion === 'realizada';
  const compradaEn = fechaIso(valor.comprado_iso, realizada);
  const expiraEn = fechaIso(valor.expira_en, clasificacion === 'proceso');
  const total = totalPesos(valor);
  const lineas = valor.lineas;
  const pedido = valor.pedido;

  if (!referencia || !FORMATO_REFERENCIA.test(referencia) || !configuracion ||
      clasificacion !== configuracion[0] || valor.etiqueta !== configuracion[1] ||
      !creadaEn || compradaEn === null || expiraEn === null || total === null ||
      !Array.isArray(lineas) || lineas.length < 1 || lineas.length > MAX_LINEAS ||
      typeof valor.puede_continuar !== 'boolean' || typeof valor.puede_verificar !== 'boolean' ||
      !(pedido === null || pedido === undefined || objetoPlano(pedido))) throw falloContrato();

  let estadoLogistico = '';
  let timeline = Object.freeze([]);
  if (objetoPlano(pedido)) {
    estadoLogistico = texto(pedido.estado_logistico, 30);
    if (!estadoLogistico || !ESTADOS_LOGISTICOS[estadoLogistico] ||
        typeof pedido.etiqueta_logistica !== 'string') throw falloContrato();
    timeline = normalizarTimeline(pedido.timeline);
  }
  if (clasificacion === 'realizada' && !objetoPlano(pedido)) throw falloContrato();

  const confirmacionPendiente = estado === 'confirmando_pago';
  const enVerificacion = estado === 'verificacion';
  return Object.freeze({
    referencia,
    estado,
    grupo: clasificacion,
    etiqueta: configuracion[1],
    creada_en: creadaEn,
    comprada_en: compradaEn,
    expira_en: expiraEn,
    total,
    lineas: Object.freeze(lineas.map(normalizarLinea)),
    puede_continuar: valor.puede_continuar === true && !confirmacionPendiente && !enVerificacion,
    puede_verificar: valor.puede_verificar === true,
    confirmacion_pendiente: confirmacionPendiente,
    en_verificacion: enVerificacion,
    mensaje_cierre: '',
    estado_logistico: estadoLogistico,
    timeline,
  });
}

export function normalizarListadoCompras(data) {
  const lista = objetoPlano(data) ? data.compras : null;
  if (!Array.isArray(lista)) throw falloContrato();
  const compras = lista.map(normalizarCompra).sort((a, b) => {
    const diferencia = Date.parse(b.comprada_en || b.creada_en) - Date.parse(a.comprada_en || a.creada_en);
    return diferencia || b.referencia.localeCompare(a.referencia, 'es');
  });
  return Object.freeze(compras);
}

function compradorPago(valor) {
  if (!objetoPlano(valor)) return null;
  const nombre = texto(valor.nombre, 120);
  const correo = texto(valor.correo, 160);
  const telefono = texto(valor.telefono, 10);
  const direccion = texto(valor.direccion, 220);
  const ciudad = texto(valor.ciudad, 80);
  const departamento = texto(valor.departamento, 80);
  if (!nombre || nombre.length < 2 || !correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ||
      !telefono || !/^\d{10}$/.test(telefono) || !direccion || direccion.length < 3 ||
      !ciudad || ciudad.length < 2 || !departamento || valor.pais !== 'CO') return null;
  return Object.freeze({ nombre, correo, telefono, direccion, ciudad, departamento, pais: 'CO' });
}

function pagoPublico(cuerpo, referenciaEsperada) {
  const pago = objetoPlano(cuerpo?.pago) ? cuerpo.pago : cuerpo;
  if (!objetoPlano(pago)) return null;
  const comprador = compradorPago(cuerpo?.comprador ?? pago.comprador);
  const checkout = cuerpo?.checkout;
  let retorno;
  try { retorno = new URL(pago.url_redireccion); } catch { return null; }
  const referencia = texto(pago.referencia, 64);
  if (!referencia || referencia !== referenciaEsperada || !FORMATO_REFERENCIA.test(referencia) ||
      !objetoPlano(checkout) || checkout.tipo !== 'compra' || checkout.referencia !== referencia || checkout.recargar !== true ||
      !comprador ||
      typeof pago.llave_publica !== 'string' || !pago.llave_publica.trim() || pago.llave_publica.length > 200 ||
      pago.moneda !== 'COP' || typeof pago.monto_en_centavos !== 'string' || !/^(?!0)\d{1,18}$/.test(pago.monto_en_centavos) ||
      typeof pago.expira_en !== 'string' || !FECHA_ISO.test(pago.expira_en) ||
      !Number.isFinite(Date.parse(pago.expira_en)) || Date.parse(pago.expira_en) <= Date.now() ||
      typeof pago.firma_integridad !== 'string' || !FIRMA.test(pago.firma_integridad) ||
      retorno.protocol !== 'https:' || retorno.hostname !== 'magandhi.com' || retorno.port ||
      retorno.pathname !== '/carrito/' || retorno.searchParams.get('ref') !== referencia) return null;
  return Object.freeze({
    llave_publica: pago.llave_publica.trim(), moneda: pago.moneda,
    monto_en_centavos: pago.monto_en_centavos, referencia,
    expira_en: pago.expira_en, firma_integridad: pago.firma_integridad,
    url_redireccion: retorno.href,
    comprador,
    checkout: Object.freeze({ tipo: 'compra', referencia, recargar: true }),
  });
}

function respuestaEstadoValida(cuerpo, referencia) {
  if (!objetoPlano(cuerpo) || typeof cuerpo.estado !== 'string') return false;
  const estado = cuerpo.estado.toLowerCase();
  if (!ESTADOS_PAGO.has(estado)) return false;
  const checkout = cuerpo.checkout;
  if (!objetoPlano(checkout) || checkout.recargar !== true) return false;
  if (checkout.tipo === 'compra') {
    return checkout.referencia === referencia && FORMATO_REFERENCIA.test(checkout.referencia || '');
  }
  return checkout.tipo === 'carrito' && FORMATO_UUID.test(checkout.id || '') &&
    entero(checkout.version, 0, Number.MAX_SAFE_INTEGER);
}

async function cuerpoRespuesta(error, data) {
  let cuerpo = data;
  if (error?.context && typeof error.context.json === 'function') {
    try { cuerpo = await error.context.json(); } catch { /* Se usa data si el error no expone JSON. */ }
  }
  return objetoPlano(cuerpo) ? cuerpo : {};
}

function abrirWompi(pago) {
  const validado = pagoPublico(pago, pago?.referencia);
  if (!validado) return false;
  const formulario = document.createElement('form');
  formulario.method = 'GET';
  formulario.action = WOMPI_CHECKOUT_URL;
  formulario.dataset.wompiTemporal = 'true';
  const campos = {
    'public-key': validado.llave_publica,
    currency: validado.moneda,
    'amount-in-cents': validado.monto_en_centavos,
    reference: validado.referencia,
    'expiration-time': validado.expira_en,
    'signature:integrity': validado.firma_integridad,
    'redirect-url': validado.url_redireccion,
    'customer-data:email': validado.comprador.correo,
    'customer-data:full-name': validado.comprador.nombre,
    'customer-data:phone-number': validado.comprador.telefono,
    'customer-data:phone-number-prefix': '+57',
    'shipping-address:address-line-1': validado.comprador.direccion,
    'shipping-address:city': validado.comprador.ciudad,
    'shipping-address:region': validado.comprador.departamento,
    'shipping-address:phone-number': validado.comprador.telefono,
    'shipping-address:name': validado.comprador.nombre,
    'shipping-address:country': validado.comprador.pais,
  };
  for (const [nombre, valor] of Object.entries(campos)) {
    const entrada = document.createElement('input');
    entrada.type = 'hidden';
    entrada.name = nombre;
    entrada.value = valor;
    formulario.appendChild(entrada);
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

function moneda(valor) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

function fecha(valor, incluirHora = false) {
  const opciones = incluirHora
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat('es-CO', opciones).format(new Date(valor));
}

function crear(tag, clase, contenido) {
  const elemento = document.createElement(tag);
  if (clase) elemento.className = clase;
  if (contenido !== undefined) elemento.textContent = contenido;
  return elemento;
}

function reemplazarImagenPorPlaceholder(contenedor) {
  contenedor.replaceChildren();
  contenedor.classList.add('cc-purchase-line__image--empty');
  contenedor.setAttribute('aria-hidden', 'true');
  contenedor.textContent = 'M';
}

export function crearControlMisCompras({ supabase, obtenerSesion, obtenerRutas, alCambiar }) {
  let compras = Object.freeze([]);
  let uidActual = null;
  let contenedor = null;
  let activa = false;
  let cargada = false;
  let errorCarga = false;
  let filtro = 'todas';
  let generacion = 0;
  let promesa = null;
  let ultimoInicio = 0;
  let temporizador = null;
  let referenciaEnAccion = '';
  let mensajeAccion = '';
  let mensajeAccionReferencia = '';
  let mensajeGeneral = '';
  let anuncio = '';
  let huellaListado = '[]';
  let referenciaExpandida = '';

  function sesionValida() {
    const sesion = obtenerSesion();
    return sesion?.estado === 'valida' && FORMATO_UUID.test(sesion.uid || '') &&
      !!sesion.sesion?.user?.email_confirmed_at;
  }

  function procesos() {
    return compras.filter((compra) => compra.grupo === 'proceso').length;
  }

  function urlImagen(referencia) {
    if (!referencia) return '';
    if (/^https:\/\//i.test(referencia)) return imagenReferencia(referencia);
    try {
      const url = supabase.storage.from('campanas').getPublicUrl(referencia)?.data?.publicUrl || '';
      const validada = new URL(url);
      return validada.protocol === 'https:' && validada.hostname === HOST_STORAGE && !validada.port ? validada.href : '';
    } catch { return ''; }
  }

  function estadoPublico() {
    return Object.freeze({ uid: uidActual, compras, procesos: procesos(), cargada, error: errorCarga });
  }

  function publicar() {
    const estado = estadoPublico();
    alCambiar?.(estado);
    window.dispatchEvent(new CustomEvent('magandhi:compras', { detail: estado }));
  }

  function detenerPolling() {
    clearTimeout(temporizador);
    temporizador = null;
  }

  function programarPolling() {
    detenerPolling();
    if (document.visibilityState !== 'visible' || procesos() < 1 || !sesionValida()) return;
    temporizador = setTimeout(() => {
      temporizador = null;
      void cargar({ silenciosa: true });
    }, POLLING_MS);
  }

  function claveFocoActual() {
    const activo = document.activeElement;
    return contenedor?.contains(activo) ? activo.dataset.ccFocusKey || '' : '';
  }

  function restaurarFoco(clave) {
    if (!clave || !contenedor) return;
    const equivalente = [...contenedor.querySelectorAll('[data-cc-focus-key]')]
      .find((elemento) => elemento.dataset.ccFocusKey === clave);
    if (!equivalente) return;
    try { equivalente.focus({ preventScroll: true }); } catch { equivalente.focus(); }
  }

  function cabecera() {
    const fragmento = document.createDocumentFragment();
    const cabeza = crear('div', 'cc-view-head');
    cabeza.append(crear('span', 'cc-view-kicker', 'Tu historial'));
    const titulo = crear('h2', '', 'Mis compras');
    titulo.id = 'cc-view-title';
    titulo.tabIndex = -1;
    cabeza.append(titulo, crear('p', '', 'Consulta tus pagos en proceso, compras realizadas y pedidos no completados con información confirmada por MAGANDHI.'));
    const region = crear('p', 'cc-purchase-updates', anuncio);
    anuncio = '';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    fragmento.append(cabeza, region);

    if (mensajeGeneral) {
      const aviso = crear('p', 'cc-purchase-alert cc-purchase-alert--general', mensajeGeneral);
      aviso.setAttribute('role', 'alert');
      fragmento.appendChild(aviso);
    }

    const filtros = crear('div', 'cc-purchase-filters');
    filtros.setAttribute('role', 'group');
    filtros.setAttribute('aria-label', 'Filtrar compras');
    for (const [valor, etiqueta] of Object.entries(FILTROS)) {
      const boton = crear('button', 'cc-purchase-filter', etiqueta);
      boton.type = 'button';
      boton.dataset.filtro = valor;
      boton.dataset.ccFocusKey = `filtro:${valor}`;
      boton.classList.toggle('is-active', filtro === valor);
      boton.setAttribute('aria-pressed', filtro === valor ? 'true' : 'false');
      boton.addEventListener('click', () => {
        filtro = valor;
        renderizar();
      });
      filtros.appendChild(boton);
    }
    fragmento.appendChild(filtros);
    return fragmento;
  }

  function estadoVacio(titulo, detalle, error = false) {
    const bloque = crear('div', `cc-empty-state${error ? ' cc-empty-state--error' : ''}`);
    if (!error) {
      const icono = crear('span', 'cc-empty-state__icon');
      icono.setAttribute('aria-hidden', 'true');
      icono.textContent = 'M';
      bloque.appendChild(icono);
    }
    bloque.append(crear('h3', '', titulo), crear('p', '', detalle));
    if (error) {
      bloque.setAttribute('role', 'alert');
      const reintentar = crear('button', 'cc-view-cta', 'Intentar de nuevo');
      reintentar.type = 'button';
      reintentar.dataset.ccFocusKey = 'estado:error:reintentar';
      reintentar.addEventListener('click', () => cargar({ forzar: true }));
      bloque.appendChild(reintentar);
    } else {
      const enlace = crear('a', 'cc-view-cta', 'Descubrir productos');
      enlace.href = `${obtenerRutas()?.inicio || '../'}#descubrir`;
      bloque.appendChild(enlace);
    }
    return bloque;
  }

  function detalleProceso(compra, cuerpo) {
    const aviso = crear('div', 'cc-purchase-process');
    if (!compra.confirmacion_pendiente && !compra.en_verificacion) {
      aviso.appendChild(crear('p', '', `Disponible hasta ${fecha(compra.expira_en, true)}.`));
    }
    if (compra.confirmacion_pendiente) {
      aviso.appendChild(crear('p', 'cc-purchase-process__bank', 'Tu banco está confirmando el pago. No abras otra ventana de pago; aquí puedes verificar el estado.'));
    } else if (compra.en_verificacion) {
      aviso.appendChild(crear('p', 'cc-purchase-process__bank', 'Estamos verificando el pago. No se abrirá otra ventana mientras resolvemos la confirmación.'));
    } else {
      aviso.appendChild(crear('p', '', compra.mensaje_cierre || 'Si el pago no se completa a tiempo, esta compra se cerrará automáticamente.'));
    }
    cuerpo.appendChild(aviso);
  }

  function detalleLogistico(compra, cuerpo) {
    if (!compra.estado_logistico && compra.timeline.length === 0) return;
    const bloque = crear('div', 'cc-purchase-logistics');
    if (compra.estado_logistico) {
      bloque.append(crear('span', 'cc-purchase-logistics__label', 'Estado del pedido'),
        crear('strong', '', ESTADOS_LOGISTICOS[compra.estado_logistico]));
    }
    if (compra.timeline.length) {
      const lista = crear('ol', 'cc-purchase-timeline');
      for (const paso of compra.timeline) {
        const item = crear('li', 'cc-purchase-timeline__item');
        const punto = crear('span', 'cc-purchase-timeline__dot');
        punto.setAttribute('aria-hidden', 'true');
        item.append(punto, crear('strong', '', paso.etiqueta));
        if (paso.cuando) {
          const cuando = crear('time', '', fecha(paso.cuando, true));
          cuando.dateTime = paso.cuando;
          item.appendChild(cuando);
        }
        lista.appendChild(item);
      }
      bloque.appendChild(lista);
    }
    cuerpo.appendChild(bloque);
  }

  function lineaCompra(linea, compra, indice) {
    const articulo = crear('article', 'cc-purchase-line');
    const imagen = crear('span', 'cc-purchase-line__image');
    const imagenActual = urlImagen(linea.imagen);
    if (imagenActual) {
      const foto = document.createElement('img');
      foto.src = imagenActual;
      foto.alt = '';
      foto.loading = 'lazy';
      foto.referrerPolicy = 'no-referrer';
      foto.addEventListener('error', () => reemplazarImagenPorPlaceholder(imagen), { once: true });
      imagen.appendChild(foto);
    } else reemplazarImagenPorPlaceholder(imagen);

    const datos = crear('div', 'cc-purchase-line__data');
    datos.append(crear('h4', '', linea.nombre), crear('p', '', `Cantidad: ${linea.cantidad} · ${moneda(linea.subtotal)}`));
    articulo.append(imagen, datos);

    if (compra.grupo === 'realizada') {
      const acciones = crear('div', 'cc-purchase-line__actions');
      if (linea.destino) {
        const recomprar = crear('a', 'cc-purchase-link', 'Volver a comprar');
        recomprar.href = linea.destino;
        recomprar.dataset.ccFocusKey = `compra:${compra.referencia}:linea:${indice}:recomprar`;
        recomprar.setAttribute('aria-label', `Volver a comprar ${linea.nombre}; se comprobarán precio y disponibilidad actuales`);
        acciones.appendChild(recomprar);
      }
      if (linea.puede_opinar === true && compra.estado_logistico === 'entregado') {
        const opinar = crear('button', 'cc-purchase-link cc-purchase-link--muted', 'Dar mi opinión · Próximamente');
        opinar.type = 'button';
        opinar.disabled = true;
        acciones.appendChild(opinar);
      }
      if (acciones.childElementCount) articulo.appendChild(acciones);
    }
    return articulo;
  }

  function mostrarMensajeAccion(referencia, mensaje) {
    mensajeAccion = mensaje;
    mensajeAccionReferencia = referencia;
    referenciaEnAccion = '';
    referenciaExpandida = referencia;
    if (activa) renderizar();
    const alerta = contenedor?.querySelector(`[data-compra-ref="${CSS.escape(referencia)}"] [data-cc-purchase-alert]`);
    if (alerta) alerta.focus();
  }

  async function continuar(compra) {
    if (referenciaEnAccion || !sesionValida() || compra.puede_continuar !== true || compra.confirmacion_pendiente) return;
    const uidAccion = obtenerSesion().uid;
    referenciaEnAccion = compra.referencia;
    referenciaExpandida = compra.referencia;
    mensajeAccion = '';
    mensajeAccionReferencia = '';
    renderizar();
    try {
      const { data, error } = await supabase.functions.invoke('crear-intencion-pago', {
        body: { intencion: { referencia: compra.referencia } },
      });
      if (!sesionValida() || obtenerSesion().uid !== uidAccion || referenciaEnAccion !== compra.referencia) return;
      const cuerpo = await cuerpoRespuesta(error, data);
      if (error || cuerpo.error) throw new Error('MC_CONTINUAR_ERROR');
      const pago = pagoPublico(cuerpo, compra.referencia);
      if (!pago || !abrirWompi(pago)) throw new Error('MC_PAGO_INVALIDO');
    } catch {
      if (!sesionValida() || obtenerSesion().uid !== uidAccion || referenciaEnAccion !== compra.referencia) return;
      await cargar({ silenciosa: true, forzar: true });
      mostrarMensajeAccion(compra.referencia, 'No pudimos abrir este pago de forma segura. Actualizamos la compra para que veas su estado vigente.');
    }
  }

  async function verificar(compra) {
    if (referenciaEnAccion || !sesionValida()) return;
    const uidAccion = obtenerSesion().uid;
    referenciaEnAccion = compra.referencia;
    referenciaExpandida = compra.referencia;
    mensajeAccion = '';
    mensajeAccionReferencia = '';
    renderizar();
    try {
      const { data, error } = await supabase.functions.invoke('estado-pago', {
        body: { referencia: compra.referencia },
      });
      if (!sesionValida() || obtenerSesion().uid !== uidAccion || referenciaEnAccion !== compra.referencia) return;
      const cuerpo = await cuerpoRespuesta(error, data);
      if (error || !respuestaEstadoValida(cuerpo, compra.referencia)) throw new Error('MC_ESTADO_INVALIDO');
      referenciaEnAccion = '';
      await cargar({ silenciosa: true, forzar: true });
      renderizar();
    } catch {
      if (!sesionValida() || obtenerSesion().uid !== uidAccion || referenciaEnAccion !== compra.referencia) return;
      await cargar({ silenciosa: true, forzar: true });
      mostrarMensajeAccion(compra.referencia, 'No pudimos verificar el pago en este momento. Conservamos el último estado confirmado.');
    }
  }

  function tarjetaCompra(compra) {
    const expandida = referenciaExpandida === compra.referencia;
    const tarjeta = crear('article', `cc-purchase-card cc-purchase-card--${compra.grupo}`);
    tarjeta.dataset.compraRef = compra.referencia;
    tarjeta.classList.toggle('is-expanded', expandida);
    if (referenciaEnAccion === compra.referencia) tarjeta.setAttribute('aria-busy', 'true');

    const idDetalle = `cc-purchase-detail-${compra.referencia}`;
    const superior = crear('button', 'cc-purchase-card__summary');
    superior.type = 'button';
    superior.dataset.ccFocusKey = `compra:${compra.referencia}:toggle`;
    superior.setAttribute('aria-expanded', expandida ? 'true' : 'false');
    superior.setAttribute('aria-controls', idDetalle);

    const estado = crear('span', `cc-purchase-status cc-purchase-status--${compra.grupo}`, compra.etiqueta);
    const meta = crear('span', 'cc-purchase-card__meta');
    const fechaCompra = compra.grupo === 'realizada' ? compra.comprada_en : compra.creada_en;
    const tiempo = crear('time', '', `${compra.grupo === 'realizada' ? 'Comprado el' : 'Creada el'} ${fecha(fechaCompra)}`);
    tiempo.dateTime = fechaCompra;
    meta.append(estado, tiempo);

    const unidades = compra.lineas.reduce((total, linea) => total + linea.cantidad, 0);
    const resumenLineas = compra.lineas.length === 1
      ? `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} · ${compra.lineas[0].nombre}`
      : `${unidades} unidades · ${compra.lineas.length} productos`;
    const resumen = crear('span', 'cc-purchase-card__brief', resumenLineas);
    const principal = crear('span', 'cc-purchase-card__summary-main');
    principal.append(meta, resumen);

    const total = crear('span', 'cc-purchase-card__total');
    total.append(crear('span', '', 'Total'), crear('strong', '', moneda(compra.total)));

    const indicador = crear('span', 'cc-purchase-card__toggle');
    indicador.setAttribute('aria-hidden', 'true');
    indicador.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>';
    const accion = crear('span', 'cc-purchase-card__toggle-label', expandida ? 'Ocultar detalles' : 'Ver detalles');
    superior.append(principal, total, indicador, accion);
    superior.addEventListener('click', () => {
      referenciaExpandida = expandida ? '' : compra.referencia;
      renderizar();
    });

    const detalles = crear('div', 'cc-purchase-card__details');
    detalles.id = idDetalle;
    detalles.hidden = !expandida;
    if (expandida) {
      const cuerpo = crear('div', 'cc-purchase-card__body');
      if (compra.grupo === 'proceso') detalleProceso(compra, cuerpo);
      if (compra.grupo === 'realizada') detalleLogistico(compra, cuerpo);
      const lineas = crear('div', 'cc-purchase-lines');
      compra.lineas.forEach((linea, indice) => lineas.appendChild(lineaCompra(linea, compra, indice)));
      cuerpo.appendChild(lineas);

      const pie = crear('footer', 'cc-purchase-card__footer');
      const referencia = crear('span', 'cc-purchase-reference', `Referencia ${compra.referencia}`);
      pie.appendChild(referencia);
      if (compra.grupo === 'proceso') {
        const acciones = crear('div', 'cc-purchase-card__actions');
        if (compra.puede_continuar) {
          const continuarPago = crear('button', 'cc-purchase-action cc-purchase-action--primary', 'Continuar pago');
          continuarPago.type = 'button';
          continuarPago.dataset.ccFocusKey = `compra:${compra.referencia}:continuar`;
          continuarPago.setAttribute('aria-disabled', referenciaEnAccion === compra.referencia ? 'true' : 'false');
          continuarPago.addEventListener('click', () => continuar(compra));
          acciones.appendChild(continuarPago);
        }
        if (compra.puede_verificar) {
          const comprobar = crear('button', 'cc-purchase-action', referenciaEnAccion === compra.referencia ? 'Verificando…' : 'Verificar estado');
          comprobar.type = 'button';
          comprobar.dataset.ccFocusKey = `compra:${compra.referencia}:verificar`;
          comprobar.setAttribute('aria-disabled', referenciaEnAccion ? 'true' : 'false');
          comprobar.addEventListener('click', () => verificar(compra));
          acciones.appendChild(comprobar);
        }
        if (acciones.childElementCount) pie.appendChild(acciones);
      }
      if (mensajeAccion && mensajeAccionReferencia === compra.referencia && !referenciaEnAccion) {
        const alerta = crear('p', 'cc-purchase-alert', mensajeAccion);
        alerta.dataset.ccPurchaseAlert = '';
        alerta.tabIndex = -1;
        alerta.setAttribute('role', 'alert');
        cuerpo.appendChild(alerta);
      }
      detalles.append(cuerpo, pie);
    }
    tarjeta.append(superior, detalles);
    return tarjeta;
  }

  function renderizar() {
    if (!contenedor || !activa) return;
    const foco = claveFocoActual();
    contenedor.replaceChildren(cabecera());
    if (!cargada && promesa) {
      const carga = crear('div', 'cc-purchase-loading');
      const spinner = crear('span', 'cc-purchase-spinner');
      spinner.setAttribute('aria-hidden', 'true');
      carga.append(spinner, crear('p', '', 'Cargando tus compras…'));
      contenedor.appendChild(carga);
      restaurarFoco(foco);
      return;
    }
    if (errorCarga && !cargada) {
      contenedor.appendChild(estadoVacio('No pudimos cargar tus compras', 'Revisa tu conexión e inténtalo de nuevo. No mostramos información sin confirmar.', true));
      restaurarFoco(foco);
      return;
    }
    const visibles = filtro === 'todas' ? compras : compras.filter((compra) => compra.grupo === filtro);
    if (!visibles.length) {
      const sinFiltro = compras.length > 0;
      contenedor.appendChild(estadoVacio(
        sinFiltro ? 'No hay compras en este filtro' : 'Todavía no tienes compras',
        sinFiltro ? 'Elige otro filtro para consultar tu historial.' : 'Cuando inicies o completes una compra, aparecerá aquí con su estado real.'
      ));
      restaurarFoco(foco);
      return;
    }
    const lista = crear('div', 'cc-purchase-list');
    for (const compra of visibles) lista.appendChild(tarjetaCompra(compra));
    contenedor.appendChild(lista);
    restaurarFoco(foco);
  }

  async function cargar({ silenciosa = false, forzar = false } = {}) {
    if (!sesionValida()) return null;
    const sesion = obtenerSesion();
    const uidAlPedir = sesion.uid;
    if (promesa) return promesa;
    if (!forzar && Date.now() - ultimoInicio < DEDUPLICACION_MS) return compras;
    const token = ++generacion;
    ultimoInicio = Date.now();
    if (!silenciosa && !cargada) renderizar();
    const tarea = (async () => {
      try {
        const { data, error } = await supabase.rpc('mc_compras_listar');
        if (error) throw error;
        const listado = normalizarListadoCompras(data);
        if (token !== generacion || uidAlPedir !== obtenerSesion()?.uid) return null;
        const nuevaHuella = JSON.stringify(listado);
        const primeraCarga = !cargada;
        const recuperada = errorCarga;
        const cambio = nuevaHuella !== huellaListado;
        if (cambio) {
          compras = listado;
          huellaListado = nuevaHuella;
          if (referenciaExpandida && !listado.some((compra) => compra.referencia === referenciaExpandida)) {
            referenciaExpandida = '';
          }
        }
        uidActual = uidAlPedir;
        cargada = true;
        errorCarga = false;
        if (cambio || primeraCarga || recuperada) {
          anuncio = primeraCarga
            ? `${listado.length} ${listado.length === 1 ? 'compra cargada' : 'compras cargadas'}.`
            : 'Tus compras se actualizaron.';
          publicar();
          renderizar();
        }
        return compras;
      } catch (error) {
        if (token !== generacion || uidAlPedir !== obtenerSesion()?.uid) return null;
        const cambioError = !errorCarga;
        errorCarga = true;
        if (cambioError) {
          anuncio = 'No pudimos actualizar tus compras.';
          publicar();
          renderizar();
        }
        return null;
      } finally {
        if (token === generacion) promesa = null;
        programarPolling();
      }
    })();
    promesa = tarea;
    if (!silenciosa && !cargada) renderizar();
    return tarea;
  }

  function mostrarAviso(mensaje = '') {
    mensajeGeneral = texto(mensaje, 300, false) || '';
    if (activa) renderizar();
  }

  function montar(elemento) {
    contenedor = elemento;
    activa = true;
    filtro = FILTROS[filtro] ? filtro : 'todas';
    mensajeAccion = '';
    mensajeAccionReferencia = '';
    renderizar();
    cargar({ forzar: true });
    programarPolling();
  }

  function desmontar() {
    activa = false;
    contenedor = null;
    referenciaEnAccion = '';
    mensajeAccion = '';
    mensajeAccionReferencia = '';
    programarPolling();
  }

  function cambiarSesion(sesion) {
    ++generacion;
    promesa = null;
    detenerPolling();
    const uid = sesion?.estado === 'valida' ? sesion.uid : null;
    if (!uid || uid !== uidActual) {
      compras = Object.freeze([]);
      huellaListado = '[]';
      cargada = false;
      errorCarga = false;
      referenciaEnAccion = '';
      referenciaExpandida = '';
      mensajeAccion = '';
      mensajeGeneral = '';
      anuncio = '';
      uidActual = uid;
      publicar();
      renderizar();
    }
    if (uid && sesionValida()) cargar({ silenciosa: true, forzar: true });
  }

  function invalidar() {
    ++generacion;
    promesa = null;
    ultimoInicio = 0;
    if (sesionValida()) return cargar({ silenciosa: cargada, forzar: true });
    return Promise.resolve(null);
  }

  function revalidarVisible() {
    if (document.visibilityState !== 'visible' || !sesionValida()) return;
    cargar({ silenciosa: true });
  }

  document.addEventListener('visibilitychange', revalidarVisible);
  window.addEventListener('focus', revalidarVisible);
  window.addEventListener('pageshow', revalidarVisible);

  return Object.freeze({ montar, desmontar, cambiarSesion, invalidar, cargar, mostrarAviso, estado: estadoPublico });
}
