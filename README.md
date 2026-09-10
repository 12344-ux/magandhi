# MAGANDHI

**Tienda online** — sitio estático publicado con GitHub Pages en **[magandhi.com](https://magandhi.com)**.

Una tienda con productos **escogidos uno a uno**: cada cosa que se ofrece fue revisada por el equipo
antes de ofrecerla. Transparencia, calidad y curaduría — lo opuesto a un marketplace masivo.

## Estado

En construcción. Hoy vive el **hero/portada** con el producto destacado y los canales de contacto.
Pendiente principal: la **página de producto real**.

## Estructura

- `index.html` — hero/portada de la tienda (CSS autocontenido, prefijo `hg-`).
- `marca.css` — tokens de color de la marca (paleta "terracota"), fuente única de color.
- `CNAME` — dominio `magandhi.com`.
- `site.webmanifest` — íconos de app.
- `productos/` — imágenes de producto.
- `marca/` — assets de marca (logo, fotos de perfil) y scripts fuente para generarlos.

## Documentación interna

- **`CONTEXTO-MAGANDHI.md`** — estado real, decisiones, marca, canales, pendientes y reglas de
  trabajo. **Leer primero** antes de hacer cualquier cambio.

## Reglas rápidas

- Nunca push directo a `main`: rama nueva → Pull Request → merge.
- CSS autocontenido por página; enlazar `marca.css` para la paleta.
- Verificar de verdad (render sin errores, DNS, etc.) antes de dar algo por listo.
