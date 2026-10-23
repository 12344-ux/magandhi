---
inclusion: always
---

# MAGANDHI tienda · arranque de sesión

Antes de tocar la tienda pública:

1. Leer `ESTADO-ACTUAL.md`.
2. Si la tarea toca enlaces, Promocionar, checkout o atribución, empezar por el
   relevo vigente del back-office
   `docs/RELEVO-PROMOCIONAR-P5-CIERRE-ESTRUCTURAL-2026-10-21.md` y
   `docs/PLANO-PROMOCIONAR-P5.md`. Para captura/checkout, leer después el
   contrato P4 y su relevo histórico, además de `docs/PLANO-FASE-COMERCIAL.md`.
3. Para carrito/Mis compras consultar además `docs/PLANO-COMERCIAL-C5.md` y
   `docs/RELEVO-COMERCIAL-C5-CIERRE-2026-10-20.md` del back-office.
4. Si la tarea toca Auth o cuentas públicas, leer `cuenta/CONFIGURACION.md` y el
   relevo `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
5. No confundir Cuentas C1–C4 con Comercial C1–C5 ni reconstruir migración,
   SMTP, TokenHash o Google OAuth.

## Promocionar · estado al 21-oct-2026

- **P0 está cerrado como contrato documental, sin implementación ni producción.**
- **P1–P3 están desplegados y cerrados en sus alcances respectivos; P3
  permanece cerrado FINAL.**
- **P4 está fusionado, publicado, activo y cerrado estructuralmente.** Tienda
  #118 (`1b22d24`) y backend #306 (`75b14b4`); migración `20261109000000`
  aplicada una vez; Edge `enlace-promocional` y `crear-intencion-pago`
  desplegadas; gate ON desde `2026-10-21T15:21:59.626776Z`.
- Prueba productiva sin dinero: código activo validado, redirect con fragmento,
  captura/limpieza en tienda, intención `200` y llegada a Wompi. Diagnóstico: 1
  intención atribuida sintética, 0 pedidos, 0 divergencias y 0 incidencias.
- No afirmar cierre monetario/end-to-end: no hubo pago, webhook APPROVED,
  pedido, inventario, asiento ni correo. Dinero solo con autorización expresa.
- `scripts/atribucion-promocional.js` conserva únicamente código y dos
  timestamps durante 30 minutos por pestaña; es independiente de `mg_vid`,
  cookies y consentimiento analítico.
- **P5 está cerrado estructural/productivamente en back-office/Supabase.** PR
  #308, merge `3205e1b0cfcd5fc98126ccf2f37aa3cb2bf914f1`; migración
  `20261110000000` ejecutada una vez según confirmó el dueño; CI
  `39643360479` `success` (88 migraciones, matriz 230/0, `Todo pasa.`) y Pages
  producción `39645791554` `success` sobre el merge. El dueño recorrió
  Resultados, Métricas y Ventas y dijo «Todo en orden».
- P5 no cambió la tienda: `scripts/atribucion-promocional.js` y la captura P4
  siguen vigentes. No quedaron confirmados preflight ni postflight productivos
  separados. Tampoco se acreditaron categorías con datos reales, compra, pago
  `APPROVED`, pedido atribuido ni ingreso.
- No hay P6 definido. El pendiente monetario común C5/P4/P5 requiere una
  compra real expresamente autorizada.
- **Punto exacto de continuidad EM7:** la captura detallada de interacción está
  apagada porque las políticas públicas siguen en borrador. Cuando el dueño
  confirme que publicó las definitivas, registrar su versión en Email marketing
  → Resumen y encender la analítica como admin desde Métricas → En vivo o
  Métricas → Tienda. Después recorrer una sola prueba de rechazo/aceptación y
  captura. Solo medirá actividad futura de quien acepte; P3/P4 siguen operando
  sin este gate y P5 no requiere cambios.

## Comercial · estado vigente

- C1–C5 cerrados estructuralmente en producción; C4 superado por C5. No
  reconstruirlos.
- Carrito ENCENDIDO y Wompi `prod`. Mis compras y reapertura C5 operan.
- Sin pago real por carrito: no afirmar pedido, inventario, asiento, correo ni
  idempotencia aprobados para C5.
- Pendientes de tienda ligados a C5: opinión autenticada («Próximamente») y los
  placeholders Favoritos, Mis opiniones y Eliminar cuenta.

## Cuentas C2 · preapertura separada

- `/cuenta/`, callback y backend C2 están publicados/desplegados y verificados.
- CAPTCHA activo; signup OFF y Google External/Testing hasta publicar políticas.

## Forma de trabajo acordada

Para despliegues: publicar en una sola secuencia SQL, Edge, frontend e
infraestructura necesaria; comunicar cualquier error real durante el proceso y
hacer una prueba integral grande al final. Evitar rondas repetitivas de “para
ver” salvo diagnóstico necesario.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; precio/monto/UID/
`customer_id` nunca son autoridad del navegador; secretos nunca en Git/chat;
rama + PR por cambio; medir producción antes de afirmar cierre. **Este repositorio
no tiene vistas previas por rama:** cuando el dueño pida crear o publicar una
rama, completar por defecto rama → PR → merge a `main` → GitHub Pages →
verificación en `https://magandhi.com`, salvo que pida expresamente detenerse
antes del merge. Si se necesita apagar carrito usar
`comercial-c5-desactivar.sql`; si se necesita apagar P4 usar
`promocionar-p4-desactivar.sql` del back-office.
