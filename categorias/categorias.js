import { supabase } from '../supabase-config.js';
import {
  CATEGORIAS_PRINCIPALES,
  CATEGORIAS_POR_CODIGO,
  SUBCATEGORIAS_BELLEZA,
  categoriaPorCodigo,
  enlaceCategoria,
  filaPerteneceACategoria,
  iconoCategoria,
} from '../componentes/categorias.js';

const BUCKET_CAMPANAS = 'campanas';
const CAMPOS_ANTIGUOS = [
  'id', 'nombre', 'slug', 'categoria_codigo', 'categoria_nombre', 'detalle_presentacion',
  'imagen_banner_path', 'precio_venta', 'imagenes', 'agotado', 'orden',
].join(',');
const CAMPOS_NUEVOS = `${CAMPOS_ANTIGUOS},categoria_codigos`;
const parametros = new URLSearchParams(window.location.search);
const categoriaSeleccionada = categoriaPorCodigo(parametros.get('categoria'));

function esc(valor) {
  return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function urlPublica(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(BUCKET_CAMPANAS).getPublicUrl(path);
  return data?.publicUrl || '';
}

function pathLiviana(path) {
  if (!path || /^https?:\/\//i.test(path)) return '';
  const punto = path.lastIndexOf('.');
  if (punto <= 0) return '';
  const base = path.slice(0, punto);
  return base.endsWith('-sm') ? path : `${base}-sm.${path.slice(punto + 1)}`;
}

function fotosProducto(fila) {
  const galeria = Array.isArray(fila.imagenes)
    ? fila.imagenes.find((item) => typeof item === 'string' && item.trim())
    : '';
  const banner = typeof fila.imagen_banner_path === 'string' ? fila.imagen_banner_path.trim() : '';
  const path = galeria || banner;
  if (!path) return { liviana: '', grande: '' };
  const grande = urlPublica(path);
  const liviana = galeria ? urlPublica(pathLiviana(path)) || grande : grande;
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

function nombreCategoriaFila(fila) {
  if (categoriaSeleccionada) return categoriaSeleccionada.nombre;
  if (fila.categoria_nombre) return fila.categoria_nombre;
  const oficial = CATEGORIAS_PRINCIPALES.find((categoria) => filaPerteneceACategoria(fila, categoria.codigo));
  return oficial?.nombre || 'Selección MAGANDHI';
}

const ICONO_IMAGEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>';
const ICONO_AGOTADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9 19.1 19.1"/></svg>';

function placeholder() {
  return `<span class="cp-product-card__placeholder" aria-hidden="true">${ICONO_IMAGEN}</span>`;
}

function tarjetaProducto(fila) {
  const fotos = fotosProducto(fila);
  const imagen = fotos.liviana
    ? `<img src="${esc(fotos.liviana)}" data-fallback-grande="${esc(fotos.grande)}" alt="${esc(fila.nombre)}" loading="lazy">`
    : placeholder();
  const precio = formatearPrecio(fila.precio_venta);
  return `<a class="cp-product-card" href="${esc(hrefProducto(fila))}">
    <div class="cp-product-card__photo">${imagen}</div>
    <div class="cp-product-card__body">
      <span class="cp-product-card__category">${esc(nombreCategoriaFila(fila))}</span>
      <h3>${esc(fila.nombre)}</h3>
      <p class="cp-product-card__detail">${esc(fila.detalle_presentacion || '')}</p>
      ${fila.agotado === true ? `<span class="cp-product-card__stock">${ICONO_AGOTADO}Agotado</span>` : ''}
      ${precio ? `<span class="cp-product-card__price">${esc(precio)}<small>COP</small></span>` : ''}
    </div>
  </a>`;
}

function activarFallbacksImagen() {
  document.querySelectorAll('[data-fallback-grande]').forEach((imagen) => {
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

function esColumnaCategoriaAusente(error) {
  const texto = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return texto.includes('categoria_codigos') && (
    texto.includes('does not exist') || texto.includes('schema cache') ||
    texto.includes('42703') || texto.includes('pgrst200') || texto.includes('pgrst204')
  );
}

async function consultarCatalogo() {
  let consulta = supabase.from('catalogo_publico').select(CAMPOS_NUEVOS);
  if (categoriaSeleccionada) consulta = consulta.contains('categoria_codigos', [categoriaSeleccionada.codigo]);
  const resultadoNuevo = await consulta.order('orden', { ascending: true });
  if (!resultadoNuevo.error) return resultadoNuevo.data || [];
  if (!esColumnaCategoriaAusente(resultadoNuevo.error)) throw resultadoNuevo.error;

  const resultadoAntiguo = await supabase
    .from('catalogo_publico')
    .select(CAMPOS_ANTIGUOS)
    .order('orden', { ascending: true });
  if (resultadoAntiguo.error) throw resultadoAntiguo.error;
  const filas = resultadoAntiguo.data || [];
  return categoriaSeleccionada
    ? filas.filter((fila) => filaPerteneceACategoria(fila, categoriaSeleccionada.codigo))
    : filas;
}

function pintarNavegacion() {
  const grid = document.querySelector('[data-category-grid]');
  if (grid) {
    grid.innerHTML = CATEGORIAS_PRINCIPALES.map((categoria) => {
      const actual = categoriaSeleccionada?.codigo === categoria.codigo;
      return `<a class="mg-category-card" href="${enlaceCategoria(categoria.codigo, './')}" ${actual ? 'aria-current="page"' : ''} aria-label="Ver productos de ${esc(categoria.nombre)}">
        <span class="mg-category-card__icon">${iconoCategoria(categoria.codigo)}</span>
        <span class="mg-category-card__name">${esc(categoria.nombre)}</span>
        <span class="mg-category-card__copy">${esc(categoria.descripcion)}</span>
      </a>`;
    }).join('');
  }
  const arbol = document.querySelector('[data-beauty-tree]');
  if (arbol) {
    arbol.innerHTML = `<div class="mg-beauty-tree__parent">
      <span class="mg-category-card__icon">${iconoCategoria('belleza')}</span>
      <span>Belleza y cuidado personal</span>
    </div><div class="mg-beauty-tree__branches">${SUBCATEGORIAS_BELLEZA.map((subcategoria) => {
      const actual = categoriaSeleccionada?.codigo === subcategoria.codigo;
      return `<a class="mg-subcategory-link" href="${enlaceCategoria(subcategoria.codigo, './')}" ${actual ? 'aria-current="page"' : ''}>${iconoCategoria(subcategoria.icono)}${esc(subcategoria.nombre)}</a>`;
    }).join('')}</div>`;
  }
  const arte = document.querySelector('[data-banner-icons]');
  if (arte) arte.innerHTML = ['tecnologia', 'hogar', 'belleza', 'mascotas']
    .map((codigo) => `<span class="cp-banner__orb">${iconoCategoria(codigo)}</span>`).join('');
}

function actualizarContenido() {
  if (!categoriaSeleccionada) return;
  const nombre = categoriaSeleccionada.nombre;
  document.title = `${nombre} · Categorías MAGANDHI`;
  document.getElementById('cp-page-title').textContent = nombre;
  document.getElementById('cp-page-copy').textContent = categoriaSeleccionada.descripcion;
  document.getElementById('cp-category-title').textContent = `Explora ${nombre}`;
  document.getElementById('cp-products-title').textContent = `${nombre} para descubrir`;
  document.getElementById('cp-products-copy').textContent = `Productos disponibles de ${nombre}, escogidos por el equipo MAGANDHI.`;
  document.getElementById('cp-breadcrumb-current').textContent = nombre;
  const url = `https://magandhi.com/categorias/?categoria=${encodeURIComponent(categoriaSeleccionada.codigo)}`;
  document.getElementById('cp-canonical').href = url;
  document.getElementById('cp-og-url').content = url;
  document.getElementById('cp-og-title').content = `${nombre} · MAGANDHI`;
}

async function pintarProductos() {
  const grid = document.getElementById('cp-product-grid');
  try {
    const filas = (await consultarCatalogo()).filter((fila) => fila?.nombre && (fila.slug || fila.id));
    if (!filas.length) {
      const detalle = categoriaSeleccionada
        ? `Todavía no hay productos disponibles en ${categoriaSeleccionada.nombre}.`
        : 'No hay productos disponibles en este momento.';
      grid.innerHTML = `<p class="cp-empty" role="status">${iconoCategoria(categoriaSeleccionada?.codigo || 'mas')}<strong>La selección está tomando forma</strong><span>${esc(detalle)}</span></p>`;
      return;
    }
    grid.innerHTML = filas.map(tarjetaProducto).join('');
    activarFallbacksImagen();
  } catch (error) {
    console.error('No se pudo cargar el catálogo público por categorías:', error);
    grid.innerHTML = `<p class="cp-empty" role="status">${iconoCategoria('mas')}<strong>No pudimos cargar la selección</strong><span>Inténtalo de nuevo más tarde.</span></p>`;
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}

pintarNavegacion();
actualizarContenido();
pintarProductos();
