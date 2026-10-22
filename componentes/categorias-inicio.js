import {
  CATEGORIAS_FALLBACK,
  CODIGOS_CATEGORIAS_DESTACADAS,
  cargarCategoriasPublicas,
  enlaceCategoria,
  iconoCategoria,
} from './categorias.js?v=3';
import { crearPanelCategorias } from './categorias-panel.js?v=2';

const contenedor = document.querySelector('[data-categorias-inicio]');
const MAX_DESTACADAS = CODIGOS_CATEGORIAS_DESTACADAS.length;

function categoriasParaInicio(categorias) {
  const lista = Array.isArray(categorias) ? categorias : [];
  const porCodigo = new Map(lista.map((categoria) => [categoria.codigo, categoria]));
  const temporadas = lista.filter((categoria) => categoria.tipo === 'temporal');
  const permanentes = CODIGOS_CATEGORIAS_DESTACADAS
    .map((codigo) => porCodigo.get(codigo))
    .filter(Boolean);
  const vistas = new Set();
  return [...temporadas, ...permanentes]
    .filter((categoria) => {
      if (!categoria?.codigo || vistas.has(categoria.codigo)) return false;
      vistas.add(categoria.codigo);
      return true;
    })
    .slice(0, MAX_DESTACADAS);
}

function pintarCategoriasInicio(categorias) {
  if (!contenedor) return;
  let mas = contenedor.querySelector('[data-categorias-abrir]');
  if (!mas) {
    mas = document.createElement('a');
    mas.className = 'mg-category-card mg-category-card--more';
    mas.href = 'categorias/';
    mas.dataset.categoriasAbrir = '';
    mas.setAttribute('aria-label', 'Abrir todas las categorías');
    mas.innerHTML = `<span class="mg-category-card__icon">${iconoCategoria('mas')}</span>
      <span class="mg-category-card__name">Más categorías</span>`;
    contenedor.appendChild(mas);
  }

  const existentes = new Map(
    [...contenedor.querySelectorAll('[data-categoria-inicio]')]
      .map((enlace) => [enlace.dataset.categoriaInicio, enlace])
  );
  const vigentes = new Set();
  categoriasParaInicio(categorias).forEach((categoria) => {
    vigentes.add(categoria.codigo);
    let enlace = existentes.get(categoria.codigo);
    if (!enlace) {
      enlace = document.createElement('a');
      enlace.className = 'mg-category-card';
      enlace.dataset.categoriaInicio = categoria.codigo;
      enlace.innerHTML = '<span class="mg-category-card__icon"></span><span class="mg-category-card__name"></span>';
    }
    enlace.href = enlaceCategoria(categoria.codigo);
    enlace.setAttribute('aria-label', `Ver categoría ${categoria.nombre}`);
    enlace.querySelector('.mg-category-card__icon').innerHTML = iconoCategoria(categoria.icono);
    enlace.querySelector('.mg-category-card__name').textContent = categoria.nombre;
    contenedor.insertBefore(enlace, mas);
  });
  existentes.forEach((enlace, codigo) => {
    if (!vigentes.has(codigo)) enlace.remove();
  });
}

// Respaldo inmediato: conserva exactamente las seis categorías históricas si
// el contrato nuevo aún no se ha consultado. La respuesta pública reemplaza
// este dibujo y antepone cualquier temporada visible, sin alterar productos.
pintarCategoriasInicio(CATEGORIAS_FALLBACK);

let solicitudCategorias = null;
async function consultarCategoriasPublicas() {
  const { supabase } = await import('../supabase-config.js');
  return cargarCategoriasPublicas(supabase);
}
function obtenerCategorias({ recargar = false } = {}) {
  if (!solicitudCategorias || recargar) solicitudCategorias = consultarCategoriasPublicas();
  return solicitudCategorias;
}

if (contenedor) {
  void obtenerCategorias()
    .then((resultado) => pintarCategoriasInicio(resultado.categorias))
    .catch((error) => {
      // La navegación de respaldo permanece utilizable; el panel mostrará su
      // error explícito si la persona intenta abrir todas las categorías.
      console.error('No se pudieron priorizar las categorías de temporada:', error);
    });
}

if (document.querySelector('[data-categorias-abrir]')) {
  crearPanelCategorias({
    obtenerCategorias,
    hrefBase: 'categorias/',
    paginaCategoriasHref: 'categorias/',
  });
}
