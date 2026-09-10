# 🛒 CONTEXTO MAGANDHI — léeme primero

> **Para el próximo Kiro (o esta misma sesión reiniciada):** este documento lo escribe la
> sesión actual para que puedas continuar el proyecto **sin perder el hilo**, como si la
> conversación nunca se hubiera cortado. Léelo completo antes de tocar nada.
> Se actualiza **al final de cada cambio relevante** (corrige lo que ya no sea cierto, no solo agregues).
>
> **Última actualización:** sesión en la que se montaron correo profesional, WhatsApp Business
> e Instagram, y se dejó pendiente la página de producto real.

---

## 0. Qué es MAGANDHI

**MAGANDHI** es una **tienda online** (sitio estático en GitHub Pages) en el dominio **magandhi.com**.

- **Repo:** `12344-ux/magandhi`, rama `main` = lo publicado. **Repo público** (obligatorio para GitHub Pages con dominio propio en plan gratuito).
- **Misión:** ser una tienda **exclusiva**, sinónimo de **transparencia y calidad**, donde **todo está
  plenamente escogido** — lo opuesto a marketplaces masivos (Temu, Mercado Libre, Amazon) donde
  cualquiera vende cualquier cosa. **No hay nicho:** vende "de todo" pero **con propósito/curaduría**.
- **El moat (ventaja):** la **curaduría + confianza**. "Esto lo escogió y revisó el equipo; nosotros
  respondemos." Posicionamiento: ser **"la tienda local confiable"** (analogía del dueño: una tienda
  de barrio, pero online — empieza pequeña a propósito).
- **NO es dropshipping.** El dueño **compra él mismo** los productos (inventario propio) y los vende.

### Modelo de 3 fases
- **FASE 1 (ACTUAL):** el dueño compra productos que encuentra y puede revender; vende poco a poco.
  Base en **Tunja** (maneja stock, entrega local rápida = su ventaja fuerte) pero quiere **atreverse
  a envíos nacionales** a toda Colombia. Producto inicial: **Shampoo Manzanilla GRISI Gold** con
  extracto de cúrcuma, 400 mL. Objetivo real de fase 1: **posicionar la marca** y generar flujo
  comprobable de visitas/ventas (NO facturar mucho). Arrancar con 1 producto es intencional.
- **FASE 2:** con tráfico/ventas comprobables, se acerca a **tiendas locales** (proveedores) y les
  ofrece vender sus productos en MAGANDHI; él pone marca+publicidad, revende con margen que controla.
  MAGANDHI controla calidad y **entrega** (él revisa y entrega); las políticas dirán que los
  **vendedores** son responsables de devoluciones. Marketplace curado, no dropshipping ciego.
- **FASE 3:** los proveedores buscan a MAGANDHI para vender ahí, y el dueño **elige** qué va acorde
  a la marca (curaduría selectiva = el activo).

---

## 1. Quién es el dueño y cómo trabajamos

Dueño **D0m0**, estudiante de Dirección de Ventas (Colombia). Es el **director** del proyecto; no
programa. Todo lo revisa por **Pull Request** en GitHub y en el navegador.

- **Trato de socio honesto y directo, NO adulador.** Explicar el porqué con **"chispas críticas"**
  (el razonamiento breve y claro). Cero humo. Nunca decir "está listo" sin haberlo verificado de verdad.
- **Autonomía con criterio:** corregir lo mal planteado y explicar después; pero en decisiones de
  marca/gusto, **proponer y dejar que él decida** (es su marca).

### 🔴 REGLA PERMANENTE Y NO NEGOCIABLE: "HACER LAS COSAS BIEN"
El dueño pidió **explícitamente** que este proyecto se construya con calidad, sin afán, dedicándole
todo el tiempo necesario. **Deber activo de Kiro:** cuando el dueño se esté afanando, haciendo cosas
"por salir del paso", o saltándose pasos, **frenarlo con honestidad** y recomendarle descansar, dar
una caminata, o recordarle que MAGANDHI se hace bien. Es un compromiso de acompañamiento real, no
una frase decorativa. (Ejemplo cumplido: se descartó sin drama un aro dorado en el logo que "parecía
McDonald's" — probar y descartar con criterio es parte del método.)

### Líneas éticas/comerciales innegociables
1. **Nunca exponer llaves/secretos** en el repo ni en el frontend. Llaves públicas sí pueden ir en el
   front; secretos jamás. Si el camino fácil expone algo sensible, buscar otra vía y explicar por qué.
2. **Nada de trucos de tienda:** reseñas inventadas, escasez/contadores falsos, precios "antes"
   inflados, promesas de resultados. **La confianza ES el producto.** (Las reseñas arrancan en CERO;
   se diseñó un "estado vacío" honesto para eso.)
3. **Prometer solo lo que la logística cumple** (por eso los detalles de envío van en políticas, no
   en promesas vagas).
4. **Nada de falsificaciones ni marcas de terceros** como propias.

---

## 2. Identidad de marca (definida y en uso)

- **Nombre:** MAGANDHI (el tagline "Tu mundo. Tus compras." del manual **NO se usa** por decisión del dueño).
- **Logo:** ícono de **bolsa/domo/montaña** (viene del manual de marca oficial; archivo original en
  `marca/91096c4c-...jpg`, ícono blanco sobre rojo, 1254px).
- **PALETA ACTUAL = "TERRACOTA"** (evolución aprobada del rojo original del manual). Vive en `marca.css`
  como **fuente única de color** (tokens). Todas las páginas deben enlazar `marca.css`.
  - Rojo principal: **`#A6332E`** (terracota, reemplazó al `#D32F2F` del manual — más boutique, menos "outlet").
  - Hover de botones: **más oscuro** `#7A2A26` (sólido, no "clickbait"), nunca más claro.
  - Fondo general: **crema `#FAF6F1`** (reemplazó el blanco puro).
  - Negro: `#111111`. Texto secundario: `#6B6660`. Tarjetas sobre fondo: `#F2ECE4`.
  - **Acento dorado `#C9962E`** = acento POR PRODUCTO (el del GRISI). ⚠️ Solo como **detalle pequeño**
    (filo, sello), **NUNCA como marco grande junto al rojo** (parece McDonald's — lección aprendida).
- **Tipografía:** **Poppins** (SemiBold para títulos/wordmark). Cargada desde Google Fonts.
- **Wordmark:** "MAGANDHI" **todo en negro**, centrado y ajustado (se abandonó la "A roja" descentrada).
- **Iconografía:** SVG de **Lucide inline** (líneas), `currentColor`. **SIN emojis en la UI.**
- **Distintivo cromático por producto:** cada producto lleva un acento de color propio (dorado=GRISI,
  azul=un jabón, etc.). La estructura de marca (terracota/negro/crema) se mantiene; el acento da
  identidad de "edición curada" y escala a catálogo grande.

### Assets de marca en el repo
- `logo-mark-terracota.png` — ícono terracota (usado en el hero). **El bueno con la paleta nueva.**
- `logo-mark.png`, `logo-mark-blanco.png`, `logo.png`, `favicon.png` — versiones VIEJAS aún en rojo
  `#D32F2F`. ⚠️ **PENDIENTE:** unificarlas a terracota (ver §5).
- `icono-app.png` (512) + `icono-app-180.png` — ícono de app tipo "AppGallery" (ícono blanco sobre
  cuadrado terracota redondeado). Declarados como apple-touch-icon + en `site.webmanifest`.
- `marca/perfil/` — fotos de perfil para redes (ícono negro sobre terracota / ícono terracota sobre negro).
- `marca/generar_assets.py`, `marca/gen_perfil_whatsapp.py` — scripts fuente (receta del "canal mínimo"
  para aislar el trazo del logo del JPG original y recolorearlo sin halo). Reutilizables.

---

## 3. Estado del sitio (qué existe hoy)

| Archivo | Qué es |
|---|---|
| `index.html` | **Hero/portada** de la tienda. EN PRODUCCIÓN. Ver detalle abajo. |
| `marca.css` | **Tokens de color** (paleta terracota, fuente única). Cache-bust `?v=N` al cambiarlo. |
| `CNAME` | `magandhi.com` |
| `site.webmanifest` | Íconos de app + theme-color terracota |
| `productos/grisi-manzanilla-gold.png` | Foto del GRISI con fondo recortado (PNG transparente), usada en el hero |
| `productos/D_NQ_NP_2X_...webp` | Foto original del GRISI (con 2 botellas + margaritas), fuente |
| `marca/`, `*.png` | Assets de marca (ver §2) |

### El hero (`index.html`) — clases con prefijo `hg-`, CSS autocontenido
- Header: `logo-mark-terracota.png` + wordmark "MAGANDHI" negro + tagline **"Hoy mereces lo mejor"**
  (se muestra en mayúsculas por CSS).
- Intro breve: **"Ahora, descúbrelo."** ("descúbrelo" en terracota).
- **Vitrina del producto:** fondo rojo/terracota como ESCENARIO + una **tarjeta blanca con filo
  dorado** (acento del producto) encima, con la foto del GRISI, sello **"Elegido por MAGANDHI"**,
  categoría, nombre, hook honesto, y botón **"Ver producto"**. Hover: la tarjeta se eleva.
  - ⚠️ El botón "Ver producto" apunta a **`producto/grisi-manzanilla-gold/`** → **esa página NO
    existe todavía → da 404.** Es el pendiente #1 (ver §5).
- **Barra fija inferior:** solo **íconos** (sin texto), circulares, estilo Lucide:
  - 📧 Correo → `mailto:contacto@magandhi.com`
  - 💬 WhatsApp → `https://wa.me/573132451188`
  - 📷 Instagram → `https://instagram.com/magandhistore`
  - (Facebook se descartó.)
- Título de pestaña del navegador: **"Magandhi"**.

---

## 4. Canales de contacto (TODOS montados y funcionando)

- **Correo profesional:** `contacto@magandhi.com` en **Zoho Mail** (plan gratis "Forever Free").
  MX + SPF + DKIM configurados en Porkbun y **verificados** (probado: envía/recibe, NO cae en spam).
  Panel admin: mailadmin.zoho.com. Bandeja: mail.zoho.com. Es cuenta superadmin.
- **WhatsApp Business:** número **+57 313 245 1188** (SIM dedicada, separada del personal del dueño).
  Nombre de perfil "Magandhi" (WhatsApp no acepta MAGANDHI todo mayúsculas). Foto de perfil puesta.
- **Instagram:** **@magandhistore** (magandhi y magandhi.co estaban ocupados). Cuenta de EMPRESA.
  Foto = ícono terracota sólido (SIN aro dorado). Bio con Tunja + envíos nacionales. Enlace a magandhi.com.
  WhatsApp Business conectado al perfil.

### Infraestructura del dominio (Porkbun)
- DNS en Porkbun. Registros: 4× A a las IPs de GitHub Pages (185.199.108-111.153) + CNAME `www` →
  `12344-ux.github.io`. HTTPS emitido y "Enforce HTTPS" activo.
- Registros de correo (Zoho): 3× MX (mx/mx2/mx3.zoho.com), TXT SPF (`v=spf1 include:zoho.com ~all`),
  TXT DKIM (`zoho._domainkey`), TXT de verificación. **Los MX viejos de Porkbun (fwd1/fwd2) se
  borraron** — no pueden convivir con los de Zoho.

---

## 5. Pendientes (en orden de prioridad)

1. **🔴 PÁGINA DE PRODUCTO REAL (lo más importante).** El botón "Ver producto" del hero da 404.
   - El **diseño ya está aprobado** (se prototipó y gustó mucho): barra de confianza, sello
     "Escogido por MAGANDHI", bloque "Por qué está en MAGANDHI" (curaduría = el diferenciador),
     galería con filo del acento del producto, ficha (marca/línea/contenido/tipo/ingrediente),
     descripción HONESTA (sin prometer resultados), sección de **reseñas en ESTADO VACÍO** (0
     opiniones, honesto), footer. Prefijo de clases `mg-`. Debe usar la paleta terracota (marca.css)
     y el acento dorado del GRISI.
   - **DECISIÓN PENDIENTE DEL DUEÑO antes de construir:** ¿cómo se compra en fase 1?
     - (a) **Por WhatsApp** (botón abre chat con mensaje pre-escrito) — recomendado para fase 1
       (venta local, sin montar pasarela, lleva al canal fuerte).
     - (b) **Pago en línea (Wompi)** — más trabajo, para cuando el volumen lo justifique.
   - ⚠️ Sobre el copy del GRISI: la etiqueta del producto dice "aclara en 28 días". **NO repetir esa
     promesa** en el copy que escribamos (línea de honestidad); describir qué ES el producto, no
     prometer resultados.
2. **Coherencia de marca:** regenerar `logo.png`, `logo-mark.png`, `favicon.png` etc. a terracota
   `#A6332E` (hoy conviven con el rojo viejo `#D32F2F`). Actualizar el manual de marca si aplica.
3. **Políticas** (páginas legales): envíos/domicilios (Tunja + nacional), devoluciones/retracto
   (Ley 1480, 5 días hábiles), privacidad, condiciones.
4. **Publicidad/redes:** PARQUEADO a propósito. Se exploró una idea de primera publicación de IG
   (concepto del sello "Elegido por MAGANDHI") pero el dueño decidió **primero terminar de montar la
   tienda** antes de hacer publicidad. No retomar hasta que la tienda funcione.

---

## 6. Reglas de trabajo (Git y técnicas)

1. **NUNCA push directo a `main`.** Siempre rama nueva → PR → el dueño mergea (mergea rápido).
2. **Una rama mergeada NO se reutiliza.** Cambio nuevo = rama + PR nuevos. Antes de reusar una rama,
   verificar con `gh api` que el PR siga abierto.
3. Antes de crear rama, revisar PRs abiertos: `gh api "repos/12344-ux/magandhi/pulls?state=open"`.
4. Si tocas `marca.css`, sube el cache-bust `?v=N` en los HTML que lo enlazan.
5. Páginas nuevas: **CSS autocontenido** en su `<style>` con prefijo de clases propio, y enlazar
   `marca.css` para heredar la paleta. NO romper el hero.
6. **Verificar de verdad, con evidencia** (no "un comando sin error"): render en Chromium headless
   (0 errores de consola), DNS con `dns.google/resolve` desde dos fuentes, etc. Nunca decir "listo"
   sin comprobar.
7. Kiro NO tiene acceso a las redes/cuentas del dueño (Zoho, WhatsApp, Instagram, Porkbun): en esas
   cosas Kiro **guía paso a paso** y el dueño ejecuta. Kiro SÍ tiene acceso de escritura al repo.

### Entorno del sandbox (aprendido)
- Pillow y `node`/playwright-core NO persisten entre sesiones nuevas: reinstalar cuando haga falta
  (`uv pip install --system pillow`; node en `/root/.nvm/versions/node/v22.23.2/bin/node`).
- Para render/captura: `playwright-core@1.47` + Chromium en `/projects/sandbox/pw/browsers`, con
  flags `--no-sandbox --allow-file-access-from-files`. Las capturas van a
  `/projects/sandbox/.kiro/artifacts/screenshots/` (ojo: deviceScaleFactor 2 puede pasar el límite de
  2000px para mostrarlas — usar dSF 1 si hay que enseñarlas).
- Clonar siempre dentro de `/projects/sandbox/`.

---

## 7. Cómo arrancar (próximo Kiro)

1. Lee este documento completo.
2. `git pull` en `main` y revisa PRs abiertos antes de asumir nada.
3. El siguiente paso natural es la **página de producto real** (§5.1) — pero primero pregunta al
   dueño la decisión de compra (WhatsApp vs Wompi) si no está resuelta.
4. Sé su socio honesto: chispa crítica cuando algo no sea lo ideal, entregando siempre algo tangible
   y verificado. Y recuérdale descansar cuando lleve mucho rato (regla "hacer las cosas bien").

¡A construir MAGANDHI, bien hecho! 🛍️
