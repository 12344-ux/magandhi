---
inclusion: always
---

# SN1 · infraestructura irreemplazable de la tienda

> **Regla permanente.** El Sistema Nervioso SN1 ya forma parte de la infraestructura de MAGANDHI. Todo trabajo visual, editorial o de experiencia debe adaptarse a sus contratos; no se rediseña el algoritmo como efecto lateral de mover, ocultar o simplificar elementos de interfaz.

## Frontera protegida

Quedan protegidos `componentes/motor-tienda.js`, las RPC `sn_buscar_v1` y `sn_recomendar_v1`, `sn_catalogo_seguro_v1`, los slots y atributos `data-sn-*`, y la telemetría asociada.

Salvo que la tarea se declare explícitamente como una evolución de SN1, no modificar:

- ranking, orden ni razones de selección;
- elegibilidad, disponibilidad, categorías, exclusiones o deduplicación;
- límites, totales, paginación ni coherencia de páginas;
- semilla, exploración, contexto o personalización de cuenta;
- validación de respuestas y contratos JSON;
- detección de consultas sensibles, privacidad o consentimiento;
- condiciones, fuente u orden del fallback seguro;
- eventos, campos, hashes o frecuencia de telemetría;
- nombres, firmas o argumentos de RPC;
- significado de superficies, layouts o atributos `data-sn-*`.

Si un cambio puede variar **qué producto aparece, en qué posición, para quién, por qué razón, mediante qué fallback, qué dato se envía o qué API se invoca**, detenerse y tratarlo como trabajo de SN1, con revisión específica de contratos, privacidad, pruebas y despliegue.

## Cambios de presentación permitidos

Se pueden cambiar sin reabrir SN1, siempre que las entradas, salidas y eventos permanezcan equivalentes:

- posición visual, espaciado, tamaños, colores y jerarquía;
- responsive, line-clamp, alineación y estabilidad de componentes;
- copy que no cambie el significado de una acción o resultado;
- accesibilidad, foco, orden visual y disclosures;
- reducir buscadores duplicados;
- hacer filtros menos prominentes mediante chips, `<details>`, popovers o paneles;
- mover nodos o reemplazar controles adaptando atómicamente su controlador local.

Ocultar no autoriza a perder estado: un filtro activo, retirado o con error debe seguir siendo perceptible y debe poder limpiarse.

## Contrato particular de búsqueda

Los cambios visuales de `/buscar/` deben conservar:

- URL y parámetros canónicos `/buscar/?q=&categoria=`;
- consulta de máximo 120 caracteres y categoría canónica de máximo 64;
- al menos un formulario visible con `[data-buscador-catalogo]` y un `input[type="search"]`;
- `[data-buscador-estado]`, combobox, sugerencias, teclado, foco y cancelación de solicitudes;
- propagación de la categoría activa mediante `data-buscador-categoria`;
- categoría pedida ante retiro o error, sin ampliar silenciosamente a todo el catálogo;
- una forma visible y accesible de conocer y quitar el filtro activo;
- llamada a `buscarProductos` con consulta, categoría, límite, desplazamiento, señal y contexto equivalentes;
- orden recibido, paginación de 12, comprabilidad y rechazo de duplicados;
- rechazo de consultas sensibles y fallback exclusivo por catálogo seguro;
- slot de descubrimiento sin resultados;
- evento `busqueda_resultados` sin consulta en claro y sujeto al consentimiento vigente.

En la página actual hay un buscador de cabecera y otro principal. En móvil es válido ocultar o retirar el de cabecera y conservar el principal. El selector de categoría puede quedar plegado o representado por un chip menos prominente; no debe borrarse sin adaptar `buscar/buscar.js`, porque hoy ese controlador depende de `#bs-category` y de sus estados.

## Criterio de aceptación

Todo cambio visual alrededor de SN1 debe demostrar:

1. mismas entradas algorítmicas antes y después;
2. mismos resultados y orden para una respuesta fija;
3. mismos parámetros de URL, paginación y filtros activos;
4. misma protección de privacidad y fallback;
5. mismos eventos consentidos;
6. ausencia de errores de consola y regresiones en móvil/escritorio.

La web se adapta al algoritmo; el algoritmo solo cambia mediante una evolución deliberada, versionada y probada.
