// MAGANDHI · Promocionar P4 · visita promocional local por pestaña.
// No crea eventos, cookies, mg_vid ni historial de navegación.

const CLAVE_ESTADO = 'mg_atribucion_promocional_v1';
const FORMATO_CODIGO = /^[0-9a-hjkmnp-tv-z]{16}$/;
const TTL_MS = 30 * 60 * 1000;
const MAX_FUTURO_MS = 60 * 1000;
const VALIDACION_TIMEOUT_MS = 1800;
const URL_VALIDACION = 'https://go.magandhi.com/validar/';

let memoria = null;
let validacionIncierta = false;

function ahora() {
  return Date.now();
}

function estadoValido(valor, instante = ahora()) {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor) &&
    FORMATO_CODIGO.test(valor.codigo || '') &&
    Number.isSafeInteger(valor.recibido_en) &&
    Number.isSafeInteger(valor.ultima_actividad) &&
    valor.recibido_en > 0 && valor.ultima_actividad >= valor.recibido_en &&
    valor.recibido_en <= instante + MAX_FUTURO_MS &&
    valor.ultima_actividad <= instante + MAX_FUTURO_MS &&
    instante - valor.ultima_actividad < TTL_MS;
}

function retirarEstado() {
  memoria = null;
  try { sessionStorage.removeItem(CLAVE_ESTADO); } catch { /* Sin storage, falla abierta. */ }
}

function leerEstado(instante = ahora()) {
  let candidato = memoria;
  try {
    const crudo = sessionStorage.getItem(CLAVE_ESTADO);
    if (crudo !== null) candidato = JSON.parse(crudo);
  } catch { /* Conserva el fallback en memoria si existe. */ }
  if (!estadoValido(candidato, instante)) {
    retirarEstado();
    return null;
  }
  memoria = candidato;
  return { ...candidato };
}

function guardarEstado(estado) {
  memoria = Object.freeze({ ...estado });
  try { sessionStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado)); } catch { /* Fallback en memoria. */ }
}

function renovarCargaVisible() {
  if (document.visibilityState !== 'visible') return;
  const instante = ahora();
  const estado = leerEstado(instante);
  if (!estado) return;
  estado.ultima_actividad = instante;
  guardarEstado(estado);
}

function extraerFragmento() {
  const hash = window.location.hash;
  const coincidencia = /^#mg_promo=([0-9a-hjkmnp-tv-z]{16})$/.exec(hash);
  if (coincidencia) return { codigo: coincidencia[1], reservado: true };
  return { codigo: '', reservado: hash.startsWith('#mg_promo=') };
}

function limpiarFragmentoReservado(reservado) {
  if (!reservado) return;
  try {
    history.replaceState(history.state, '', window.location.pathname + window.location.search);
  } catch { /* La navegación sigue aunque no pueda limpiarse. */ }
}

async function validarCodigo(codigo) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), VALIDACION_TIMEOUT_MS);
  try {
    const respuesta = await fetch(URL_VALIDACION + encodeURIComponent(codigo), {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      signal: controlador.signal,
      headers: { Accept: 'application/json' },
    });
    if (respuesta.status === 204) return 'valido';
    if (respuesta.status === 404) return 'invalido';
    return 'incierto';
  } catch {
    return 'incierto';
  } finally {
    clearTimeout(temporizador);
  }
}

async function capturarLlegada() {
  const fragmento = extraerFragmento();
  limpiarFragmentoReservado(fragmento.reservado);
  if (!fragmento.codigo) {
    renovarCargaVisible();
    return;
  }

  // Mientras B se valida, A no puede permanecer recuperable por otra página.
  // Se conserva solo en memoria para restaurarlo tras un 404 autoritativo.
  const instanteLlegada = ahora();
  const anterior = leerEstado(instanteLlegada);
  if (anterior && document.visibilityState === 'visible') {
    anterior.ultima_actividad = instanteLlegada;
  }
  retirarEstado();
  validacionIncierta = true;

  const resultado = await validarCodigo(fragmento.codigo);
  if (resultado === 'valido') {
    const instante = ahora();
    guardarEstado({
      codigo: fragmento.codigo,
      recibido_en: instante,
      ultima_actividad: instante,
    });
    validacionIncierta = false;
    return;
  }
  if (resultado === 'invalido') {
    if (estadoValido(anterior)) guardarEstado(anterior);
    validacionIncierta = false;
    return;
  }
  // Si la validación quedó incierta, A ya fue retirado: la compra y cargas
  // siguientes continúan sin atribución hasta otro enlace propio confirmado.
}

const capturaInicial = capturarLlegada().catch(() => {
  retirarEstado();
  validacionIncierta = true;
});

export async function codigoAtribucionParaIntencion() {
  await capturaInicial;
  if (validacionIncierta) return undefined;
  const instante = ahora();
  const estado = leerEstado(instante);
  if (!estado) return undefined;
  // Iniciar checkout es actividad calificable, pero solo después de comprobar
  // que la visita no había vencido.
  estado.ultima_actividad = instante;
  guardarEstado(estado);
  return estado.codigo;
}
