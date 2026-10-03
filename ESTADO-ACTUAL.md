# MAGANDHI · estado actual de la tienda pública

**Corte:** 2 de octubre de 2026
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
- Opiniones en estado vacío hasta disponer de compras verificadas reales.

La ruta `producto/grisi-manzanilla-gold/` es un redirect histórico de compatibilidad y no debe volver a convertirse en una ficha duplicada.

## Contrato de datos

- Proyecto Supabase compartido con el back-office.
- La tienda anónima solo debe leer la vista con lista blanca `catalogo_publico`.
- Las tablas base de Inventario, Campañas, Ventas y Finanzas no son públicas.
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

1. Wompi F2 y, después, activación controlada de producción.
2. Políticas reales: privacidad, condiciones, entregas, cambios/devoluciones y tratamiento de datos.
3. Canal/página formal de PQRS; mientras tanto se usa el correo real.
4. Sistema de opiniones vinculado a compras verificadas.
5. Metadata/canonical/OG por producto; mantener `noindex` hasta resolverlo.
6. Definir cómo escala el grid móvil más allá de los cinco espacios actuales.
7. Revisar accesibilidad completa de carrusel y modales antes del lanzamiento público definitivo.

## Fuentes de verdad

- Marca pública: `marca/logo/logo-magandhi.svg`, `marca/generar_assets.py`, `marca.css`.
- Banners: `.kiro/steering/estandar-banners-magandhi.md` y `banners/LEEME.md`.
- Presentación pública: `index.html` y `producto/index.html`.
- Esquema/RLS/RPC/Edge Functions: repositorio del back-office, carpeta `supabase/`.
- Inventario y publicación: back-office en `montaguth.institute`.
