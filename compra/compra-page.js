import '../analitica/analitica.js?v=4';
import { observarSesionCliente } from '../cliente/cliente-sesion.js';
import {
  leerBorrador,
  olvidarBorrador,
  cargarResumen,
  confirmarResumen,
  validarIdentidadBorrador,
  validarDatosPersonales,
  validarEntrega,
  guardarDatosPersonales,
  guardarEntrega,
  crearPagoDesdeBorrador,
  moneda,
} from './compra-core.js?v=1';

const paso = document.body.dataset.compraPaso;
const porId = (id) => document.getElementById(id);

function mostrarContenidoSensible(mostrar) {
  const principal = document.querySelector('.cp-main');
  if (principal) principal.style.visibility = mostrar ? '' : 'hidden';
}

function configurarRegreso(borrador) {
  const enlace = document.querySelector('[data-compra-back]');
  if (!enlace) return;
  if (paso === 'resumen' && borrador?.origen?.retorno) enlace.href = borrador.origen.retorno;
  enlace.addEventListener('click', (evento) => {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    try {
      const anterior = document.referrer ? new URL(document.referrer) : null;
      if (!anterior || anterior.origin !== window.location.origin || history.length <= 1) return;
      const anteriorEsFlujo = anterior.pathname.startsWith('/compra/');
      if ((paso === 'resumen' && !anteriorEsFlujo) || (paso !== 'resumen' && anteriorEsFlujo)) {
        evento.preventDefault();
        history.back();
      }
    } catch {
      // El href siempre conserva una ruta de respaldo utilizable.
    }
  });
}

function iconoProducto() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>';
  return svg;
}

function crearItem(item) {
  const articulo = document.createElement('article');
  articulo.className = 'cp-order-item';
  const media = document.createElement('span');
  media.className = 'cp-order-item__media';
  if (item.imagen) {
    const imagen = document.createElement('img');
    imagen.src = item.imagen;
    imagen.alt = '';
    imagen.loading = 'eager';
    imagen.addEventListener('error', () => media.replaceChildren(iconoProducto()), { once: true });
    media.appendChild(imagen);
  } else media.appendChild(iconoProducto());

  const informacion = document.createElement('div');
  informacion.className = 'cp-order-item__info';
  const nombre = document.createElement('h3');
  nombre.textContent = item.nombre;
  const detalle = document.createElement('p');
  detalle.textContent = `${item.cantidad} ${item.cantidad === 1 ? 'unidad' : 'unidades'} · ${moneda(item.precioUnitario)} c/u`;
  informacion.append(nombre, detalle);
  const subtotal = document.createElement('strong');
  subtotal.textContent = moneda(item.subtotal);
  articulo.append(media, informacion, subtotal);
  return articulo;
}

function pintarMini(resumen) {
  const contenedor = document.querySelector('[data-compra-mini]');
  if (!contenedor || !resumen?.items?.length) return;
  const filas = contenedor.querySelector('[data-mini-items]');
  const fragmento = document.createDocumentFragment();
  for (const item of resumen.items) {
    const fila = document.createElement('div');
    fila.className = 'cp-mini__row';
    const nombre = document.createElement('span');
    nombre.textContent = `${item.cantidad} × ${item.nombre}`;
    const subtotal = document.createElement('strong');
    subtotal.textContent = moneda(item.subtotal);
    fila.append(nombre, subtotal);
    fragmento.appendChild(fila);
  }
  filas?.replaceChildren(fragmento);
  const total = contenedor.querySelector('[data-mini-total]');
  if (total) total.textContent = moneda(resumen.total);
}

function mostrarErrorResumen(error) {
  const carga = document.querySelector('[data-compra-loading]');
  const resumen = document.querySelector('[data-compra-resumen]');
  const fallo = document.querySelector('[data-compra-error]');
  if (carga) carga.hidden = true;
  if (resumen) resumen.hidden = true;
  if (fallo) fallo.hidden = false;
  const texto = document.querySelector('[data-compra-error-text]');
  if (texto) texto.textContent = error?.message || 'Vuelve al producto o al carrito para intentarlo de nuevo.';
  const retorno = leerBorrador()?.origen?.retorno;
  const enlace = fallo?.querySelector('a');
  if (enlace && retorno) enlace.href = retorno;
}

async function montarResumen() {
  const boton = document.querySelector('[data-compra-continuar]');
  const carga = document.querySelector('[data-compra-loading]');
  const contenido = document.querySelector('[data-compra-resumen]');
  const fallo = document.querySelector('[data-compra-error]');
  boton.disabled = true;
  if (carga) carga.hidden = false;
  if (contenido) contenido.hidden = true;
  if (fallo) fallo.hidden = true;
  try {
    const resumen = await cargarResumen();
    confirmarResumen(resumen);
    if (carga) carga.hidden = true;
    if (contenido) contenido.hidden = false;
    const titulo = document.querySelector('[data-compra-source-title]');
    const unidades = document.querySelector('[data-compra-units]');
    const lista = document.querySelector('[data-compra-items]');
    const total = document.querySelector('[data-compra-total]');
    if (titulo) titulo.textContent = resumen.titulo;
    if (unidades) unidades.textContent = `${resumen.unidades} ${resumen.unidades === 1 ? 'unidad' : 'unidades'}`;
    if (lista) lista.replaceChildren(...resumen.items.map(crearItem));
    if (total) total.textContent = moneda(resumen.total);
    const actualizado = new URLSearchParams(window.location.search).get('actualizado') === '1';
    const aviso = document.querySelector('[data-compra-update]');
    if (aviso) aviso.hidden = !actualizado;
    boton.disabled = false;
    if (!boton.dataset.compraReady) {
      boton.dataset.compraReady = 'true';
      boton.addEventListener('click', () => window.location.assign('./datos/'));
    }
  } catch (error) {
    mostrarErrorResumen(error);
  }
}

function valoresFormulario(formulario) {
  return Object.fromEntries(new FormData(formulario).entries());
}

function marcarCampo(formulario, nombre, invalido) {
  const control = formulario.elements.namedItem(nombre);
  const contenedor = control?.closest('.cp-field');
  contenedor?.classList.toggle('is-error', invalido);
  control?.setAttribute('aria-invalid', invalido ? 'true' : 'false');
  if (invalido) control?.setAttribute('aria-errormessage', `cp-${nombre}-error`);
  else control?.removeAttribute('aria-errormessage');
  return invalido ? control : null;
}

function conectarValidacion(formulario, validar, boton) {
  const actualizar = () => {
    const resultado = validar(valoresFormulario(formulario));
    boton.disabled = !resultado.valido;
    formulario.querySelectorAll('select').forEach((select) => { select.dataset.vacio = select.value ? 'false' : 'true'; });
    return resultado;
  };
  formulario.querySelectorAll('input, select').forEach((control) => {
    const evento = control.tagName === 'SELECT' ? 'change' : 'input';
    control.addEventListener(evento, () => {
      control.closest('.cp-field')?.classList.remove('is-error');
      control.setAttribute('aria-invalid', 'false');
      control.removeAttribute('aria-errormessage');
      actualizar();
    });
    control.addEventListener('blur', () => {
      const resultado = validar(valoresFormulario(formulario));
      const clave = control.name;
      if (clave in resultado.campos && control.value.trim()) marcarCampo(formulario, clave, !resultado.campos[clave]);
    });
  });
  actualizar();
  return actualizar;
}

function mostrarErrores(formulario, resultado) {
  let primero = null;
  for (const [nombre, valido] of Object.entries(resultado.campos)) {
    const control = marcarCampo(formulario, nombre, !valido);
    if (control && !primero) primero = control;
  }
  primero?.focus();
}

function rellenar(formulario, datos) {
  if (!datos) return;
  for (const [nombre, valor] of Object.entries(datos)) {
    const control = formulario.elements.namedItem(nombre);
    if (control) control.value = valor;
  }
  formulario.querySelectorAll('select').forEach((select) => { select.dataset.vacio = select.value ? 'false' : 'true'; });
}

async function montarDatos(borrador) {
  if (!borrador?.resumen) {
    window.location.replace('../');
    return;
  }
  if (!await validarIdentidadBorrador(borrador)) {
    window.location.replace(borrador.origen?.retorno || '../../carrito/');
    return;
  }
  mostrarContenidoSensible(true);
  pintarMini(borrador.resumen);
  const formulario = porId('cp-personal-form');
  const boton = formulario.querySelector('button[type="submit"]');
  rellenar(formulario, borrador.datos);
  conectarValidacion(formulario, validarDatosPersonales, boton);
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const resultado = validarDatosPersonales(valoresFormulario(formulario));
    if (!resultado.valido) {
      mostrarErrores(formulario, resultado);
      return;
    }
    if (!guardarDatosPersonales(resultado.datos)) {
      const alerta = formulario.querySelector('[data-form-alert]');
      alerta.textContent = 'No pudimos guardar este paso. Vuelve al resumen e inténtalo de nuevo.';
      alerta.hidden = false;
      return;
    }
    window.location.assign('../entrega/');
  });
}

async function montarEntrega(borrador) {
  if (!borrador?.resumen) {
    window.location.replace('../');
    return;
  }
  if (!await validarIdentidadBorrador(borrador)) {
    window.location.replace(borrador.origen?.retorno || '../../carrito/');
    return;
  }
  if (!validarDatosPersonales(borrador.datos).valido) {
    window.location.replace('../datos/');
    return;
  }
  mostrarContenidoSensible(true);
  pintarMini(borrador.resumen);
  const formulario = porId('cp-delivery-form');
  const boton = formulario.querySelector('button[type="submit"]');
  const etiqueta = formulario.querySelector('[data-pay-label]');
  const alerta = formulario.querySelector('[data-form-alert]');
  rellenar(formulario, borrador.entrega);
  let resumenVigente = false;
  const actualizarValidacion = conectarValidacion(formulario, validarEntrega, boton);
  boton.disabled = true;

  try {
    const actual = await cargarResumen(borrador);
    if (actual.fingerprint !== borrador.resumen.fingerprint) {
      window.location.replace('../?actualizado=1');
      return;
    }
    resumenVigente = true;
    const validacion = actualizarValidacion();
    boton.disabled = !validacion.valido;
  } catch (error) {
    alerta.textContent = error?.message || 'No pudimos comprobar la compra. Vuelve al resumen e inténtalo de nuevo.';
    alerta.hidden = false;
    boton.disabled = true;
  }

  formulario.addEventListener('input', () => {
    if (!resumenVigente) boton.disabled = true;
  });
  formulario.addEventListener('change', () => {
    if (!resumenVigente) boton.disabled = true;
  });
  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!resumenVigente || boton.disabled) return;
    const resultado = validarEntrega(valoresFormulario(formulario));
    if (!resultado.valido) {
      mostrarErrores(formulario, resultado);
      return;
    }
    if (!guardarEntrega(resultado.datos)) {
      alerta.textContent = 'No pudimos guardar la dirección. Revisa los campos e inténtalo de nuevo.';
      alerta.hidden = false;
      return;
    }
    alerta.hidden = true;
    formulario.setAttribute('aria-busy', 'true');
    boton.disabled = true;
    etiqueta.textContent = 'Preparando pago…';
    try {
      await crearPagoDesdeBorrador();
    } catch (error) {
      formulario.removeAttribute('aria-busy');
      etiqueta.textContent = 'Pagar con Wompi';
      alerta.textContent = error?.message || 'No pudimos iniciar el pago. Revisa tu conexión e inténtalo de nuevo.';
      alerta.hidden = false;
      if (error?.codigo === 'RESUMEN_CAMBIO' || /MAX_COMPRABLE|VERSION|AGOTAD|NO_DISPONIBLE|PRECIO/.test(error?.codigo || '')) {
        const enlace = document.createElement('a');
        enlace.href = '../?actualizado=1';
        enlace.textContent = 'Revisar el resumen actualizado';
        alerta.append(' ', enlace);
        resumenVigente = false;
      } else boton.disabled = !validarEntrega(valoresFormulario(formulario)).valido;
    }
  });
}

const borrador = leerBorrador();
if (borrador?.origen?.tipo === 'carrito') {
  mostrarContenidoSensible(false);
  observarSesionCliente((sesion) => {
    if (sesion.estado === 'comprobando') {
      mostrarContenidoSensible(false);
      return;
    }
    if (sesion.estado === 'valida' && sesion.uid === borrador.origen.uid) {
      mostrarContenidoSensible(true);
      return;
    }
    mostrarContenidoSensible(false);
    document.querySelector('.cp-form')?.reset();
    olvidarBorrador();
    window.location.replace(borrador.origen.retorno || '/carrito/');
  });
}
configurarRegreso(borrador);
requestAnimationFrame(() => porId('cp-title')?.focus());

if (paso === 'resumen') montarResumen();
else if (paso === 'datos') montarDatos(borrador);
else if (paso === 'entrega') montarEntrega(borrador);

window.addEventListener('pageshow', async (evento) => {
  if (!evento.persisted) return;
  const actual = leerBorrador();
  if (!actual) {
    const retorno = borrador?.origen?.retorno || '/';
    window.location.replace(retorno);
    return;
  }
  if (actual.origen.tipo === 'carrito' && (paso === 'datos' || paso === 'entrega')) {
    mostrarContenidoSensible(false);
    if (!await validarIdentidadBorrador(actual)) {
      document.querySelector('.cp-form')?.reset();
      window.location.replace(actual.origen.retorno || '/carrito/');
      return;
    }
    mostrarContenidoSensible(true);
  }
  if (paso === 'resumen') {
    await montarResumen();
    return;
  }
  if (paso === 'entrega') {
    window.location.reload();
    return;
  }
  document.querySelector('.cp-form')?.removeAttribute('aria-busy');
});
