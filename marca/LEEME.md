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

- `gen_perfil_whatsapp.py`: genera las variantes cuadradas para WhatsApp/Instagram desde el logo oficial.
- `perfil/`: entregables de perfil para canales externos; no aparecen como `<img>` en la web y eso no los convierte en archivos huérfanos.

## Archivos históricos

- `91096c4c-581c-4b87-a1cd-2df1b0a0c450.jpg`
- `9831d0a9-a7b7-4dc8-91f9-d514e254c025.jpg`

Son referencias de procedencia anteriores a la identidad terracota vigente. **No son fuente de verdad, no se sirven en la tienda y no deben usarse para generar nuevos assets.** Se conservan únicamente como memoria del proceso; Git permite retirarlos en una limpieza futura si el dueño decide que ya no aportan evidencia.
