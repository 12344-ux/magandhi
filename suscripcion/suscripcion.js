// ============================================================
// MAGANDHI · Suscripción a novedades (EM6) · módulo reutilizable.
// Uso: <section id="mg-suscripcion" hidden></section> +
//      <script type="module" src="suscripcion/suscripcion.js"></script>
// · Pregunta a la Edge Function em-suscripcion si el formulario está ACTIVO.
//   Si no lo está (interruptor del back-office apagado o política sin
//   registrar), la sección queda oculta: la tienda no muestra nada.
// · Casilla de autorización DESMARCADA y siempre visible; el texto y el enlace
//   a la política vienen del servidor (lo que se acepta = lo que queda como
//   prueba). Doble confirmación por correo: pedir no inscribe a nadie.
// · Respuesta igual exista o no el correo. Campo trampa contra bots.
// Copy PROVISIONAL: el equipo lo reescribe antes de abrir la tienda.
// ============================================================
import { supabase } from '../supabase-config.js';

const raiz = new URL('./', import.meta.url);
if (!document.querySelector('link[data-su-css]')) {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = new URL('suscripcion.css?v=1', raiz).href; l.dataset.suCss = '1';
  document.head.appendChild(l);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ICO_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>';

async function llamar(body) {
  try {
    const { data, error } = await supabase.functions.invoke('em-suscripcion', { body });
    if (error) {
      let j = null; try { j = await error.context.json(); } catch (_) {}
      return { ok: false, data: j, error: (j && j.error) || 'No pudimos conectarnos. Intenta de nuevo en un momento.' };
    }
    return { ok: true, data };
  } catch (_) {
    return { ok: false, error: 'No pudimos conectarnos. Intenta de nuevo en un momento.' };
  }
}

export async function montarSuscripcion(sec) {
  if (!sec) return;
  const r = await llamar({ modo: 'config' });
  if (!r.ok || !r.data || !r.data.activa) { sec.hidden = true; return; }
  const cfg = r.data;
  const id = 'su-' + Math.random().toString(36).slice(2, 8);
  sec.classList.add('su-caja');
  sec.setAttribute('aria-labelledby', id + '-tit');
  sec.innerHTML =
    '<div class="su-card">' +
      '<div><p class="su-k">Novedades</p><h2 class="su-tit" id="' + id + '-tit">Entérate primero de lo que escogemos</h2>' +
        '<p class="su-txt">Te escribimos solo cuando hay algo que vale la pena: productos nuevos y ofertas. Puedes dejar de recibirlos cuando quieras.</p></div>' +
      '<form class="su-form" novalidate>' +
        '<div class="su-fila">' +
          '<label class="su-campo">Correo<input type="email" name="correo" autocomplete="email" inputmode="email" maxlength="254" required placeholder="tucorreo@ejemplo.com"></label>' +
          '<label class="su-campo">Nombre (opcional)<input type="text" name="nombre" autocomplete="given-name" maxlength="60" placeholder="Cómo quieres que te saludemos"></label>' +
        '</div>' +
        '<fieldset class="su-temas"><legend>Quiero recibir</legend>' +
          (cfg.temas || []).map((t) => '<label class="su-tema"><input type="checkbox" name="tema" value="' + esc(t.codigo) + '" checked>' + esc(t.nombre) + '</label>').join('') +
        '</fieldset>' +
        '<label class="su-acepto"><input type="checkbox" name="acepto"><span>' + esc(cfg.texto_consentimiento) +
          (cfg.politica_url ? ' Lee la <a href="' + esc(cfg.politica_url) + '" target="_blank" rel="noopener">política de tratamiento de datos</a>.' : '') + '</span></label>' +
        '<div class="su-trampa" aria-hidden="true"><label>Sitio web<input type="text" name="sitio_web" tabindex="-1" autocomplete="off"></label></div>' +
        '<button class="su-btn" type="submit">Suscribirme</button>' +
        '<p class="su-msg" role="status" aria-live="polite"></p>' +
      '</form>' +
    '</div>';
  sec.hidden = false;

  const f = sec.querySelector('form'), msg = sec.querySelector('.su-msg'), btn = sec.querySelector('.su-btn');
  const decir = (t, err) => { msg.textContent = t || ''; msg.className = 'su-msg' + (err ? ' err' : ''); };
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correo = f.correo.value.trim();
    const temas = [...f.querySelectorAll('input[name="tema"]:checked')].map((x) => x.value);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { decir('Escribe un correo válido.', true); f.correo.focus(); return; }
    if (!temas.length) { decir('Elige al menos qué quieres recibir.', true); return; }
    if (!f.acepto.checked) { decir('Para suscribirte, marca la casilla de autorización.', true); f.acepto.focus(); return; }
    btn.disabled = true; decir('Enviando…');
    const res = await llamar({ modo: 'suscribir', correo, nombre: f.nombre.value.trim() || null, temas, acepto: true, sitio_web: f.sitio_web.value });
    btn.disabled = false;
    if (!res.ok) { decir(res.error, true); return; }
    f.outerHTML = '<div class="su-ok" role="status">' + ICO_OK + '<span>' + esc(res.data.mensaje) + '</span></div>';
  });
}

montarSuscripcion(document.getElementById('mg-suscripcion'));
