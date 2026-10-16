import { supabase } from '../supabase-config.js';
import {
  AUTH_CALLBACK_URL,
  SIGNUP_CALLBACK_URL,
  RECOVERY_CALLBACK_URL,
  TURNSTILE_SITE_KEY,
  CUENTA_INITIALIZE_FUNCTION,
} from './cuenta-config.js';
import { requestPasswordRecovery } from './cuenta-auth-helpers.js';

const views = ['loading', 'auth', 'recovery', 'password', 'session'];
const captchaWidgets = new Map();
let initializePromise = null;
let initializeUserId = null;
let authReady = false;
const RECOVERY_PROOF_KEY = 'mg_cuenta_recovery_validada';
const RECOVERY_PROOF_MAX_AGE_MS = 10 * 60 * 1000;

const byId = (id) => document.getElementById(id);

function showView(name, shouldFocus = true) {
  for (const view of views) {
    const element = byId(`ct-${view}`);
    if (element) element.hidden = view !== name;
  }
  if (!shouldFocus) return;
  const focusTargets = {
    auth: '#ct-auth [role="tab"][aria-selected="true"]',
    recovery: '#ct-recovery-title',
    password: '#ct-password-title',
    session: '#ct-session-title',
  };
  const selector = focusTargets[name];
  const target = selector ? document.querySelector(selector) : null;
  if (target) requestAnimationFrame(() => target.focus());
}

function message(id, text = '', tone = 'info') {
  const element = byId(id);
  if (!element) return;
  element.textContent = text;
  if (text) element.dataset.tone = tone;
  else delete element.dataset.tone;
}

function setBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
    button.removeAttribute('aria-busy');
    delete button.dataset.label;
  }
}

function normalizedEmail(input) {
  return String(input?.value || '').trim().toLowerCase();
}

function consumeRecoveryProof(session) {
  try {
    const raw = sessionStorage.getItem(RECOVERY_PROOF_KEY);
    sessionStorage.removeItem(RECOVERY_PROOF_KEY);
    if (!raw || !session?.user?.id) return false;
    const proof = JSON.parse(raw);
    return proof?.uid === session.user.id &&
      Number.isFinite(proof?.validadaEn) &&
      Date.now() - proof.validadaEn >= 0 &&
      Date.now() - proof.validadaEn <= RECOVERY_PROOF_MAX_AGE_MS;
  } catch {
    return false;
  }
}

function validateEmail(input) {
  const valid = Boolean(input && input.validity.valid && normalizedEmail(input));
  if (input) input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  return valid;
}

function validatePassword(input, minimum = 1) {
  const valid = Boolean(input && input.value.length >= minimum);
  if (input) input.setAttribute('aria-invalid', valid ? 'false' : 'true');
  return valid;
}

function humanAuthError(error, context) {
  const code = String(error?.code || '').toLowerCase();
  const status = Number(error?.status || 0);
  if (code.includes('captcha')) return 'No pudimos validar el desafío de seguridad. Inténtalo de nuevo.';
  if (code === 'over_request_rate_limit' || code.includes('rate_limit') || status === 429) {
    return 'Hiciste varios intentos seguidos. Espera un momento antes de volver a intentar.';
  }
  if (context === 'login') {
    return 'No pudimos iniciar sesión. Revisa el correo y la contraseña e inténtalo de nuevo.';
  }
  if (context === 'password' && (code === 'same_password' || code.includes('different_password'))) {
    return 'Elige una contraseña diferente a la anterior.';
  }
  if (context === 'register' && code === 'signup_disabled') {
    return 'La creación de cuentas todavía no está disponible. Inténtalo de nuevo más adelante.';
  }
  if (context === 'recovery') {
    return 'No pudimos enviar las instrucciones en este momento. Espera un poco e inténtalo de nuevo.';
  }
  return 'No pudimos completar la solicitud. Revisa tu conexión e inténtalo de nuevo.';
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
  const userId = session?.user?.id;
  if (!userId || !session.user.email_confirmed_at) return;
  if (initializePromise && initializeUserId === userId) return initializePromise;
  // Una promesa resuelta nunca puede autorizar al siguiente usuario de la
  // pestaña. Si cambió el UID, comienza una inicialización nueva.
  initializePromise = null;
  initializeUserId = userId;
  initializePromise = (async () => {
    const { data, error } = await supabase.functions.invoke(CUENTA_INITIALIZE_FUNCTION, { body: {} });
    if (error || data?.error) {
      const failure = new Error('account_initialization_failed');
      failure.code = await accountFunctionErrorCode(error, data);
      throw failure;
    }
    return data;
  })();
  try {
    return await initializePromise;
  } catch (error) {
    if (initializeUserId === userId) {
      initializePromise = null;
      initializeUserId = null;
    }
    throw error;
  }
}

async function showSession(session, status) {
  showView('session');
  byId('ct-session-email').textContent = session?.user?.email || '';
  message('ct-session-message', 'Terminando de preparar tu cuenta…', 'info');

  try {
    await initializeAccount(session);
    if (status === 'confirmed') message('ct-session-message', 'Correo confirmado. Tu cuenta está lista.', 'success');
    else if (status === 'password-updated') message('ct-session-message', 'Tu contraseña quedó actualizada.', 'success');
    else if (status === 'session-warning') message('ct-session-message', 'La preparación pendiente terminó correctamente. Tu cuenta está lista.', 'success');
    else message('ct-session-message');
  } catch (error) {
    if (error?.code === 'CC_NO_DISPONIBLE') {
      await supabase.auth.signOut({ scope: 'local' });
      initializePromise = null;
      initializeUserId = null;
      setTab('login');
      showView('auth');
      message('ct-login-message', 'No pudimos habilitar esta cuenta. Si necesitas ayuda, escríbenos por nuestros canales de atención.', 'error');
      return;
    }
    message('ct-session-message', 'Tu sesión está activa, pero no pudimos terminar de preparar la cuenta. Inténtalo de nuevo más tarde.', 'info');
  }
}

function setTab(tabName, focus = false) {
  const login = tabName === 'login';
  const loginTab = byId('ct-tab-login');
  const registerTab = byId('ct-tab-register');
  const loginPanel = byId('ct-panel-login');
  const registerPanel = byId('ct-panel-register');
  loginTab.setAttribute('aria-selected', String(login));
  registerTab.setAttribute('aria-selected', String(!login));
  loginTab.tabIndex = login ? 0 : -1;
  registerTab.tabIndex = login ? -1 : 0;
  loginPanel.hidden = !login;
  registerPanel.hidden = login;
  message('ct-login-message');
  message('ct-register-message');
  if (focus) (login ? loginTab : registerTab).focus();
}

function getCaptchaToken(name) {
  if (!TURNSTILE_SITE_KEY) return undefined;
  const entry = captchaWidgets.get(name);
  return entry?.token || undefined;
}

function resetCaptcha(name) {
  if (!TURNSTILE_SITE_KEY || !window.turnstile) return;
  const entry = captchaWidgets.get(name);
  if (!entry) return;
  entry.token = '';
  window.turnstile.reset(entry.id);
}

function requireCaptcha(name, messageId) {
  if (!TURNSTILE_SITE_KEY || getCaptchaToken(name)) return true;
  message(messageId, 'Completa el desafío de seguridad antes de continuar.', 'error');
  return false;
}

async function setupTurnstile() {
  if (!TURNSTILE_SITE_KEY) return;
  await new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  document.querySelectorAll('[data-captcha-for]').forEach((container) => {
    const name = container.dataset.captchaFor;
    const entry = { id: null, token: '' };
    entry.id = window.turnstile.render(container, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: 'light',
      size: 'flexible',
      callback(token) { entry.token = token; },
      'expired-callback'() { entry.token = ''; },
      'error-callback'() { entry.token = ''; },
    });
    captchaWidgets.set(name, entry);
  });
}

async function submitLogin(event) {
  event.preventDefault();
  const emailInput = byId('ct-login-email');
  const passwordInput = byId('ct-login-password');
  if (!validateEmail(emailInput) || !validatePassword(passwordInput)) {
    message('ct-login-message', 'Escribe un correo válido y tu contraseña para continuar.', 'error');
    return;
  }
  if (!requireCaptcha('login', 'ct-login-message')) return;
  const button = byId('ct-login-submit');
  setBusy(button, true, 'Iniciando sesión…');
  message('ct-login-message');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail(emailInput),
      password: passwordInput.value,
      options: { captchaToken: getCaptchaToken('login') },
    });
    if (error) throw error;
    await showSession(data.session);
  } catch (error) {
    message('ct-login-message', humanAuthError(error, 'login'), 'error');
    resetCaptcha('login');
  } finally {
    setBusy(button, false);
  }
}

async function submitRegister(event) {
  event.preventDefault();
  const emailInput = byId('ct-register-email');
  const passwordInput = byId('ct-register-password');
  const confirmInput = byId('ct-register-password-confirm');
  const emailValid = validateEmail(emailInput);
  const passwordValid = validatePassword(passwordInput, 8);
  const matches = passwordValid && passwordInput.value === confirmInput.value;
  confirmInput.setAttribute('aria-invalid', matches ? 'false' : 'true');
  if (!emailValid || !passwordValid || !matches) {
    message('ct-register-message', matches ? 'Revisa los campos marcados antes de continuar.' : 'Las contraseñas deben tener al menos 8 caracteres y coincidir.', 'error');
    return;
  }
  if (!requireCaptcha('register', 'ct-register-message')) return;
  const button = byId('ct-register-submit');
  setBusy(button, true, 'Creando cuenta…');
  message('ct-register-message');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail(emailInput),
      password: passwordInput.value,
      options: {
        emailRedirectTo: SIGNUP_CALLBACK_URL,
        captchaToken: getCaptchaToken('register'),
      },
    });
    if (error) {
      const enumerable = ['user_already_exists', 'email_exists'].includes(String(error.code || '').toLowerCase());
      if (!enumerable) throw error;
    }
    // La apertura de C2 exige confirmación. Si un entorno se configuró por error
    // con auto-confirmación, no conservamos esa sesión creada por contraseña.
    if (data?.session) await supabase.auth.signOut({ scope: 'local' });
    event.currentTarget.reset();
    message('ct-register-message', 'Si podemos completar el registro con ese correo, recibirás un enlace de confirmación. Revisa también spam o promociones.', 'success');
  } catch (error) {
    message('ct-register-message', humanAuthError(error, 'register'), 'error');
  } finally {
    resetCaptcha('register');
    setBusy(button, false);
  }
}

async function startGoogle() {
  const button = byId('ct-google');
  setBusy(button, true, 'Conectando con Google…');
  message('ct-google-message');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: AUTH_CALLBACK_URL },
  });
  if (error) {
    message('ct-google-message', 'No pudimos abrir el acceso con Google. Inténtalo de nuevo.', 'error');
    setBusy(button, false);
  }
}

async function submitRecovery(event) {
  event.preventDefault();
  const emailInput = byId('ct-recovery-email');
  if (!validateEmail(emailInput)) {
    message('ct-recovery-message', 'Escribe un correo válido para continuar.', 'error');
    return;
  }
  if (!requireCaptcha('recovery', 'ct-recovery-message')) return;
  const button = byId('ct-recovery-submit');
  setBusy(button, true, 'Enviando enlace…');
  message('ct-recovery-message');
  try {
    await requestPasswordRecovery(supabase.auth, normalizedEmail(emailInput), {
      redirectTo: RECOVERY_CALLBACK_URL,
      captchaToken: getCaptchaToken('recovery'),
    });
    event.currentTarget.reset();
    message('ct-recovery-message', 'Si existe una cuenta asociada, recibirás un enlace para crear una nueva contraseña. Revisa también spam o promociones.', 'success');
  } catch (error) {
    message('ct-recovery-message', humanAuthError(error, 'recovery'), 'error');
  } finally {
    resetCaptcha('recovery');
    setBusy(button, false);
  }
}

async function submitNewPassword(event) {
  event.preventDefault();
  const passwordInput = byId('ct-new-password');
  const confirmInput = byId('ct-new-password-confirm');
  const valid = validatePassword(passwordInput, 8);
  const matches = valid && passwordInput.value === confirmInput.value;
  confirmInput.setAttribute('aria-invalid', matches ? 'false' : 'true');
  if (!valid || !matches) {
    message('ct-password-message', 'Las contraseñas deben tener al menos 8 caracteres y coincidir.', 'error');
    return;
  }
  const button = byId('ct-password-submit');
  setBusy(button, true, 'Guardando contraseña…');
  message('ct-password-message');
  try {
    const { data, error } = await supabase.auth.updateUser({ password: passwordInput.value });
    if (error) throw error;
    const { data: sessionData } = await supabase.auth.getSession();
    await showSession(sessionData.session || { user: data.user }, 'password-updated');
    history.replaceState(null, '', window.location.pathname);
  } catch (error) {
    message('ct-password-message', humanAuthError(error, 'password'), 'error');
  } finally {
    setBusy(button, false);
  }
}

async function signOutLocal() {
  const button = byId('ct-signout');
  setBusy(button, true, 'Cerrando sesión…');
  message('ct-session-message');
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  setBusy(button, false);
  if (error) {
    message('ct-session-message', 'No pudimos cerrar la sesión en este dispositivo. Inténtalo de nuevo.', 'error');
    return;
  }
  initializePromise = null;
  initializeUserId = null;
  setTab('login');
  showView('auth');
  message('ct-login-message', 'La sesión se cerró en este dispositivo.', 'success');
}

function wireEvents() {
  byId('ct-tab-login').addEventListener('click', () => setTab('login'));
  byId('ct-tab-register').addEventListener('click', () => setTab('register'));
  byId('ct-login-form').addEventListener('submit', submitLogin);
  byId('ct-register-form').addEventListener('submit', submitRegister);
  byId('ct-google').addEventListener('click', startGoogle);
  byId('ct-show-recovery').addEventListener('click', () => showView('recovery'));
  byId('ct-recovery-back').addEventListener('click', () => showView('auth'));
  byId('ct-recovery-form').addEventListener('submit', submitRecovery);
  byId('ct-password-form').addEventListener('submit', submitNewPassword);
  byId('ct-signout').addEventListener('click', signOutLocal);
  document.querySelector('.ct-tabs').addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    setTab(byId('ct-tab-login').getAttribute('aria-selected') === 'true' ? 'register' : 'login', true);
  });
}

async function boot() {
  wireEvents();
  setupTurnstile().catch(() => {
    message('ct-google-message', 'No pudimos cargar el desafío de seguridad. Recarga la página antes de continuar.', 'error');
  });

  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  const status = params.get('status');
  const { data, error } = await supabase.auth.getSession();
  authReady = true;
  if (error) {
    showView('auth');
    message('ct-login-message', 'No pudimos comprobar tu sesión. Recarga la página e inténtalo de nuevo.', 'error');
    return;
  }
  if (mode === 'password') {
    history.replaceState(null, '', window.location.pathname);
    if (data.session && consumeRecoveryProof(data.session)) {
      showView('password');
    } else if (data.session) {
      await showSession(data.session);
    } else {
      showView('recovery');
      message('ct-recovery-message', 'El enlace ya no es válido. Solicita uno nuevo.', 'error');
    }
    return;
  }
  if (data.session) await showSession(data.session, status);
  else {
    setTab(params.get('tab') === 'register' ? 'register' : 'login');
    showView('auth');
    if (status === 'callback-error') message('ct-login-message', 'El enlace no es válido o ya venció. Solicita uno nuevo si lo necesitas.', 'error');
    if (status === 'account-unavailable') message('ct-login-message', 'No pudimos habilitar esta cuenta. Si necesitas ayuda, escríbenos por nuestros canales de atención.', 'error');
  }
}

supabase.auth.onAuthStateChange((event) => {
  if (!authReady) return;
  if (event === 'SIGNED_OUT') {
    initializePromise = null;
    initializeUserId = null;
    if (!new URLSearchParams(location.search).has('mode')) showView('auth');
  }
});

boot();
