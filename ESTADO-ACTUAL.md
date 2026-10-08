# MAGANDHI · estado actual de la tienda pública

**Corte:** 7 de octubre de 2026
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

### Políticas — `politicas/` (ESTRUCTURA provisional, 8-oct-2026)

- Rutas definitivas: `/politicas/` (índice), `/politicas/datos/`, `/politicas/cookies/`, `/politicas/terminos/`, `/politicas/envios/`, `/politicas/devoluciones/`.
- Cada sección tiene su ancla estable (`#responsable`, `#derechos`, `#cookies`, `#retracto`…) para que tienda, correos y checkout las enlacen desde ya.
- El **texto es provisional a propósito**: el equipo redactará los documentos definitivos antes de abrir la tienda. Mientras tanto: `noindex`, franja «Documento en preparación» y versión `borrador-0` (meta `politica-version`).
- Al publicar el texto real: subir la versión (meta + línea «Versión») y registrarla en el back-office (Email marketing → Resumen). Lo capturado bajo una versión `borrador-*` nunca recibirá campañas reales (regla de EM6).
- Enlazadas desde el footer del home y del producto.

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

## Pagos: límite actual

F1 está operativo en **sandbox**:

1. la tienda envía identificador y cantidad 1;
2. la Edge Function relee precio/disponibilidad;
3. calcula firma server-side;
4. abre el checkout Wompi.

Todavía no existe F2 en producción: persistencia de intención, webhook idempotente, pedido automático, descuento transaccional de stock y recuperación de pagos. **No habilitar cobros reales hasta cerrar F2.**

## Seguridad y honestidad

- No existen secretos privilegiados en el frontend.
- La tienda no calcula ni envía el precio confiable al servidor; el backend lo relee.
- No se publican existencias exactas, costos, proveedor ni IDs internos de Inventario.
- No se muestran reseñas o promedios inventados.
- Los enlaces sin destino real se retiran en vez de simular funcionalidad.
- Los banners y fotos no superan 2000px por dimensión dentro del flujo de trabajo de Kiro.

## Pendientes reales

1. Entrega del código de reseña al cliente en el último correo de seguimiento. Requiere montar el envío de correos de MAGANDHI, que todavía no existe. **Hasta cerrarlo no entran opiniones reales**, aunque el motor ya esté desplegado y probado.
2. Wompi F2 y, después, activación controlada de producción.
3. Políticas reales: privacidad, condiciones, entregas, cambios/devoluciones y tratamiento de datos.
4. Canal/página formal de PQRS; mientras tanto se usa el correo real.
5. Repaso de textos de la sección de opiniones. El diseño quedó aprobado; solo falta pulir copias.
6. Metadata/canonical/OG por producto; mantener `noindex` hasta resolverlo.
7. Definir cómo escala el grid móvil más allá de los cinco espacios actuales.
8. Revisar accesibilidad completa de carrusel y modales antes del lanzamiento público definitivo.

## Fuentes de verdad

- Marca pública: `marca/logo/logo-magandhi.svg`, `marca/generar_assets.py`, `marca.css`.
- Banners: `.kiro/steering/estandar-banners-magandhi.md` y `banners/LEEME.md`.
- Presentación pública: `index.html` y `producto/index.html`.
- Esquema/RLS/RPC/Edge Functions: repositorio del back-office, carpeta `supabase/`.
- Inventario y publicación: back-office en `montaguth.institute`.
