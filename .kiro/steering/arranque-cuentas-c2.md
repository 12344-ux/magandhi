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
- Google está configurado `External / Testing` y habilitado en Supabase, pero
  falta probar el botón real.
- Signup y CAPTCHA siguen apagados; `TURNSTILE_SITE_KEY` está vacía.
- Siguiente exacto: crear manualmente un usuario Auth autoconfirmado con el
  correo del Google Test User y probar `Continuar con Google` en ventana privada
  sin encender signup.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; secretos nunca
en Git/chat; rama + PR por cambio; medir producción antes de afirmar cierre.
