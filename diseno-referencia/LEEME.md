# Diseño de referencia — MAGANDHI (tienda pública)

> Carpeta de **memoria de diseño**. Guarda versiones de diseño APROBADAS por el
> dueño para poder volver a ellas en cualquier momento, con su contexto. No es
> código en producción: es la fotografía de "esto quedó aprobado y por qué".

## home-grid-color-categoria-APROBADO.html

**Qué es:** el home (`index.html`) rediseñado a **grid de 5 productos** con el
sistema **COLOR = CATEGORÍA**. Aprobado por el dueño ("quedó increíblemente
bien"). Copia congelada del diseño para poder restaurarlo si algo cambia y se
quiere regresar.

### El concepto (no negociable): COLOR = CATEGORÍA
- El color NO es decorativo por producto: es **semántico por categoría**. Cada
  categoría tiene UN color fijo de la familia MAGANDHI.
- Como en una página de producto solo hay un producto (de una categoría), esa
  página entera se "viste" de ese color → nunca arcoíris.
- En el home (grid), cada tarjeta lleva el color de su categoría; misma
  temperatura/saturación cálida = se lee "colección curada", no arcoíris.
- Es la **base visual del futuro software Campañas**: en Campañas se elegirá la
  categoría del producto, y ese dato (a) pinta la tarjeta del home, (b) viste la
  página de producto, y (c) alimenta un criterio de segmentación para el clúster.

### Paleta de categorías (tonos MAGANDHI, misma familia cálida)
Cada una: acento / claro / sombra (variables `--acento` / `--acento-cl` / `--acento-sombra`).

| Categoría | Color | acento | claro | sombra |
|---|---|---|---|---|
| Cuidado del cabello (Grisi, firma) | dorado | `#C9962E` | `#E7C56B` | `rgba(201,150,46,.18)` |
| Belleza femenina | rosa terroso | `#B5657A` | `#D99FAE` | `rgba(181,101,122,.16)` |
| Belleza masculina | grafito cálido | `#3A3A3A` | `#7A7A7A` | `rgba(58,58,58,.14)` |
| Cuidado personal/general | topo cálido | `#6E6A66` | `#A8A29C` | `rgba(110,106,102,.15)` |
| Hogar y limpieza | azul petróleo | `#3E6B78` | `#7FA6B0` | `rgba(62,107,120,.15)` |
| Alimentos/naturales | terracota tostado | `#C0682E` | `#E3A576` | `rgba(192,104,46,.16)` |
| Destacado/clásico | rojo-terracota | `#B23A2E` | `#D98A80` | `rgba(178,58,46,.15)` |

Cada tarjeta define su color con variables inline sobre `.hg-tarjeta`
(`style="--acento:#...;--acento-cl:#...;--acento-sombra:..."`). Cambiar esas 3
variables re-viste toda la tarjeta (panel de foto, borde, botón, kicker, medalla,
estrella).

### Comportamiento por pantalla
- **PC:** grid de tarjetas. Cada tarjeta = panel de color arriba (con foto o
  ícono placeholder) + texto abajo.
- **Móvil (≤760px):** tarjetas **horizontales apiladas** — cuadrito de color a la
  izquierda + texto a la derecha. El contorno se extiende en el color de la
  categoría. (Diseño pedido por el dueño en boceto.)
- **Producto estrella** (Grisi): lleva una ⭐ ADICIONAL a la medalla "Elegido por
  MAGANDHI", en la esquina superior.

### Productos de EJEMPLO (inventados para ver el sistema; se ajustan desde Campañas)
Solo el Grisi es real (con página en `producto/grisi-manzanilla-gold/`). Los otros
4 son de ejemplo y enlazan a `#`:
1. Sérum Facial de Rosa Mosqueta — belleza femenina (rosa)
2. Bálsamo para Barba de Cedro — belleza masculina (grafito)
3. Jabón de Coco para el Hogar — hogar/limpieza (azul)
4. Miel de Café Artesanal — alimentos/naturales (terracota)

### Historial de versiones del home
- **v1 (span destacado):** el Grisi iba más grande (2×2) que los demás. Aprobado
  como look, pero el dueño pidió después igualar todos al mismo tamaño.
- **v2 (tamaño uniforme):** todas las tarjetas del MISMO tamaño, en orden. (Esta
  es la versión que quedó tras el ajuste que pidió el dueño.)

> Cómo restaurar: si en el futuro se quiere volver a este look base, partir de
> esta copia. El sistema de color (variables) y el responsive móvil son la parte
> que NO se debe perder.
