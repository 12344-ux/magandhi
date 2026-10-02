# Banners de la tienda MAGANDHI

Esta carpeta contiene las imágenes del carrusel principal del home. En esta primera
versión son **fondos temporales de presentación**; después se reemplazarán por las
fotografías y campañas reales.

## Dos recortes por banner

Cada diapositiva usa dos archivos del mismo concepto:

| Uso | Medida recomendada | Proporción | Ejemplo |
|---|---:|---:|---|
| Escritorio / PC | **1600 × 600 px** | 8:3 (2,67:1) | `banner-1-pc.jpg` |
| Teléfono / móvil | **1080 × 1080 px** | 1:1 | `banner-1-movil.jpg` |

El navegador selecciona automáticamente el archivo correcto según el ancho de la
pantalla. Así evitamos que una fotografía horizontal quede mutilada en un teléfono o
que un recorte cuadrado desperdicie espacio en PC.

## Cómo preparar los dos recortes correctamente

1. Parte de una misma fotografía de buena calidad.
2. Crea primero el recorte **1600 × 600**: deja el sujeto principal preferiblemente
   hacia la derecha y aire a la izquierda para el texto.
3. Crea después el recorte **1080 × 1080**: recompón la escena para móvil; no te
   limites a cortar el centro automáticamente.
4. **No escribas texto dentro de la imagen.** El título, subtítulo, sello y botón se
   pintan como HTML en `index.html`: quedan nítidos, accesibles, editables y sin
   problemas de tildes.
5. Exporta en JPG/WebP optimizado. Como guía: intenta mantener cada archivo por debajo
   de 300 KB sin perder nitidez visible.

## Convención de nombres

Para cada diapositiva usa el mismo número o identificador:

```text
banner-1-pc.jpg
banner-1-movil.jpg
banner-2-pc.jpg
banner-2-movil.jpg
```

En `index.html`, cada `.hg-slide` declara ambas rutas mediante `data-pc` y
`data-movil`. Para agregar o cambiar una diapositiva hay que mantener esa pareja.

> La imagen comunica la campaña; los colores estructurales de la interfaz siempre
> siguen la marca MAGANDHI: terracota `#A6332E`, ámbar `#C28A3A`, blanco y neutros.
