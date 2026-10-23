import {
  CATEGORIAS_FALLBACK,
  CODIGOS_CATEGORIAS_DESTACADAS,
  cargarCategoriasPublicas,
  enlaceCategoria,
  iconoCategoria,
} from './categorias.js?v=4';
import { aplicarFotoCategoria } from './categorias-fotos.js?v=1';

const contenedor = document.querySelector('[data-categorias-inicio]');
const MAX_DESTACADAS = CODIGOS_CATEGORIAS_DESTACADAS.length;

// Solo presentación: si la respuesta pública tarda más que esto, se dibuja el
// respaldo histórico para que la navegación nunca quede bloqueada. No cambia
// qué categorías se eligen, en qué orden ni hacia dónde enlazan.
const ESPERA_RESPALDO_MS = 3000;

// «Más categorías» es un enlace normal a la página de categorías (sin ventana).
function asegurarMas() {
  let mas = contenedor.querySelector('[data-categorias-mas]');
  if (!mas) {
    mas = document.createElement('a');
    mas.className = 'mg-category-card mg-category-card--more';
    mas.href = 'categorias/';
    mas.dataset.categoriasMas = '';
    mas.setAttribute('aria-label', 'Ver todas las categorías');
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
    aplicarFotoCategoria(enlace, categoria.codigo);
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

async function obtenerCategorias() {
  const { supabasePublico } = await import('../supabase-publico.js?v=1');
  return cargarCategoriasPublicas(supabasePublico);
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
