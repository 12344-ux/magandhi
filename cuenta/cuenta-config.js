// Configuración pública del frontend de cuentas. No contiene secretos.
// Las URLs de Auth se fijan al dominio canónico para impedir redirects abiertos.
export const CANONICAL_SITE_URL = 'https://magandhi.com';
export const ACCOUNT_URL = `${CANONICAL_SITE_URL}/cuenta/`;
export const AUTH_CALLBACK_URL = `${CANONICAL_SITE_URL}/cuenta/callback/`;
export const SIGNUP_CALLBACK_URL = `${AUTH_CALLBACK_URL}?flow=signup`;
export const RECOVERY_CALLBACK_URL = `${AUTH_CALLBACK_URL}?flow=recovery`;

// Clave PÚBLICA de Cloudflare Turnstile. Déjala vacía durante desarrollo solo
// mientras CAPTCHA permanezca apagado en Supabase Auth. Antes de encenderlo en
// Supabase, crea el widget para magandhi.com y pega aquí su site key pública.
// La secret key de Turnstile pertenece al servidor/dashboard y NUNCA al repo.
export const TURNSTILE_SITE_KEY = '';

export const CUENTA_INITIALIZE_FUNCTION = 'cuenta-inicializar';
