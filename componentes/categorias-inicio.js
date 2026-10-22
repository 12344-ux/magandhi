import {
  cargarCategoriasPublicas,
  enlaceCategoria,
  iconoCategoria,
} from './categorias.js?v=3';
import { crearPanelCategorias } from './categorias-panel.js?v=3';

function esc(valor) {
  return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const contenedor = document.querySelector('[data-categorias-inicio]');
let solicitudCategorias = null;

async function consultarCategoriasPublicas() {
  const { supabase } = await import('../supabase-config.js');
  return cargarCategoriasPublicas(supabase);
}

function obtenerCategorias({ recargar = false } = {}) {
  if (!solicitudCategorias || recargar) solicitudCategorias = consultarCategoriasPublicas();
  return solicitudCategorias;
}

function tarjetaCategoria(categoria) {
  return `<a class="mg-category-card" href="${esc(enlaceCategoria(categoria.codigo))}" aria-label="Ver categoría ${esc(categoria.nombre)}">
    <span class="mg-category-card__icon">${iconoCategoria(categoria.icono)}</span>
    <span class="mg-category-card__name">${esc(categoria.nombre)}</span>
  </a>`;
}

function tarjetaMas() {
  return `<a class="mg-category-card mg-category-card--more" href="categorias/" data-categorias-abrir aria-label="Abrir todas las categorías" aria-haspopup="dialog" aria-controls="mg-category-panel" aria-expanded="false">
    <span class="mg-category-card__icon">${iconoCategoria('mas')}</span>
    <span class="mg-category-card__name">Más categorías</span>
  </a>`;
}

function renderizarCategoriasInicio(resultado) {
  if (!contenedor) return;
  const categorias = Array.isArray(resultado?.categorias) ? resultado.categorias.slice(0, 6) : [];
  contenedor.innerHTML = categorias.map(tarjetaCategoria).concat(tarjetaMas()).join('');
}

async function pintarCategoriasInicio() {
  if (!contenedor) return;
  contenedor.setAttribute('aria-busy', 'true');
  try {
    renderizarCategoriasInicio(await obtenerCategorias());
  } catch (error) {
    // La visibilidad es autoridad del servidor: ante red/permisos no se reviven
    // categorías ocultas desde un arreglo local. Se conserva únicamente la
    // entrada neutra a la página, que volverá a consultar el catálogo vigente.
    console.warn('No se pudieron cargar las categorías vigentes del inicio:', error);
    contenedor.innerHTML = tarjetaMas();
  } finally {
    contenedor.removeAttribute('aria-busy');
  }
}

if (contenedor) pintarCategoriasInicio();

if (document.querySelector('[data-categorias-abrir]') || contenedor) {
  crearPanelCategorias({
    obtenerCategorias,
    hrefBase: 'categorias/',
    paginaCategoriasHref: 'categorias/',
    alCargar: renderizarCategoriasInicio,
  });
}
