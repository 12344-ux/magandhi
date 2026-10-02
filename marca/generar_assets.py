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
  logo-mark-terracota.png  797x797  mark del header (home y producto), a sangre,
                                    logo TERRACOTA sobre transparente
  logo.png                 512x512  og:image para compartir, logo terracota con aire
  favicon.png               96x96   icono de la pestana, logo terracota transparente
  icono-app-180.png        180x180  apple-touch (acceso directo iOS):
                                    logo BLANCO sobre cuadrado TERRACOTA solido
  icono-app.png            512x512  icono PWA 'any maskable':
                                    logo BLANCO sobre cuadrado TERRACOTA solido
                                    (safe zone: el logo ocupa ~62% centrado)

NOTA DE DISENO (pedido del dueno): los iconos de APP (icono-app* ) deben verse
como "una app bonita": LOGO BLANCO sobre FONDO TERRACOTA solido (no la silueta
terracota sobre transparente, que el sistema acababa poniendo sobre un fondo
ajeno —negro— al instalar el acceso directo). El favicon y el mark del header SI
van en terracota sobre transparente.
"""
import io
import os

import cairosvg
from PIL import Image

SVG = "marca/logo/logo-magandhi.svg"
TERRACOTA = (166, 51, 46)   # #A6332E, color de marca
BLANCO = (255, 255, 255)


def render_glyph(size, color=None):
    """Rasteriza el SVG a 'size' px. Si 'color' se indica, recolorea el logo a
    ese color (conservando el alpha del trazo); si no, deja el color del SVG
    (terracota)."""
    png_bytes = cairosvg.svg2png(url=SVG, output_width=size, output_height=size)
    glyph = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    if color is None:
        return glyph
    # Recolorea: pinta 'color' usando el alpha del logo como mascara.
    solido = Image.new("RGBA", glyph.size, color + (255,))
    out = Image.new("RGBA", glyph.size, color + (0,))
    _, _, _, a = glyph.split()
    out = Image.composite(solido, out, a)
    return out


def logo_transparente(size, pad_ratio=0.0, color=None):
    """Logo (del color dado o terracota) centrado sobre fondo TRANSPARENTE,
    con un padding opcional (ratio del lado por borde)."""
    inner = int(round(size * (1 - 2 * pad_ratio)))
    glyph = render_glyph(inner, color)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.alpha_composite(glyph, (off, off))
    return canvas


def icono_app(size, logo_ratio=0.62):
    """Icono de APP: cuadrado TERRACOTA solido con el LOGO BLANCO centrado.
    'logo_ratio' = cuanto del lado ocupa el logo (deja aire alrededor para que
    se vea como una app y respete la safe zone del maskable)."""
    canvas = Image.new("RGBA", (size, size), TERRACOTA + (255,))
    inner = int(round(size * logo_ratio))
    glyph = render_glyph(inner, BLANCO)
    off = (size - inner) // 2
    canvas.alpha_composite(glyph, (off, off))
    return canvas


# --- salidas ---
# Mark del header y favicon: logo TERRACOTA sobre transparente.
logo_transparente(797, pad_ratio=0.00).save("logo-mark-terracota.png")  # header a sangre
logo_transparente(512, pad_ratio=0.10).save("logo.png")                 # og:image con aire
logo_transparente(96,  pad_ratio=0.08).save("favicon.png")              # pestana

# Iconos de APP: logo BLANCO sobre fondo TERRACOTA solido ("app bonita").
icono_app(180, logo_ratio=0.60).save("icono-app-180.png")  # apple-touch (iOS)
icono_app(512, logo_ratio=0.62).save("icono-app.png")      # PWA maskable

for f in ("logo-mark-terracota.png", "logo.png", "favicon.png",
          "icono-app-180.png", "icono-app.png"):
    print(f, os.path.getsize(f), "bytes", Image.open(f).size)
