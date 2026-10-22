import '../componentes/cuenta-carrito.js?v=11';
import {
  buscarProductos,
  crearTarjetaProducto,
  montarSlots,
} from '../componentes/motor-tienda.js?v=3';
import { supabase } from '../supabase-config.js';
import {
  cargarCategoriasPublicas,
  categoriaPorCodigo,
} from '../componentes/categorias.js?v=3';

const TAMANO_PAGINA = 12;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODELO_RE = /^[a-z0-9][a-z0-9._-]{0,59}$/;
const paginaBuscar = new URL('./', import.meta.url);
const parametros = new URLSearchParams(window.location.search);
const consulta = normalizarConsulta(parametros.get('q'));
const categoriaPedida = normalizarCategoria(parametros.get('categoria'));
const grid = document.getElementById('bs-grid');
const estado = document.getElementById('bs-state');
const totalNodo = document.getElementById('bs-total');
const botonMas = document.getElementById('bs-more');
const selectorCategoria = document.getElementById('bs-category');
const avisoCategorias = document.getElementById('bs-category-notice');
const botonReintentarCategorias = document.getElementById('bs-category-retry');
const formularioPrincipal = document.querySelector('.bs-form[data-buscador-catalogo]');
const entradaPrincipal = document.getElementById('bs-query');
const descubrimiento = document.getElementById('bs-discovery');
const productosVistos = new Set();
let cantidadProductosVistos = 0;
let categoriaActiva = null;
let categoriaFiltro = categoriaPedida || null;
let desde = 0;
let total = 0;
let cargando = false;
let controlador = null;
let generacion = 0;
let analiticaEmitida = false;
let fuenteBusqueda = null;

function normalizarConsulta(valor) {
  return typeof valor === 'string'
    ? valor.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 120)
      .toLocaleLowerCase('es')
    : '';
}

function normalizarCategoria(valor) {
  const limpia = typeof valor === 'string'
    ? valor.normalize('NFKC').trim().toLowerCase()
    : '';
  return limpia.length <= 64 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(limpia) ? limpia : '';
}

function actualizarCategoriaFormulario() {
  if (formularioPrincipal) formularioPrincipal.dataset.buscadorCategoria = categoriaFiltro || '';
}

function mostrarEstado(mensaje, tono = '') {
  estado.replaceChildren();
  estado.textContent = mensaje;
  estado.dataset.tone = tono;
  estado.setAttribute('role', tono === 'error' ? 'alert' : 'status');
  estado.hidden = !mensaje;
}

function mostrarError() {
  estado.replaceChildren();
  estado.dataset.tone = 'error';
  estado.setAttribute('role', 'alert');
  const mensaje = document.createElement('span');
  mensaje.textContent = 'No pudimos completar la búsqueda. Revisa tu conexión e inténtalo de nuevo.';
  const reintentar = document.createElement('button');
  reintentar.type = 'button';
  reintentar.textContent = 'Reintentar';
  reintentar.addEventListener('click', () => cargarPagina(false));
  estado.append(mensaje, reintentar);
  estado.hidden = false;
}

function mostrarConsultaSensible() {
  grid.replaceChildren();
  productosVistos.clear();
  cantidadProductosVistos = 0;
  total = 0;
  desde = 0;
  fuenteBusqueda = null;
  totalNodo.textContent = '';
  botonMas.hidden = true;
  limpiarDescubrimiento();
  document.title = 'Búsqueda protegida · MAGANDHI';
  document.getElementById('bs-title').textContent = 'No pudimos procesar la búsqueda';
  document.getElementById('bs-results-title').textContent = 'Prueba otra búsqueda';
  mostrarEstado(
    'Para proteger tu privacidad, busca solo por el nombre o la categoría del producto, sin incluir datos personales.',
    'error',
  );
}

function clavesProducto(producto) {
  const claves = [`id:${producto.id.toLowerCase()}`];
  if (producto.slug) claves.push(`slug:${producto.slug.toLowerCase()}`);
  return claves;
}

function productoDisponible(producto) {
  return producto && producto.agotado !== true &&
    Number.isSafeInteger(producto.max_comprable) && producto.max_comprable > 0;
}

function agregarProductos(productos, reemplazar) {
  const clavesPreparadas = reemplazar ? new Set() : new Set(productosVistos);
  const preparados = [];
  for (const producto of productos) {
    if (!productoDisponible(producto)) {
      throw new Error('SN1 devolvió un producto no comprable en la búsqueda.');
    }
    const claves = clavesProducto(producto);
    if (claves.some((clave) => clavesPreparadas.has(clave))) {
      throw new Error('SN1 devolvió productos duplicados durante la paginación.');
    }
    const tarjeta = crearTarjetaProducto(producto, { mostrarRazon: true });
    if (!tarjeta) throw new Error('No se pudo pintar un resultado válido.');
    claves.forEach((clave) => clavesPreparadas.add(clave));
    preparados.push({ tarjeta, claves });
  }

  if (reemplazar) {
    grid.replaceChildren();
    productosVistos.clear();
    cantidadProductosVistos = 0;
  }
  const fragmento = document.createDocumentFragment();
  preparados.forEach(({ tarjeta, claves }) => {
    claves.forEach((clave) => productosVistos.add(clave));
    fragmento.appendChild(tarjeta);
  });
  grid.appendChild(fragmento);
  cantidadProductosVistos += preparados.length;
  return preparados.length;
}

function actualizarCabecera() {
  const titulo = document.getElementById('bs-title');
  const resultados = document.getElementById('bs-results-title');
  document.querySelectorAll('[data-buscador-catalogo] input[type="search"]').forEach((entrada) => {
    entrada.value = consulta;
  });
  if (consulta) {
    titulo.textContent = `Resultados para “${consulta}”`;
    resultados.textContent = `Coincidencias para “${consulta}”`;
    document.title = `${consulta} · Buscar · MAGANDHI`;
  } else if (categoriaPedida) {
    titulo.textContent = 'Explora la categoría';
    resultados.textContent = 'Productos de la categoría';
  }
}

function actualizarTotal() {
  totalNodo.textContent = total === 1 ? '1 producto disponible' : `${total} productos disponibles`;
  botonMas.hidden = cantidadProductosVistos >= total || desde >= total || total === 0;
}

function limpiarDescubrimiento() {
  descubrimiento.replaceChildren();
}

function montarDescubrimiento() {
  descubrimiento.replaceChildren();
  const slot = document.createElement('section');
  slot.dataset.snSlot = 'buscar-sin-resultados';
  slot.dataset.snSuperficie = 'busqueda';
  slot.dataset.snLimite = '8';
  slot.dataset.snLayout = 'carril_derecha';
  slot.dataset.snTitulo = 'Explora otras ideas';
  slot.dataset.snSubtitulo = 'Una selección disponible para seguir descubriendo.';
  if (consulta) slot.dataset.snConsulta = consulta;
  if (categoriaFiltro) slot.dataset.snCategoria = categoriaFiltro;
  slot.hidden = true;
  descubrimiento.appendChild(slot);
  montarSlots(slot);
}

function requestIdAnalitica() {
  try {
    if (typeof window.crypto?.randomUUID === 'function') {
      const requestId = window.crypto.randomUUID().toLowerCase();
      if (UUID_RE.test(requestId)) return requestId;
    }
  } catch { /* continúa con un UUID local */ }
  const bytes = new Uint8Array(16);
  try {
    if (typeof window.crypto?.getRandomValues === 'function') window.crypto.getRandomValues(bytes);
    else bytes.forEach((_, indice) => { bytes[indice] = Math.floor(Math.random() * 256); });
  } catch {
    bytes.forEach((_, indice) => { bytes[indice] = Math.floor(Math.random() * 256); });
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((valor) => valor.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function hashConsulta(valor) {
  if (!window.crypto?.subtle || typeof TextEncoder !== 'function') return null;
  try {
    const bytes = new TextEncoder().encode(valor);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)]
      .map((item) => item.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

async function emitirResultados(respuesta) {
  if (analiticaEmitida) return;
  analiticaEmitida = true;
  try {
    const requestId = requestIdAnalitica();
    const modeloVersion = typeof respuesta?.modelo_version === 'string'
      ? respuesta.modelo_version.trim()
      : '';
    const cantidad = respuesta?.total;
    if (!UUID_RE.test(requestId) || !MODELO_RE.test(modeloVersion) ||
        !Number.isSafeInteger(cantidad) || cantidad < 0 || cantidad > 10000) return;
    const extra = {
      request_id: requestId,
      superficie: 'busqueda',
      modelo_version: modeloVersion,
      cantidad_resultados: cantidad,
    };
    const consultaHash = await hashConsulta(respuesta.consulta || '');
    if (/^[a-f0-9]{64}$/.test(consultaHash || '')) extra.consulta_hash = consultaHash;
    if (typeof window.mgEvento === 'function') window.mgEvento('busqueda_resultados', extra);
    else window.dispatchEvent(new CustomEvent('magandhi:analitica-interna', {
      detail: { tipo: 'busqueda_resultados', extra },
    }));
  } catch { /* La búsqueda no depende de la disponibilidad de Web Crypto. */ }
}

async function cargarPagina(agregar) {
  if (cargando || (!consulta && !categoriaFiltro)) return;
  cargando = true;
  controlador?.abort();
  controlador = new AbortController();
  const token = ++generacion;
  const desplazamiento = agregar ? desde : 0;
  grid.setAttribute('aria-busy', 'true');
  botonMas.disabled = true;
  botonMas.textContent = 'Cargando…';
  if (!agregar) {
    fuenteBusqueda = null;
    mostrarEstado('Buscando productos disponibles…');
    totalNodo.textContent = '';
    limpiarDescubrimiento();
  }

  try {
    const respuesta = await buscarProductos({
      consulta,
      categoria: categoriaFiltro,
      limite: TAMANO_PAGINA,
      desde: desplazamiento,
      signal: controlador.signal,
      productoActual: null,
    });
    if (token !== generacion) return;
    const fuenteActual = {
      modo: String(respuesta.modo || ''),
      modelo: String(respuesta.modelo_version || ''),
      total: respuesta.total,
    };
    if (agregar && fuenteBusqueda && (
      fuenteBusqueda.modo !== fuenteActual.modo ||
      fuenteBusqueda.modelo !== fuenteActual.modelo ||
      fuenteBusqueda.total !== fuenteActual.total
    )) {
      throw new Error('La fuente de búsqueda cambió durante la paginación.');
    }
    if (!agregar) fuenteBusqueda = fuenteActual;
    const disponibles = respuesta.productos.filter(productoDisponible);
    const agregados = agregarProductos(disponibles, !agregar);
    total = respuesta.total;
    desde = desplazamiento + TAMANO_PAGINA;
    mostrarEstado('');
    actualizarTotal();
    if (!agregar) emitirResultados(respuesta);
    if (!cantidadProductosVistos) {
      const contexto = consulta ? ` para “${consulta}”` : '';
      mostrarEstado(`No encontramos productos disponibles${contexto}. Prueba otra palabra o categoría.`);
      montarDescubrimiento();
    } else if (agregar && agregados === 0) {
      botonMas.hidden = true;
    }
  } catch (error) {
    if (error?.name !== 'AbortError' && token === generacion) {
      if (error?.codigo === 'SN_CONSULTA_SENSIBLE') mostrarConsultaSensible();
      else mostrarError();
    }
  } finally {
    if (token === generacion) {
      cargando = false;
      grid.setAttribute('aria-busy', 'false');
      botonMas.disabled = false;
      botonMas.textContent = 'Ver más';
    }
  }
}

function navegarConCategoria(codigo) {
  const destino = new URL(paginaBuscar.href);
  const consultaViva = normalizarConsulta(entradaPrincipal?.value);
  if (consultaViva) destino.searchParams.set('q', consultaViva);
  if (codigo) destino.searchParams.set('categoria', codigo);
  window.location.assign(destino.href);
}

function mostrarAvisoCategorias(visible) {
  avisoCategorias.hidden = !visible;
  if (visible) selectorCategoria.setAttribute('aria-describedby', avisoCategorias.id);
  else selectorCategoria.removeAttribute('aria-describedby');
}

async function cargarCategorias() {
  selectorCategoria.disabled = true;
  botonReintentarCategorias.disabled = true;
  botonReintentarCategorias.textContent = 'Reintentando…';
  try {
    const resultado = await cargarCategoriasPublicas(supabase);
    const categorias = resultado.categorias;
    selectorCategoria.replaceChildren();
    const todas = document.createElement('option');
    todas.value = '';
    todas.textContent = 'Todas las categorías';
    selectorCategoria.appendChild(todas);
    categorias.forEach((categoria) => {
      const opcion = document.createElement('option');
      opcion.value = categoria.codigo;
      opcion.textContent = categoria.nombre;
      selectorCategoria.appendChild(opcion);
    });
    categoriaActiva = categoriaPedida ? categoriaPorCodigo(categoriaPedida, categorias) : null;
    categoriaFiltro = categoriaActiva?.codigo || categoriaPedida || null;
    actualizarCategoriaFormulario();
    if (categoriaPedida && !categoriaActiva) {
      const retirada = document.createElement('option');
      retirada.value = categoriaPedida;
      retirada.textContent = 'Categoría no disponible';
      retirada.disabled = true;
      selectorCategoria.appendChild(retirada);
      selectorCategoria.value = categoriaPedida;
      avisoCategorias.querySelector('span').textContent =
        'La categoría solicitada ya no está disponible. El filtro se conserva de forma visible; elige otra categoría para cambiarlo.';
      mostrarAvisoCategorias(true);
    } else {
      selectorCategoria.value = categoriaFiltro || '';
      mostrarAvisoCategorias(false);
    }
    selectorCategoria.disabled = false;
    selectorCategoria.removeAttribute('title');
    return true;
  } catch {
    categoriaActiva = null;
    // El código ya pasó la validación sintáctica local: conservarlo evita que
    // una búsqueda filtrada se amplíe silenciosamente a todo el catálogo.
    categoriaFiltro = categoriaPedida || null;
    actualizarCategoriaFormulario();
    selectorCategoria.disabled = true;
    selectorCategoria.title = 'No pudimos cargar las categorías. Puedes reintentar sin perder el filtro solicitado.';
    avisoCategorias.querySelector('span').textContent = categoriaFiltro
      ? 'No pudimos actualizar las categorías. Conservamos el filtro solicitado, pero el selector no está disponible.'
      : 'No pudimos actualizar las categorías. La búsqueda sigue disponible y puedes reintentar el selector.';
    mostrarAvisoCategorias(true);
    return false;
  } finally {
    botonReintentarCategorias.disabled = false;
    botonReintentarCategorias.textContent = 'Reintentar categorías';
  }
}

actualizarCategoriaFormulario();
selectorCategoria.addEventListener('change', () => navegarConCategoria(selectorCategoria.value));
botonReintentarCategorias.addEventListener('click', () => cargarCategorias());
botonMas.addEventListener('click', () => cargarPagina(true));

async function iniciar() {
  actualizarCabecera();
  await cargarCategorias();
  if (!consulta && !categoriaFiltro) {
    total = 0;
    totalNodo.textContent = '';
    mostrarEstado('Escribe un producto, una presentación o una categoría para comenzar.');
    return;
  }
  cargarPagina(false);
}

iniciar();
