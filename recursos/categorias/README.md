# Banner de la página de categorías

Fondos del banner superior de `/categorias/`. Son solo presentación: no cambian categorías, productos, filtros ni contratos de Supabase/SN1.

## Brief para quien hace las imágenes

Son 2 imágenes del mismo concepto, compuestas por separado (la de celular no es un recorte de la de computador).

**1. Computador: 1600 × 400 px (4:1)**
- Mitad izquierda tranquila, sin objetos y algo más oscura: ahí va el texto en blanco.
- El protagonista va en el 45 % derecho.
- Nada importante a menos de 60 px de los bordes.

**2. Celular: 1080 × 720 px (3:2)**
- El 60 % izquierdo queda tranquilo para el texto.
- El protagonista va en el 40 % derecho, con unos 50 px libres arriba y abajo.

**Estilo**
- La misma familia de las fotos de categorías: pared terracota, arco crema, luz cálida de estudio y bodegón cuidado.
- El protagonista es un solo bodegón que reúne pocas piezas de varias categorías (por ejemplo un regalo, unos audífonos, un bolso y una planta), agrupadas como una escena. No un collage ni un catálogo.
- El arco crema va detrás del protagonista, a la derecha, nunca detrás del texto.
- El fondo dominante es terracota o negro, nunca arena o crema, porque se confunde con el fondo de la página.
- Sin texto, logotipos, marcas visibles (Nike, Apple…) ni marcas de agua.
- Contraste moderado, sin saturación excesiva.

**Entrega**
- JPG, PNG o WebP en sRGB. Puede ser más grande si conserva la proporción.
- Si la herramienta no permite 4:1, generar en 21:9 o 16:9 con el protagonista en la franja horizontal central (se recorta arriba y abajo).
- Subir aquí: https://github.com/12344-ux/magandhi/upload/design/pagina-categorias/recursos/categorias

## Cómo se ve en la página

| Pantalla | Archivo publicado | Caja aproximada |
|---|---|---|
| PC | `cabecera-categorias-v1-pc.webp` | 1152 × 288 px a 1280 px de pantalla |
| Móvil | `cabecera-categorias-v1-movil.webp` | 351 × 234 px a 390 px de pantalla |

- El texto va siempre en HTML: sello «Selección MAGANDHI», título «Explora a tu manera» (o el nombre de la categoría elegida) y una frase de apoyo. El mismo banner sirve para la vista general y para cada categoría.
- Los originales pueden subirse con cualquier nombre; se recortan y exportan a WebP sRGB de 300 KB o menos.
- Un archivo publicado nunca se sobrescribe: la siguiente versión sube a `v2`.

## Archivos publicados (v1 · 22-oct-2026)

Originales PNG del commit `5680f60` (PC 1983 × 793, móvil 1536 × 1024), exportados a WebP sRGB:

- `cabecera-categorias-v1-pc.webp` (1600 × 400, ≈ 32 KB): el original era 2.5:1; se llegó a 4:1 extendiendo hacia la izquierda solo la pared lisa, sin tocar el bodegón, que empieza en el 66 % del ancho.
- `cabecera-categorias-v1-movil.webp` (1080 × 720, ≈ 35 KB): el bodegón se redujo al 84 % y se corrió a la derecha (empieza en el 53 %) para que el texto tenga libre la mitad izquierda.
- Título del banner (HTML): «En MAGANDHI siempre hay algo nuevo por descubrir»; al elegir una categoría muestra su nombre y descripción.
