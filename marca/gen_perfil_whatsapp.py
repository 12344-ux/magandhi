#!/usr/bin/env python3
"""Genera los perfiles cuadrados de MAGANDHI desde el SVG oficial.

Seis combinaciones de tinta y fondo con la paleta vigente, mas tres versiones
con fondo transparente para montar sobre cualquier superficie.

Los nombres de salida conservan "rojo" por compatibilidad historica, pero el
color real y vigente es TERRACOTA #A6332E. Ningun JPG historico interviene.

Uso, desde la raiz del repo:  python3 marca/gen_perfil_whatsapp.py
"""
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image

SVG = Path("marca/logo/logo-magandhi.svg")
SALIDA = Path("marca/perfil")

# Paleta vigente (marca/LEEME.md). "Blanco puro para superficies de producto".
TERRACOTA = (166, 51, 46)   # #A6332E
NEGRO = (17, 17, 17)        # #111111
BLANCO = (255, 255, 255)    # #FFFFFF

# 1024 y no 640: estos archivos ya no son solo para WhatsApp (que se conformaba
# con 640), sino para cualquier sitio. Un cuadrado de 1024 se reduce limpio a
# cualquier tamano, y al contrario no: ampliar pixela.
TAM = 1024

# El logo ocupa el 66 % del lienzo. No es estetica: WhatsApp e Instagram
# recortan la foto de perfil en CIRCULO, y el circulo inscrito en un cuadrado
# se come las esquinas. Con 66 % la silueta entra completa en el circulo y
# sigue centrada cuando el recorte es cuadrado.
OCUPACION = 0.66


# Se rasteriza grande y luego se reduce: recortar y reescalar desde 2048 da un
# borde mas limpio que pedirle a cairo el tamano final directamente.
RENDER = 2048


def silueta():
    """Rasteriza el SVG maestro y RECORTA su margen interno.

    El recorte importa: el lienzo del SVG mide 1254 pero la tinta solo ocupa
    1129x1005 dentro de el, con margenes DESIGUALES (62 izq, 63 der, 103 arriba,
    146 abajo). Sin recortar pasaban dos cosas: el logo salia mas pequeno de lo
    que dice OCUPACION (60 % de ancho y 53 % de alto en vez de 66 %) y quedaba
    descentrado hacia arriba, porque se centraba el LIENZO y no la silueta.
    """
    png = cairosvg.svg2png(url=str(SVG), output_width=RENDER, output_height=RENDER)
    im = Image.open(BytesIO(png)).convert("RGBA")
    return im.crop(im.getchannel("A").getbbox())


BASE = silueta()


def renderizar_logo(color):
    """Escala la silueta a la ocupacion pedida y la tine del color.

    El SVG es UN solo path solido, asi que tenir por canal alfa reproduce la
    silueta exacta sin tocar el vector ni depender de buscar y reemplazar un
    codigo de color dentro del XML.
    """
    caja = round(TAM * OCUPACION)
    ancho, alto = BASE.size
    escala = caja / max(ancho, alto)          # el lado largo manda: nunca se deforma
    icono = BASE.resize((round(ancho * escala), round(alto * escala)), Image.LANCZOS)
    alpha = icono.getchannel("A")
    solido = Image.new("RGBA", icono.size, color + (255,))
    vacio = Image.new("RGBA", icono.size, color + (0,))
    return Image.composite(solido, vacio, alpha)


def perfil(fondo, tinta, nombre):
    """fondo=None deja el fondo transparente."""
    relleno = (0, 0, 0, 0) if fondo is None else fondo + (255,)
    lienzo = Image.new("RGBA", (TAM, TAM), relleno)
    icono = renderizar_logo(tinta)
    posicion = ((TAM - icono.width) // 2, (TAM - icono.height) // 2)
    lienzo.alpha_composite(icono, posicion)
    destino = SALIDA / nombre
    destino.parent.mkdir(parents=True, exist_ok=True)
    lienzo.save(destino, optimize=True)
    kb = destino.stat().st_size / 1024
    print(f"  {destino}  {Image.open(destino).size[0]}x{Image.open(destino).size[1]}  {kb:.0f} KB")


print("Las seis combinaciones:")
perfil(TERRACOTA, NEGRO,     "perfil-negro-sobre-rojo.png")
perfil(NEGRO,     TERRACOTA, "perfil-rojo-sobre-negro.png")
perfil(NEGRO,     BLANCO,    "perfil-blanco-sobre-negro.png")
perfil(TERRACOTA, BLANCO,    "perfil-blanco-sobre-rojo.png")
perfil(BLANCO,    TERRACOTA, "perfil-rojo-sobre-blanco.png")
perfil(BLANCO,    NEGRO,     "perfil-negro-sobre-blanco.png")

print("Y con fondo transparente, para montar sobre cualquier superficie:")
perfil(None, TERRACOTA, "perfil-rojo-transparente.png")
perfil(None, NEGRO,     "perfil-negro-transparente.png")
perfil(None, BLANCO,    "perfil-blanco-transparente.png")
