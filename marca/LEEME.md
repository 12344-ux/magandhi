# Marca MAGANDHI · inventario vigente

Esta carpeta conserva las fuentes oficiales y la procedencia histórica de la marca de la tienda pública.

## Fuente de verdad actual

- `logo/logo-magandhi.svg`: **logo maestro oficial**. Es el único origen para regenerar íconos.
- `generar_assets.py`: genera desde el SVG los PNG servidos por la web.
- `../marca.css`: paleta ejecutable vigente de `magandhi.com`.
- `../.kiro/steering/estandar-banners-magandhi.md`: reglas de campañas y banners.

Paleta comercial vigente:

- terracota `#A6332E`;
- negro `#111111`;
- dorado `#C28A3A`;
- fondo arena `#EFE7DD`;
- blanco puro para superficies de producto.

## Derivados públicos

El generador produce en la raíz:

- `logo-mark-terracota.png` — marca del header/footer;
- `logo.png` — imagen social;
- `favicon.png` — pestaña;
- `icono-app-180.png` e `icono-app.png` — accesos directos/PWA.

Los derivados no se editan a mano. Si cambia el SVG, se regenera el conjunto y se incrementa su versión de caché en todas las referencias.

## Perfiles externos

- `gen_perfil_whatsapp.py`: genera las variantes cuadradas para WhatsApp, Instagram y cualquier otro canal, desde el logo oficial.
- `perfil/`: entregables de perfil para canales externos; no aparecen como `<img>` en la web y eso no los convierte en archivos huérfanos.

**Nueve archivos, todos 1024×1024 PNG.** Seis combinaciones de tinta y fondo:

| Archivo | Fondo | Tinta |
|---|---|---|
| `perfil-negro-sobre-rojo.png` | terracota `#A6332E` | negro `#111111` |
| `perfil-rojo-sobre-negro.png` | negro `#111111` | terracota `#A6332E` |
| `perfil-blanco-sobre-negro.png` | negro `#111111` | blanco `#FFFFFF` |
| `perfil-blanco-sobre-rojo.png` | terracota `#A6332E` | blanco `#FFFFFF` |
| `perfil-rojo-sobre-blanco.png` | blanco `#FFFFFF` | terracota `#A6332E` |
| `perfil-negro-sobre-blanco.png` | blanco `#FFFFFF` | negro `#111111` |

Y tres con fondo transparente, para montar sobre cualquier superficie: `perfil-rojo-transparente.png`, `perfil-negro-transparente.png`, `perfil-blanco-transparente.png`.

Los nombres conservan «rojo» por compatibilidad histórica; el color real y vigente es **terracota**.

### Las dos decisiones del generador

**1024 y no 640.** El tamaño anterior se eligió pensando solo en WhatsApp. Un cuadrado de 1024 se reduce limpio a cualquier destino, y al contrario no: ampliar pixela.

**El logo ocupa el 66 % del lienzo, medido sobre la tinta y no sobre el lienzo del SVG.** WhatsApp e Instagram recortan la foto de perfil en **círculo**, y el círculo inscrito en un cuadrado se come las esquinas. Con el 66 % la silueta queda a 451 px del centro en su punto más lejano, contra un radio de 512: **11,9 % de margen**.

El recorte previo a la tinta importa y no es cosmético. El lienzo del SVG mide 1254 px pero la silueta solo ocupa 1129×1005 dentro de él, con márgenes **desiguales** (62 izq, 63 der, 103 arriba, 146 abajo). Centrando el lienzo en vez de la silueta, el logo salía más pequeño de lo que decía la constante (60 % de ancho y 53 % de alto) **y descentrado hacia arriba**. Ahora los márgenes del resultado son 174/176 y 212/212.

### Regenerarlos

```
pip install cairosvg pillow
python3 marca/gen_perfil_whatsapp.py      # desde la raíz del repo
```

Si cambia el SVG maestro, se regeneran los nueve de una vez. No se editan a mano.

## Archivos históricos

- `91096c4c-581c-4b87-a1cd-2df1b0a0c450.jpg`
- `9831d0a9-a7b7-4dc8-91f9-d514e254c025.jpg`

Son referencias de procedencia anteriores a la identidad terracota vigente. **No son fuente de verdad, no se sirven en la tienda y no deben usarse para generar nuevos assets.** Se conservan únicamente como memoria del proceso; Git permite retirarlos en una limpieza futura si el dueño decide que ya no aportan evidencia.
