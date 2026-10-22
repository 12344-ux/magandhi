# Imágenes de categorías de la portada

Esta carpeta reserva los recursos visuales del carril **«Explora por categoría»** de la portada móvil. Las imágenes son exclusivamente de presentación: no cambian filtros, pertenencia de productos, visibilidad, orden de negocio ni contratos de Supabase/SN1.

## Entrega solicitada

- **Una imagen por categoría**.
- Medida final: **800 × 800 px** (proporción `1:1`).
- Formato preferido: **WebP opaco**, perfil **sRGB**.
- Peso objetivo: **100 KB o menos** por archivo, sin degradación visible.
- Se aceptan originales JPG, PNG o WebP de mayor tamaño; antes de publicar se recortarán y optimizarán a esta especificación.
- Sin texto, logotipo, marcos, bordes, transparencia ni márgenes blancos.
- La imagen debe llegar a los cuatro bordes y funcionar con `object-fit: cover`.
- Mantener el protagonista dentro del **70 % central**. La franja inferior debe admitir un degradado oscuro y el nombre de la categoría.
- Evitar collages, fondos de catálogo, saturación excesiva y stock genérico. La dirección debe sentirse cálida, boutique, cercana y curada.

## Nombres de archivo

Usar el código estable de la categoría en minúsculas:

- `categoria-navidad-v1.webp`
- `categoria-tecnologia-v1.webp`
- `categoria-moda-v1.webp`
- `categoria-hogar-v1.webp`
- `categoria-deportes-v1.webp`
- `categoria-belleza-v1.webp`
- `categoria-accesorios-v1.webp`
- `categoria-mascotas-v1.webp`
- `categoria-jugueteria-v1.webp`

Para una categoría nueva: `categoria-{codigo}-v1.webp`. Nunca se sobrescribe un recurso publicado: la siguiente versión será `v2`, `v3`, etc.

## Tratamiento previsto en móvil

- Fotografía a sangre dentro de la tarjeta, sin caja blanca interior.
- Recorte mediante `object-fit: cover`.
- Nombre en HTML sobre un velo inferior, nunca incrustado en la imagen.
- Radio, borde, foco y sombra siguen perteneciendo al componente MAGANDHI.
- El ícono SVG actual permanece como respaldo si una imagen falta o no carga.
- «Más categorías» conserva su tratamiento gráfico actual y no necesita fotografía.

## Paleta estructural MAGANDHI

- Terracota principal: `#A6332E`
- Terracota oscuro: `#7A2A26`
- Terracota profundo: `#5C1F1C`
- Negro: `#111111`
- Tinta: `#1C1C1C`
- Ámbar: `#C28A3A`
- Ámbar claro: `#D9AE6E`
- Arena de página: `#EFE7DD`
- Crema: `#FAF6F1`
- Blanco de superficie: `#FFFFFF`
- Gris secundario: `#6B6660`

Las fotografías pueden conservar colores naturales, pero deben compartir temperatura cálida, contraste moderado y una edición coherente. La interfaz seguirá usando terracota como color principal y ámbar solo como acento.

## Contratos que no se alteran

- Una categoría temporal visible continúa apareciendo antes de las permanentes.
- Ocultar una temporada la retira de la navegación sin borrar asociaciones ni productos.
- Se conserva la selección, deduplicación, límite y destino de cada enlace actuales.
- No se cambia `componentes/motor-tienda.js`, ningún `data-sn-*`, ranking, disponibilidad ni telemetría.
- El mapeo visual se hará por `categoria.codigo`; nunca por posición en pantalla.
