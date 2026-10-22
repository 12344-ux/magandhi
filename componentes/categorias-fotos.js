// MAGANDHI · fotografías de categorías (solo presentación).
// Mapeo por código estable de categoría, nunca por posición en pantalla. Un
// código sin foto, o una foto que no carga, conserva el ícono SVG de la
// tarjeta. No altera selección, orden, enlaces ni contratos de Supabase/SN1.
// Un archivo publicado no se sobrescribe: una foto nueva sube a v2, v3… y se
// cambia aquí su nombre.
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

/**
 * Pone (o retira) la fotografía de una tarjeta `.mg-category-card`. Es
 * idempotente: si la tarjeta ya tiene la foto correcta no vuelve a pedirla.
 */
export function aplicarFotoCategoria(enlace, codigo) {
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
