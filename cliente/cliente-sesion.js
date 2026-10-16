import { supabase } from '../supabase-config.js';

const CUENTA_INICIALIZAR = 'cuenta-inicializar';
const inicializacionesPorUid = new Map();
const observadores = new Set();
let ultimoUid = null;
let generacion = 0;
let estado = Object.freeze({ estado: 'comprobando', uid: null, sesion: null, codigo: '' });

function publicar(siguiente) {
  estado = Object.freeze(siguiente);
  for (const observar of observadores) {
    try { observar(estado); } catch (error) { console.error('Error al observar la sesión de cliente:', error); }
  }
  window.dispatchEvent(new CustomEvent('magandhi:sesion-cliente', { detail: estado }));
}

async function codigoFuncion(error, data) {
  if (typeof data?.codigo === 'string') return data.codigo;
  try {
    const payload = await error?.context?.json();
    return typeof payload?.codigo === 'string' ? payload.codigo : '';
  } catch {
    return '';
  }
}

function inicializarCuenta(sesion) {
  const uid = sesion?.user?.id;
  if (!uid || !sesion.user.email_confirmed_at) return Promise.reject(new Error('sesion_no_confirmada'));
  if (inicializacionesPorUid.has(uid)) return inicializacionesPorUid.get(uid);

  const promesa = (async () => {
    const { data, error } = await supabase.functions.invoke(CUENTA_INICIALIZAR, { body: {} });
    if (error || data?.error) {
      const fallo = new Error('cuenta_no_inicializada');
      fallo.code = await codigoFuncion(error, data);
      throw fallo;
    }
    return data;
  })();

  inicializacionesPorUid.set(uid, promesa);
  promesa.catch(() => {
    if (inicializacionesPorUid.get(uid) === promesa) inicializacionesPorUid.delete(uid);
  });
  return promesa;
}

async function validarSesion(sesion, tokenGeneracion) {
  const uid = sesion?.user?.id || null;
  if (!uid || !sesion?.user?.email_confirmed_at) {
    if (tokenGeneracion === generacion) publicar({ estado: 'sin-sesion', uid: null, sesion: null, codigo: '' });
    return;
  }

  try {
    await inicializarCuenta(sesion);
    if (tokenGeneracion !== generacion) return;
    publicar({ estado: 'valida', uid, sesion, codigo: '' });
  } catch (error) {
    if (tokenGeneracion !== generacion) return;
    const codigo = typeof error?.code === 'string' ? error.code : '';
    publicar({ estado: 'error', uid: null, sesion: null, codigo });
    if (codigo === 'CC_NO_DISPONIBLE') {
      inicializacionesPorUid.delete(uid);
      try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* El estado ya quedó cerrado. */ }
    }
  }
}

function revisar(sesion) {
  const uid = sesion?.user?.id || null;
  if (uid !== ultimoUid) {
    if (ultimoUid) inicializacionesPorUid.delete(ultimoUid);
    ultimoUid = uid;
  }
  const cambioUid = uid !== estado.uid;
  const tokenGeneracion = ++generacion;
  if (cambioUid || !uid || !sesion?.user?.email_confirmed_at) {
    publicar({ estado: 'comprobando', uid: null, sesion: null, codigo: '' });
  }
  validarSesion(sesion, tokenGeneracion);
}

export function observarSesionCliente(observador) {
  if (typeof observador !== 'function') return () => {};
  observadores.add(observador);
  observador(estado);
  return () => observadores.delete(observador);
}

export function obtenerSesionCliente() {
  return estado;
}

export async function revalidarSesionCliente(forzar = false) {
  if (forzar && ultimoUid) inicializacionesPorUid.delete(ultimoUid);
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    ++generacion;
    publicar({ estado: 'error', uid: null, sesion: null, codigo: '' });
    return estado;
  }
  revisar(data.session);
  return estado;
}

supabase.auth.onAuthStateChange((evento, sesion) => {
  if (evento === 'SIGNED_OUT') {
    ++generacion;
    inicializacionesPorUid.clear();
    ultimoUid = null;
    publicar({ estado: 'sin-sesion', uid: null, sesion: null, codigo: '' });
    return;
  }
  // Evita esperar una llamada de red dentro del callback de Auth.
  queueMicrotask(() => revisar(sesion));
});

(async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    ++generacion;
    publicar({ estado: 'error', uid: null, sesion: null, codigo: '' });
    return;
  }
  revisar(data.session);
})();
