import { supabase } from '../../supabase-config.js';
import { CUENTA_INITIALIZE_FUNCTION } from '../cuenta-config.js';

const title = document.getElementById('ct-callback-title');
const message = document.getElementById('ct-callback-message');
const spinner = document.getElementById('ct-callback-spinner');
const back = document.getElementById('ct-callback-back');

const RECOVERY_PROOF_KEY = 'mg_cuenta_recovery_validada';

function cleanSensitiveUrl(url) {
  const clean = new URL(url.href);
  for (const key of ['code', 'token_hash', 'type', 'error', 'error_code', 'error_description']) clean.searchParams.delete(key);
  clean.hash = '';
  history.replaceState(null, '', `${clean.pathname}${clean.search}`);
}

function accountDestination(status, mode = '') {
  const destination = new URL('/cuenta/', window.location.origin);
  if (mode) destination.searchParams.set('mode', mode);
  if (status) destination.searchParams.set('status', status);
  return destination.href;
}

function fail() {
  spinner.hidden = true;
  title.textContent = 'No pudimos confirmar el acceso';
  message.textContent = 'El enlace no es válido o ya venció. Vuelve a Mi cuenta para intentarlo de nuevo.';
  back.hidden = false;
}

async function accountFunctionErrorCode(error, data) {
  if (data?.codigo) return data.codigo;
  try {
    const payload = await error?.context?.json();
    return payload?.codigo || '';
  } catch {
    return '';
  }
}

async function initializeAccount(session) {
  if (!session?.user?.id || !session.user.email_confirmed_at) return;
  const { data, error } = await supabase.functions.invoke(CUENTA_INITIALIZE_FUNCTION, { body: {} });
  if (error || data?.error) {
    const failure = new Error('account_initialization_failed');
    failure.code = await accountFunctionErrorCode(error, data);
    throw failure;
  }
}

async function finishCallback() {
  const original = new URL(window.location.href);
  const captured = window.__MG_AUTH_CALLBACK__ || {};
  delete window.__MG_AUTH_CALLBACK__;
  const code = captured.code || original.searchParams.get('code');
  const tokenHash = captured.tokenHash || original.searchParams.get('token_hash');
  const tokenType = captured.tokenType || original.searchParams.get('type');
  let flow = captured.flow || original.searchParams.get('flow') || 'oauth';
  if (tokenType === 'recovery') flow = 'recovery';
  const providerError = captured.error || original.searchParams.get('error') || original.searchParams.get('error_description');

  // La limpieza principal ocurre en el <head>, antes de cargar recursos. Esta
  // segunda pasada protege el fallback si el módulo se usa fuera de ese HTML.
  cleanSensitiveUrl(original);
  if (providerError) {
    fail();
    return;
  }

  try {
    let session;
    let recoveryVerified = false;
    if (tokenHash) {
      const tipo = tokenType === 'recovery' ? 'recovery' : 'email';
      const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
      if (error) throw error;
      session = data.session;
      recoveryVerified = tipo === 'recovery';
    } else if (code) {
      // El callback conserva compatibilidad con códigos PKCE emitidos antes
      // de publicar GIS y con enlaces que todavía dependan de ese intercambio.
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      session = data.session;
      // Compatibilidad controlada con la plantilla predeterminada de Supabase:
      // un code PKCE solo prueba recuperación si esta ejecución lo intercambió.
      recoveryVerified = flow === 'recovery';
    } else {
      // Una sesión ordinaria ya guardada no convierte una URL manipulada en
      // prueba de recuperación. Siempre exigimos token_hash o code recién usado.
      throw new Error('missing_callback_credential');
    }
    if (!session) throw new Error('missing_session');

    let status = flow === 'signup' ? 'confirmed' : '';
    try {
      await initializeAccount(session);
    } catch (error) {
      if (error?.code === 'CC_NO_DISPONIBLE') {
        await supabase.auth.signOut({ scope: 'local' });
        window.location.replace(accountDestination('account-unavailable'));
        return;
      }
      // Una recuperación no permite cambiar la contraseña hasta comprobar que
      // esta identidad pertenece a la superficie pública, no al panel interno.
      if (flow === 'recovery') {
        await supabase.auth.signOut({ scope: 'local' });
        fail();
        return;
      }
      status = 'session-warning';
    }

    if (flow === 'recovery') {
      if (!recoveryVerified) throw new Error('recovery_not_verified');
      try {
        sessionStorage.setItem(RECOVERY_PROOF_KEY, JSON.stringify({
          uid: session.user.id,
          validadaEn: Date.now(),
        }));
      } catch {
        await supabase.auth.signOut({ scope: 'local' });
        fail();
        return;
      }
      window.location.replace(accountDestination('', 'password'));
      return;
    }
    window.location.replace(accountDestination(status));
  } catch {
    fail();
  }
}

finishCallback();
