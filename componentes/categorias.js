const TRAZO = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONOS = Object.freeze({
  tecnologia: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9 7h6M8 17h8M10 12h.01M14 12h.01"/>',
  moda: '<path d="M9 4 6 6l-3 5 4 2v8h10v-8l4-2-3-5-3-2c-.5 1.8-1.5 2.7-3 2.7S9.5 5.8 9 4Z"/><path d="M9 4c.8.7 1.8 1 3 1s2.2-.3 3-1"/>',
  hogar: '<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/>',
  deportes: '<path d="M7 16c-2.8 0-5-1.8-5-4s2.2-4 5-4c1.6 0 3 .6 4 1.6C12 8.6 13.4 8 15 8c3.9 0 7 2.2 7 5s-3.1 5-7 5c-1.7 0-3.2-.4-4.4-1.2C9.7 16.3 8.5 16 7 16Z"/><path d="M6 12h4M8 10v4M16 11h.01M18 14h.01"/>',
  belleza: '<path d="M12 3c2.8 3.2 4.2 6 4.2 8.4A4.2 4.2 0 0 1 12 15.6a4.2 4.2 0 0 1-4.2-4.2C7.8 9 9.2 6.2 12 3Z"/><path d="M5 21c1.6-2.7 3.9-4 7-4s5.4 1.3 7 4M9.7 11.4c.7.5 1.5.8 2.3.8s1.6-.3 2.3-.8"/>',
  accesorios: '<circle cx="9" cy="15" r="5"/><circle cx="15" cy="9" r="5"/><path d="m11.5 5.7 1.3-2.2h4.4l1.3 2.2"/>',
  jugueteria: '<path d="m12 3 2.5 5.1 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8Z"/><path d="M5 21h14"/>',
  mascotas: '<path d="M8.5 12.5c-2.5 1.3-4 3-4 5A3.5 3.5 0 0 0 8 21c1.5 0 2.6-.8 4-1.8 1.4 1 2.5 1.8 4 1.8a3.5 3.5 0 0 0 3.5-3.5c0-2-1.5-3.7-4-5-1.3-.7-2.2-1.5-3.5-1.5s-2.2.8-3.5 1.5Z"/><circle cx="6.5" cy="8" r="2"/><circle cx="17.5" cy="8" r="2"/><circle cx="11" cy="5" r="2"/>',
  alimentos: '<path d="M5 9h14l-1 12H6Z"/><path d="M8 9c0-3 1.5-5 4-6 2.5 1 4 3 4 6M9 14h6"/>',
  mas: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  cabello: '<path d="M7 21v-8a5 5 0 0 1 10 0v8M8 8c.7-3.3 2-5 4-5s3.3 1.7 4 5"/><path d="M10 14v7M14 14v7"/>',
  belleza_masc: '<circle cx="12" cy="8" r="4"/><path d="M5 21c.8-4.5 3.1-7 7-7s6.2 2.5 7 7M10 9.5c.6.7 1.3 1 2 1s1.4-.3 2-1"/>',
  belleza_fem: '<path d="M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"/><path d="M12 13v8M8.5 17h7"/>',
  cuidado_gral: '<path d="M12 3c3 3.4 4.5 6.2 4.5 8.5a4.5 4.5 0 0 1-9 0C7.5 9.2 9 6.4 12 3Z"/><path d="M5 21h14M9 17.5h6"/>',
});

export const SUBCATEGORIAS_BELLEZA = Object.freeze([
  Object.freeze({ codigo: 'cabello', nombre: 'Cuidado del cabello', descripcion: 'Limpieza, tratamiento y bienestar capilar.', icono: 'cabello' }),
  Object.freeze({ codigo: 'belleza_fem', nombre: 'Cuidado femenino', descripcion: 'Rutinas y productos de cuidado seleccionados.', icono: 'belleza_fem' }),
  Object.freeze({ codigo: 'belleza_masc', nombre: 'Belleza y cuidado masculino', descripcion: 'Cuidado personal y rutinas para hombre.', icono: 'belleza_masc' }),
  Object.freeze({ codigo: 'cuidado_gral', nombre: 'Cuidado corporal e higiene', descripcion: 'Bienestar e higiene para todos los días.', icono: 'cuidado_gral' }),
]);

export const CATEGORIAS_PRINCIPALES = Object.freeze([
  Object.freeze({ codigo: 'tecnologia', nombre: 'Tecnología', descripcion: 'Soluciones prácticas para una vida más conectada.', icono: 'tecnologia' }),
  Object.freeze({ codigo: 'moda', nombre: 'Moda', descripcion: 'Piezas escogidas para acompañar tu estilo.', icono: 'moda' }),
  Object.freeze({ codigo: 'hogar', nombre: 'Hogar', descripcion: 'Detalles útiles para disfrutar cada espacio.', icono: 'hogar' }),
  Object.freeze({ codigo: 'deportes', nombre: 'Deportes', descripcion: 'Elementos para moverte y sentirte bien.', icono: 'deportes' }),
  Object.freeze({ codigo: 'belleza', nombre: 'Belleza y cuidado personal', descripcion: 'Bienestar cotidiano, elegido con cuidado.', icono: 'belleza', subcategorias: SUBCATEGORIAS_BELLEZA }),
  Object.freeze({ codigo: 'accesorios', nombre: 'Accesorios', descripcion: 'Complementos funcionales con un toque especial.', icono: 'accesorios' }),
  Object.freeze({ codigo: 'jugueteria', nombre: 'Juguetería', descripcion: 'Ideas para jugar, crear y compartir.', icono: 'jugueteria' }),
  Object.freeze({ codigo: 'mascotas', nombre: 'Mascotas', descripcion: 'Cuidado y compañía para quienes son parte de casa.', icono: 'mascotas' }),
  Object.freeze({ codigo: 'alimentos', nombre: 'Alimentos y bebidas', descripcion: 'Sabores seleccionados para tus momentos cotidianos.', icono: 'alimentos' }),
]);

export const CATEGORIAS_RAIZ_POR_CODIGO = Object.freeze(Object.fromEntries(
  CATEGORIAS_PRINCIPALES.map((categoria) => [categoria.codigo, categoria])
));

export const CATEGORIAS_POR_CODIGO = Object.freeze(Object.fromEntries([
  ...CATEGORIAS_PRINCIPALES,
  ...SUBCATEGORIAS_BELLEZA.map((categoria) => ({ ...categoria, parent_codigo: 'belleza' })),
].map((categoria) => [categoria.codigo, Object.freeze(categoria)])));

const ALIAS_HISTORICOS = Object.freeze({
  cabello: 'belleza',
  cuidado_del_cabello: 'belleza',
  belleza_fem: 'belleza',
  belleza_femenina: 'belleza',
  belleza_masc: 'belleza',
  belleza_masculina: 'belleza',
  cuidado_masculino: 'belleza',
  cuidado_gral: 'belleza',
  cuidado_general: 'belleza',
  cuidado_personal: 'belleza',
  belleza_y_cuidado_personal: 'belleza',
  hogar_limpieza: 'hogar',
  alimentos_naturales: 'alimentos',
  alimentos_y_bebidas: 'alimentos',
});

export function normalizarCodigo(valor) {
  return String(valor ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function categoriaPorCodigo(valor) {
  const codigo = normalizarCodigo(valor);
  return CATEGORIAS_POR_CODIGO[codigo] || null;
}

export function codigoPrincipal(valor) {
  const codigo = normalizarCodigo(valor);
  if (CATEGORIAS_RAIZ_POR_CODIGO[codigo]) return codigo;
  const subcategoria = SUBCATEGORIAS_BELLEZA.find((item) => item.codigo === codigo);
  if (subcategoria) return 'belleza';
  return ALIAS_HISTORICOS[codigo] || '';
}

export function codigosDeFila(fila) {
  const origen = fila?.categoria_codigos;
  let codigos = [];
  if (Array.isArray(origen)) codigos = origen;
  else if (typeof origen === 'string') {
    const limpio = origen.trim();
    if (limpio.startsWith('[')) {
      try { codigos = JSON.parse(limpio); } catch { codigos = limpio.split(','); }
    } else codigos = limpio.split(',');
  }
  if (!codigos.length) codigos = [fila?.categoria_codigo, fila?.categoria_nombre];
  return codigos.map(normalizarCodigo).filter(Boolean);
}

export function filaPerteneceACategoria(fila, categoria) {
  const objetivo = categoriaPorCodigo(categoria)?.codigo;
  if (!objetivo) return false;
  return codigosDeFila(fila).some((codigo) => codigo === objetivo || codigoPrincipal(codigo) === objetivo);
}

export function iconoCategoria(codigo, opciones = {}) {
  const clave = CATEGORIAS_POR_CODIGO[codigo]?.icono || codigo;
  const dibujo = ICONOS[clave] || ICONOS.mas;
  const clase = opciones.clase ? ` class="${opciones.clase}"` : '';
  const etiqueta = opciones.etiqueta ? ` role="img" aria-label="${opciones.etiqueta}"` : ' aria-hidden="true"';
  return `<svg${clase} viewBox="0 0 24 24" ${TRAZO}${etiqueta}>${dibujo}</svg>`;
}

export function enlaceCategoria(codigo, base = 'categorias/') {
  const categoria = categoriaPorCodigo(codigo);
  return categoria ? `${base}?categoria=${encodeURIComponent(categoria.codigo)}` : base;
}
