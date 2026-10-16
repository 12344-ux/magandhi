// Configuración pública del frontend de cuentas. No contiene secretos.
// Las URLs de Auth se fijan al dominio canónico para impedir redirects abiertos.
export const CANONICAL_SITE_URL = 'https://magandhi.com';
export const ACCOUNT_URL = `${CANONICAL_SITE_URL}/cuenta/`;
export const AUTH_CALLBACK_URL = `${CANONICAL_SITE_URL}/cuenta/callback/`;
export const SIGNUP_CALLBACK_URL = `${AUTH_CALLBACK_URL}?flow=signup`;
export const RECOVERY_CALLBACK_URL = `${AUTH_CALLBACK_URL}?flow=recovery`;

// Identificador público del cliente Web de Google. Autoriza únicamente los
// orígenes declarados en Google Cloud; el Client Secret nunca va al frontend.
export const GOOGLE_CLIENT_ID = '975249312497-go5nqtl8ml9mr4p8smbo8mg4ofqlchto.apps.googleusercontent.com';

// Clave PÚBLICA de Cloudflare Turnstile para magandhi.com. La secret key se
// guarda únicamente en el servidor/dashboard y NUNCA en este repositorio.
// CAPTCHA debe permanecer apagado en Supabase hasta publicar y medir el widget.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAFYjHiX83pwXm9WQ';

// El frontend exige un token resuelto antes de enviar correo/contraseña o
// recuperación. Supabase CAPTCHA se activa solo después de publicar este valor.
export const TURNSTILE_REQUIRED = true;

export const CUENTA_INITIALIZE_FUNCTION = 'cuenta-inicializar';
