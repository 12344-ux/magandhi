# MAGANDHI · estado actual de la tienda pública

**Corte:** 16 de octubre de 2026 (el estado completo del proyecto vive en `CONTEXTO-MAGANDHI.md` del repo del back-office)

> **Cuentas C2 · infraestructura cerrada en preapertura:** `/cuenta/` está
> publicado con correo/contraseña, recuperación, Google GIS y Turnstile. Se
> midieron alta nueva por correo, confirmación, segundo login y alta Google con
> usuario nuevo: identidades únicas y una sola cuenta activa. CAPTCHA permanece
> activo; signup está OFF y Google sigue External/Testing. La apertura queda
> deliberadamente pendiente hasta redactar, revisar y publicar políticas. Punto
> exacto: `cuenta/CONFIGURACION.md` y
> `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
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
- Contacto real por WhatsApp y `contacto@magandhi.com`.

### Producto — `producto/index.html`

- Plantilla genérica para cualquier producto publicado.
- Consulta una fila de `catalogo_publico` por slug o UUID.
- Galería dinámica: miniaturas, flechas PC, swipe móvil y navegación circular.
- Foto principal grande y miniaturas `-sm` cuando existen.
- Contenido de descripción, curaduría y ficha visible solo cuando Campañas aporta datos.
- Estado agotado deshabilita la compra.
- Checkout Wompi iniciado mediante `crear-intencion-pago`.
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
- `campana_producto.precio_venta` es el precio comercial mostrado y firmado para checkout.
- El stock real proviene de `movimientos_inventario`; la tienda recibe únicamente `agotado`.
- `imagenes` conserva paths grandes; la variante liviana se deriva como `<base>-sm.<ext>`.
- La publishable key de `supabase-config.js` es pública por diseño; la seguridad depende de grants/RLS, no de ocultarla.

## Pagos: en producción

Wompi F1 → F4 está en producción y quedó verificado con una compra real el 9-oct-2026:

1. La tienda envía el identificador, la cantidad 1, los datos del comprador y la procedencia. La **dirección viaja completa**: `dirección · detalles de entrega` unidos, para que el apartamento o la torre lleguen al pedido (los campos tienen tope 120 y 70, así que la unión cabe en los 200 que guarda el servidor). A Wompi se le siguen enviando separados, cada uno en su parámetro oficial.
2. `crear-intencion-pago` relee el precio, **guarda la intención antes de firmar** y calcula la firma server-side.
3. Se abre el checkout de Wompi. El ambiente lo elige la llave pública que devuelve el servidor.
4. Al aprobarse el pago, el back-office crea el pedido web una sola vez, baja el stock, registra el asiento contable y envía solo el correo «Recibido».

Si la intención falla, el aviso dice **el motivo real** (agotado, producto retirado, problema de configuración nuestro, fallo pasajero), leyendo el cuerpo de la respuesta y no el mensaje genérico de `supabase-js`. Nunca se filtra jerga técnica.

El interruptor entre pagos reales y de prueba vive en el back-office (`pagos_config.entorno`); la tienda no cambia.

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

1. **C2 queda cerrado técnicamente en preapertura:** signup permanece OFF y
   Google External/Testing hasta publicar políticas. Cuando se retome, completar
   políticas y avisos contextuales; luego preparar Google Production y activar
   signup permanente.
2. Políticas reales: privacidad, condiciones, entregas, cambios/devoluciones y tratamiento de datos.
3. Canal/página formal de PQRS; mientras tanto se usa el correo real.
4. Repaso de textos de la sección de opiniones. El diseño quedó aprobado; solo falta pulir copias. Los copys del aviso de vuelta del pago son provisionales y entran en el mismo repaso.
5. Metadata/canonical/OG por producto; mantener `noindex` hasta resolverlo.
6. Definir cómo escala el grid móvil más allá de los cinco espacios actuales.
7. Revisar accesibilidad completa de carrusel y modales antes del lanzamiento público definitivo.

## Siguiente evolución comercial · aprobada, no desplegada

El 16-oct-2026 se aprobaron dos frentes para construir por tramos:

1. **Cantidades y carrito autenticado:** máximo por pedido configurado en
   Campañas, cantidad también para invitado, carrito persistente solo con cuenta
   y checkout multiproducto idempotente. Para proveedor, el máximo efectivo
   conserva después de la compra el piso Dropi; para producto propio manda
   Inventario.
2. **Promocionar:** enlace oficial y por canal, preview social, textos, QR, kit
   visual, registro de enlaces y atribución hasta la venta. Meta Ads, Pixel y
   Conversions API quedan fuera de esta fase.

El plano autoritativo vive en el back-office:
`docs/PLANO-FASE-COMERCIAL.md`. La aprobación del plano no significa que estas
funciones existan todavía en producción.

## Fuentes de verdad

- Marca pública: `marca/logo/logo-magandhi.svg`, `marca/generar_assets.py`, `marca.css`.
- Banners: `.kiro/steering/estandar-banners-magandhi.md` y `banners/LEEME.md`.
- Presentación pública: `index.html` y `producto/index.html`.
- Cuenta C2 y gates de apertura: `cuenta/CONFIGURACION.md`.
- Esquema/RLS/RPC/Edge Functions: repositorio del back-office, carpeta `supabase/`.
- Relevo operativo vigente: `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
- Siguiente fase comercial: `docs/PLANO-FASE-COMERCIAL.md` del back-office.
- Inventario y publicación: back-office en `montaguth.institute`.
