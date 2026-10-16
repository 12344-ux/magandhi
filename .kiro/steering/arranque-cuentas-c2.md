---
inclusion: always
---

# MAGANDHI tienda · arranque C2

Antes de tocar cuentas públicas:

1. Leer `ESTADO-ACTUAL.md` y `cuenta/CONFIGURACION.md`.
2. Leer en el repo `12344-ux.github.io` el relevo vigente
   `docs/RELEVO-CUENTAS-C2-2026-10-16.md`.
3. No reconstruir C1/C2, migración, SMTP, TokenHash ni Google OAuth.

Estado medido al 16-oct-2026:

- `/cuenta/`, callback y backend C2 están publicados/desplegados.
- Migración máxima: `20261101000000`; preflight limpio.
- Login password, inicialización idempotente y recuperación cross-browser están
  verificados.
- Google Identity Services está publicado en `External / Testing`; el selector
  muestra `magandhi.com` y la prueba controlada confirmó mismo UID, identidad
  Google enlazada y una sola cuenta activa después del segundo acceso.
- Signup sigue apagado. CAPTCHA de Supabase y Turnstile están activos; login y
  recuperación con token válido, omisión `captcha_failed`/400 y renovación tras
  expiración están medidos.
- Siguiente exacto: registro nuevo controlado por correo. Después probar Google
  con un usuario realmente nuevo y cerrar políticas antes de abrir.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; secretos nunca
en Git/chat; rama + PR por cambio; medir producción antes de afirmar cierre.
