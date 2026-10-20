# MAGANDHI · estado actual de la tienda pública

**Corte:** 20 de octubre de 2026 (el estado completo del proyecto vive en `CONTEXTO-MAGANDHI.md` del repo del back-office)

> **Cuentas C2 · infraestructura cerrada en preapertura:** `/cuenta/` está
> publicado con correo/contraseña, recuperación, Google GIS y Turnstile. Se
> midieron alta nueva por correo, confirmación, segundo login y alta Google con
> usuario nuevo: identidades únicas y una sola cuenta activa. CAPTCHA permanece
> activo; signup está OFF y Google sigue External/Testing. La apertura queda
> deliberadamente pendiente hasta redactar, revisar y publicar políticas. Punto
> exacto: `cuenta/CONFIGURACION.md` y el relevo temático
> `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
>
> **C5 COMERCIAL · EN PRODUCCIÓN Y CERRADO ESTRUCTURALMENTE (20-oct-2026);
> carrito ENCENDIDO.** La tienda C5 (PR #113, `4a0b439`) ya opera sobre el
> backend C5: migraciones `20261106000000` y `20261106000100` (slug automático)
> aplicadas y Edge C5 desplegadas. Mis compras muestra datos reales. El dueño
> confirmó sin dinero: carrito libre al crear la intención, compra en proceso,
> «Continuar pago» sin duplicar y vencimiento sin transacción. Wompi sigue en
> `prod`: una compra por carrito cobra dinero real. No hubo pago real por
> carrito, así que no hay cierre transaccional. Relevo vigente en el
> back-office: `docs/RELEVO-COMERCIAL-C5-CIERRE-2026-10-20.md`.
>
> **C4 COMERCIAL · cerrado estructuralmente y superado por C5.** Los PR de
> tienda #108 y #109 (ids de campaña) siguen fusionados; el bloqueo de 30
> minutos ya no rige y las decisiones que dejó abiertas se resolvieron con C5.
> Relevo histórico: `docs/RELEVO-COMERCIAL-C4-2026-10-19.md` del back-office.
>
> **Corregido el 19-oct (PR #109):** el carrito rechazaba los ids de las
> campañas sembradas en 2025 (`00000000-…-0000000c000N`), que son válidos en
> PostgreSQL pero no son UUID RFC 4122. Afectaba a 5 de 6 campañas y mostraba
> "revisa tu conexión". Ahora se acepta la forma canónica, los errores de
> disponibilidad tienen mensajes propios y la caché se renovó
> (`carrito-core.js?v=3`, `carrito-ui.js?v=5`).
>
> **C3 COMERCIAL · cerrado estructuralmente:** backend
> PR #280 (implementación `424e7632d214a90afdb7c9265fbe758bfa3fc580`,
> merge `275c0dd4548937075770ddd6dace1801c013c929`) y tienda PR #106
> (implementación `c87934cd6034677be1c1888b8eadce95dcc348a4`, merge
> `b18c1ed4f075241a066048b0bfbe1b19d0eb96c9`); Pages quedó construido.
> Migración `20261104000000` aplicada, postflight correcto y Edge Functions
> redesplegadas. Se midieron UI OFF/ON y una intención v2 productiva sin pago:
> total/líneas exactos y una sola intención al reintentar entre sesiones. No
> hubo aprobación, pedido, inventario, asiento, correo ni webhook repetido. Su
> checkout multiproducto sigue vigente dentro de C5.
>
> **C1 COMERCIAL · desplegado y probado en estructura:** backend #276 (merge
> `e75dc1c…`) y tienda #102 (merge `db56c4f…`). La compra inmediata admite
> cantidad seleccionada y conserva la compra invitada. No hubo un pago real con
> cantidad 2: webhook, pedido, baja de 2, asiento, correo e idempotencia todavía
> no están medidos para esa cantidad.
>
> **Dropshipping:** D2c está desplegado; la tienda ya puede vender productos de
> proveedor con stock vivo y verificación antes de Wompi. El despacho posterior
> continúa manual en el back-office.

**Producción:** `https://magandhi.com`
**Repositorio:** `12344-ux/magandhi`

Este documento describe lo que existe hoy. No es un backlog histórico ni una promesa de funciones futuras.

## Identidad vigente

- Marca pública: **MAGANDHI**.
- Logo maestro: `marca/logo/logo-magandhi.svg`.
- Generador de derivados: `marca/generar_assets.py`.
- Paleta ejecutable: `marca.css`.
- Terracota: `#A6332E`.
- Negro: `#111111`.
- Dorado: `#C28A3A`.
- Fondo arena: `#EFE7DD`.
- Superficies de producto: blanco puro.
- Tipografía: Poppins.
- Voz: habla MAGANDHI o el equipo; nunca una persona vendedora individual.

Los JPG de `marca/` son referencias históricas. No gobiernan la identidad ni deben alimentar nuevos assets.

## Superficies públicas

### Home — `index.html`

- Carrusel hero responsive con assets independientes PC/móvil.
- Banner Historia con composición independiente PC/móvil.
- Vitrina dinámica desde `catalogo_publico`.
- Tarjetas blancas, acento dorado fijo y disponibilidad derivada.
- Enlaces hacia `producto/?slug=…` con respaldo por `?id=…`.
- El acceso al carrito autenticado y su checkout C5 están desplegados bajo un
  único flag, **encendido al 20-oct-2026**. Apagado, el carrito permanece oculto
  y no altera la navegación ni la compra invitada.
- Contacto real por WhatsApp y `contacto@magandhi.com`.

### Producto — `producto/index.html`

- Plantilla genérica para cualquier producto publicado.
- Consulta una fila de `catalogo_publico` por slug o UUID.
- Galería dinámica: miniaturas, flechas PC, swipe móvil y navegación circular.
- Foto principal grande y miniaturas `-sm` cuando existen.
- Contenido de descripción, curaduría y ficha visible solo cuando Campañas aporta datos.
- Estado agotado deshabilita la compra.
- `catalogo_publico.max_comprable` habilita un selector accesible de cantidad
  entre 1 y el máximo efectivo; la ficha muestra «Máximo N unidades por pedido»
  y recalcula el total antes de continuar.
- El máximo público está acotado a `0..20`: `0` equivale a agotado y nunca
  revela stock exacto. Si el máximo cambia, un rechazo `409` obliga a escoger de
  nuevo; la tienda no recorta silenciosamente la cantidad.
- Checkout Wompi iniciado mediante `crear-intencion-pago`, con la cantidad
  seleccionada también para compra invitada.
- «Agregar al carrito» y el checkout multiproducto aparecen solo para una cuenta
  autenticada válida mientras el flag esté encendido (lo está al 20-oct-2026).
  Estos caminos no reemplazan «Comprar ahora».
- WhatsApp contextual por producto.
- Opiniones verificadas en vivo (ver sección siguiente). Estado vacío honesto mientras un producto no tenga opiniones.

### Mi cuenta — `cuenta/` (C2, preapertura 16-oct-2026)

- Registro e inicio por correo + contraseña.
- `Continuar con Google` mediante Google Identity Services e ID token validado
  por Supabase Auth; el selector visible identifica `magandhi.com`.
- Confirmación y recuperación con TokenHash; callback noindex/no-referrer.
- Recuperación probada abriendo el correo en otro navegador.
- Inicialización server-side mediante `cuenta-inicializar`; el navegador nunca
  escribe `cuentas_cliente` ni elige `customer_id`.
- Sesión de cliente separada del panel interno; personal y cuentas no
  disponibles reciben rechazo opaco y cierre local.
- Compra como invitado intacta.
- Google Identity Services está publicado y medido en External/Testing: mismo
  UID, identidad enlazada y una fila activa después del segundo acceso.
- Alta nueva por correo con CAPTCHA, confirmación TokenHash y segundo login:
  mismo UID y una sola fila activa.
- Alta Google con usuario realmente nuevo: identidad única y una fila activa.
- CAPTCHA permanece activo. Signup está apagado y Google sigue External/Testing.
- Apertura pendiente: redactar/revisar/publicar políticas; después activar signup
  permanentemente y completar Google Production.
- Estado y siguiente paso exacto en `cuenta/CONFIGURACION.md`.

### Carrito autenticado y Mis compras — `carrito/` + centro de cuenta (C5 EN PRODUCCIÓN; flag ENCENDIDO al 20-oct-2026)

- Una cesta activa por cuenta, persistente entre dispositivos: consolida
  líneas, cambia cantidades, retira y detecta conflictos de versión entre
  pestañas. Relee presentación, precio, máximo y disponibilidad; nunca guarda el
  precio como autoridad.
- Checkout multiproducto con formulario de envío/facturación. El navegador
  envía solo id/versión del carrito y comprador; nunca líneas, precio, monto,
  UID ni `customer_id`.
- **Carrito libre:** al crear la intención, el servidor congela las líneas, las
  retira del carrito y avanza su versión en la misma transacción. El carrito
  queda libre de inmediato y la compra vive en Mis compras. Ya no existe el
  bloqueo de 30 minutos de C4.
- **Mis compras** (Mi cuenta): filtros Todas / En proceso / Realizadas / No
  completadas; tarjetas multiproducto con total, fecha, cantidades e imagen
  actual o placeholder; seguimiento Recibido → Preparando → En camino →
  Entregado desde `pedidos.estado`; incluye los pedidos históricos de la cuenta.
- «Continuar pago» solo para una compra vigente sin transacción bancaria: vuelve
  a firmar la misma intención, sin crear otra. «Verificar estado» para
  confirmación bancaria o revisión. Sin transacción, la compra vence a los 30
  minutos y pasa a No completadas sin tocar el carrito.
- Aviso no bloqueante en el carrito y punto en «Mi cuenta» mientras haya
  compras en proceso; refresco cada 15 s solo con procesos y página visible.
- El retorno de Wompi y el enlace `/carrito/?cuenta=compras` abren Mis compras,
  también después de volver a iniciar sesión, sin open redirect.
- «Volver a comprar» abre la ficha actual, que recalcula precio y
  disponibilidad. «Dar mi opinión» aparece solo tras entregado y sigue
  «Próximamente»; la opinión por el código del correo no cambia.
- Las intenciones C4 históricas conservan su contrato; compra inmediata e
  invitada siguen independientes. Logout o cambio de cuenta retira de inmediato
  la cesta y Mis compras visibles.
- **Sin pago real por carrito:** pedido, inventario, asiento, correo e
  idempotencia aprobados no están medidos para C3/C4/C5.

### Políticas — `politicas/` (ESTRUCTURA provisional, 8-oct-2026)

- Rutas definitivas: `/politicas/` (índice), `/politicas/datos/`, `/politicas/cookies/`, `/politicas/terminos/`, `/politicas/envios/`, `/politicas/devoluciones/`.
- Cada sección tiene su ancla estable (`#responsable`, `#derechos`, `#cookies`, `#retracto`…) para que tienda, correos y checkout las enlacen desde ya.
- El **texto es provisional a propósito**: el equipo redactará los documentos definitivos antes de abrir la tienda. Mientras tanto: `noindex`, franja «Documento en preparación» y versión `borrador-0` (meta `politica-version`).
- Al publicar el texto real: subir la versión (meta + línea «Versión») y registrarla en el back-office (Email marketing → Resumen). Lo capturado bajo una versión `borrador-*` nunca recibirá campañas reales (regla de EM6).
- Enlazadas desde el footer del home y del producto.

### Suscripción a novedades — `suscripcion/` (EM6, 8-oct-2026)

- Módulo reutilizable `suscripcion/suscripcion.js` + `suscripcion.css` (prefijo `su-`). Hoy montado en el home, arriba del footer (`<section id="mg-suscripcion" hidden>`).
- Pregunta a la Edge Function `em-suscripcion` si está activo. **Apagado** (interruptor del back-office o política sin registrar) = la sección no aparece.
- Casilla de autorización **desmarcada**, con el texto exacto que queda como prueba y el enlace a la política; temas Novedades/Ofertas; campo trampa.
- Doble confirmación: `suscripcion/confirmar/#t=<token>`. El token va en el fragmento y la página lo borra de la barra; `noindex` + `no-referrer`.
- Copy provisional.

### Analítica propia — `analitica/` (EM7 · Métricas M1, 8-oct-2026)

- `analitica/analitica.js` + `analitica.css` (prefijo `an-`), cargado en el home y en el producto.
- Solo actúa si el back-office encendió la analítica **y** la persona aceptó el aviso «Tú decides». Rechazar es igual de fácil y no deja identificador.
- Sin Meta ni Google. Envía a `tienda-eventos`: página vista, producto visto, clic en «Comprar» (gancho en el botón), inicio del pago (antes de redirigir a Wompi) y llegada desde una campaña. Origen solo como categoría; nunca la URL de procedencia.
- `window.mgCookies()` reabre el aviso («Preferencias de cookies» en el footer). Copy provisional.

### Opiniones verificadas — `producto/index.html`

Sistema aprobado el 7 de octubre de 2026. Es el esquema que siguen **todos** los productos.

- Calificación bajo el precio: estrellas + promedio real + número de opiniones, enlazando a `#resenas`.
- Promedio **real** (`avg`) a un decimal, **siempre acompañado del total**. Una sola opinión de cinco estrellas muestra `5.0 · 1 opinión`; no se suaviza ni se infla.
- Estrellas sólidas: doradas las llenas, grises las vacías y una parcial con degradado para el decimal exacto.
- En la ficha se muestran **cuatro** opiniones, todas del mismo tamaño: sin respuesta de marca, texto recortado a tres líneas y `Ver opinión completa` cuando se recorta.
- Selección de esas cuatro: con cuatro o menos, las más recientes; con más, las cuatro mejor calificadas desempatando por recencia.
- `Ver todas las opiniones` aparece solo con más de cuatro y abre el panel completo: modal centrado en computador, pantalla completa en móvil.
- Panel: filtros por estrellas con conteo (solo computador), orden por recientes, antiguas, mejor y peor calificadas, y respuesta de marca visible.
- Fechas relativas desde el registro de la opinión; la fecha exacta queda en el título emergente.
- Realce al pasar el cursor únicamente en las cuatro de la ficha.
- `Dejar una reseña` exige estrellas; el comentario es opcional. Envía el código del pedido a `enviar-opinion`.
- Contorno dorado de marca en las tarjetas y en el botón de ver todas.

La ruta `producto/grisi-manzanilla-gold/` es un redirect histórico de compatibilidad y no debe volver a convertirse en una ficha duplicada.

## Contrato de datos

- Proyecto Supabase compartido con el back-office.
- La tienda anónima solo debe leer la vista con lista blanca `catalogo_publico`.
- Las tablas base de Inventario, Campañas, Ventas y Finanzas no son públicas.
- Opiniones: la tienda anónima solo lee las vistas con lista blanca `producto_rating_publico` (total y promedio por slug) y `opiniones_publicas` (tarjetas). La tabla `opiniones` no es pública.
- Escribir una opinión ocurre únicamente a través de la Edge Function `enviar-opinion`, que valida el código del pedido server-side. La tienda nunca escribe la tabla.
- `campana_producto.precio_venta` es el precio comercial. El monto autoritativo
  se calcula en servidor como `precio_venta × cantidad × 100`, con enteros.
- `campana_producto.max_unidades_pedido` define el máximo comercial por pedido
  (`1..20`, con `1` para campañas históricas); no es stock ni reutiliza
  `tope_escaparate`.
- `catalogo_publico` expone únicamente `agotado` y `max_comprable`, acotado a
  `0..20`; `agotado` equivale a `max_comprable = 0`. Nunca publica stock exacto,
  reservas, piso Dropi, origen, proveedor ni identificadores externos.
- En producto propio, el máximo efectivo combina el máximo de campaña con la
  disponibilidad derivada de Inventario. En proveedor, descuenta pedidos
  pagados pendientes de transcripción y conserva el piso Dropi.
- `pw_registrar_intencion` persiste y vuelve a validar campaña, cantidad, precio
  y monto. Al materializar el pago, `crear_pedido` consolida por
  campaña/producto y repite máximo y disponibilidad bajo bloqueo. Las
  intenciones históricas versión 0 conservan compatibilidad acotada.
- `imagenes` conserva paths grandes; la variante liviana se deriva como `<base>-sm.<ext>`.
- La publishable key de `supabase-config.js` es pública por diseño; la seguridad depende de grants/RLS, no de ocultarla.

## Pagos: en producción

Wompi F1 → F4 está en producción y quedó verificado con una compra real de una
unidad el 9-oct-2026. Esa evidencia es histórica y no demuestra por sí sola el
flujo completo de C1 COMERCIAL con varias unidades:

1. La tienda envía el identificador, la **cantidad seleccionada** —entero entre
   `1` y el máximo público efectivo—, los datos del comprador y la procedencia.
   Si una integración histórica omite cantidad, el backend conserva `1` por
   compatibilidad. La **dirección viaja completa**: `dirección · detalles de
   entrega` unidos, para que el apartamento o la torre lleguen al pedido (los
   campos tienen tope 120 y 70, así que la unión cabe en los 200 que guarda el
   servidor). A Wompi se le siguen enviando separados, cada uno en su parámetro
   oficial.
2. `crear-intencion-pago` ignora precio y monto del navegador, relee catálogo y
   `max_comprable`, verifica proveedor en vivo cuando aplica, calcula
   `precio × cantidad × 100`, **guarda la intención antes de firmar** y recibe
   una segunda validación transaccional en `pw_registrar_intencion`.
3. Se abre el checkout de Wompi. El ambiente lo elige la llave pública que
   devuelve el servidor.
4. Al aprobarse el pago, el webhook usa la cantidad y campaña congeladas;
   `crear_pedido` vuelve a validar máximo y disponibilidad. En el flujo ya
   medido de una unidad crea el pedido una sola vez, baja el stock, registra el
   asiento contable y envía solo el correo «Recibido».

Si la intención falla, el aviso dice **el motivo real** (agotado, producto retirado, problema de configuración nuestro, fallo pasajero), leyendo el cuerpo de la respuesta y no el mensaje genérico de `supabase-js`. Nunca se filtra jerga técnica.

El interruptor entre pagos reales y de prueba vive en el back-office (`pagos_config.entorno`); la tienda no cambia.

### Evidencia C1 COMERCIAL · 16-oct-2026

- Backend #276 (merge `e75dc1c…`) y tienda #102 (merge `db56c4f…`).
- Producción: migración `20261102000000`, postflight `9/9` y
  `crear-intencion-pago` desplegada.
- Cantidad 1 respondió `200` y su persistencia pasó `7/7`, sin ejecutar pago.
- `max+1` fue rechazado con `409`; Grisi reportó `max_unidades_pedido = 2` y
  `max_comprable = 2`.
- Cantidad 2 respondió `200` por `13.980.000` centavos. El dueño verificó
  selector, máximo, total, modal y compra invitada.
- **Límite:** no se ejecutó un pago real de cantidad 2. Por tanto, no están
  medidos para esa cantidad el webhook, la creación del pedido, la baja de 2,
  el asiento, el correo ni la idempotencia. C1 está **desplegado y probado en
  estructura**, no cerrado end-to-end.

### Evidencia C2 COMERCIAL · 16-oct-2026

- Backend PR #278 fusionado en
  `a811082cc585ad8d77a98aa346ffbd06ac2ac3f4`.
- Tienda PR #104: implementación
  `90dcb6d42eabd26935743b5bae4de9bba9692e39`, merge a `main`
  `35a104a1c12b9b9276773bc7d7c082c0733c73a9`; Pages built.
- Preflight `3/3 true`, migración máxima `20261103000000` aplicada y postflight
  `10/10 true`.
- Con el flag OFF se verificó que C2 no aparecía ni alteraba los caminos
  existentes. Después se activó temporalmente para probar agregar, consolidar,
  cambiar y retirar líneas.
- La cesta persistió entre navegadores, quedó aislada entre dos cuentas y el
  conflicto entre pestañas fue detectado. Logout y compra invitada conservaron
  su comportamiento independiente.
- Los invariantes `sin_doble_activo` y `sin_huerfanas` dieron `true`.
- No se ejecutaron dinero, Wompi, pedidos ni movimientos de inventario.
- El flag productivo final quedó en `false`.

**Estado histórico de C2:** desplegado y probado en estructura; dejó el flag
en `false` para construir C3.

### Evidencia C3 COMERCIAL · 17-oct-2026

- Backend #280 (`424e763`, merge `275c0dd`) y tienda #106 (`c87934c`, merge
  `b18c1ed`) fusionados; Pages construido.
- Migración `20261104000000` aplicada; postflight de objetos, firmas, índice,
  RLS, grants e invariantes correcto; máximo `1000000000` centavos.
- `crear-intencion-pago` y `wompi-webhook` redesplegadas. CORS 204, sesión
  requerida 401 y firma ausente 401 correctos.
- Con flag OFF se comprobaron home, compra inmediata, carrito, sesión y logout.
- Con activaciones temporales se comprobaron multiproducto/cantidades,
  subtotales, total, persistencia, cambios, validaciones y modal.
- Una intención v2 productiva sin pago abrió Wompi por el total exacto, congeló
  líneas válidas y conservó una sola intención al reintentar desde otra sesión.
- No hubo aprobación, pedido, movimientos de inventario, asiento, correo ni
  webhook repetido. C3 queda correcto en estructura, no end-to-end.
- Flag productivo final: `false`. Esta evidencia C3 sigue siendo la base
  actualmente desplegada mientras C4 permanece solo en rama.

### Vuelta del pago — `producto/index.html` (D0, 9-oct-2026)

Antes, al volver de Wompi la ficha se veía igual y «Comprar ahora» seguía activo: **se podía pagar dos veces.** Ahora:

- El aviso se enciende por dos caminos: `?ref=` en la URL (la vuelta oficial, que arma `crear-intencion-pago`) y la memoria de la pestaña (`sessionStorage`), que cubre volver con el botón **atrás** del navegador, donde no hay `?ref=`.
- El estado se le pregunta al servidor con la Edge Function `estado-pago`, por referencia y **sin datos personales**. La autorización es la posesión de la referencia, igual que el código de reseña.
- **La compra queda bloqueada mientras no haya veredicto** (`pendiente`, `revision`). Con `aprobado` se libera, porque la persona ya sabe que su pago entró; con `rechazado` también, porque no hubo cobro y reintentar es lo correcto.
- **Si el servidor no responde, el mensaje es el prudente** («Estamos confirmando tu pago») y la compra sigue bloqueada. Nunca se afirma que un pago quedó listo sin haberlo medido. Un pago en `revision` reconoce que el dinero entró sin prometer el pedido.
- La referencia se **borra de la barra de direcciones** en cuanto se lee: no queda en el historial, en un marcador ni en un enlace compartido. El `slug` del producto sí se conserva.
- El aviso vive fuera de `.mg-ficha`, así que sigue visible aunque el producto no cargue o se haya despublicado.
- Un pago recordado de más de 6 horas, o de otro producto, no avisa ni bloquea nada.
- Copy provisional.

## Seguridad y honestidad

- No existen secretos privilegiados en el frontend.
- La tienda no calcula ni envía el precio confiable al servidor; el backend lo relee.
- No se publican existencias exactas, costos, proveedor ni IDs internos de Inventario.
- No se muestran reseñas o promedios inventados.
- Los enlaces sin destino real se retiran en vez de simular funcionalidad.
- Los banners y fotos no superan 2000px por dimensión dentro del flujo de trabajo de Kiro.

## Pendientes reales

0. **Comercial C5 · despliegue productivo pendiente:** código fusionado en
   backend #287 y tienda #113; falta reconciliar ledger C4, preparar paquete
   operativo, desplegar Edge C5, apagar carrito, aplicar `20261106000000`,
   postflight, reactivar y probar sin dinero. Pago real solo con autorización.
   También falta el slug automático server-side como forward independiente.
1. **Opinión por cuenta:** el botón solo aparece después de entregado, pero su
   registro autenticado queda deliberadamente pendiente; el código de reseña
   histórico continúa funcionando.
2. **C2 queda cerrado técnicamente en preapertura:** signup permanece OFF y
   Google External/Testing hasta publicar políticas. Cuando se retome, completar
   políticas y avisos contextuales; luego preparar Google Production y activar
   signup permanente.
2. Políticas reales: privacidad, condiciones, entregas, cambios/devoluciones y tratamiento de datos.
3. Canal/página formal de PQRS; mientras tanto se usa el correo real.
4. Repaso de textos de la sección de opiniones. El diseño quedó aprobado; solo falta pulir copias. Los copys del aviso de vuelta del pago son provisionales y entran en el mismo repaso.
5. Metadata/canonical/OG por producto; mantener `noindex` hasta resolverlo.
6. Definir cómo escala el grid móvil más allá de los cinco espacios actuales.
7. Revisar accesibilidad completa de carrusel y modales antes del lanzamiento público definitivo.

## Evolución comercial · C1–C5 cerrados estructuralmente

Estado al 20-oct-2026:

1. C1–C5 están cerrados estructuralmente en producción; C4 quedó superado por
   C5. El carrito está encendido y Wompi en `prod`.
2. Ningún tramo de carrito tiene pago real: el cierre transaccional exige una
   compra C5 expresamente autorizada con pedido único, inventario/proveedor,
   asiento, correo e idempotencia.
3. Pendientes de tienda ligados a C5: opinión autenticada por cuenta (hoy
   «Próximamente») y los placeholders del centro de cuenta (Favoritos, Mis
   opiniones, Eliminar cuenta).
4. Siguiente etapa del plano: **Promocionar P0 · taxonomía y privacidad**,
   seguida de P1 (producto compartible), que también resuelve el pendiente de
   metadata/canonical/OG.

## Fuentes de verdad

- Marca pública: `marca/logo/logo-magandhi.svg`, `marca/generar_assets.py`, `marca.css`.
- Banners: `.kiro/steering/estandar-banners-magandhi.md` y `banners/LEEME.md`.
- Presentación pública: `index.html` y `producto/index.html`.
- Cuenta C2 y gates de apertura: `cuenta/CONFIGURACION.md`.
- Esquema/RLS/RPC/Edge Functions: repositorio del back-office, carpeta `supabase/`.
- Relevo general vigente:
  `docs/RELEVO-COMERCIAL-C5-CIERRE-2026-10-20.md` del back-office: estado
  productivo exacto tras el cierre estructural de C5, pendientes y prompt de la
  próxima sesión.
- Relevos históricos C4 y C5:
  `docs/RELEVO-COMERCIAL-C4-2026-10-19.md` y
  `docs/RELEVO-COMERCIAL-C5-2026-10-19.md` del back-office.
- Relevo temático de cuentas y sus gates:
  `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
- Diseño y criterios C5:
  `docs/PLANO-COMERCIAL-C5.md` y `docs/PLANO-FASE-COMERCIAL.md` del back-office.
- Inventario y publicación: back-office en `montaguth.institute`.
