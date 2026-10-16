import { readFile } from 'node:fs/promises';

const base = new URL('./', import.meta.url);
const required = [
  'index.html', 'cuenta.css', 'cuenta.js', 'cuenta-config.js', 'cuenta-auth-helpers.js',
  'callback/index.html', 'callback/callback.js'
];

const files = Object.fromEntries(await Promise.all(required.map(async (path) => {
  const text = await readFile(new URL(path, base), 'utf8');
  return [path, text];
})));

const product = await readFile(new URL('../producto/index.html', base), 'utf8');
const { requestPasswordRecovery } = await import('./cuenta-auth-helpers.js');
let recoveryErrorPropagated = false;
try {
  await requestPasswordRecovery({
    async resetPasswordForEmail() { return { error: { code: 'captcha_failed' } }; },
  }, 'persona@example.invalid', {});
} catch (error) {
  recoveryErrorPropagated = error?.code === 'captcha_failed';
}
const recoverySuccess = await requestPasswordRecovery({
  async resetPasswordForEmail() { return { error: null }; },
}, 'persona@example.invalid', {});

const checks = [
  ['PKCE explícito', (await readFile(new URL('../supabase-config.js', base), 'utf8')).includes("flowType: 'pkce'")],
  ['detección implícita desactivada', (await readFile(new URL('../supabase-config.js', base), 'utf8')).includes('detectSessionInUrl: false')],
  ['callback noindex', /noindex/.test(files['callback/index.html'])],
  ['callback no-referrer', /no-referrer/.test(files['callback/index.html'])],
  ['intercambio PKCE conservado para enlaces compatibles', /exchangeCodeForSession/.test(files['callback/callback.js'])],
  ['TokenHash para correos en otro navegador', /verifyOtp\(\{ token_hash: tokenHash/.test(files['callback/callback.js'])],
  ['limpieza de códigos y token hash', /'token_hash'/.test(files['callback/index.html']) && /history\.replaceState/.test(files['callback/callback.js'])],
  ['cierre local', /scope:\s*'local'/.test(files['cuenta.js'])],
  ['inicialización server-side', /cuenta-inicializar/.test(files['cuenta-config.js'])],
  ['Google GIS con ID token y nonce',
    /accounts\.google\.com\/gsi\/client/.test(files['cuenta.js']) &&
    /signInWithIdToken/.test(files['cuenta.js']) &&
    /token:\s*response\.credential/.test(files['cuenta.js']) &&
    /crypto\.getRandomValues/.test(files['cuenta.js']) &&
    /SHA-256/.test(files['cuenta.js']) &&
    /nonce:\s*hashed/.test(files['cuenta.js']) &&
    /nonce,/.test(files['cuenta.js']) &&
    /container\.inert\s*=\s*true/.test(files['cuenta.js']) &&
    /googleCredentialGeneration\s*=\s*null/.test(files['cuenta.js']) &&
    /GOOGLE_CLIENT_ID\s*=\s*'[^']+\.apps\.googleusercontent\.com'/.test(files['cuenta-config.js']) &&
    !/signInWithOAuth/.test(files['cuenta.js'])],
  ['recuperación exige comprobante reciente', /consumeRecoveryProof\(data\.session\)/.test(files['cuenta.js']) && /missing_callback_credential/.test(files['callback/callback.js'])],
  ['recuperación propaga errores devueltos por Supabase', recoveryErrorPropagated],
  ['recuperación acepta una respuesta sin error', recoverySuccess === true],
  ['inicialización ligada al UID actual', /initializeUserId === userId/.test(files['cuenta.js']) && /initializeUserId = null/.test(files['cuenta.js'])],
  ['Turnstile obligatorio, perezoso y flexible',
    /TURNSTILE_SITE_KEY\s*=\s*'0x[0-9A-Za-z_-]+'/.test(files['cuenta-config.js']) &&
    /TURNSTILE_REQUIRED\s*=\s*true/.test(files['cuenta-config.js']) &&
    /ensureCaptcha/.test(files['cuenta.js']) &&
    /getClientRects/.test(files['cuenta.js']) &&
    /size:\s*'flexible'/.test(files['cuenta.js'])],
  ['sin escritura directa del puente', !/\.from\(['"]cuentas_cliente['"]\)/.test(files['cuenta.js'] + files['callback/callback.js'])],
  ['checkout invitado permanece presente', /crear-intencion-pago/.test(product) && /id="mg-comprar"/.test(product)],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) console.log(`${ok ? 'OK' : 'FALLO'} · ${name}`);
if (failed.length) process.exitCode = 1;
else console.log(`\n${checks.length}/${checks.length} comprobaciones C2 superadas.`);
