const TIEMPO_MAXIMO_PREDETERMINADO_MS = 8000;

function errorAbortado() {
  try {
    return new DOMException('La solicitud fue reemplazada.', 'AbortError');
  } catch {
    const error = new Error('La solicitud fue reemplazada.');
    error.name = 'AbortError';
    return error;
  }
}

function errorTiempoAgotado() {
  const error = new Error('La solicitud tardó más de lo permitido.');
  error.name = 'TimeoutError';
  error.code = 'MG_TIEMPO_AGOTADO';
  return error;
}

/**
 * Acota una petición Supabase completa, incluida la espera previa por Auth.
 * Acepta un builder o una fábrica que recibe AbortSignal. El builder cancela
 * su fetch con abortSignal; la fábrica puede entregarlo a functions.invoke.
 */
export async function resolverSolicitudAcotada(peticion, opciones = {}) {
  const signal = opciones.signal;
  const tiempoSolicitado = Number(opciones.tiempoMaximoMs);
  const tiempoMaximoMs = Number.isFinite(tiempoSolicitado) && tiempoSolicitado > 0
    ? Math.floor(tiempoSolicitado)
    : TIEMPO_MAXIMO_PREDETERMINADO_MS;

  if (signal?.aborted) throw errorAbortado();

  const controlador = new AbortController();
  const errorLimite = errorTiempoAgotado();
  let agotado = false;
  let cancelado = false;
  let temporizador = null;
  let alAbortar = null;

  const cancelacion = new Promise((_, rechazar) => {
    temporizador = setTimeout(() => {
      agotado = true;
      try { controlador.abort(errorLimite); } catch { controlador.abort(); }
      rechazar(errorLimite);
    }, tiempoMaximoMs);

    if (signal) {
      alAbortar = () => {
        cancelado = true;
        const error = errorAbortado();
        try { controlador.abort(error); } catch { controlador.abort(); }
        rechazar(error);
      };
      signal.addEventListener('abort', alAbortar, { once: true });
    }
  });

  try {
    const ejecutable = typeof peticion === 'function'
      ? peticion(controlador.signal)
      : (typeof peticion?.abortSignal === 'function'
        ? peticion.abortSignal(controlador.signal)
        : peticion);
    const resultado = await Promise.race([Promise.resolve(ejecutable), cancelacion]);
    if (cancelado || signal?.aborted) throw errorAbortado();
    if (agotado) throw errorLimite;
    return resultado;
  } catch (error) {
    // Algunos fetch convierten abort() en AbortError antes de que gane la
    // promesa del temporizador. Estas banderas preservan la causa real.
    if (cancelado || signal?.aborted) throw errorAbortado();
    if (agotado) throw errorLimite;
    throw error;
  } finally {
    if (temporizador !== null) clearTimeout(temporizador);
    if (signal && alAbortar) signal.removeEventListener('abort', alAbortar);
  }
}
