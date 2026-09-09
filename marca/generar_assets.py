#!/usr/bin/env python3
"""
Genera los assets de marca del sitio a partir del icono original de MAGANDHI.

Origen: marca/91096c4c-...jpg (icono BLANCO sobre fondo ROJO, 1254 px).
Receta (documentada del proyecto): el alpha se saca del canal MINIMO(R,G,B)
normalizado, lo que aisla la tinta del icono sin arrastrar el halo rojo que
deja el antialiasing del JPG. Sobre ese alpha se recolorea el icono.

Salidas (en la raiz del repo):
  logo-mark.png         icono ROJO #D32F2F sobre transparente  (fondos claros)
  logo-mark-blanco.png  icono BLANCO sobre transparente         (fondos oscuros/rojos)
  favicon.png           96x96, icono rojo sobre transparente
  logo.png              512x512 app-icon: icono blanco sobre cuadrado rojo redondeado
"""
from PIL import Image, ImageDraw
import os

ORIGEN = "marca/91096c4c-581c-4b87-a1cd-2df1b0a0c450.jpg"
ROJO = (211, 47, 47)      # #D32F2F  Rojo Magandhi (Pantone 186 C)
BLANCO = (255, 255, 255)

# --- 1. cargar y construir la mascara alpha del icono (el trazo blanco) ---
src = Image.open(ORIGEN).convert("RGB")
r, g, b = src.split()

# El icono es BLANCO (los tres canales altos) sobre ROJO (R alto, G/B bajos).
# El canal MINIMO(R,G,B) es alto solo donde hay blanco -> aisla el trazo.
px_r, px_g, px_b = r.load(), g.load(), b.load()
W, H = src.size
alpha = Image.new("L", (W, H), 0)
pa = alpha.load()
LO, HI = 60, 210  # umbrales de normalizacion del trazo
for y in range(H):
    for x in range(W):
        m = min(px_r[x, y], px_g[x, y], px_b[x, y])
        if m <= LO:
            v = 0
        elif m >= HI:
            v = 255
        else:
            v = int((m - LO) * 255 / (HI - LO))
        pa[x, y] = v

# --- 2. recortar al bounding box del icono + aire cuadrado ---
bbox = alpha.getbbox()
alpha = alpha.crop(bbox)
w, h = alpha.size
lado = int(max(w, h) * 1.20)  # 10% de aire por lado
cuadro = Image.new("L", (lado, lado), 0)
cuadro.paste(alpha, ((lado - w) // 2, (lado - h) // 2))
alpha = cuadro


def icono_coloreado(color, tam=None):
    a = alpha if tam is None else alpha.resize((tam, tam), Image.LANCZOS)
    out = Image.new("RGBA", a.size, color + (0,))
    solido = Image.new("RGBA", a.size, color + (255,))
    out = Image.composite(solido, out, a)
    return out


# --- 3. salidas ---
icono_coloreado(ROJO).save("logo-mark.png")
icono_coloreado(BLANCO).save("logo-mark-blanco.png")
icono_coloreado(ROJO, 96).save("favicon.png")

# app-icon: cuadrado rojo con esquinas redondeadas + icono blanco centrado
TAM = 512
radio = 96
mask = Image.new("L", (TAM, TAM), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, TAM, TAM], radius=radio, fill=255)
tile = Image.new("RGBA", (TAM, TAM), (0, 0, 0, 0))
fondo = Image.new("RGBA", (TAM, TAM), ROJO + (255,))
tile = Image.composite(fondo, tile, mask)
ic = icono_coloreado(BLANCO, int(TAM * 0.62))
off = (TAM - ic.size[0]) // 2
tile.alpha_composite(ic, (off, off))
tile.save("logo.png")

for f in ("logo-mark.png", "logo-mark-blanco.png", "favicon.png", "logo.png"):
    print(f, os.path.getsize(f), "bytes", Image.open(f).size)
