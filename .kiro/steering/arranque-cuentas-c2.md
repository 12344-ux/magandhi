---
inclusion: always
---

# MAGANDHI tienda · arranque Cuentas C2 + Comercial C3

Antes de tocar la tienda pública:

1. Leer `ESTADO-ACTUAL.md`.
2. Usar como punto de entrada global del back-office
   `docs/RELEVO-COMERCIAL-C3-2026-10-17.md`. Si la tarea toca cantidades,
   carrito, checkout, metadata de producto, enlaces, Promocionar o atribución
   comercial, leer además `docs/PLANO-FASE-COMERCIAL.md`.
3. Si la tarea toca Auth o cuentas públicas, leer `cuenta/CONFIGURACION.md` y el
   relevo temático `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
4. No confundir Cuentas C2/C3/C4 con Comercial C2/C3/C4 ni reconstruir
   migración, SMTP, TokenHash o Google OAuth.
5. No reconstruir C1–C3 COMERCIAL. **C3 está desplegado y probado en estructura;
   flag final `false`. Comercial C4 es el siguiente tramo.** Promocionar sigue
   pendiente.

## Comercial · estado medido al 17-oct-2026

- Migración global máxima en producción: `20261104000000`.
- C3: backend #280 (`424e763`, merge `275c0dd`) y tienda #106 (`c87934c`,
  merge `b18c1ed`); Pages construido.
- Preflight C2 limpio, migración C3 aplicada, postflight de objetos/firmas/
  índice/RLS/grants correcto y Edge Functions redesplegadas.
- Sondas CORS, sesión requerida, ambiente y firma ausente correctas.
- Con flag OFF/ON temporal se midieron carrito multiproducto, cantidades,
  subtotales, total, persistencia, formulario y retorno.
- Una intención v2 productiva **sin pago** congeló líneas/total exactos y el
  reintento desde otra sesión conservó una sola intención por versión.
- No hubo aprobación, pedido, inventario, asiento, correo ni webhook repetido.
  No afirmar cierre end-to-end. La intención queda en `creada`, sin pedido/
  evento, y no se borra ni documenta con referencia/UID/PII.
- El flag productivo final es `false`. C4 debe derivar/vincular `customer_id` en
  servidor y resolver consumo/desbloqueo/revisión postpago.
- C1 conserva su límite independiente: cantidad 2 solo llegó a intención, sin
  pago real.

## Cuentas C2 · preapertura separada

- `/cuenta/`, callback y backend C2 están publicados/desplegados.
- Login password, inicialización idempotente, recuperación cross-browser,
  Google GIS y Turnstile están verificados con identidades únicas y una sola
  cuenta activa.
- Cuentas C2 queda cerrado técnicamente en preapertura. CAPTCHA sigue activo;
  signup permanece OFF y Google External/Testing.
- La apertura se retoma solo después de redactar, revisar y publicar políticas;
  entonces se prepara Google Production y se activa signup permanente.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; precio/monto/UID/
`customer_id` nunca son autoridad del navegador; secretos nunca en Git/chat;
rama + PR por cambio; medir producción antes de afirmar cierre. Mantener el flag
OFF durante construcción y despliegue de C4. No atribuir pago, pedido, inventario,
asiento, correo o idempotencia aprobada sin evidencia real.
