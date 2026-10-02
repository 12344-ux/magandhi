# Banners de la tienda MAGANDHI

Esta carpeta contiene las imágenes de los espacios promocionales del home. Cada
espacio tiene una geometría propia e inmutable. **PC y móvil son dos direcciones
de arte distintas**, no un recorte automático de una misma imagen.

## Perfiles exactos por espacio

| Espacio | PC | Móvil |
|---|---:|---:|
| Carrusel hero | **1600 × 600 px** · 8:3 | **1080 × 1080 px** · 1:1 |
| Banner Historia | **1600 × 478 px** · ≈3,35:1 | **1080 × 1854 px** · ≈0,583:1 |

Estas proporciones representan el espacio que ya ocupan los banners. Una campaña
se diseña para su espacio; nunca se cambia el espacio para acomodar la campaña.
En producción, a 1280px el hero se muestra en 1152×432 y el banner Historia en
aproximadamente 1152×344. A 390px se muestran en 351×351 y aproximadamente
351×602, respectivamente.

## Construcción correcta

1. Identifica primero el espacio que se va a reemplazar.
2. Diseña la composición PC en la medida exacta de ese espacio.
3. Recompón la misma idea para la medida móvil correspondiente. No cortes el
   centro automáticamente ni fuerces el formato del hero sobre Historia.
4. Deja el sujeto principal hacia la derecha y una zona tranquila para el texto.
5. No escribas copy dentro de la imagen. Título, subtítulo, sello y botón se
   mantienen en HTML: nítidos, accesibles y editables.
6. Exporta en JPG/WebP optimizado, sRGB y por debajo de 300KB cuando sea posible.
7. Ningún archivo puede superar 2000px en alguna dimensión.

## Superficies cromáticas de banner

Los banners deben distinguirse inequívocamente del fondo arena real de la página
`#EFE7DD`. Las superficies base aprobadas son:

- terracota MAGANDHI: gradiente de `#79211F` a `#A6332E`;
- negro profundo: gradiente de `#111111` a `#1D1D1D`.

Crema `#FAF6F1`, tarjeta `#F2ECE4` y arena `#EFE7DD` no se usan como superficie
dominante de banner porque se confunden con la interfaz. Blanco y ámbar
`#C28A3A` quedan para texto, sellos, CTA y detalles pequeños.

## Archivos actuales

```text
banner-1-pc.jpg                       1600×600
banner-1-movil.jpg                    1080×1080
banner-curaduria-v2-pc.jpg            1600×600
banner-curaduria-v2-movil.jpg         1080×1080
banner-historia-v2-pc.jpg             1600×478
banner-historia-v2-movil.jpg          1080×1854
```

El carrusel declara su pareja mediante `data-pc` y `data-movil`. Historia cambia
su pareja desde CSS en el mismo breakpoint de `760px`. Aunque dos piezas compartan
lenguaje visual, conservan archivos independientes para evitar acoplamientos.

La especificación completa de comunicación, proceso y control de calidad vive en
`.kiro/steering/estandar-banners-magandhi.md`.
