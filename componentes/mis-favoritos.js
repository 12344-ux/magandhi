import { SUPABASE_URL } from '../supabase-config.js';
import {
  establecerFavorito,
  mensajeErrorFavoritos,
  observarFavoritos,
  refrescarFavoritos,
} from './favoritos-core.js?v=1';

const STORAGE = new URL(SUPABASE_URL);
const PREFIJO_STORAGE = '/storage/v1/object/public/campanas/';
const formatoPrecio = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const ICONO_CORAZON = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

function crear(tag, clase, contenido) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (contenido !== undefined) nodo.textContent = contenido;
  return nodo;
}

function urlImagenSegura(entrada) {
  const valor = String(entrada || '').trim();
  if (!valor || valor.length > 1000 || valor.includes('\\')) return '';
  try {
    if (/^https:\/\//i.test(valor)) {
      const url = new URL(valor);
      return url.origin === STORAGE.origin && !url.username && !url.password && !url.port &&
        url.pathname.startsWith(PREFIJO_STORAGE) ? url.href : '';
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(valor)) return '';
    const segmentos = valor.split('/');
    if (!segmentos.length || segmentos.some((segmento) => {
      let decodificado = '';
      try { decodificado = decodeURIComponent(segmento); } catch { return true; }
      return !segmento || decodificado === '.' || decodificado === '..' || /[\\/]/.test(decodificado);
    })) return '';
    const ruta = segmentos.map(encodeURIComponent).join('/');
    const url = new URL(`${PREFIJO_STORAGE}${ruta}`, STORAGE);
    return url.pathname.startsWith(PREFIJO_STORAGE) ? url.href : '';
  } catch {
    return '';
  }
}

function imagenFavorito(favorito) {
  const primera = favorito.imagenes.find((item) => urlImagenSegura(item));
  return urlImagenSegura(primera || favorito.imagen_banner_path);
}

function enlaceProducto(favorito) {
  return favorito.slug ? `/producto/${encodeURIComponent(favorito.slug)}/` : '';
}

export function crearControlFavoritos() {
  let contenedor = null;
  let activo = false;
  let estado = null;
  let anuncio = '';
  let errorAccion = '';
  let focoPendiente = '';

  function cabecera() {
    const fragmento = document.createDocumentFragment();
    const cabeza = crear('div', 'cc-view-head');
    const titulo = crear('h2', '', 'Favoritos');
    titulo.id = 'cc-view-title';
    titulo.tabIndex = -1;
    cabeza.append(
      crear('span', 'cc-view-kicker', 'Tu selección'),
      titulo,
      crear('p', '', 'Guarda los productos que quieras recordar y vuelve a ellos cuando sea el momento.'),
    );
    fragmento.appendChild(cabeza);
    const actualizaciones = crear('p', 'cc-favorites-updates', anuncio);
    actualizaciones.setAttribute('role', 'status');
    actualizaciones.setAttribute('aria-live', 'polite');
    fragmento.appendChild(actualizaciones);
    if (errorAccion) {
      const alerta = crear('p', 'cc-favorites-alert', errorAccion);
      alerta.setAttribute('role', 'alert');
      fragmento.appendChild(alerta);
    }
    return fragmento;
  }

  function estadoVacio(titulo, detalle, reintentar = false) {
    const vacio = crear('div', `cc-empty-state${reintentar ? ' cc-empty-state--error' : ''}`);
    const icono = crear('span', 'cc-empty-state__icon');
    icono.innerHTML = ICONO_CORAZON;
    vacio.append(icono, crear('h3', '', titulo), crear('p', '', detalle));
    if (reintentar) {
      const boton = crear('button', 'cc-view-cta', 'Intentar de nuevo');
      boton.type = 'button';
      boton.addEventListener('click', () => {
        errorAccion = '';
        refrescarFavoritos().catch(() => {});
      });
      vacio.appendChild(boton);
    }
    return vacio;
  }

  function restaurarFoco() {
    if (!focoPendiente || !contenedor || estado?.mutando.length) return;
    const anterior = contenedor.querySelector(`[data-favorito-foco="${CSS.escape(focoPendiente)}"]`);
    const destino = anterior && !anterior.disabled
      ? anterior
      : contenedor.querySelector('[data-favorito-foco]:not([disabled])') || contenedor.querySelector('#cc-view-title');
    focoPendiente = '';
    requestAnimationFrame(() => destino?.focus());
  }

  async function quitar(favorito, boton) {
    if (boton.disabled) return;
    errorAccion = '';
    focoPendiente = favorito.campana_id;
    try {
      await establecerFavorito(favorito.campana_id, false);
      anuncio = `${favorito.nombre} se quitó de tus favoritos.`;
      const region = contenedor?.querySelector('.cc-favorites-updates');
      if (region) region.textContent = anuncio;
    } catch (error) {
      focoPendiente = favorito.campana_id;
      errorAccion = mensajeErrorFavoritos(error);
      renderizar();
    }
  }

  function tarjeta(favorito) {
    const tarjeta = crear('article', 'cc-favorite-card');
    if (estado.mutando.includes(favorito.campana_id)) tarjeta.setAttribute('aria-busy', 'true');
    const destino = enlaceProducto(favorito);
    const imagen = imagenFavorito(favorito);
    const media = destino ? crear('a', 'cc-favorite-card__media') : crear('div', 'cc-favorite-card__media');
    if (destino) {
      media.href = destino;
      media.setAttribute('aria-label', `Ver ${favorito.nombre}`);
    }
    if (imagen) {
      const foto = document.createElement('img');
      foto.src = imagen;
      foto.alt = favorito.nombre;
      foto.loading = 'lazy';
      foto.decoding = 'async';
      foto.addEventListener('error', () => {
        media.replaceChildren(crear('span', 'cc-favorite-card__placeholder', 'M'));
      });
      media.appendChild(foto);
    } else {
      media.appendChild(crear('span', 'cc-favorite-card__placeholder', 'M'));
    }

    const cuerpo = crear('div', 'cc-favorite-card__body');
    const titulo = destino ? crear('a', 'cc-favorite-card__title', favorito.nombre) : crear('h3', 'cc-favorite-card__title', favorito.nombre);
    if (destino) titulo.href = destino;
    const detalle = favorito.retirado
      ? 'Este producto ya no está publicado.'
      : favorito.disponible ? 'Disponible' : 'Agotado por ahora';
    cuerpo.append(titulo, crear('span', `cc-favorite-card__availability${favorito.disponible ? '' : ' is-unavailable'}`, detalle));
    if (favorito.precio_venta !== null) {
      cuerpo.appendChild(crear('strong', 'cc-favorite-card__price', `$ ${formatoPrecio.format(favorito.precio_venta)} COP`));
    }

    const quitarBoton = crear('button', 'cc-favorite-card__remove');
    quitarBoton.type = 'button';
    quitarBoton.dataset.favoritoFoco = favorito.campana_id;
    const mutandoEste = estado.mutando.includes(favorito.campana_id);
    quitarBoton.innerHTML = `${ICONO_CORAZON}<span>${mutandoEste ? 'Quitando…' : 'Quitar'}</span>`;
    quitarBoton.disabled = estado.mutando.length > 0;
    quitarBoton.setAttribute('aria-label', `Quitar ${favorito.nombre} de favoritos`);
    quitarBoton.addEventListener('click', () => quitar(favorito, quitarBoton));
    tarjeta.append(media, cuerpo, quitarBoton);
    return tarjeta;
  }

  function renderizar() {
    if (!activo || !contenedor || !estado) return;
    contenedor.replaceChildren(cabecera());
    if (!estado.cargados && estado.cargando) {
      const carga = crear('div', 'cc-purchase-loading');
      const spinner = crear('span', 'cc-purchase-spinner');
      spinner.setAttribute('aria-hidden', 'true');
      carga.append(spinner, crear('p', '', 'Cargando tus favoritos…'));
      contenedor.appendChild(carga);
      return;
    }
    if (!estado.cargados && estado.error) {
      contenedor.appendChild(estadoVacio(
        'No pudimos cargar tus favoritos',
        'Revisa tu conexión e inténtalo de nuevo. No mostramos información sin confirmar.',
        true,
      ));
      restaurarFoco();
      return;
    }
    if (!estado.favoritos.length) {
      contenedor.appendChild(estadoVacio(
        'Tu lista de favoritos está esperando',
        'Cuando guardes un producto desde su ficha, aparecerá aquí.',
      ));
      restaurarFoco();
      return;
    }
    const lista = crear('div', 'cc-favorite-list');
    estado.favoritos.forEach((favorito) => lista.appendChild(tarjeta(favorito)));
    contenedor.appendChild(lista);
    restaurarFoco();
  }

  observarFavoritos((siguiente) => {
    estado = siguiente;
    renderizar();
  });

  function montar(elemento) {
    contenedor = elemento;
    activo = true;
    anuncio = '';
    errorAccion = '';
    renderizar();
    refrescarFavoritos().catch(() => {});
  }

  function desmontar() {
    activo = false;
    contenedor = null;
    focoPendiente = '';
    errorAccion = '';
  }

  return Object.freeze({ montar, desmontar });
}
