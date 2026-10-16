# Configuración de Cuenta C2

El frontend no contiene secretos. Usa el cliente público único de `../supabase-config.js` y URLs de retorno fijas de `cuenta-config.js`.

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

   **Confirm signup** — el `RedirectTo` ya contiene `?flow=signup`:

   ```html
   <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirmar mi correo</a>
   ```

   **Reset password** — el `RedirectTo` ya contiene `?flow=recovery`:

   ```html
   <a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=recovery">Crear una nueva contraseña</a>
   ```

   No usar enlaces manuales con correo, UID o tokens distintos de
   `.TokenHash`. Probar cada enlace en el navegador original y en otro.
5. Habilitar Google y registrar en Google la URL de callback que indique Supabase para el proyecto. El navegador vuelve después a la URL canónica de MAGANDHI.
6. Desplegar `cuenta-inicializar`. Debe validar el JWT, exigir correo confirmado y ser idempotente; el frontend nunca escribe `cuentas_cliente` directamente.
7. Verificar SMTP, plantillas, límites de envío y rechazo del login interno antes de encender el registro público.

## Cloudflare Turnstile

`TURNSTILE_SITE_KEY` en `cuenta-config.js` es una **site key pública** y comienza vacía. Con ella vacía, el frontend omite el widget para permitir desarrollo **solo mientras CAPTCHA esté apagado en Supabase Auth**.

Antes de habilitar CAPTCHA en Supabase:

1. Crear un widget Turnstile válido para `magandhi.com` (y los hosts de prueba necesarios).
2. Pegar únicamente su site key pública en `TURNSTILE_SITE_KEY`.
3. Configurar la secret key directamente en Supabase/Cloudflare; nunca guardarla en este repositorio.
4. Probar registro, login y recuperación, incluido token vencido, rate limit y fallo de desafío.

Si CAPTCHA se habilita en Supabase dejando la site key vacía, Auth rechazará correctamente las solicitudes; esa combinación no está preparada para producción.

## Alcance

C2 solo gestiona acceso, confirmación, recuperación y cierre local. No añade carrito, panel de pedidos, perfil, direcciones ni rellena el checkout. La compra invitada existente permanece independiente.
