---
inclusion: always
---

# MAGANDHI tienda · arranque Cuentas C2 + C1 COMERCIAL

Antes de tocar la tienda pública:

1. Leer `ESTADO-ACTUAL.md`.
2. Usar como punto de entrada global del back-office
   `docs/RELEVO-COMERCIAL-C1-2026-10-16.md`. Si la tarea toca cantidades,
   carrito, metadata de producto, enlaces, Promocionar o atribución comercial,
   leer además `docs/PLANO-FASE-COMERCIAL.md`.
3. Si la tarea toca Auth o cuentas públicas, leer `cuenta/CONFIGURACION.md` y el
   relevo temático `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
4. No reconstruir Cuentas C1/C2, migración, SMTP, TokenHash ni Google OAuth.
5. No reconstruir C1 COMERCIAL: cantidad inmediata ya está desplegada y probada
   en estructura. C2 carrito autenticado es el siguiente tramo; C3, C4 y
   Promocionar siguen pendientes.

Estado medido al 16-oct-2026:

- Migración global máxima en producción: `20261102000000`.
- C1 COMERCIAL: backend #276 (merge `e75dc1c…`) y tienda #102 (merge
  `db56c4f…`); migración `20261102000000`, postflight `9/9` y
  `crear-intencion-pago` desplegada.
- Cantidad 1 respondió `200` y persistencia `7/7`, sin pago; `max+1` fue
  rechazado `409`; Grisi dio máximo configurado `2` y `max_comprable = 2`;
  cantidad 2 respondió `200` por `13.980.000` centavos.
- El dueño verificó selector, máximo, total, modal y compra invitada.
- No hubo pago real de cantidad 2: webhook, pedido, baja de 2, asiento, correo e
  idempotencia no están medidos para esa cantidad. C1 COMERCIAL no está cerrado
  end-to-end.
- `/cuenta/`, callback y backend C2 están publicados/desplegados.
- El preflight propio de Cuentas C1/C2 fue limpio sobre la migración
  `20261101000000`: cero inconsistencias, ambigüedades o vínculos duplicados.
- Login password, inicialización idempotente y recuperación cross-browser están
  verificados.
- Google Identity Services está publicado en `External / Testing`; el selector
  muestra `magandhi.com` y la prueba controlada confirmó mismo UID, identidad
  Google enlazada y una sola cuenta activa después del segundo acceso.
- Alta nueva por correo con CAPTCHA, confirmación, inicialización y segundo
  login: correcta, mismo UID y una sola cuenta activa.
- Alta Google con usuario realmente nuevo: correcta, identidad única y una sola
  cuenta activa.
- Cuentas C2 queda cerrado técnicamente en preapertura. CAPTCHA sigue activo;
  signup permanece OFF y Google External/Testing.
- La apertura se retoma solo después de redactar, revisar y publicar políticas;
  entonces se prepara Google Production y se activa signup permanente.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; el contrato
público solo expone `agotado` y `max_comprable` acotado, nunca stock exacto;
secretos nunca en Git/chat; rama + PR por cambio; medir producción antes de
afirmar cierre. No convertir evidencia estructural en cierre end-to-end ni
afirmar pago, pedido, baja, asiento, correo o idempotencia de varias unidades sin
medición real.
