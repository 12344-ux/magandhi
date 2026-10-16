---
inclusion: always
---

# MAGANDHI tienda · arranque Cuentas C2 + C2 COMERCIAL

Antes de tocar la tienda pública:

1. Leer `ESTADO-ACTUAL.md`.
2. Usar como punto de entrada global del back-office
   `docs/RELEVO-COMERCIAL-C2-2026-10-16.md`. Si la tarea toca cantidades,
   carrito, checkout, metadata de producto, enlaces, Promocionar o atribución
   comercial, leer además `docs/PLANO-FASE-COMERCIAL.md`.
3. Si la tarea toca Auth o cuentas públicas, leer `cuenta/CONFIGURACION.md` y el
   relevo temático `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
4. No confundir Cuentas C2 con Comercial C2 ni reconstruir Cuentas C1/C2,
   migración, SMTP, TokenHash o Google OAuth.
5. No reconstruir C1 ni C2 COMERCIAL. **C2 Comercial desplegado y probado en
   estructura, apagado hasta C3**. C3 es el siguiente tramo; C4 y Promocionar
   siguen pendientes.

## Comercial · estado medido al 16-oct-2026

- Migración global máxima en producción: `20261103000000`.
- C2 COMERCIAL: backend PR #278 fusionado en
  `a811082cc585ad8d77a98aa346ffbd06ac2ac3f4`; tienda PR #104 con implementación
  `90dcb6d42eabd26935743b5bae4de9bba9692e39`, merge a `main`
  `35a104a1c12b9b9276773bc7d7c082c0733c73a9` y Pages built.
- Preflight `3/3 true`, migración `20261103000000` aplicada y postflight
  `10/10 true`.
- El flag OFF fue probado. Con activación temporal se verificaron agregar,
  consolidar, cambiar y retirar; persistencia entre navegadores; aislamiento
  entre dos cuentas; conflicto entre pestañas; logout y compra invitada.
- Los invariantes `sin_doble_activo` y `sin_huerfanas` dieron `true`.
- C2 no tocó dinero, Wompi, pedidos ni inventario. El flag productivo final es
  `false`; no afirmar checkout multiproducto antes de C3.
- C1 COMERCIAL conserva su límite: cantidad 2 solo llegó a intención, sin pago
  real. Webhook, pedido, baja de 2, asiento, correo e idempotencia no están
  medidos para esa cantidad; C1 no está cerrado end-to-end.

## Cuentas C2 · preapertura separada

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
