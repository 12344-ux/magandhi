import { CATEGORIAS_POR_CODIGO, enlaceCategoria, iconoCategoria } from './categorias.js';

const contenedor = document.querySelector('[data-categorias-inicio]');
if (contenedor) {
  const codigos = ['tecnologia', 'moda', 'hogar', 'deportes', 'belleza', 'accesorios'];
  const accesos = codigos.map((codigo) => {
    const categoria = CATEGORIAS_POR_CODIGO[codigo];
    return `<a class="mg-category-card" href="${enlaceCategoria(codigo)}" aria-label="Ver categoría ${categoria.nombre}">
      <span class="mg-category-card__icon">${iconoCategoria(codigo)}</span>
      <span class="mg-category-card__name">${categoria.nombre}</span>
    </a>`;
  });
  accesos.push(`<a class="mg-category-card mg-category-card--more" href="categorias/" aria-label="Ver todas las categorías">
    <span class="mg-category-card__icon">${iconoCategoria('mas')}</span>
    <span class="mg-category-card__name">Más categorías</span>
  </a>`);
  contenedor.innerHTML = accesos.join('');
}
