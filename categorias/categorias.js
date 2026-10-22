import { supabase, SUPABASE_URL } from '../supabase-config.js';
import {
  buscarProductos,
  extraerProductos,
  montarSlots,
} from '../componentes/motor-tienda.js?v=2';
import {
  cargarCategoriasPublicas,
  categoriaPorCodigo,
  enlaceCategoria,
  filaPerteneceACategoria,
  iconoCategoria,
} from '../componentes/categorias.js?v=2';
import { aplicarFotoCategoria } from '../componentes/categorias-fotos.js?v=1';

const BUCKET_CAMPANAS = 'campanas';
const TAMANO_PAGINA_CATALOGO = 60;
const MAX_TOTAL_CATALOGO = 10000;
const parametros = new URLSearchParams(window.location.search);
const codigoSolicitado = parametros.get('categoria') || '';
const hayFiltroSolicitado = Boolean(codigoSolicitado.trim());
const gridProductos = document.getElementById('cp-product-grid');
const botonMasProductos = document.getElementById('cp-products-more');
const estadoMasProductos = document.getElementById('cp-products-more-status');
let categoriasDisponibles = [];
let solicitudCategorias = null;
let cicloInicio = 0;
let generacionCatalogo = 0;
let controladorCatalogo = null;
let catalogoCargando = false;
let paginacionCatalogo = null;

function esc(valor) {
  return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function obtenerCategorias({ recargar = false } = {}) {
  if (!solicitudCategorias || recargar) solicitudCategorias = cargarCategoriasPublicas(supabase);
  return solicitudCategorias;
}

function urlPublica(path) {
  if (!path || typeof path !== 'string') return '';
  if (/^https:\/\//i.test(path)) {
    try {
      const candidata = new URL(path);
      const storage = new URL(SUPABASE_URL);
      const prefijo = `/storage/v1/object/public/${BUCKET_CAMPANAS}/`;
      if (candidata.origin === storage.origin && !candidata.username && !candidata.password &&
          !candidata.port && candidata.pathname.startsWith(prefijo)) return candidata.href;
    } catch { /* cae al placeholder */ }
    return '';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return '';
  const segmentos = path.split('/');
  for (const segmento of segmentos) {
    let decodificado = '';
    try { decodificado = decodeURIComponent(segmento); } catch { return ''; }
    if (!segmento || decodificado === '.' || decodificado === '..' || /[\\/]/.test(decodificado)) return '';
  }
  const { data } = supabase.storage.from(BUCKET_CAMPANAS).getPublicUrl(path);
  return data?.publicUrl || '';
}

function pathLiviana(pathGrande) {
  if (!pathGrande || typeof pathGrande !== 'string') return '';
  const conSufijo = (path) => {
    const punto = path.lastIndexOf('.');
    const barra = path.lastIndexOf('/');
    if (punto <= barra + 1 || punto === path.length - 1) return '';
    const base = path.slice(0, punto);
    return base.endsWith('-sm') ? path : `${base}-sm.${path.slice(punto + 1)}`;
  };
  if (/^https:\/\//i.test(pathGrande)) {
    try {
      const url = new URL(pathGrande);
      const pathname = conSufijo(url.pathname);
      if (!pathname) return '';
      url.pathname = pathname;
      return url.href;
    } catch { return ''; }
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathGrande)) return '';
  return conSufijo(pathGrande);
}

function fotosProducto(fila) {
  const asset = fila.asset && typeof fila.asset.path === 'string' ? fila.asset.path.trim() : '';
  const galeria = Array.isArray(fila.imagenes)
    ? fila.imagenes.find((item) => typeof item === 'string' && item.trim())
    : '';
  const banner = typeof fila.imagen_banner_path === 'string' ? fila.imagen_banner_path.trim() : '';
  const path = asset || galeria || banner;
  if (!path) return { liviana: '', grande: '' };
  const grande = urlPublica(path);
  const intentaLiviana = Boolean(asset || galeria);
  const liviana = intentaLiviana ? urlPublica(pathLiviana(path)) || grande : grande;
  return { liviana, grande };
}

function formatearPrecio(valor) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? `$ ${Math.round(numero).toLocaleString('es-CO')}` : '';
}

function hrefProducto(fila) {
  if (fila.slug) return `../producto/${encodeURIComponent(fila.slug)}/`;
  return `../producto/?id=${encodeURIComponent(fila.id)}`;
}

function nombreCategoriaFila(fila, categoriaSeleccionada) {
  if (categoriaSeleccionada) return categoriaSeleccionada.nombre;
  if (fila.categoria_nombre) return fila.categoria_nombre;
  const categoria = categoriasDisponibles.find((item) => filaPerteneceACategoria(fila, item.codigo));
  return categoria?.nombre || 'Selección MAGANDHI';
}

const ICONO_IMAGEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';

function placeholder() {
  return `<span class="cp-product-card__placeholder" aria-hidden="true">${ICONO_IMAGEN}</span>`;
}

function tarjetaProducto(fila, categoriaSeleccionada) {
  if (!fila || fila.agotado === true || !Number.isSafeInteger(fila.max_comprable) || fila.max_comprable <= 0) return '';
  const fotos = fotosProducto(fila);
  const imagen = fotos.liviana
    ? `<img src="${esc(fotos.liviana)}" data-fallback-grande="${esc(fotos.grande)}" alt="${esc(fila.asset?.alt || fila.nombre)}" loading="lazy">`
    : placeholder();
  const precio = formatearPrecio(fila.precio_venta);
  return `<a class="cp-product-card" href="${esc(hrefProducto(fila))}" data-sn-producto-id="${esc(fila.id)}" data-sn-producto-slug="${esc(fila.slug || '')}">
    <div class="cp-product-card__photo">${imagen}</div>
    <div class="cp-product-card__body">
      <span class="cp-product-card__category">${esc(nombreCategoriaFila(fila, categoriaSeleccionada))}</span>
      <h3>${esc(fila.nombre)}</h3>
      <p class="cp-product-card__detail">${esc(fila.detalle_presentacion || '')}</p>
      ${precio ? `<span class="cp-product-card__price">${esc(precio)}<small>COP</small></span>` : ''}
    </div>
  </a>`;
}

function activarFallbacksImagen(raiz = document) {
  raiz.querySelectorAll('[data-fallback-grande]:not([data-fallback-listo])').forEach((imagen) => {
    imagen.dataset.fallbackListo = 'true';
    imagen.addEventListener('error', () => {
      const grande = imagen.dataset.fallbackGrande || '';
      if (!imagen.dataset.intentoGrande && grande && imagen.src !== grande) {
        imagen.dataset.intentoGrande = 'true';
        imagen.src = grande;
        return;
      }
      const contenedor = imagen.closest('.cp-product-card__photo');
      if (contenedor) contenedor.innerHTML = placeholder();
    });
  });
}

function clavesCatalogo(fila) {
  const claves = [`id:${fila.id.toLowerCase()}`];
  if (fila.slug) claves.push(`slug:${fila.slug.toLowerCase()}`);
  return claves;
}

function validarPaginaCatalogo(respuesta, desde, estadoAnterior = null, categoriaSeleccionada = null) {
  if (!Number.isSafeInteger(respuesta?.total) || respuesta.total < 0 ||
      respuesta.total > MAX_TOTAL_CATALOGO || !Array.isArray(respuesta.productos)) {
    throw new Error('SN1 devolvió una página de catálogo fuera de contrato.');
  }
  const modo = String(respuesta.modo || '');
  const modelo = String(respuesta.modelo_version || '');
  if (!modo || !modelo) throw new Error('SN1 no identificó la fuente del catálogo.');
  if (estadoAnterior && (
    estadoAnterior.total !== respuesta.total ||
    estadoAnterior.modo !== modo ||
    estadoAnterior.modelo !== modelo ||
    estadoAnterior.desde !== desde
  )) {
    throw new Error('El total o la fuente del catálogo cambió durante la paginación.');
  }
  const filasEsperadas = Math.min(
    TAMANO_PAGINA_CATALOGO,
    Math.max(0, respuesta.total - desde),
  );
  if (respuesta.productos.length !== filasEsperadas) {
    throw new Error('SN1 devolvió una página incoherente con el total del catálogo.');
  }
  const filas = extraerProductos(respuesta, { productoActual: null });
  if (filas.length !== filasEsperadas || filas.some((fila) =>
    !fila?.nombre || (!fila.slug && !fila.id) || fila.agotado === true ||
    !Number.isSafeInteger(fila.max_comprable) || fila.max_comprable <= 0 ||
    (categoriaSeleccionada && !filaPerteneceACategoria(fila, categoriaSeleccionada.codigo))
  )) {
    throw new Error('SN1 devolvió filas no comprables o incompletas en el catálogo.');
  }

  const claves = new Set(estadoAnterior?.claves || []);
  for (const fila of filas) {
    const candidatas = clavesCatalogo(fila);
    if (candidatas.some((clave) => claves.has(clave))) {
      throw new Error('SN1 devolvió productos duplicados entre páginas del catálogo.');
    }
    candidatas.forEach((clave) => claves.add(clave));
  }
  const cantidad = (estadoAnterior?.cantidad || 0) + filas.length;
  const siguienteDesde = desde + TAMANO_PAGINA_CATALOGO;
  if (siguienteDesde >= respuesta.total && cantidad !== respuesta.total) {
    throw new Error('SN1 devolvió páginas incompletas para el total anunciado.');
  }
  return {
    filas,
    estado: {
      total: respuesta.total,
      modo,
      modelo,
      desde: siguienteDesde,
      cantidad,
      claves,
    },
  };
}

async function consultarPaginaCatalogo(categoriaSeleccionada, desde, signal) {
  return buscarProductos({
    consulta: '',
    categoria: categoriaSeleccionada?.codigo || null,
    limite: TAMANO_PAGINA_CATALOGO,
    desde,
    signal,
    productoActual: null,
  });
}

function pintarNavegacion(categorias, categoriaSeleccionada) {
  const grid = document.querySelector('[data-category-grid]');
  const estado = document.querySelector('[data-category-state]');
  estado.hidden = true;
  grid.hidden = false;
  if (!categorias.length) {
    grid.hidden = true;
    estado.hidden = false;
    estado.setAttribute('role', 'status');
    estado.innerHTML = `${iconoCategoria('coleccion')}<div><strong>Aún no hay categorías visibles</strong><span>Puedes explorar todos los productos mientras preparamos esta selección.</span></div>`;
    return;
  }
  grid.innerHTML = categorias.map((categoria) => {
    const actual = categoriaSeleccionada?.codigo === categoria.codigo;
    return `<a class="mg-category-card" href="${esc(enlaceCategoria(categoria.codigo, './'))}" data-categoria-pagina="${esc(categoria.codigo)}" ${actual ? 'aria-current="page"' : ''} aria-label="Ver productos de ${esc(categoria.nombre)}">
      <span class="mg-category-card__icon">${iconoCategoria(categoria.icono)}</span>
      <span class="mg-category-card__name">${esc(categoria.nombre)}</span>
      <span class="mg-category-card__copy">${esc(categoria.descripcion)}</span>
    </a>`;
  }).join('');
  // Solo presentación: la misma fotografía de la portada, por código.
  grid.querySelectorAll('[data-categoria-pagina]').forEach((enlace) => {
    aplicarFotoCategoria(enlace, enlace.dataset.categoriaPagina);
  });
}

function pintarCargaCategorias() {
  const grid = document.querySelector('[data-category-grid]');
  const estado = document.querySelector('[data-category-state]');
  grid.hidden = true;
  estado.hidden = false;
  estado.setAttribute('role', 'status');
  estado.innerHTML = `${iconoCategoria('coleccion')}<div><strong>Cargando categorías…</strong><span>Estamos preparando la selección vigente de MAGANDHI.</span></div>`;
}

function pintarErrorCategorias() {
  const grid = document.querySelector('[data-category-grid]');
  const estado = document.querySelector('[data-category-state]');
  grid.hidden = true;
  estado.hidden = false;
  estado.setAttribute('role', 'alert');
  estado.innerHTML = `${iconoCategoria('coleccion')}<div><strong>No pudimos cargar las categorías</strong><span>La conexión o los permisos no permitieron consultar la lista actual.</span><button type="button" data-categorias-pagina-reintentar>Reintentar</button></div>`;
  estado.querySelector('[data-categorias-pagina-reintentar]')?.addEventListener('click', () => iniciar(true));
}

function actualizarContenido(categoriaSeleccionada, totalCategorias = 0) {
  const titulo = categoriaSeleccionada?.nombre || 'Explora a tu manera';
  const descripcion = categoriaSeleccionada?.descripcion || (totalCategorias
    ? `${totalCategorias} categorías para descubrir productos útiles, especiales y escogidos con intención.`
    : 'Descubre productos útiles, especiales y escogidos con intención.');
  const icono = categoriaSeleccionada?.icono || 'coleccion';
  document.getElementById('cp-page-title').textContent = titulo;
  document.getElementById('cp-page-copy').textContent = descripcion;
  document.querySelector('[data-banner-main-icon]').innerHTML = iconoCategoria(icono);
  document.getElementById('cp-category-title').textContent = categoriaSeleccionada ? 'Elige otra categoría' : 'Nuestras categorías';
  document.getElementById('cp-products-title').textContent = categoriaSeleccionada ? `${titulo} para descubrir` : 'Productos para descubrir';
  document.getElementById('cp-products-copy').textContent = categoriaSeleccionada
    ? `Productos disponibles de ${titulo}, escogidos por el equipo MAGANDHI.`
    : 'Mostramos toda la selección disponible, ordenada para explorar con calma.';
  document.getElementById('cp-breadcrumb-current').textContent = categoriaSeleccionada?.nombre || 'Categorías';

  const metaDescripcion = categoriaSeleccionada
    ? `${titulo} en MAGANDHI. ${descripcion}`.slice(0, 160)
    : 'Explora todas las categorías de MAGANDHI y descubre productos escogidos para la vida cotidiana.';
  document.getElementById('cp-description').content = metaDescripcion;
  document.getElementById('cp-og-description').content = metaDescripcion;

  if (!categoriaSeleccionada) {
    document.title = 'Categorías · MAGANDHI';
    document.getElementById('cp-canonical').href = 'https://magandhi.com/categorias/';
    document.getElementById('cp-og-url').content = 'https://magandhi.com/categorias/';
    document.getElementById('cp-og-title').content = 'Categorías · MAGANDHI';
    return;
  }
  document.title = `${titulo} · Categorías MAGANDHI`;
  const url = `https://magandhi.com/categorias/?categoria=${encodeURIComponent(categoriaSeleccionada.codigo)}`;
  document.getElementById('cp-canonical').href = url;
  document.getElementById('cp-og-url').content = url;
  document.getElementById('cp-og-title').content = `${titulo} · MAGANDHI`;
}

function actualizarContenidoNoDisponible() {
  const titulo = 'Categoría no disponible';
  const descripcion = 'Esta categoría ya no forma parte de la selección pública. Puedes elegir otra o volver a todos los productos.';
  const robots = document.querySelector('[data-politicas-categorias]');
  if (robots) robots.content = 'noindex,follow';
  document.title = `${titulo} · MAGANDHI`;
  document.getElementById('cp-page-title').textContent = titulo;
  document.getElementById('cp-page-copy').textContent = descripcion;
  document.querySelector('[data-banner-main-icon]').innerHTML = iconoCategoria('coleccion');
  document.getElementById('cp-category-title').textContent = 'Elige otra categoría';
  document.getElementById('cp-products-title').textContent = titulo;
  document.getElementById('cp-products-copy').textContent = 'La lista pública cargó correctamente, pero este código no está disponible.';
  document.getElementById('cp-breadcrumb-current').textContent = titulo;
  document.getElementById('cp-description').content = descripcion;
  document.getElementById('cp-og-description').content = descripcion;
  const url = 'https://magandhi.com/categorias/';
  document.getElementById('cp-canonical').href = url;
  document.getElementById('cp-og-url').content = url;
  document.getElementById('cp-og-title').content = `${titulo} · MAGANDHI`;
}

function markupEstadoVacio(categoriaSeleccionada) {
  const detalle = categoriaSeleccionada
    ? `Todavía no hay productos disponibles en ${categoriaSeleccionada.nombre}.`
    : 'No hay productos disponibles en este momento.';
  return `<div class="cp-state cp-state--empty" role="status">
    <span class="cp-state__icon">${iconoCategoria(categoriaSeleccionada?.icono || 'coleccion')}</span>
    <strong>Esta selección está tomando forma</strong>
    <span>${esc(detalle)}</span>
    <div class="cp-state__actions">
      <a class="cp-state__primary" href="../#descubrir">Ver todos los productos</a>
      <a class="cp-state__secondary" href="#cp-category-title">Elegir otra categoría</a>
    </div>
  </div>`;
}

function markupCategoriaNoDisponible() {
  return `<div class="cp-state cp-state--empty" role="status">
    <span class="cp-state__icon">${iconoCategoria('coleccion')}</span>
    <strong>Esta categoría ya no está disponible</strong>
    <span>No mostramos el catálogo completo como si fuera el resultado de este enlace. Elige una categoría vigente o explora todos los productos.</span>
    <div class="cp-state__actions">
      <a class="cp-state__primary" href="../#descubrir">Ver todos los productos</a>
      <a class="cp-state__secondary" href="#cp-category-title">Elegir otra categoría</a>
    </div>
  </div>`;
}

function markupEstadoError(titulo = 'No pudimos cargar la selección', detalle = 'Ocurrió un problema al consultar el catálogo. Inténtalo de nuevo.') {
  return `<div class="cp-state cp-state--error" role="alert">
    <span class="cp-state__icon">${iconoCategoria('coleccion')}</span>
    <strong>${esc(titulo)}</strong>
    <span>${esc(detalle)}</span>
    <div class="cp-state__actions">
      <button class="cp-state__primary" type="button" data-catalogo-reintentar>Reintentar</button>
      <a class="cp-state__secondary" href="../#descubrir">Ir a todos los productos</a>
    </div>
  </div>`;
}

function configurarSlotDescubrimiento(categoriaSeleccionada, habilitado = true) {
  const slot = document.querySelector('[data-sn-slot="categoria-descubrimiento"]');
  if (!slot) return;
  slot.dataset.snCategoria = categoriaSeleccionada?.codigo || '';
  slot.dataset.snDisabled = habilitado ? 'false' : 'true';
  if (!habilitado) slot.hidden = true;
  montarSlots(slot, { forzar: true }).catch(() => { /* El slot falla cerrado. */ });
}

function actualizarBotonMas() {
  if (!botonMasProductos) return;
  const hayMas = !!paginacionCatalogo && paginacionCatalogo.desde < paginacionCatalogo.total;
  botonMasProductos.hidden = !hayMas;
  botonMasProductos.disabled = catalogoCargando;
  botonMasProductos.textContent = catalogoCargando ? 'Cargando…' : 'Ver más';
}

function detenerCargaCatalogo() {
  controladorCatalogo?.abort();
  controladorCatalogo = null;
  generacionCatalogo += 1;
  catalogoCargando = false;
  paginacionCatalogo = null;
  if (gridProductos) gridProductos.setAttribute('aria-busy', 'false');
  if (estadoMasProductos) {
    estadoMasProductos.textContent = '';
    estadoMasProductos.setAttribute('role', 'status');
  }
  actualizarBotonMas();
}

function markupProductos(filas, categoriaSeleccionada) {
  const tarjetas = filas.map((fila) => tarjetaProducto(fila, categoriaSeleccionada));
  if (tarjetas.some((tarjeta) => !tarjeta)) {
    throw new Error('No se pudo pintar una fila válida del catálogo.');
  }
  return tarjetas.join('');
}

async function pintarProductos(categoriaSeleccionada) {
  controladorCatalogo?.abort();
  const controlador = new AbortController();
  controladorCatalogo = controlador;
  const token = ++generacionCatalogo;
  catalogoCargando = true;
  paginacionCatalogo = null;
  gridProductos.setAttribute('aria-busy', 'true');
  configurarSlotDescubrimiento(categoriaSeleccionada, false);
  gridProductos.innerHTML = '<p class="cp-state cp-state--loading" role="status">Cargando la selección…</p>';
  if (estadoMasProductos) {
    estadoMasProductos.textContent = '';
    estadoMasProductos.setAttribute('role', 'status');
  }
  actualizarBotonMas();
  let renderExitoso = false;
  try {
    const respuesta = await consultarPaginaCatalogo(categoriaSeleccionada, 0, controlador.signal);
    if (token !== generacionCatalogo) return;
    const pagina = validarPaginaCatalogo(respuesta, 0, null, categoriaSeleccionada);
    if (!pagina.filas.length) {
      gridProductos.innerHTML = markupEstadoVacio(categoriaSeleccionada);
    } else {
      gridProductos.innerHTML = markupProductos(pagina.filas, categoriaSeleccionada);
      activarFallbacksImagen(gridProductos);
    }
    paginacionCatalogo = { ...pagina.estado, categoriaSeleccionada };
    renderExitoso = true;
  } catch (error) {
    if (error?.name !== 'AbortError' && token === generacionCatalogo) {
      console.error('No se pudo cargar el catálogo público por categorías:', error);
      gridProductos.innerHTML = markupEstadoError();
      gridProductos.querySelector('[data-catalogo-reintentar]')?.addEventListener('click', () => pintarProductos(categoriaSeleccionada));
    }
  } finally {
    if (token === generacionCatalogo) {
      catalogoCargando = false;
      if (controladorCatalogo === controlador) controladorCatalogo = null;
      gridProductos.setAttribute('aria-busy', 'false');
      actualizarBotonMas();
      if (renderExitoso) configurarSlotDescubrimiento(categoriaSeleccionada, true);
    }
  }
}

async function cargarMasProductos() {
  if (catalogoCargando || !paginacionCatalogo ||
      paginacionCatalogo.desde >= paginacionCatalogo.total) return;
  const estadoAnterior = paginacionCatalogo;
  const categoriaSeleccionada = estadoAnterior.categoriaSeleccionada;
  const desde = estadoAnterior.desde;
  const controlador = new AbortController();
  controladorCatalogo?.abort();
  controladorCatalogo = controlador;
  const token = ++generacionCatalogo;
  catalogoCargando = true;
  gridProductos.setAttribute('aria-busy', 'true');
  configurarSlotDescubrimiento(categoriaSeleccionada, false);
  if (estadoMasProductos) {
    estadoMasProductos.textContent = 'Cargando más productos…';
    estadoMasProductos.setAttribute('role', 'status');
  }
  actualizarBotonMas();
  let renderExitoso = false;
  try {
    const respuesta = await consultarPaginaCatalogo(categoriaSeleccionada, desde, controlador.signal);
    if (token !== generacionCatalogo || paginacionCatalogo !== estadoAnterior) return;
    const pagina = validarPaginaCatalogo(respuesta, desde, estadoAnterior, categoriaSeleccionada);
    const markup = markupProductos(pagina.filas, categoriaSeleccionada);
    if (markup) gridProductos.insertAdjacentHTML('beforeend', markup);
    activarFallbacksImagen(gridProductos);
    paginacionCatalogo = { ...pagina.estado, categoriaSeleccionada };
    if (estadoMasProductos) estadoMasProductos.textContent = '';
    renderExitoso = true;
  } catch (error) {
    if (error?.name !== 'AbortError' && token === generacionCatalogo) {
      console.error('No se pudo cargar otra página del catálogo:', error);
      if (estadoMasProductos) {
        estadoMasProductos.textContent = 'No pudimos cargar más productos. Puedes intentarlo de nuevo.';
        estadoMasProductos.setAttribute('role', 'alert');
      }
    }
  } finally {
    if (token === generacionCatalogo) {
      catalogoCargando = false;
      if (controladorCatalogo === controlador) controladorCatalogo = null;
      gridProductos.setAttribute('aria-busy', 'false');
      actualizarBotonMas();
      // También se restaura tras un error para que el slot no permanezca oculto;
      // cada render exitoso fuerza una composición con todas las exclusiones.
      if (renderExitoso || gridProductos.querySelector('[data-sn-producto-id]')) {
        configurarSlotDescubrimiento(categoriaSeleccionada, true);
      }
    }
  }
}

function pintarCategoriaNoDisponible() {
  detenerCargaCatalogo();
  configurarSlotDescubrimiento(null, false);
  gridProductos.innerHTML = markupCategoriaNoDisponible();
}

function pintarProductosBloqueadosPorCategorias() {
  detenerCargaCatalogo();
  configurarSlotDescubrimiento(null, false);
  gridProductos.innerHTML = markupEstadoError(
    'No pudimos abrir esta categoría',
    'Necesitamos consultar la lista vigente antes de aplicar el filtro. Revisa tu conexión e inténtalo de nuevo.',
  );
  gridProductos.querySelector('[data-catalogo-reintentar]')?.addEventListener('click', () => iniciar(true));
}

botonMasProductos?.addEventListener('click', cargarMasProductos);

async function iniciar(recargar = false) {
  const ciclo = ++cicloInicio;
  detenerCargaCatalogo();
  configurarSlotDescubrimiento(null, false);
  pintarCargaCategorias();
  try {
    const resultado = await obtenerCategorias({ recargar });
    if (ciclo !== cicloInicio) return;
    categoriasDisponibles = resultado.categorias;
    const categoriaSeleccionada = categoriaPorCodigo(codigoSolicitado, categoriasDisponibles);
    pintarNavegacion(categoriasDisponibles, categoriaSeleccionada);
    if (hayFiltroSolicitado && !categoriaSeleccionada) {
      actualizarContenidoNoDisponible();
      pintarCategoriaNoDisponible();
      return;
    }
    actualizarContenido(categoriaSeleccionada, categoriasDisponibles.length);
    await pintarProductos(categoriaSeleccionada);
  } catch (error) {
    if (ciclo !== cicloInicio) return;
    console.error('No se pudo cargar categorias_publicas:', error);
    categoriasDisponibles = [];
    pintarErrorCategorias();
    actualizarContenido(null, 0);
    if (hayFiltroSolicitado) pintarProductosBloqueadosPorCategorias();
    else await pintarProductos(null);
  }
}

iniciar();
