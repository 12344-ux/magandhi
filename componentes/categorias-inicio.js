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

// Solo presentación: si la respuesta pública tarda más que esto, se dibuja el
// respaldo histórico para que la navegación nunca quede bloqueada. No cambia
// qué categorías se eligen, en qué orden ni hacia dónde enlazan.
const ESPERA_RESPALDO_MS = 3000;

// Fotografías del carril móvil, mapeadas por código estable (nunca por
// posición). Un código sin foto, o una foto que no carga, conserva el ícono
// SVG. Un archivo publicado no se sobrescribe: una foto nueva sube a v2, v3…
// En PC la foto permanece oculta y, al ser diferida, no se descarga.
const BASE_FOTOS = new URL('../recursos/home/categorias/', import.meta.url);
const FOTOS_CATEGORIAS = Object.freeze({
  navidad: 'categoria-navidad-v1.webp',
  tecnologia: 'categoria-tecnologia-v1.webp',
  moda: 'categoria-moda-v1.webp',
  hogar: 'categoria-hogar-v1.webp',
  deportes: 'categoria-deportes-v1.webp',
  belleza: 'categoria-belleza-v1.webp',
  accesorios: 'categoria-accesorios-v1.webp',
  mascotas: 'categoria-mascotas-v1.webp',
  jugueteria: 'categoria-jugueteria-v1.webp',
});

function aplicarFoto(enlace, codigo) {
  const archivo = Object.prototype.hasOwnProperty.call(FOTOS_CATEGORIAS, codigo)
    ? FOTOS_CATEGORIAS[codigo]
    : '';
  const actual = enlace.querySelector('.mg-category-card__foto');
  if (!archivo) {
    actual?.remove();
    enlace.classList.remove('mg-category-card--foto');
    return;
  }
  const src = new URL(archivo, BASE_FOTOS).href;
  if (actual?.dataset.foto === src) return;
  actual?.remove();

  const foto = document.createElement('img');
  foto.className = 'mg-category-card__foto';
  foto.alt = '';
  foto.width = 800;
  foto.height = 800;
  foto.loading = 'lazy';
  foto.decoding = 'async';
  foto.dataset.foto = src;
  foto.addEventListener('load', () => { foto.dataset.cargada = ''; }, { once: true });
  foto.addEventListener('error', () => {
    foto.remove();
    enlace.classList.remove('mg-category-card--foto');
  }, { once: true });
  foto.src = src;
  enlace.classList.add('mg-category-card--foto');
  enlace.prepend(foto);
}

function asegurarMas() {
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
  return mas;
}

// Estado de espera: reserva el mismo espacio que las tarjetas reales para que
// la primera categoría visible sea la que decida la respuesta pública (p. ej.
// una temporada activa), sin mostrar antes otra y luego reordenar.
function pintarEspera() {
  if (!contenedor) return;
  const mas = asegurarMas();
  contenedor.setAttribute('aria-busy', 'true');
  for (let indice = 0; indice < MAX_DESTACADAS; indice += 1) {
    const hueco = document.createElement('span');
    hueco.className = 'mg-category-card mg-category-card--espera';
    hueco.dataset.categoriaEspera = '';
    hueco.setAttribute('aria-hidden', 'true');
    contenedor.insertBefore(hueco, mas);
  }
}

function hayEspera() {
  return Boolean(contenedor?.querySelector('[data-categoria-espera]'));
}

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
  const mas = asegurarMas();
  // Con scroll-snap, insertar una temporada delante hace que el navegador
  // conserve la tarjeta que estaba encajada y la temporada quede oculta a la
  // izquierda. Si el carril estaba al inicio, debe seguir al inicio.
  const estabaAlInicio = contenedor.scrollLeft <= 1;
  contenedor.querySelectorAll('[data-categoria-espera]').forEach((hueco) => hueco.remove());
  contenedor.removeAttribute('aria-busy');

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
    aplicarFoto(enlace, categoria.codigo);
    contenedor.insertBefore(enlace, mas);
  });
  existentes.forEach((enlace, codigo) => {
    if (!vigentes.has(codigo)) enlace.remove();
  });
  if (estabaAlInicio) contenedor.scrollLeft = 0;
}

// Espera inmediata en lugar del respaldo: la respuesta pública dibuja primero
// cualquier temporada visible. Las seis categorías históricas siguen siendo el
// respaldo si la consulta falla o tarda más de ESPERA_RESPALDO_MS.
pintarEspera();

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
  const respaldoPorDemora = setTimeout(() => {
    if (hayEspera()) pintarCategoriasInicio(CATEGORIAS_FALLBACK);
  }, ESPERA_RESPALDO_MS);
  void obtenerCategorias()
    .then((resultado) => pintarCategoriasInicio(resultado.categorias))
    .catch((error) => {
      // La navegación de respaldo permanece utilizable; el panel mostrará su
      // error explícito si la persona intenta abrir todas las categorías.
      if (hayEspera()) pintarCategoriasInicio(CATEGORIAS_FALLBACK);
      console.error('No se pudieron priorizar las categorías de temporada:', error);
    })
    .finally(() => clearTimeout(respaldoPorDemora));
}

if (document.querySelector('[data-categorias-abrir]')) {
  crearPanelCategorias({
    obtenerCategorias,
    hrefBase: 'categorias/',
    paginaCategoriasHref: 'categorias/',
  });
}
