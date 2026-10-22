// MAGANDHI · accesos rápidos inferiores en móvil (Volver, Inicio, Categorías,
// Carrito, Cuenta). Mismo comportamiento que la página de producto: aparecen
// cuando la cabecera sale de la vista. No dependen de sesión ni de red.
//
// El contador del carrito escucha el evento público `magandhi:carrito` en vez
// de importar cuenta-carrito.js, para no crear una segunda instancia si su
// versión cambia. Por eso este script debe ir ANTES que cuenta-carrito.js en
// el documento: los módulos se ejecutan en orden y así no pierde ningún aviso.
const nav = document.getElementById('mg-mobile-nav');
const cabecera = nav ? document.querySelector(nav.dataset.cabecera || 'header') : null;

if (nav && cabecera) {
  const mediaMovil = window.matchMedia('(max-width:860px)');
  let framePendiente = 0;

  const mostrar = (visible) => {
    const activo = mediaMovil.matches && visible;
    nav.dataset.visible = activo ? 'true' : 'false';
    nav.setAttribute('aria-hidden', activo ? 'false' : 'true');
    document.body.classList.toggle('mg-mobile-nav-visible', activo);
  };
  const evaluar = () => {
    framePendiente = 0;
    mostrar(cabecera.getBoundingClientRect().bottom <= 0);
  };
  const solicitarEvaluacion = () => {
    if (!framePendiente) framePendiente = requestAnimationFrame(evaluar);
  };

  // «Volver» regresa dentro de la tienda; si se llegó desde fuera, el href
  // lleva al inicio.
  nav.querySelector('[data-mg-mobile-back]')?.addEventListener('click', (evento) => {
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

  const enlaceCarrito = nav.querySelector('[data-mg-mobile-cart]');
  const badgeCarrito = nav.querySelector('[data-mg-mobile-cart-badge]');
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

  window.addEventListener('scroll', solicitarEvaluacion, { passive: true });
  window.addEventListener('resize', solicitarEvaluacion, { passive: true });
  window.addEventListener('pageshow', solicitarEvaluacion);
  if (typeof mediaMovil.addEventListener === 'function') {
    mediaMovil.addEventListener('change', solicitarEvaluacion);
  } else {
    mediaMovil.addListener(solicitarEvaluacion);
  }
  evaluar();
}
