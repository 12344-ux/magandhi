#!/usr/bin/env python3
"""Genera dos perfiles 640×640 desde el SVG oficial de MAGANDHI.

Los nombres de salida conservan "rojo" por compatibilidad histórica, pero el
color real y vigente es TERRACOTA #A6332E. Ningún JPG histórico interviene.
"""
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image

SVG = Path("marca/logo/logo-magandhi.svg")
SALIDA = Path("marca/perfil")
TERRACOTA = (166, 51, 46)  # #A6332E
NEGRO = (17, 17, 17)       # #111111
TAM = 640
OCUPACION = 0.66  # aire para el recorte circular de WhatsApp/Instagram


def renderizar_logo(color):
    """Rasteriza el SVG maestro y aplica el color conservando su alfa."""
    lado = round(TAM * OCUPACION)
    png = cairosvg.svg2png(url=str(SVG), output_width=lado, output_height=lado)
    fuente = Image.open(BytesIO(png)).convert("RGBA")
    alpha = fuente.getchannel("A")
    solido = Image.new("RGBA", fuente.size, color + (255,))
    vacio = Image.new("RGBA", fuente.size, color + (0,))
    return Image.composite(solido, vacio, alpha)


def perfil(fondo, tinta, nombre):
    lienzo = Image.new("RGBA", (TAM, TAM), fondo + (255,))
    icono = renderizar_logo(tinta)
    posicion = ((TAM - icono.width) // 2, (TAM - icono.height) // 2)
    lienzo.alpha_composite(icono, posicion)
    destino = SALIDA / nombre
    destino.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(destino, optimize=True)
    print(destino, "->", Image.open(destino).size)


perfil(TERRACOTA, NEGRO, "perfil-negro-sobre-rojo.png")
perfil(NEGRO, TERRACOTA, "perfil-rojo-sobre-negro.png")
