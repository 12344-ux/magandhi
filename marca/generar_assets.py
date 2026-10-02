#!/usr/bin/env python3
"""
Genera los assets de marca de la tienda a partir del LOGO VECTORIAL de MAGANDHI.

Origen: marca/logo/logo-magandhi.svg
  · Silueta del bolso MAGANDHI (rebranding), un solo <path>.
  · Color de marca TERRACOTA #A6332E (el mismo de marca.css y theme-color).
  · viewBox cuadrado 1254x1254: ideal para favicon e iconos de app.

El SVG es la FUENTE. Estos PNG son derivados: para cambiar el logo o su color,
se edita el SVG y se vuelve a correr este script (requiere cairosvg + Pillow:
`pip install cairosvg Pillow`).

Salidas (en la raiz del repo), con el mismo nombre/tamano que usa el sitio:
  logo-mark-terracota.png  797x797  mark del header (home y producto), a sangre
  logo.png                 512x512  og:image para compartir (con aire)
  favicon.png               96x96   icono de la pestana
  icono-app-180.png        180x180  apple-touch-icon (acceso directo iOS)
  icono-app.png            512x512  icono PWA 'any maskable' (safe zone ~18%)
"""
import io
import os

import cairosvg
from PIL import Image

SVG = "marca/logo/logo-magandhi.svg"


def render(size, pad_ratio=0.0):
    """Rasteriza el SVG a 'size' px, con un padding transparente opcional
    (ratio del lado por cada borde). El padding deja 'aire' para los iconos
    que el sistema recorta (favicon, apple-touch, maskable)."""
    inner = int(round(size * (1 - 2 * pad_ratio)))
    png_bytes = cairosvg.svg2png(url=SVG, output_width=inner, output_height=inner)
    glyph = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.alpha_composite(glyph, (off, off))
    return canvas


# --- salidas (padding elegido por el uso de cada icono) ---
render(797, pad_ratio=0.00).save("logo-mark-terracota.png")  # header: a sangre
render(512, pad_ratio=0.10).save("logo.png")                 # og:image: respira
render(96,  pad_ratio=0.08).save("favicon.png")              # pestana: algo de aire
render(180, pad_ratio=0.14).save("icono-app-180.png")        # apple-touch (iOS)
render(512, pad_ratio=0.18).save("icono-app.png")            # maskable: safe zone

for f in ("logo-mark-terracota.png", "logo.png", "favicon.png",
          "icono-app-180.png", "icono-app.png"):
    print(f, os.path.getsize(f), "bytes", Image.open(f).size)
