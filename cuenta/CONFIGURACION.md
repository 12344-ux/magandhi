# Configuración de Cuenta C2

El frontend no contiene secretos. Usa el cliente público único de `../supabase-config.js` y URLs de retorno fijas de `cuenta-config.js`.

## Estado medido · 16-oct-2026

- [x] C2 fusionado y publicado (tienda PR #93; backend PR #270).
- [x] Migración `20261101000000` aplicada; preflight C1/C2 presente y cinco
  medidas de integridad en cero.
- [x] `cuenta-inicializar` desplegada con Verify JWT.
- [x] Site URL y tres redirects de callback configurados.
- [x] `auth.magandhi.com` verificado en Resend mediante Porkbun.
- [x] Custom SMTP guardado con `MAGANDHI <cuenta@auth.magandhi.com>`.
- [x] Confirmación/recuperación TokenHash y cambio de contraseña probados,
  incluso abriendo el enlace en otro navegador.
- [x] Google OAuth configurado `External / Testing`, test user, cliente web,
  provider Supabase y callback correctos.
- [x] Flujo OAuth redirigido probado: mismo UID, identidad Google enlazada y una
  sola cuenta activa después del segundo acceso.
- [x] Google Identity Services publicado mediante tienda PR #95 y medido en
  producción: el selector muestra `magandhi.com`, conserva el mismo UID, enlaza
  la misma identidad y mantiene una sola cuenta activa tras el segundo acceso.
- [x] Widget Cloudflare Turnstile administrado creado para `magandhi.com` y
  site key pública configurada en el frontend; CAPTCHA sigue apagado.
- [ ] Publicar y medir el widget en móvil y escritorio.
- [ ] Probar registro nuevo por correo y Google con CAPTCHA.
- [ ] Cerrar políticas y decidir apertura pública.

**Siguiente exacto:** publicar la site key mediante rama + PR y comprobar que
el widget flexible carga correctamente en móvil y escritorio. Solo después se
guarda el secret en Supabase y se enciende CAPTCHA; signup permanece apagado.
Relevo completo: `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.

## Supabase Auth

Antes de habilitar registros en producción:

1. Mantener confirmación de correo obligatoria.
2. Configurar `https://magandhi.com` como Site URL.
3. Añadir a la lista de redirects permitidos:
   - `https://magandhi.com/cuenta/callback/`
   - `https://magandhi.com/cuenta/callback/?flow=signup`
   - `https://magandhi.com/cuenta/callback/?flow=recovery`
4. Personalizar las plantillas para que confirmación y recuperación funcionen
   incluso si el enlace se abre en otro navegador. El callback acepta
   `token_hash` y lo verifica directamente con Supabase:

   **Confirm signup** — producción usa una URL directa y fija:

   ```html
   <a href="https://magandhi.com/cuenta/callback/?flow=signup&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirmar mi correo</a>
   ```

   **Reset password** — producción usa una URL directa y fija:

   ```html
   <a href="https://magandhi.com/cuenta/callback/?flow=recovery&amp;token_hash={{ .TokenHash }}&amp;type=recovery">Crear una nueva contraseña</a>
   ```

   No usar enlaces manuales con correo, UID o tokens distintos de
   `.TokenHash`. Probar cada enlace en el navegador original y en otro.
5. Google permanece `External / Testing`. El botón web usa Google Identity
   Services desde `https://magandhi.com`, obtiene un ID token con nonce y lo
   valida mediante `signInWithIdToken`; el Client ID de `cuenta-config.js` es
   público y el Client Secret sigue únicamente en Supabase. El callback OAuth
   `https://bxlzipwxyxdtffnuizbz.supabase.co/auth/v1/callback` se conserva
   durante la transición, pero no participa en el nuevo botón. No pasar a
   Production antes de políticas y pruebas finales.
6. `cuenta-inicializar` está desplegada con Verify JWT; valida el JWT, exige
   correo confirmado y es idempotente.
7. SMTP, plantillas y recuperación cross-browser están medidos. El límite Auth
   inicial es 30 correos/hora y no debe aumentarse antes de CAPTCHA.

## Google Identity Services

El botón oficial carga `https://accounts.google.com/gsi/client` directamente y
usa popup, nonce de un solo uso e ID token. Si se aplica una política CSP desde
un CDN o proxy, debe autorizar los recursos GIS necesarios en `script-src`,
`frame-src`, `connect-src` y `style-src` para `https://accounts.google.com`.
Una política `Cross-Origin-Opener-Policy` estricta debe conservar la comunicación
del popup; validar `same-origin-allow-popups` antes de publicarla en esta ruta.
No relajar globalmente la CSP ni copiar el script de Google al repositorio.

Producción quedó medida en ventana privada: el selector muestra `magandhi.com`,
la sesión regresa sin advertencias y Supabase conserva el mismo UID, la identidad
Google enlazada y una sola fila activa antes y después del segundo acceso.

## Cloudflare Turnstile

`TURNSTILE_SITE_KEY` en `cuenta-config.js` contiene únicamente la **site key
pública** del widget administrado para `magandhi.com`. La secret permanece fuera
del repositorio. `TURNSTILE_REQUIRED=false` mantiene una fase de observación:
el widget se renderiza perezosamente solo cuando su formulario está visible y
puede enviar token, pero una falla de Cloudflare todavía no bloquea Auth mientras
CAPTCHA también siga apagado en Supabase.

Antes de habilitar CAPTCHA en Supabase:

1. Fusionar/publicar la site key y comprobar el widget en móvil y escritorio.
2. Cambiar `TURNSTILE_REQUIRED` a `true` mediante una segunda rama + PR, después
   de que el widget publicado quede medido.
3. Guardar la secret key directamente en Supabase Auth; nunca en este
   repositorio, documentación o chat.
4. Encender CAPTCHA manteniendo signup apagado.
5. Probar login y recuperación con token válido, ausente y vencido, además de
   rate limit y fallo de desafío.

No encender CAPTCHA antes de comprobar que el frontend publicado entrega tokens;
Auth rechazaría correctamente las solicitudes sin token.

## Alcance

C2 solo gestiona acceso, confirmación, recuperación y cierre local. No añade carrito, panel de pedidos, perfil, direcciones ni rellena el checkout. La compra invitada existente permanece independiente.
