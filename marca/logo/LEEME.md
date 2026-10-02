# Logo oficial de MAGANDHI

Esta carpeta guarda el **logo vectorial** de la tienda (la fuente de todos los íconos).

## Archivos

- **`logo-magandhi.svg`** — el logo oficial, color de marca **terracota `#A6332E`**.
  Es la FUENTE: de aquí se generan todos los PNG del sitio.
- `Rebranding Magandhi.svg` — el vector original tal como se subió (venía en
  `#A8332C`). Se conserva como referencia; el que manda es `logo-magandhi.svg`.

## Cómo regenerar los íconos del sitio

Si se edita el logo o su color, se vuelven a generar los PNG corriendo, **desde la
raíz del repo**:

```
pip install cairosvg Pillow
python3 marca/generar_assets.py
```

Eso regenera, con el mismo nombre/tamaño que usa la tienda:
`favicon.png`, `icono-app-180.png`, `icono-app.png`, `logo.png` y
`logo-mark-terracota.png`.

> Al cambiar los íconos, subir el `?v=N` en los `<link>` de `index.html`,
> `producto/index.html` y en `site.webmanifest` para que los navegadores dejen de
> servir la versión cacheada vieja.
