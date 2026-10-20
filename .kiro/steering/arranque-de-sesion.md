---
inclusion: always
---

# MAGANDHI tienda · arranque de sesión

Antes de tocar la tienda pública:

1. Leer `ESTADO-ACTUAL.md`.
2. Usar como punto de entrada global el relevo del back-office
   `docs/RELEVO-COMERCIAL-C5-CIERRE-2026-10-20.md`. Si la tarea toca cantidades,
   carrito, Mis compras, checkout, metadata de producto, enlaces, Promocionar o
   atribución comercial, leer además `docs/PLANO-FASE-COMERCIAL.md` (y
   `docs/PLANO-COMERCIAL-C5.md` para carrito/Mis compras).
3. Si la tarea toca Auth o cuentas públicas, leer `cuenta/CONFIGURACION.md` y el
   relevo temático `docs/RELEVO-CUENTAS-C2-2026-10-16.md` del back-office.
4. No confundir Cuentas C1–C4 con Comercial C1–C5 ni reconstruir migración,
   SMTP, TokenHash o Google OAuth.

## Comercial · estado al 20-oct-2026

- **C1–C5 cerrados estructuralmente** en producción; C4 superado por C5. No
  reconstruirlos.
- Backend aplicado hasta `20261106000100` (C5 + slug automático); Edge
  `crear-intencion-pago` y `estado-pago` en versión C5.
- **Carrito ENCENDIDO a propósito** y Wompi `prod`: una compra por carrito cobra
  dinero real. Signup OFF.
- Mis compras opera con la RPC real `mc_compras_listar`; «Continuar pago» vuelve
  a firmar la misma intención; el carrito queda libre al crear la intención.
- Sin pago real por carrito: no afirmar pedido, inventario, asiento, correo ni
  idempotencia aprobados.
- Pendientes de tienda ligados a C5: opinión autenticada («Próximamente») y los
  placeholders Favoritos, Mis opiniones y Eliminar cuenta.
- Siguiente etapa del plano: **Promocionar P0**; el dueño la confirma antes de
  construir.

## Cuentas C2 · preapertura separada

- `/cuenta/`, callback y backend C2 están publicados/desplegados y verificados.
- CAPTCHA activo; signup OFF y Google External/Testing hasta publicar políticas.

Reglas: compra invitada intacta; `clientes.id` no se reemplaza; precio/monto/UID/
`customer_id` nunca son autoridad del navegador; secretos nunca en Git/chat;
rama + PR por cambio; medir producción antes de afirmar cierre. Si se necesita
apagar el carrito, usar `comercial-c5-desactivar.sql` del back-office y exigir
`apagado_confirmado=true`.
