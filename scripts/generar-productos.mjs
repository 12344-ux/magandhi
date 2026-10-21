#!/usr/bin/env node
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE_PATH = path.join(ROOT, 'producto', 'index.html');
const CATALOGO_PATH = path.join(ROOT, 'producto', 'catalogo-seo.json');
const CONFIG_PATH = path.join(ROOT, 'supabase-config.js');
const SITE_URL = 'https://magandhi.com';
const BRAND_IMAGE = `${SITE_URL}/logo.png`;
const STORAGE_BUCKET = 'campanas';
const GENERATED_MARKER = 'MAGANDHI_PRODUCTO_GENERADO_P1';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEO_START = '<!-- PRODUCTO_SEO_INICIO: bloque reemplazado por scripts/generar-productos.mjs -->';
const SEO_END = '<!-- PRODUCTO_SEO_FIN -->';

function fail(message) {
  throw new Error(message);
}

function html(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function xml(value) {
  return html(value);
}

function jsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function text(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function seoDescription(product) {
  const source = text(product.descripcion) || text(product.subtitulo) ||
    'Producto elegido y revisado por el equipo de MAGANDHI.';
  if (source.length <= 160) return source;
  return `${source.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}

function encodeStoragePath(value) {
  const segments = String(value).split('/');
  if (!segments.length) return '';
  for (const segment of segments) {
    let decoded;
    try { decoded = decodeURIComponent(segment); } catch { return ''; }
    if (!segment || decoded === '.' || decoded === '..' || /[\\/]/.test(decoded)) return '';
  }
  return segments.map(encodeURIComponent).join('/');
}

function publicImage(product, supabaseUrl) {
  const source = Array.isArray(product.imagenes)
    ? product.imagenes.find((item) => typeof item === 'string' && item.trim())
    : '';
  const image = String(source || product.imagen_banner_path || '').trim();
  if (!image) return BRAND_IMAGE;
  if (/^https:\/\//i.test(image)) {
    try {
      const candidate = new URL(image);
      const storage = new URL(supabaseUrl);
      const prefix = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
      if (candidate.hostname === storage.hostname && candidate.pathname.startsWith(prefix) &&
          !candidate.port && !candidate.username && !candidate.password) return candidate.href;
    } catch { /* cae al fallback estable */ }
    return BRAND_IMAGE;
  }
  const encoded = encodeStoragePath(image);
  if (!encoded) return BRAND_IMAGE;
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${encoded}`;
}

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) fail(`No se encontró ${label} en la plantilla.`);
  if (source.indexOf(search, first + search.length) >= 0) fail(`${label} aparece más de una vez.`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceRegion(source, start, end, replacement, label) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) fail(`No se encontró la región ${label}.`);
  return source.slice(0, from) + replacement + source.slice(to + end.length);
}

async function exists(target) {
  try {
    await access(target, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readCatalog() {
  if (!(await exists(CATALOGO_PATH))) return { version: 1, politicas: 'borrador', productos: [] };
  const parsed = JSON.parse(await readFile(CATALOGO_PATH, 'utf8'));
  if (parsed.version !== 1 || !['borrador', 'publicada'].includes(parsed.politicas) || !Array.isArray(parsed.productos)) {
    fail('producto/catalogo-seo.json no cumple el contrato P1 versión 1.');
  }
  return parsed;
}

async function readPublicConfig() {
  const source = await readFile(CONFIG_PATH, 'utf8');
  const url = source.match(/export const SUPABASE_URL = '([^']+)'/);
  const key = source.match(/export const SUPABASE_PUBLISHABLE_KEY = '([^']+)'/);
  if (!url || !key) fail('No se pudo leer la configuración pública de Supabase.');
  return { url: url[1], key: key[1] };
}

function normalizeProduct(row, previous) {
  if (!row || !UUID_RE.test(String(row.id || ''))) fail('catalogo_publico devolvió un UUID inválido.');
  const slug = text(row.slug).toLowerCase();
  if (!SLUG_RE.test(slug)) fail(`Slug inválido para ${row.id}: ${slug || '(vacío)'}.`);
  const nombre = text(row.nombre);
  if (!nombre) fail(`Producto sin nombre: ${row.id}.`);
  const aliases = new Set(Array.isArray(previous?.aliases) ? previous.aliases : []);
  if (previous?.slug && previous.slug !== slug) aliases.add(previous.slug);
  aliases.delete(slug);
  for (const alias of aliases) {
    if (!SLUG_RE.test(alias)) fail(`Alias inválido para ${row.id}: ${alias}.`);
  }
  return {
    id: String(row.id).toLowerCase(),
    slug,
    aliases: [...aliases].sort(),
    retirado: false,
    nombre,
    subtitulo: text(row.caracteristica_adicional),
    descripcion: text(row.hook_largo),
    imagenes: Array.isArray(row.imagenes)
      ? row.imagenes.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim())
      : [],
    imagen_banner_path: text(row.imagen_banner_path),
    orden: Number.isSafeInteger(row.orden) ? row.orden : 0,
  };
}

function validateCatalog(catalog) {
  const ids = new Set();
  const routes = new Map();
  for (const product of catalog.productos) {
    if (!UUID_RE.test(String(product.id || '')) || ids.has(product.id)) fail(`UUID repetido o inválido: ${product.id}.`);
    ids.add(product.id);
    if (!SLUG_RE.test(product.slug)) fail(`Slug inválido: ${product.slug}.`);
    for (const route of [product.slug, ...(product.aliases || [])]) {
      if (!SLUG_RE.test(route)) fail(`Ruta de producto inválida: ${route}.`);
      const owner = routes.get(route);
      if (owner && owner !== product.id) fail(`La ruta ${route} pertenece a más de un UUID.`);
      routes.set(route, product.id);
    }
  }
}

async function syncCatalog() {
  const oldCatalog = await readCatalog();
  const previousById = new Map(oldCatalog.productos.map((product) => [product.id, product]));
  const config = await readPublicConfig();
  const fields = [
    'id', 'nombre', 'slug', 'caracteristica_adicional', 'hook_largo',
    'imagenes', 'imagen_banner_path', 'orden',
  ].join(',');
  const endpoint = new URL('/rest/v1/catalogo_publico', config.url);
  endpoint.searchParams.set('select', fields);
  endpoint.searchParams.set('order', 'orden.asc,slug.asc');
  const response = await fetch(endpoint, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) fail(`catalogo_publico respondió ${response.status}: ${await response.text()}`);
  const rows = await response.json();
  if (!Array.isArray(rows)) fail('catalogo_publico no devolvió una lista.');

  // P1 backend expone aliases históricos sin datos internos. Durante el orden
  // de despliegue tienda→migración, un 404 significa que la vista aún no existe:
  // el manifiesto local sigue preservando sus aliases y una sincronización
  // posterior incorpora la autoridad server-side.
  const aliasesEndpoint = new URL('/rest/v1/campana_slug_alias_publico', config.url);
  aliasesEndpoint.searchParams.set('select', 'campana_producto_id,slug_anterior,slug_actual');
  aliasesEndpoint.searchParams.set('order', 'slug_anterior.asc');
  const aliasesResponse = await fetch(aliasesEndpoint, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  let aliasRows = [];
  if (aliasesResponse.ok) {
    aliasRows = await aliasesResponse.json();
    if (!Array.isArray(aliasRows)) fail('campana_slug_alias_publico no devolvió una lista.');
  } else if (aliasesResponse.status !== 404) {
    fail(`campana_slug_alias_publico respondió ${aliasesResponse.status}: ${await aliasesResponse.text()}`);
  }
  const aliasesById = new Map();
  for (const row of aliasRows) {
    const id = String(row.campana_producto_id || '').toLowerCase();
    const alias = text(row.slug_anterior).toLowerCase();
    const actual = text(row.slug_actual).toLowerCase();
    if (!UUID_RE.test(id) || !SLUG_RE.test(alias) || !SLUG_RE.test(actual) || alias === actual) {
      fail('campana_slug_alias_publico devolvió una fila inválida.');
    }
    if (!aliasesById.has(id)) aliasesById.set(id, new Set());
    aliasesById.get(id).add(alias);
  }

  const currentIds = new Set();
  const products = rows.map((row) => {
    const id = String(row.id || '').toLowerCase();
    if (currentIds.has(id)) fail(`catalogo_publico repitió el UUID ${id}.`);
    currentIds.add(id);
    const product = normalizeProduct(row, previousById.get(id));
    const serverAliases = aliasesById.get(id);
    if (serverAliases) product.aliases = [...new Set([...product.aliases, ...serverAliases])].sort();
    return product;
  });
  for (const old of oldCatalog.productos) {
    if (!currentIds.has(old.id)) products.push({ ...old, retirado: true });
  }
  products.sort((a, b) => Number(a.retirado) - Number(b.retirado) || a.orden - b.orden || a.slug.localeCompare(b.slug));
  const catalog = { version: 1, politicas: oldCatalog.politicas, productos: products };
  validateCatalog(catalog);
  await writeFile(CATALOGO_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
  return { catalog, config };
}

function seoBlock(product, image, indexable) {
  const canonical = `${SITE_URL}/producto/${product.slug}/`;
  const title = `${product.nombre} · MAGANDHI`;
  const description = seoDescription(product);
  const robotsValue = indexable ? 'index,follow' : 'noindex,follow';
  const structured = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nombre,
    description,
    image: [image],
    url: canonical,
  };
  return `${SEO_START}
<title data-producto-seo="title">${html(title)}</title>
<meta name="description" data-producto-seo="description" content="${html(description)}">
<!-- El gate editorial y el sitemap comparten producto/catalogo-seo.json. -->
<meta name="robots" content="${robotsValue}">
<link rel="canonical" data-producto-seo="canonical" href="${html(canonical)}">
<meta property="og:type" data-producto-seo="og-type" content="product">
<meta property="og:site_name" content="MAGANDHI">
<meta property="og:locale" content="es_CO">
<meta property="og:title" data-producto-seo="og-title" content="${html(title)}">
<meta property="og:description" data-producto-seo="og-description" content="${html(description)}">
<meta property="og:url" data-producto-seo="og-url" content="${html(canonical)}">
<meta property="og:image" data-producto-seo="og-image" content="${html(image)}">
<meta property="og:image:secure_url" data-producto-seo="og-image-secure" content="${html(image)}">
<meta property="og:image:alt" data-producto-seo="og-image-alt" content="${html(product.nombre)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" data-producto-seo="twitter-title" content="${html(title)}">
<meta name="twitter:description" data-producto-seo="twitter-description" content="${html(description)}">
<meta name="twitter:image" data-producto-seo="twitter-image" content="${html(image)}">
<meta name="twitter:image:alt" data-producto-seo="twitter-image-alt" content="${html(product.nombre)}">
<script type="application/ld+json" id="mg-producto-jsonld">${jsonLd(structured)}</script>
${SEO_END}`;
}

function productShell(template, product, supabaseUrl, indexable) {
  const image = publicImage(product, supabaseUrl);
  let output = template.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!-- ${GENERATED_MARKER}: shell completo derivado de producto/index.html; no editar. -->`);
  output = replaceRegion(output, SEO_START, SEO_END, seoBlock(product, image, indexable), 'SEO de producto');
  output = replaceOnce(
    output,
    '<body data-producto-id="" data-producto-slug="">',
    `<body data-producto-id="${html(product.id)}" data-producto-slug="${html(product.slug)}">`,
    'dataset del body',
  );
  output = replaceOnce(output, '<h1 class="mg-titulo" id="mg-titulo">Producto</h1>', `<h1 class="mg-titulo" id="mg-titulo">${html(product.nombre)}</h1>`, 'H1 inicial');
  output = replaceOnce(output, '<p class="mg-sub" id="mg-sub">Cargando información del producto…</p>', `<p class="mg-sub" id="mg-sub">${html(product.subtitulo)}</p>`, 'subtítulo inicial');
  output = replaceOnce(output, '<span id="mg-miga-nom">Producto</span>', `<span id="mg-miga-nom">${html(product.nombre)}</span>`, 'miga inicial');
  output = replaceOnce(
    output,
    '      <div class="mg-foto__contenido" id="mg-foto-contenido" aria-live="polite">\n        <div class="mg-foto__ph">\n          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>\n          Imagen no disponible\n        </div>\n      </div>',
    `      <div class="mg-foto__contenido" id="mg-foto-contenido" aria-live="polite">\n        <img class="mg-foto__img" src="${html(image)}" alt="${html(product.nombre)}" decoding="async" fetchpriority="high">\n      </div>`,
    'imagen inicial',
  );
  output = replaceOnce(
    output,
    '<p class="mg-desc" id="mg-desc" hidden></p>',
    product.descripcion
      ? `<p class="mg-desc" id="mg-desc">${html(product.descripcion)}</p>`
      : '<p class="mg-desc" id="mg-desc" hidden></p>',
    'descripción inicial',
  );
  return output;
}

function aliasShell(alias, currentSlug) {
  const destination = `/producto/${currentSlug}/`;
  const canonical = `${SITE_URL}${destination}`;
  return `<!DOCTYPE html>
<!-- ${GENERATED_MARKER}: alias; no editar. -->
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Redirigiendo… · MAGANDHI</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${html(canonical)}">
<meta http-equiv="refresh" content="0; url=${html(destination)}">
<script>location.replace(${JSON.stringify(destination)} + location.search + location.hash);</script>
</head>
<body><p>Este producto cambió de dirección. <a href="${html(destination)}">Continuar a MAGANDHI</a>.</p></body>
</html>
`;
}

function retiredShell(product, route) {
  return `<!DOCTYPE html>
<!-- ${GENERATED_MARKER}: producto retirado; no editar. -->
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Producto no disponible · MAGANDHI</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${SITE_URL}/producto/${html(route)}/">
</head>
<body><main><h1>Producto no disponible</h1><p>Este producto no está disponible por ahora.</p><p><a href="/">Ver productos en MAGANDHI</a></p></main></body>
</html>
`;
}

function sitemap(catalog) {
  const productUrls = catalog.politicas === 'publicada'
    ? catalog.productos
      .filter((product) => !product.retirado)
      .map((product) => `${SITE_URL}/producto/${product.slug}/`)
    : [];
  const urls = [SITE_URL + '/', SITE_URL + '/categorias/', ...productUrls];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${xml(url)}</loc></url>`).join('\n')}
</urlset>
`;
}

function robots() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
}

async function expectedOutputs(catalog, config) {
  validateCatalog(catalog);
  const template = await readFile(TEMPLATE_PATH, 'utf8');
  const outputs = new Map();
  const indexable = catalog.politicas === 'publicada';
  for (const product of catalog.productos) {
    const routes = [product.slug, ...(product.aliases || [])];
    if (product.retirado) {
      for (const route of routes) outputs.set(`producto/${route}/index.html`, retiredShell(product, route));
      continue;
    }
    outputs.set(`producto/${product.slug}/index.html`, productShell(template, product, config.url, indexable));
    for (const alias of product.aliases || []) {
      outputs.set(`producto/${alias}/index.html`, aliasShell(alias, product.slug));
    }
  }
  outputs.set('sitemap.xml', sitemap(catalog));
  outputs.set('robots.txt', robots());
  return outputs;
}

async function safeWrite(relative, content) {
  const target = path.join(ROOT, relative);
  if (!target.startsWith(ROOT + path.sep)) fail(`Ruta de salida insegura: ${relative}.`);
  await mkdir(path.dirname(target), { recursive: true });
  if (await exists(target)) {
    const current = await readFile(target, 'utf8');
    const generated = current.includes(GENERATED_MARKER);
    const historicalGrisi = relative === 'producto/grisi-manzanilla-gold/index.html' &&
      current.includes('MAGANDHI · Redirect de compatibilidad.');
    const rootArtifact = relative === 'sitemap.xml' || relative === 'robots.txt';
    if (!generated && !historicalGrisi && !rootArtifact && current !== content) {
      fail(`Se rechazó sobrescribir ${relative}: no tiene marcador generado.`);
    }
    if (current === content) return false;
  }
  await writeFile(target, content, 'utf8');
  return true;
}

async function generate(catalog, config) {
  const outputs = await expectedOutputs(catalog, config);
  let changed = 0;
  for (const [relative, content] of outputs) {
    if (await safeWrite(relative, content)) changed += 1;
  }
  return { total: outputs.size, changed };
}

async function check(catalog, config) {
  const outputs = await expectedOutputs(catalog, config);
  const drift = [];
  for (const [relative, expected] of outputs) {
    const target = path.join(ROOT, relative);
    if (!(await exists(target))) {
      drift.push(`${relative}: falta`);
      continue;
    }
    const current = await readFile(target, 'utf8');
    if (current !== expected) drift.push(`${relative}: desactualizado`);
  }
  // No se borran directorios. Sí se detecta cualquier shell previamente
  // generado que ya no esté gobernado por catálogo/aliases para evitar deriva.
  const productEntries = await readdir(path.join(ROOT, 'producto'), { withFileTypes: true });
  for (const entry of productEntries) {
    if (!entry.isDirectory()) continue;
    const relative = `producto/${entry.name}/index.html`;
    const target = path.join(ROOT, relative);
    if (!(await exists(target))) continue;
    const current = await readFile(target, 'utf8');
    if (current.includes(GENERATED_MARKER) && !outputs.has(relative)) drift.push(`${relative}: generado sin catálogo`);
  }
  if (drift.length) fail(`Artefactos P1 fuera de sincronía:\n- ${drift.join('\n- ')}`);
  return outputs.size;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !['--sync', '--check'].includes(args[0]))) {
    fail('Uso: node scripts/generar-productos.mjs [--sync|--check]');
  }
  let catalog;
  let config;
  if (args[0] === '--sync') {
    ({ catalog, config } = await syncCatalog());
    const result = await generate(catalog, config);
    console.log(`Sincronizados ${catalog.productos.filter((item) => !item.retirado).length} productos; ${result.changed}/${result.total} artefactos escritos.`);
    return;
  }
  catalog = await readCatalog();
  config = await readPublicConfig();
  if (args[0] === '--check') {
    const total = await check(catalog, config);
    console.log(`P1 correcto: catálogo, ${total - 2} shells, sitemap.xml y robots.txt coinciden.`);
    return;
  }
  const result = await generate(catalog, config);
  console.log(`Generación P1 completa: ${result.changed}/${result.total} artefactos escritos.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
