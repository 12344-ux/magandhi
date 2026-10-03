# Logo oficial de MAGANDHI

## Fuente maestra

`logo-magandhi.svg` es el logo vectorial oficial y vigente de MAGANDHI. Usa terracota `#A6332E` sobre transparencia y es la única fuente autorizada para generar derivados.

No existe otro SVG maestro en esta carpeta. Los JPG históricos de `marca/` documentan etapas anteriores, pero no sustituyen este archivo.

## Regenerar los assets públicos

Desde la raíz del repositorio:

```bash
python3 -m pip install CairoSVG Pillow
python3 marca/generar_assets.py
```

El script genera, con dimensiones estables:

- `logo-mark-terracota.png` — 797×797;
- `logo.png` — 512×512;
- `favicon.png` — 96×96;
- `icono-app-180.png` — 180×180;
- `icono-app.png` — 512×512.

Después de regenerar, verificar tamaños y actualizar `?v=N` en `index.html`, `producto/index.html` y `site.webmanifest`. No sobrescribir derivados publicados sin actualizar su versión de caché.
