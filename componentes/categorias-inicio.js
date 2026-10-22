import {
  CATEGORIAS_POR_CODIGO,
  CODIGOS_CATEGORIAS_DESTACADAS,
  cargarCategoriasPublicas,
  enlaceCategoria,
  iconoCategoria,
} from './categorias.js?v=2';
import { crearPanelCategorias } from './categorias-panel.js?v=2';

function esc(valor) {
  return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const contenedor = document.querySelector('[data-categorias-inicio]');
if (contenedor) {
  const accesos = CODIGOS_CATEGORIAS_DESTACADAS.map((codigo) => {
    const categoria = CATEGORIAS_POR_CODIGO[codigo];
    return `<a class="mg-category-card" href="${esc(enlaceCategoria(codigo))}" aria-label="Ver categoría ${esc(categoria.nombre)}">
      <span class="mg-category-card__icon">${iconoCategoria(categoria.icono)}</span>
      <span class="mg-category-card__name">${esc(categoria.nombre)}</span>
    </a>`;
  });
  accesos.push(`<a class="mg-category-card mg-category-card--more" href="categorias/" data-categorias-abrir aria-label="Abrir todas las categorías">
    <span class="mg-category-card__icon">${iconoCategoria('mas')}</span>
    <span class="mg-category-card__name">Más categorías</span>
  </a>`);
  contenedor.innerHTML = accesos.join('');
}

let solicitudCategorias = null;
async function consultarCategoriasPublicas() {
  const { supabase } = await import('../supabase-config.js');
  return cargarCategoriasPublicas(supabase);
}
function obtenerCategorias({ recargar = false } = {}) {
  if (!solicitudCategorias || recargar) solicitudCategorias = consultarCategoriasPublicas();
  return solicitudCategorias;
}

if (document.querySelector('[data-categorias-abrir]')) {
  crearPanelCategorias({
    obtenerCategorias,
    hrefBase: 'categorias/',
    paginaCategoriasHref: 'categorias/',
  });
}
