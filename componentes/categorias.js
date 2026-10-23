import { resolverSolicitudAcotada } from './solicitud-acotada.js?v=1';

const TRAZO = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const TIEMPO_MAXIMO_CATEGORIAS_MS = 8000;

// Biblioteca cerrada de iconos. El back-office solo aporta una clave; nunca
// se interpreta HTML, SVG, URL ni estilos recibidos desde datos públicos.
const ICONOS = Object.freeze({
  tecnologia: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10 5.5h4M10.5 18.5h3"/>',
  moda: '<path d="M9 4 6 6l-3 5 4 2v8h10v-8l4-2-3-5-3-2c-.5 1.8-1.5 2.7-3 2.7S9.5 5.8 9 4Z"/><path d="M9 4c.8.7 1.8 1 3 1s2.2-.3 3-1"/>',
  hogar: '<path d="M4 11h16v9H4z"/><path d="M7 11V8a5 5 0 0 1 10 0v3M7 15h10M7 20v2M17 20v2"/>',
  deportes: '<circle cx="12" cy="12" r="9"/><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2 12 7Z"/><path d="M12 3v4M15 9.2l4-1.3M13.9 12.7l2.5 3.5M10.1 12.7l-2.5 3.5M9 9.2 5 7.9M7.6 16.2l-1 2.7M16.4 16.2l1 2.7"/>',
  belleza: '<path d="M9 8h6l1 3v10H8V11l1-3Z"/><path d="M10 8V4h4v4M10 4h6M16 4v2M10 13h4M10 17h4"/>',
  accesorios: '<path d="m9 2-1 5h8l-1-5H9ZM9 22l-1-5h8l-1 5H9Z"/><rect x="6" y="7" width="12" height="10" rx="4"/><path d="M12 10v3l2 1"/>',
  mascotas: '<path d="M8.5 12.5c-2.5 1.3-4 3-4 5A3.5 3.5 0 0 0 8 21c1.5 0 2.6-.8 4-1.8 1.4 1 2.5 1.8 4 1.8a3.5 3.5 0 0 0 3.5-3.5c0-2-1.5-3.7-4-5-1.3-.7-2.2-1.5-3.5-1.5s-2.2.8-3.5 1.5Z"/><circle cx="6.5" cy="8" r="2"/><circle cx="17.5" cy="8" r="2"/><circle cx="11" cy="5" r="2"/>',
  jugueteria: '<path d="M9 3a3 3 0 1 0 3 3v3h3a3 3 0 1 1 3 3h-3v3a3 3 0 1 1-3 3v-3H9a3 3 0 1 1-3-3h3V9H6a3 3 0 0 1 3-6Z"/>',
  regalo: '<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M7.5 9C5.6 9 4.5 8 4.5 6.5S5.6 4 7 4c2.4 0 5 5 5 5M16.5 9c1.9 0 3-1 3-2.5S18.4 4 17 4c-2.4 0-5 5-5 5"/>',
  bienestar: '<path d="M20.8 5.7c-2-2-5.1-1.9-7 .2L12 7.8l-1.8-1.9c-1.9-2.1-5-2.2-7-.2-2.1 2.1-2 5.5.1 7.6L12 22l8.7-8.7c2.1-2.1 2.2-5.5.1-7.6Z"/><path d="M8 12h2l1.2-2.5 1.7 5 1.2-2.5H17"/>',
  oficina: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2"/>',
  viaje: '<rect x="6" y="5" width="12" height="16" rx="3"/><path d="M9 5V3h6v2M9 10v6M15 10v6M9 21v1M15 21v1"/>',
  bebes: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l5.7-5.7M9 15c.8.7 1.8 1 3 1s2.2-.3 3-1M9 11h.01M15 11h.01"/>',
  alimentos: '<path d="M5 9h14l-1 12H6Z"/><path d="M8 9c0-3 1.5-5 4-6 2.5 1 4 3 4 6M9 14h6"/>',
  coleccion: '<rect x="3" y="4" width="7" height="7" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="3" y="15" width="7" height="6" rx="2"/><rect x="14" y="15" width="7" height="6" rx="2"/>',
  mas: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
});

export const CATEGORIAS_FALLBACK = Object.freeze([
  Object.freeze({ codigo: 'tecnologia', nombre: 'Tecnología', descripcion: 'Soluciones prácticas para una vida más conectada.', icono: 'tecnologia', orden: 10 }),
  Object.freeze({ codigo: 'moda', nombre: 'Moda', descripcion: 'Piezas escogidas para acompañar tu estilo.', icono: 'moda', orden: 20 }),
  Object.freeze({ codigo: 'hogar', nombre: 'Hogar', descripcion: 'Detalles útiles para disfrutar cada espacio.', icono: 'hogar', orden: 30 }),
  Object.freeze({ codigo: 'deportes', nombre: 'Deportes', descripcion: 'Elementos para moverte y sentirte bien.', icono: 'deportes', orden: 40 }),
  Object.freeze({ codigo: 'belleza', nombre: 'Belleza', descripcion: 'Bienestar y cuidado cotidiano, elegidos con intención.', icono: 'belleza', orden: 50 }),
  Object.freeze({ codigo: 'accesorios', nombre: 'Accesorios', descripcion: 'Complementos funcionales con un toque especial.', icono: 'accesorios', orden: 60 }),
  Object.freeze({ codigo: 'mascotas', nombre: 'Mascotas', descripcion: 'Cuidado y compañía para quienes son parte de casa.', icono: 'mascotas', orden: 70 }),
  Object.freeze({ codigo: 'jugueteria', nombre: 'Juguetería', descripcion: 'Ideas para jugar, crear y compartir.', icono: 'jugueteria', orden: 80 }),
]);

// Alias conservado para consumidores anteriores del componente.
export const CATEGORIAS_PRINCIPALES = CATEGORIAS_FALLBACK;
export const CODIGOS_CATEGORIAS_DESTACADAS = Object.freeze([
  'tecnologia', 'moda', 'hogar', 'deportes', 'belleza', 'accesorios',
]);

const CATEGORIAS_FALLBACK_POR_CODIGO = Object.freeze(Object.fromEntries(
  CATEGORIAS_FALLBACK.map((categoria) => [categoria.codigo, categoria]),
));
export const CATEGORIAS_POR_CODIGO = CATEGORIAS_FALLBACK_POR_CODIGO;

// Estos códigos dejaron de ser categorías visibles. Solo resuelven datos y
// enlaces históricos hacia la categoría raíz Belleza.
const ALIAS_HISTORICOS_BELLEZA = Object.freeze({
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
});

function textoBreve(valor, maximo) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, maximo);
}

function nombreDesdeCodigo(codigo) {
  return codigo.split(/[_-]/).filter(Boolean)
    .map((parte) => `${parte.charAt(0).toUpperCase()}${parte.slice(1)}`)
    .join(' ');
}

function escaparAtributo(valor) {
  return String(valor ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function tieneIcono(clave) {
  return Object.prototype.hasOwnProperty.call(ICONOS, clave);
}

export function normalizarCodigo(valor) {
  return String(valor ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// Preserva la identidad exacta que catalogo_publico usa en text[]. La clave
// normalizada se reserva para aliases e iconos, nunca para consultas remotas.
export function codigoCanonicoCategoria(valor) {
  const codigo = textoBreve(valor, 100);
  return /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(codigo) ? codigo : '';
}

export function claveIconoCategoria(valor) {
  const origen = valor && typeof valor === 'object'
    ? valor.icono ?? valor.icono_codigo ?? valor.codigo
    : valor;
  const clave = normalizarCodigo(origen);
  return tieneIcono(clave) ? clave : 'coleccion';
}

/**
 * Normaliza, deduplica y ordena el contrato público. Los datos de una categoría
 * oficial completan campos vacíos desde el registro fallback, pero una respuesta
 * válida nunca agrega categorías ausentes: visibilidad y altas siguen siendo
 * autoridad de categorias_publicas.
 */
export function fusionarCategoriasPublicas(filas) {
  if (!Array.isArray(filas)) throw new TypeError('categorias_publicas no devolvió una lista.');
  const vistas = new Set();
  const categorias = [];
  filas.forEach((fila, indice) => {
    const codigo = codigoCanonicoCategoria(fila?.codigo);
    if (!codigo || vistas.has(codigo) || ALIAS_HISTORICOS_BELLEZA[codigo]) return;
    vistas.add(codigo);
    const respaldo = CATEGORIAS_FALLBACK_POR_CODIGO[codigo];
    const nombre = textoBreve(fila?.nombre, 100) || respaldo?.nombre || nombreDesdeCodigo(codigo);
    const descripcion = textoBreve(fila?.descripcion, 240) || respaldo?.descripcion || `Descubre la selección disponible en ${nombre}.`;
    const ordenDato = Number(fila?.orden);
    const orden = Number.isFinite(ordenDato) ? ordenDato : (respaldo?.orden ?? 10000 + indice);
    categorias.push(Object.freeze({
      codigo,
      nombre,
      descripcion,
      icono: claveIconoCategoria(fila?.icono_codigo || respaldo?.icono || codigo),
      orden,
      tipo: fila?.tipo === 'temporal' ? 'temporal' : 'permanente',
    }));
  });
  categorias.sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'));
  return Object.freeze(categorias);
}

export function esContratoCategoriasAusente(error) {
  const codigo = String(error?.code || '').toUpperCase();
  const texto = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  if (!texto.includes('categorias_publicas')) return false;
  return codigo === '42P01' || codigo === 'PGRST205' || texto.includes('does not exist') ||
    (texto.includes('schema cache') && (texto.includes('could not find') || texto.includes('not find')));
}

function esColumnaTipoAusente(error) {
  const codigo = String(error?.code || '').toUpperCase();
  const texto = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return (codigo === 'PGRST204' || codigo === '42703' || texto.includes('schema cache')) &&
    /\btipo\b/.test(texto) && /(column|columna|field|campo|schema cache)/.test(texto);
}

async function consultarCategorias(clienteSupabase, campos) {
  const peticion = clienteSupabase
    .from('categorias_publicas')
    .select(campos)
    .order('orden', { ascending: true })
    .order('codigo', { ascending: true });
  return resolverSolicitudAcotada(peticion, {
    tiempoMaximoMs: TIEMPO_MAXIMO_CATEGORIAS_MS,
  });
}

/**
 * Fallback deliberadamente estrecho: si solo falta la columna aditiva `tipo`,
 * repite el contrato anterior y trata esas filas como permanentes. Los datos
 * fijos se usan únicamente cuando la vista completa todavía no existe.
 */
export async function cargarCategoriasPublicas(clienteSupabase) {
  let resultado = await consultarCategorias(
    clienteSupabase,
    'codigo,nombre,icono_codigo,descripcion,orden,tipo',
  );

  if (resultado.error && esColumnaTipoAusente(resultado.error)) {
    resultado = await consultarCategorias(
      clienteSupabase,
      'codigo,nombre,icono_codigo,descripcion,orden',
    );
    if (!resultado.error) {
      return Object.freeze({
        categorias: fusionarCategoriasPublicas(resultado.data || []),
        origen: 'categorias_publicas_sin_tipo',
      });
    }
  }

  if (!resultado.error) {
    return Object.freeze({ categorias: fusionarCategoriasPublicas(resultado.data || []), origen: 'categorias_publicas' });
  }
  if (esContratoCategoriasAusente(resultado.error)) {
    return Object.freeze({ categorias: CATEGORIAS_FALLBACK, origen: 'fallback_contrato_ausente' });
  }
  throw resultado.error;
}

export function categoriaPorCodigo(valor, categorias = CATEGORIAS_FALLBACK) {
  if (!Array.isArray(categorias)) return null;
  const codigoExacto = codigoCanonicoCategoria(valor);
  const directo = categorias.find((categoria) => categoria.codigo === codigoExacto);
  if (directo) return directo;
  const clave = normalizarCodigo(valor);
  const codigoCompatible = ALIAS_HISTORICOS_BELLEZA[clave] ||
    (CATEGORIAS_FALLBACK_POR_CODIGO[clave] ? clave : '');
  return codigoCompatible
    ? categorias.find((categoria) => categoria.codigo === codigoCompatible) || null
    : null;
}

export function codigoPrincipal(valor) {
  const canonico = codigoCanonicoCategoria(valor);
  if (canonico) return ALIAS_HISTORICOS_BELLEZA[canonico] || canonico;
  const clave = normalizarCodigo(valor);
  if (ALIAS_HISTORICOS_BELLEZA[clave]) return ALIAS_HISTORICOS_BELLEZA[clave];
  return CATEGORIAS_FALLBACK_POR_CODIGO[clave] ? clave : '';
}

export function codigosDeFila(fila) {
  const origen = fila?.categoria_codigos;
  let codigos = [];
  if (Array.isArray(origen)) codigos = origen;
  else if (typeof origen === 'string') {
    const limpio = origen.trim();
    if (limpio.startsWith('[')) {
      try {
        const parsed = JSON.parse(limpio);
        codigos = Array.isArray(parsed) ? parsed : [];
      } catch {
        codigos = limpio.split(',');
      }
    } else codigos = limpio.split(',');
  }
  if (!codigos.length) codigos = [fila?.categoria_codigo, fila?.categoria_nombre];
  return [...new Set(codigos.map((codigo) => textoBreve(codigo, 100)).filter(Boolean))];
}

export function filaPerteneceACategoria(fila, categoria) {
  const valor = categoria && typeof categoria === 'object' ? categoria.codigo : categoria;
  const objetivo = codigoPrincipal(valor);
  if (!objetivo) return false;
  return codigosDeFila(fila).some((codigo) => codigoPrincipal(codigo) === objetivo);
}

export function iconoCategoria(codigoOIcono, opciones = {}) {
  const clave = claveIconoCategoria(codigoOIcono);
  const claseSegura = textoBreve(opciones.clase, 120).replace(/[^a-zA-Z0-9 _-]/g, '');
  const clase = claseSegura ? ` class="${escaparAtributo(claseSegura)}"` : '';
  const etiqueta = textoBreve(opciones.etiqueta, 120);
  const accesibilidad = etiqueta
    ? ` role="img" aria-label="${escaparAtributo(etiqueta)}"`
    : ' aria-hidden="true"';
  return `<svg${clase} viewBox="0 0 24 24" ${TRAZO}${accesibilidad}>${ICONOS[clave]}</svg>`;
}

export function enlaceCategoria(codigo, base = 'categorias/') {
  const normalizado = codigoPrincipal(codigo && typeof codigo === 'object' ? codigo.codigo : codigo);
  return normalizado ? `${base}?categoria=${encodeURIComponent(normalizado)}` : base;
}
