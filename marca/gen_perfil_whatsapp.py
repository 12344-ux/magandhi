#!/usr/bin/env python3
"""Genera 2 variantes de foto de perfil para WhatsApp Business (640x640).
Misma receta que el ícono de acceso directo: aislar el trazo del logo con el
canal mínimo y recolorear limpio, sobre un fondo de color lleno.

  perfil-negro-sobre-rojo.png   -> ícono NEGRO sobre fondo TERRACOTA
  perfil-rojo-sobre-negro.png   -> ícono TERRACOTA sobre fondo NEGRO
"""
from PIL import Image

ORIGEN = "marca/91096c4c-581c-4b87-a1cd-2df1b0a0c450.jpg"
TERRACOTA = (166, 51, 46)   # #A6332E  (paleta nueva de marca)
NEGRO = (17, 17, 17)        # #111111
TAM = 640

# --- máscara alpha del trazo (canal mínimo aísla el ícono sin halo) ---
src = Image.open(ORIGEN).convert("RGB")
r, g, b = src.split()
pr, pg, pb = r.load(), g.load(), b.load()
W, H = src.size
alpha = Image.new("L", (W, H), 0)
pa = alpha.load()
LO, HI = 60, 210
for y in range(H):
    for x in range(W):
        m = min(pr[x, y], pg[x, y], pb[x, y])
        pa[x, y] = 0 if m <= LO else (255 if m >= HI else int((m-LO)*255/(HI-LO)))
alpha = alpha.crop(alpha.getbbox())


def icono(color, tam, aire=1.55):
    """Ícono coloreado, centrado, con 'aire' alrededor (WhatsApp recorta en círculo)."""
    w, h = alpha.size
    lado = int(max(w, h) * aire)
    cuadro = Image.new("L", (lado, lado), 0)
    cuadro.paste(alpha, ((lado-w)//2, (lado-h)//2))
    a = cuadro.resize((tam, tam), Image.LANCZOS)
    out = Image.new("RGBA", (tam, tam), color + (0,))
    sol = Image.new("RGBA", (tam, tam), color + (255,))
    return Image.composite(sol, out, a)


def perfil(fondo, tinta, nombre):
    lienzo = Image.new("RGBA", (TAM, TAM), fondo + (255,))
    ic = icono(tinta, TAM)
    lienzo.alpha_composite(ic)
    # WhatsApp muestra la foto en círculo: exportamos cuadrada, el fondo lleno
    # asegura que el círculo quede completamente del color (sin esquinas vacías).
    lienzo.convert("RGB").save(nombre, quality=95)
    print(nombre, "->", Image.open(nombre).size)


# (a) ícono negro sobre fondo terracota
perfil(TERRACOTA, NEGRO, "perfil-negro-sobre-rojo.png")
# (b) ícono terracota sobre fondo negro
perfil(NEGRO, TERRACOTA, "perfil-rojo-sobre-negro.png")
