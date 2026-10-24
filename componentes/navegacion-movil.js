// MAGANDHI · barra principal inferior en móvil (Volver, Inicio, Categorías,
// Carrito, Cuenta). Solo vive en Inicio, Categorías y Producto y queda anclada
// desde que carga la página. No depende de red: la sesión la anuncia
// cuenta-carrito.js en `html[data-mg-sesion]` y el evento `magandhi:sesion`.
//
// · Con sesión: Carrito lleva al carrito y Cuenta abre «Mi cuenta» (el mismo
//   centro que abre la cabecera, mediante `magandhi:abrir-cuenta`).
// · Invitado: Cuenta lleva a crear cuenta y Carrito muestra un aviso para
//   registrarse. «Comprar ahora» como invitado no cambia.
//
// El contador del carrito escucha el evento público `magandhi:carrito` en vez
// de importar cuenta-carrito.js, para no crear una segunda instancia si su
// versión cambia. Por eso este script debe ir ANTES que cuenta-carrito.js en
// el documento: los módulos se ejecutan en orden y así no pierde ningún aviso.
const nav = document.getElementById('mg-mobile-nav');
const mediaMovil = window.matchMedia('(max-width:860px)');

const ICONO_CARRITO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
const ICONO_CERRAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

// «Volver» (barra móvil y cabecera de PC de la ficha) regresa dentro de la
// tienda; si se llegó desde fuera, el href lleva al inicio.
document.querySelectorAll('[data-mg-mobile-back]').forEach((volver) => {
  volver.addEventListener('click', (evento) => {
    if (evento.defaultPrevented || evento.button !== 0 || evento.metaKey ||
        evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    let regresoInterno = false;
    try {
      regresoInterno = window.history.length > 1 && Boolean(document.referrer) &&
        new URL(document.referrer).origin === window.location.origin;
    } catch { /* Si no se puede validar, el href lleva al inicio. */ }
    if (regresoInterno) {
      evento.preventDefault();
      window.history.back();
    }
  });
});

if (nav) {
  const enlaceCarrito = nav.querySelector('[data-mg-mobile-cart]');
  const badgeCarrito = nav.querySelector('[data-mg-mobile-cart-badge]');
  const enlaceCuenta = nav.querySelector('[data-mg-mobile-account]');
  const textoCuenta = enlaceCuenta?.querySelector('span');
  const baseCuenta = enlaceCuenta?.getAttribute('href') || '/cuenta/';
  const hrefCarrito = enlaceCarrito?.getAttribute('href') || '/carrito/';
  const conPestana = (tab) => `${baseCuenta}${baseCuenta.includes('?') ? '&' : '?'}tab=${tab}`;

  let sesion = document.documentElement.dataset.mgSesion || 'comprobando';
  let aviso = null;
  let origenAviso = null;

  const esInvitado = () => sesion === 'sin-sesion';
  const esValida = () => sesion === 'valida';

  function pintarSesion() {
    if (enlaceCuenta) {
      if (esValida()) {
        enlaceCuenta.href = baseCuenta;
        enlaceCuenta.setAttribute('aria-label', 'Abrir mi cuenta');
        enlaceCuenta.setAttribute('aria-haspopup', 'dialog');
        if (textoCuenta) textoCuenta.textContent = 'Mi cuenta';
      } else {
        enlaceCuenta.href = conPestana(sesion === 'error' ? 'login' : 'register');
        enlaceCuenta.setAttribute('aria-label', sesion === 'error' ? 'Revisar mi sesión' : 'Crear cuenta');
        enlaceCuenta.removeAttribute('aria-haspopup');
        enlaceCuenta.removeAttribute('aria-expanded');
        if (textoCuenta) textoCuenta.textContent = 'Cuenta';
      }
    }
    if (enlaceCarrito) {
      if (esInvitado()) enlaceCarrito.setAttribute('aria-haspopup', 'dialog');
      else enlaceCarrito.removeAttribute('aria-haspopup');
      enlaceCarrito.href = hrefCarrito;
    }
    if (!esInvitado() && aviso && !aviso.hidden) cerrarAviso(false);
  }

  function crearAviso() {
    const raiz = document.createElement('div');
    raiz.className = 'mg-aviso-cuenta';
    raiz.hidden = true;
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-modal', 'true');
    raiz.setAttribute('aria-labelledby', 'mg-aviso-cuenta-titulo');
    raiz.setAttribute('aria-describedby', 'mg-aviso-cuenta-texto');
    raiz.innerHTML = `
      <div class="mg-aviso-cuenta__fondo" data-mg-aviso-cerrar></div>
      <section class="mg-aviso-cuenta__hoja">
        <span class="mg-aviso-cuenta__asa" aria-hidden="true"></span>
        <button type="button" class="mg-aviso-cuenta__cerrar" data-mg-aviso-cerrar aria-label="Cerrar">${ICONO_CERRAR}</button>
        <div class="mg-aviso-cuenta__icono" aria-hidden="true">${ICONO_CARRITO}</div>
        <span class="mg-aviso-cuenta__sello">Tu cuenta MAGANDHI</span>
        <h2 id="mg-aviso-cuenta-titulo" tabindex="-1">Tu carrito vive en tu cuenta</h2>
        <p class="mg-aviso-cuenta__texto" id="mg-aviso-cuenta-texto">Regístrate para acceder al carrito, reunir varios productos y comprarlos juntos, con más comodidad.</p>
        <div class="mg-aviso-cuenta__acciones">
          <a class="mg-aviso-cuenta__accion mg-aviso-cuenta__accion--principal" href="${conPestana('register')}">Crear cuenta</a>
          <a class="mg-aviso-cuenta__accion mg-aviso-cuenta__accion--secundaria" href="${conPestana('login')}">Ya tengo cuenta</a>
        </div>
        <p class="mg-aviso-cuenta__nota">¿Buscas un solo producto? Puedes comprarlo ahora mismo con <strong>«Comprar ahora»</strong>, sin registrarte.</p>
      </section>`;
    raiz.querySelectorAll('[data-mg-aviso-cerrar]').forEach((el) => {
      el.addEventListener('click', () => cerrarAviso());
    });
    raiz.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        cerrarAviso();
        return;
      }
      if (evento.key !== 'Tab') return;
      const controles = [...raiz.querySelectorAll('a[href],button')];
      const primero = controles[0];
      const ultimo = controles[controles.length - 1];
      if (evento.shiftKey && (document.activeElement === primero || document.activeElement === raiz.querySelector('h2'))) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    });
    document.body.appendChild(raiz);
    return raiz;
  }

  function abrirAviso(origen) {
    aviso = aviso || crearAviso();
    origenAviso = origen || null;
    aviso.hidden = false;
    document.body.classList.add('mg-aviso-cuenta-abierto');
    origenAviso?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => aviso.querySelector('h2')?.focus());
  }

  function cerrarAviso(devolverFoco = true) {
    if (!aviso || aviso.hidden) return;
    aviso.hidden = true;
    document.body.classList.remove('mg-aviso-cuenta-abierto');
    origenAviso?.setAttribute('aria-expanded', 'false');
    if (devolverFoco && origenAviso?.isConnected) origenAviso.focus();
    origenAviso = null;
  }

  const clicSimple = (evento) => !(evento.defaultPrevented || evento.button !== 0 ||
    evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey);

  enlaceCarrito?.addEventListener('click', (evento) => {
    if (!clicSimple(evento) || !esInvitado() || !mediaMovil.matches) return;
    evento.preventDefault();
    abrirAviso(enlaceCarrito);
  });

  enlaceCuenta?.addEventListener('click', (evento) => {
    if (!clicSimple(evento) || !esValida()) return;
    // cuenta-carrito.js abre el centro y marca `abierto`; si no pudo, el
    // enlace sigue su camino normal hacia /cuenta/.
    const detalle = { origen: enlaceCuenta, abierto: false };
    window.dispatchEvent(new CustomEvent('magandhi:abrir-cuenta', { detail: detalle }));
    if (detalle.abierto) evento.preventDefault();
  });

  if (enlaceCarrito && badgeCarrito) {
    window.addEventListener('magandhi:carrito', (evento) => {
      const estado = evento.detail || {};
      const unidades = estado.visible && estado.snapshot
        ? Math.max(0, Number(estado.snapshot.cantidad_unidades) || 0)
        : 0;
      badgeCarrito.textContent = String(unidades);
      badgeCarrito.hidden = unidades === 0;
      enlaceCarrito.setAttribute('aria-label', unidades === 0
        ? 'Carrito, sin productos'
        : `Carrito, ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`);
    });
  }

  window.addEventListener('magandhi:sesion', (evento) => {
    sesion = evento.detail?.estado || 'comprobando';
    pintarSesion();
  });

  const alCambiarMedio = () => { if (!mediaMovil.matches) cerrarAviso(false); };
  if (typeof mediaMovil.addEventListener === 'function') mediaMovil.addEventListener('change', alCambiarMedio);
  else mediaMovil.addListener(alCambiarMedio);

  pintarSesion();
}
