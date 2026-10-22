import { enlaceCategoria, iconoCategoria } from './categorias.js?v=2';

const SELECTOR_ABRIR = '[data-categorias-abrir]';
const ICONO_CERRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
const ICONO_FLECHA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

function esc(valor) {
  return String(valor ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function esActivacionSimple(evento, enlace) {
  return evento.button === 0 && !evento.metaKey && !evento.ctrlKey && !evento.shiftKey &&
    !evento.altKey && !enlace.hasAttribute('download') && enlace.target !== '_blank';
}

/**
 * Crea un único selector modal progresivo. Los disparadores siguen siendo
 * enlaces reales a /categorias/ cuando JavaScript no está disponible.
 */
export function crearPanelCategorias({
  obtenerCategorias,
  hrefBase = 'categorias/',
  paginaCategoriasHref = 'categorias/',
  codigoActual = '',
} = {}) {
  if (typeof obtenerCategorias !== 'function') {
    throw new TypeError('El panel de categorías requiere una función de carga.');
  }

  const idPanel = 'mg-category-panel';
  const existente = document.getElementById(idPanel);
  if (existente) return null;

  const raiz = document.createElement('div');
  raiz.className = 'mg-category-panel';
  raiz.id = idPanel;
  raiz.hidden = true;
  raiz.innerHTML = `
    <section class="mg-category-panel__dialog" role="dialog" aria-modal="true" aria-labelledby="mg-category-panel-title" aria-describedby="mg-category-panel-description">
      <header class="mg-category-panel__header">
        <span class="mg-category-panel__brand-icon" aria-hidden="true">${iconoCategoria('coleccion')}</span>
        <div class="mg-category-panel__heading">
          <span>Explora MAGANDHI</span>
          <h2 id="mg-category-panel-title" tabindex="-1">Todas las categorías</h2>
          <p id="mg-category-panel-description">Elige un mundo y descubre su selección disponible.</p>
        </div>
        <button class="mg-category-panel__close" type="button" aria-label="Cerrar categorías" data-categorias-cerrar>${ICONO_CERRAR}</button>
      </header>
      <div class="mg-category-panel__body">
        <div class="mg-category-panel__status" data-categorias-panel-status role="status" aria-live="polite"></div>
        <nav class="mg-category-panel__grid" data-categorias-panel-grid aria-label="Todas las categorías disponibles" hidden></nav>
        <div class="mg-category-panel__footer">
          <span>También puedes explorar el catálogo en una página completa.</span>
          <a href="${esc(paginaCategoriasHref)}">Abrir página de categorías${ICONO_FLECHA}</a>
        </div>
      </div>
    </section>`;
  document.body.appendChild(raiz);

  const dialogo = raiz.querySelector('.mg-category-panel__dialog');
  const titulo = raiz.querySelector('#mg-category-panel-title');
  const estado = raiz.querySelector('[data-categorias-panel-status]');
  const grid = raiz.querySelector('[data-categorias-panel-grid]');
  let disparadorActivo = null;
  let cargando = null;
  let cargaCompleta = false;

  function prepararDisparador(disparador) {
    disparador.setAttribute('aria-haspopup', 'dialog');
    disparador.setAttribute('aria-controls', idPanel);
    disparador.setAttribute('aria-expanded', raiz.hidden ? 'false' : String(disparador === disparadorActivo));
  }

  document.querySelectorAll(SELECTOR_ABRIR).forEach(prepararDisparador);

  function pintarCarga() {
    estado.hidden = false;
    estado.className = 'mg-category-panel__status mg-category-panel__status--loading';
    estado.setAttribute('role', 'status');
    estado.innerHTML = `<span class="mg-category-panel__loader" aria-hidden="true">${iconoCategoria('coleccion')}</span><strong>Cargando categorías…</strong>`;
    grid.hidden = true;
  }

  function pintarCategorias(categorias) {
    if (!categorias.length) {
      estado.hidden = false;
      estado.className = 'mg-category-panel__status mg-category-panel__status--empty';
      estado.setAttribute('role', 'status');
      estado.innerHTML = `${iconoCategoria('coleccion')}<strong>Aún no hay categorías visibles</strong><span>Puedes ver todos los productos disponibles mientras preparamos esta selección.</span><a class="mg-category-panel__state-link" href="${esc(paginaCategoriasHref)}">Ver catálogo completo</a>`;
      grid.hidden = true;
      return;
    }
    estado.innerHTML = '';
    estado.hidden = true;
    grid.innerHTML = categorias.map((categoria) => {
      const actual = categoria.codigo === codigoActual;
      return `<a class="mg-category-panel__item" href="${esc(enlaceCategoria(categoria.codigo, hrefBase))}" ${actual ? 'aria-current="page"' : ''}>
        <span class="mg-category-panel__item-icon">${iconoCategoria(categoria.icono)}</span>
        <span class="mg-category-panel__item-copy"><strong>${esc(categoria.nombre)}</strong><small>${esc(categoria.descripcion)}</small></span>
        <span class="mg-category-panel__item-arrow">${ICONO_FLECHA}</span>
      </a>`;
    }).join('');
    grid.hidden = false;
  }

  function pintarError() {
    estado.hidden = false;
    estado.className = 'mg-category-panel__status mg-category-panel__status--error';
    estado.setAttribute('role', 'alert');
    estado.innerHTML = `${iconoCategoria('coleccion')}<strong>No pudimos cargar las categorías</strong><span>Revisa tu conexión e inténtalo de nuevo. No reemplazamos este fallo con datos desactualizados.</span><div><button type="button" data-categorias-reintentar>Reintentar</button><a class="mg-category-panel__state-link" href="${esc(paginaCategoriasHref)}">Abrir página completa</a></div>`;
    grid.hidden = true;
  }

  async function cargar(recargar = false) {
    if (cargaCompleta && !recargar) return;
    if (cargando && !recargar) return cargando;
    pintarCarga();
    cargando = Promise.resolve(obtenerCategorias({ recargar }))
      .then((resultado) => {
        pintarCategorias(resultado.categorias);
        cargaCompleta = true;
      })
      .catch((error) => {
        console.error('No se pudieron cargar las categorías públicas:', error);
        pintarError();
      })
      .finally(() => { cargando = null; });
    return cargando;
  }

  function abrir(disparador) {
    disparadorActivo?.setAttribute('aria-expanded', 'false');
    disparadorActivo = disparador;
    prepararDisparador(disparadorActivo);
    disparadorActivo.setAttribute('aria-expanded', 'true');
    raiz.hidden = false;
    document.body.classList.add('mg-category-panel-open');
    void cargar();
    requestAnimationFrame(() => titulo.focus());
  }

  function cerrar() {
    if (raiz.hidden) return;
    raiz.hidden = true;
    document.body.classList.remove('mg-category-panel-open');
    disparadorActivo?.setAttribute('aria-expanded', 'false');
    if (disparadorActivo?.isConnected) disparadorActivo.focus();
    disparadorActivo = null;
  }

  function controlesEnDialogo() {
    return [...dialogo.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')]
      .filter((elemento) => elemento.offsetParent !== null && elemento.getAttribute('aria-hidden') !== 'true');
  }

  function manejarTeclado(evento) {
    if (raiz.hidden) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cerrar();
      return;
    }
    if (evento.key !== 'Tab') return;
    const controles = controlesEnDialogo();
    if (!controles.length) {
      evento.preventDefault();
      titulo.focus();
      return;
    }
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    const activo = document.activeElement;
    if (!dialogo.contains(activo)) {
      evento.preventDefault();
      (evento.shiftKey ? ultimo : primero).focus();
    } else if (evento.shiftKey && (activo === primero || activo === titulo)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && activo === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

  document.addEventListener('click', (evento) => {
    const disparador = evento.target.closest?.(SELECTOR_ABRIR);
    if (disparador && esActivacionSimple(evento, disparador)) {
      evento.preventDefault();
      prepararDisparador(disparador);
      abrir(disparador);
      return;
    }
    if (evento.target.closest?.('[data-categorias-cerrar]')) cerrar();
    if (evento.target.closest?.('[data-categorias-reintentar]')) void cargar(true);
  });
  raiz.addEventListener('click', (evento) => {
    if (evento.target === raiz) cerrar();
  });
  document.addEventListener('keydown', manejarTeclado);

  // Precarga discreta: al abrir, el panel suele estar listo. Solo la ausencia
  // comprobada del contrato activa el fallback; otros errores quedan visibles.
  void cargar();

  return Object.freeze({ abrir, cerrar, recargar: () => cargar(true) });
}
