---
inclusion: always
---

# MAGANDHI tienda · arranque C2

Antes de tocar cuentas públicas:

1. Leer `ESTADO-ACTUAL.md` y `cuenta/CONFIGURACION.md`.
2. Leer en el repo `12344-ux.github.io` el relevo vigente
   `docs/RELEVO-CUENTAS-C2-2026-10-16.md`.
3. No reconstruir C1/C2, migración, SMTP, TokenHash ni Google OAuth.
4. Si la tarea toca cantidades, carrito, metadata de producto, enlaces o
   atribución comercial, leer en el back-office
   `docs/PLANO-FASE-COMERCIAL.md`. Sus frentes están aprobados para construir,
   pero no están desplegados mientras el contexto no aporte evidencia.

Estado medido al 16-oct-2026:

- `/cuenta/`, callback y backend C2 están publicados/desplegados.
- Migración máxima: `20261101000000`; preflight limpio.
- Login password, inicialización idempotente y recuperación cross-browser están
  verificados.
- Google Identity Services está publicado en `External / Testing`; el selector
  muestra `magandhi.com` y la prueba controlada confirmó mismo UID, identidad
  Google enlazada y una sola cuenta activa después del segundo acceso.
- Alta nueva por correo con CAPTCHA, confirmación, inicialización y segundo
  login: correcta, mismo UID y una sola cuenta activa.
- Alta Google con usuario realmente nuevo: correcta, identidad única y una sola
  cuenta activa.
- C2 queda cerrado técnicamente en preapertura. CAPTCHA sigue activo; signup
  permanece OFF y Google External/Testing.
- La apertura se retoma solo después de redactar, revisar y publicar políticas;
  entonces se prepara Google Production y se activa signup permanente.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; secretos nunca
en Git/chat; rama + PR por cambio; medir producción antes de afirmar cierre.
