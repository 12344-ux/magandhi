---
inclusion: auto
name: estandar-banners-magandhi
description: Fuente única y obligatoria para idear, diseñar, producir, implementar o revisar cualquier banner o diapositiva del carrusel de MAGANDHI.
---

# Estándar de banners de MAGANDHI

> **Fuente única de verdad.** Antes de crear, cambiar o revisar un banner de MAGANDHI, leer este archivo completo. Si otra nota del repositorio contradice este estándar, manda este archivo.

## 1. Qué debe lograr un banner MAGANDHI

Un banner no es decoración ni un volante lleno de información. Es una pieza de comunicación visual con **un mensaje, un punto focal y una acción**.

La secuencia de lectura obligatoria es:

1. **Sello**: ubica la idea (`Selección MAGANDHI`, `Curaduría MAGANDHI`, etc.).
2. **Titular**: comunica una sola promesa o idea memorable.
3. **Apoyo**: explica lo mínimo necesario para creer o entender.
4. **CTA**: indica una sola acción concreta.

La imagen y el texto se reparten el trabajo: la imagen atrae y crea atmósfera; el HTML explica y permite actuar. Si ambos dicen exactamente lo mismo, sobra uno. Si hay dos mensajes compitiendo, el banner está mal resuelto.

### Percepción de marca que debe conservar

- MAGANDHI es **una tienda que llegó**, no una tienda “que está empezando”.
- Se comunica como marca o equipo: nunca como una persona individual ni “el vendedor”.
- Se siente boutique, cercana, confiable y selectiva; no masiva, ruidosa ni improvisada.
- La curaduría y la transparencia pesan más que el descuento.
- No se usan urgencias falsas, reseñas falsas, escasez inventada ni promesas que la operación no pueda cumplir.
- El tono es sobrio y directo. No se amontonan sellos, precios, porcentajes y llamados a la vez.

## 2. Lo que existe hoy y no debe romperse

El carrusel principal vive autocontenido en `index.html`:

- CSS: clases con prefijo `hg-`, especialmente `.hg-hero`, `.hg-carrusel`, `.hg-slide` y sus hijos.
- HTML: cada diapositiva es un `.hg-slide` con dos rutas de imagen.
- JavaScript: cambia el recorte a `760px`, crea puntos, permite flechas, teclado, swipe y autoavance cada `6000ms`.
- Paleta: los tokens oficiales están en `marca.css`.
- Assets: las parejas de imágenes viven en `banners/`.

Las imágenes actuales son fondos de presentación, no campañas fotográficas definitivas. Lo que sí está aprobado y debe conservarse es el **sistema**: proporciones, riel, jerarquía, zona de texto, contraste, sobriedad y adaptación independiente a móvil.

### Medidas verificadas en producción

| Contexto | Archivo fuente | Proporción | Caja visible comprobada |
|---|---:|---:|---:|
| PC | `1600 × 600 px` | `8:3` | a 1280px de viewport: `1152 × 432 px` |
| Móvil | `1080 × 1080 px` | `1:1` | a 390px de viewport: `351 × 351 px` |

La caja del hero tiene `max-width:1200px`, padding lateral de `24px` en PC y `12px` en móvil. El carrusel conserva radio de `20px`, recorte interno (`overflow:hidden`) y sombra sutil. No se cambia esta geometría para acomodar una idea: **la idea se compone para esta geometría**.

## 3. Entregable obligatorio por cada concepto

Cada banner nuevo requiere una pareja diseñada como una misma campaña:

1. `banner-{id}-pc.jpg` o `.webp`: **1600 × 600 px**, relación `8:3`.
2. `banner-{id}-movil.jpg` o `.webp`: **1080 × 1080 px**, relación `1:1`.

Reglas duras:

- Nunca entregar una sola imagen para ambos formatos.
- Nunca fabricar móvil con un recorte central automático del PC.
- Nunca superar **2000 px en ninguna dimensión**.
- Objetivo de peso: **menos de 300 KB por archivo** sin degradación visible.
- Usar `sRGB`; evitar perfiles de color exóticos.
- Preferir nombres semánticos y versionados para campañas reales, por ejemplo:
  - `banner-curaduria-v1-pc.webp`
  - `banner-curaduria-v1-movil.webp`
- No sobrescribir un nombre publicado si puede quedar en caché. Subir versión (`v2`) y cambiar las rutas en HTML.
- No reutilizar un asset del carrusel en otra sección. Aunque dos piezas compartan exactamente el mismo lenguaje visual, cada una conserva su propia pareja de archivos. Historia ya usa assets terracota independientes para que una campaña futura no cambie dos zonas por accidente.

## 4. Retícula y zonas seguras

### PC — composición horizontal 1600 × 600

- El contenido HTML ocupa como máximo el **52% izquierdo**.
- Reservar visualmente el **55% izquierdo** como zona tranquila para sello, título, apoyo y CTA.
- Ubicar el producto, persona, objeto o gesto principal en el **40–45% derecho**.
- El punto focal debe sobrevivir a `background-size:cover` y `background-position:center`.
- No poner rostros, producto, logotipo ni detalles esenciales pegados a los bordes.
- El fondo detrás del texto puede tener textura, pero no detalle de alto contraste que rompa la lectura.
- El recorrido visual ideal es izquierda → derecha: primero mensaje, después evidencia visual.

### Móvil — composición cuadrada 1080 × 1080

- El contenido HTML se apoya abajo y puede ocupar hasta el **88% del ancho**.
- Reservar el tercio inferior, especialmente la esquina inferior izquierda, como zona tranquila.
- Recomponer el punto focal hacia la mitad superior o hacia la derecha.
- El sujeto puede crecer respecto a PC; no debe quedar diminuto por conservar el encuadre horizontal.
- Verificar que el sujeto no choque con sello, título, descripción, CTA ni puntos del carrusel.
- No asumir que “responsive” significa cortar: es una **segunda dirección de arte** del mismo concepto.

## 5. Dirección visual

### Un solo punto focal

Antes de producir, poder completar esta frase: “La mirada entra por ___, entiende ___ y termina en ___”. Si hay más de una respuesta por espacio, simplificar.

Prioridades:

1. Producto o símbolo visual principal.
2. Titular.
3. CTA.
4. Detalles secundarios.

No se agregan elementos solo para “llenar”. El espacio negativo es parte del estilo boutique y permite que la jerarquía respire.

### Color

Tokens estructurales actuales:

- Terracota principal: `#A6332E`.
- Negro: `#111111`.
- Crema: `#FAF6F1`.
- Arena de página: `#EFE7DD`.
- Ámbar de acento: `#C28A3A`.
- Gris secundario: `#6B6660`.

Reglas:

- El terracota, crema y negro construyen la marca.
- El ámbar es un **detalle pequeño**: sello, botón o filo. Nunca un marco o superficie grande junto al terracota; esa combinación protagonista se percibe como comida rápida y rompe el carácter boutique.
- El color particular de un producto puede vivir en la fotografía o en detalles menores, pero no reemplaza la estructura cromática de MAGANDHI.
- No introducir un color decorativo nuevo sin una función comunicativa clara.

### Tipografía y texto

Todo texto comunicativo va en HTML, nunca rasterizado dentro del JPG/WebP:

- conserva nitidez en cualquier pantalla;
- permite corregir copy y tildes;
- es accesible y seleccionable;
- evita crear cuatro archivos por cada cambio de frase.

La familia actual es **Poppins**. Jerarquía existente:

- sello: `10–11px`, semibold, mayúsculas, tracking amplio;
- titular PC: `26–46px`; móvil: `23–30px`; peso `700`; interlínea `1.08`;
- apoyo: `13–16.5px`, interlínea `1.5`, máximo `30ch`;
- CTA: `14.5px`, semibold.

Límites de copy recomendados:

- sello: **2–3 palabras útiles** más MAGANDHI cuando corresponda;
- titular: **una idea, máximo dos líneas intencionales**;
- apoyo: **una frase**, idealmente 65–95 caracteres;
- CTA: **2–4 palabras de acción**.

El `<br>` puede fijar el quiebre de dos líneas, pero debe probarse en móvil estrecho. Si aparece una tercera línea, no se encoge la tipografía por reflejo: primero se mejora el copy.

### Fotografía, ilustración o composición gráfica

- Debe verse real, cuidada y coherente con una tienda curada.
- Evitar stock genérico, collage de catálogo, fondos recargados y objetos flotando sin intención.
- No incrustar el wordmark como marca de agua gigante.
- No duplicar en la imagen el titular que ya aparece en HTML.
- Si la imagen contiene información necesaria para comprender la campaña, repetir esa información en el HTML; los fondos CSS no tienen `alt`.
- Mantener luz, perspectiva, sombras y escala consistentes entre elementos.

### ADN visual observado en los banners actuales

La gramática gráfica que da identidad al sistema actual es deliberadamente mínima:

- **campo tonal continuo**, no un mosaico de elementos;
- **gradiente horizontal suave** que oscurece o aclara la zona del copy y conduce la mirada hacia el protagonista;
- **un símbolo u objeto sobredimensionado a la derecha**, tono sobre tono y con contraste bajo;
- **recorte intencional del protagonista por el borde derecho o inferior**, para que la composición continúe fuera del marco;
- área izquierda amplia, limpia y estable;
- profundidad producida con gradiente, escala y superposición, no con adornos;
- ningún elemento gráfico compite con el titular o parece otro botón.

En una campaña fotográfica no es obligatorio repetir la bolsa/ícono actual. Sí debe conservarse esa lógica: **masa visual grande a la derecha + calma a la izquierda + contraste progresivo + un solo protagonista**. El motivo visual apoya la idea; no se convierte en marca de agua ni ilustración de relleno.

## 6. Dos tratamientos permitidos

Elegir el tratamiento por el contraste real de la imagen, no por gusto arbitrario.

### Oscuro — `.hg-slide`

- Para terracota oscuro, fotografía oscura o fondo con masa tonal profunda.
- Titular y apoyo blancos.
- Velo PC negro horizontal: más fuerte a la izquierda y transparente a la derecha.
- Velo móvil negro vertical: más fuerte abajo, donde vive el texto.

### Claro — `.hg-slide.hg-slide--claro`

- Para crema, blanco o fotografía luminosa.
- Titular negro y apoyo gris.
- Velo PC blanco horizontal.
- Velo móvil blanco vertical, más fuerte abajo.

No crear una tercera variante por campaña. Si una imagen no funciona con ninguno de los dos tratamientos, la composición o la fotografía debe corregirse.

**Contraste obligatorio:** medir el resultado real sobre la imagen final. Texto normal y CTA deben alcanzar como mínimo `4.5:1`; texto grande, `3:1`. El ámbar actual con texto blanco puede no alcanzar `4.5:1`: no convertir esa combinación en regla ciega. Resolver el contraste sin cambiar globalmente la paleta durante un trabajo de campaña; puede usarse texto oscuro sobre ámbar o un tono funcional más oscuro, documentando la decisión.

### Constantes visuales actuales

Estas constantes forman parte del marco aprobado. No se ajustan por campaña:

| Elemento | Valor actual |
|---|---|
| riel exterior | `max-width:1200px`; `24px` laterales PC; `12px` móvil |
| proporción | `1600/600` PC; `1/1` móvil |
| contenedor | `border-radius:20px`; `overflow:hidden` |
| sombra | `0 14px 40px rgba(17,17,17,.10)` |
| contenido PC | centrado vertical; `max-width:52%`; padding horizontal `clamp(24px,4vw,56px)` |
| contenido móvil | apoyado abajo; `max-width:88%`; `padding-bottom:34px` |
| velo oscuro PC | `linear-gradient(90deg, rgba(17,17,17,.42) 0%, rgba(17,17,17,.12) 48%, transparent 72%)` |
| velo claro PC | `linear-gradient(90deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,.18) 48%, transparent 72%)` |
| velo oscuro móvil | `linear-gradient(180deg, rgba(17,17,17,.12) 0%, rgba(17,17,17,.08) 40%, rgba(17,17,17,.58) 100%)` |
| velo claro móvil | `linear-gradient(180deg, rgba(255,255,255,.1) 0%, rgba(255,255,255,.3) 55%, rgba(255,255,255,.75) 100%)` |
| sello | blanco, radio píldora, sombra sutil, icono lineal/simple |
| CTA | un botón ámbar, radio `12px`, flecha a la derecha |
| transición | desplazamiento horizontal `.5s ease`; autoavance `6000ms` |

La existencia de estos valores en este documento no autoriza duplicar el CSS. La fuente ejecutable sigue siendo `index.html`; esta tabla permite reconocer desviaciones y reconstruir la intención.

## 7. Arquitectura exacta de una diapositiva

Mientras el carrusel actual siga vigente, una diapositiva nueva conserva este contrato:

```html
<div class="hg-slide" role="group"
     aria-roledescription="diapositiva" aria-label="1 de N"
     style="background-image:url('banners/banner-{id}-pc.webp')"
     data-pc="banners/banner-{id}-pc.webp"
     data-movil="banners/banner-{id}-movil.webp">
  <div class="hg-slide__cont">
    <span class="hg-pill">
      <!-- SVG inline simple, con currentColor -->
      Selección MAGANDHI
    </span>
    <h2 class="hg-slide__tit">Una sola idea,<br>en dos líneas.</h2>
    <p class="hg-slide__sub">Una frase que demuestra o aclara la idea principal.</p>
    <a class="hg-slide__btn" href="DESTINO-REAL">
      Acción concreta
      <!-- flecha SVG inline -->
    </a>
  </div>
</div>
```

Para fondo claro, añadir `hg-slide--claro`. Al agregar o quitar slides:

- actualizar `aria-label="X de N"` en **todas** las diapositivas;
- comprobar que el CTA llega a una ruta real;
- no cambiar las clases ni duplicar la lógica del carrusel;
- no tocar el ritmo de `6000ms`, breakpoints o geometría en un cambio que solo sea de campaña;
- conservar el texto como HTML y los SVG inline;
- verificar que la diapositiva funcione con teclado, swipe, puntos y autoavance.

## 8. Proceso cuando el dueño propone una idea

El trabajo no empieza generando una imagen. El Kiro responsable debe traducir la idea a una decisión de comunicación.

### Paso 1 — Extraer el brief mínimo

Definir, sin inventar promesas:

- objetivo de negocio;
- persona a quien se habla;
- una idea principal;
- evidencia o apoyo;
- acción esperada;
- destino real del CTA;
- producto o símbolo visual protagonista;
- tratamiento oscuro o claro.

Si la idea del dueño ya permite deducirlo con seguridad, avanzar sin interrogatorio innecesario. Preguntar solo cuando falte una decisión que cambie el sentido, la honestidad o el destino del banner.

### Paso 2 — Escribir antes de decorar

Proponer internamente:

- sello;
- titular de dos líneas;
- apoyo de una frase;
- CTA;
- frase de dirección visual: “punto focal + ubicación + atmósfera”.

Eliminar todo lo que no sostenga la idea principal.

### Paso 3 — Diseñar PC y móvil como pareja

- Crear primero la estructura horizontal y después **recomponer** el cuadrado.
- Mantener el mismo concepto, sujeto, luz y tono en ambas piezas.
- Respetar las zonas seguras de la sección 4.
- No incrustar copy en la imagen.
- Exportar con las medidas exactas y peso objetivo.

### Paso 4 — Integrar sin rediseñar el sistema

- Añadir los dos assets versionados en `banners/`.
- Añadir o reemplazar solo el bloque `.hg-slide` necesario.
- Usar rutas `data-pc` y `data-movil` correctas.
- Seleccionar una de las dos variantes de contraste existentes.
- Mantener intactos riel, radio, sombra, breakpoints y controles salvo solicitud expresa.

### Paso 5 — Verificar con evidencia

No declarar “listo” porque el código compile o la página cargue. Comprobar los criterios de la sección 10.

## 9. Errores que hacen que deje de parecer MAGANDHI

- Diseñar un volante con cinco mensajes dentro del banner.
- Quemar el copy en la imagen.
- Usar el mismo recorte en PC y móvil.
- Centrar el producto justo debajo del texto.
- Llenar el espacio negativo con adornos sin función.
- Usar dorado/ámbar como aro, marco o fondo protagonista junto al terracota.
- Introducir colores chillones por “llamar la atención”.
- Crear una variante CSS distinta para cada campaña.
- Reducir letra hasta hacer caber un titular largo.
- Poner dos CTA con el mismo peso.
- Usar “compra ya”, contadores o urgencia sin fundamento real.
- Hablar como emprendimiento personal o explicar que la tienda está empezando.
- Reutilizar el mismo archivo en el carrusel y en Historia, dejando dos zonas acopladas por accidente.
- Cambiar la mecánica completa del carrusel dentro de una tarea de contenido.

## 10. Lista de control obligatoria

### Comunicación

- [ ] Se entiende una sola idea en menos de 3 segundos.
- [ ] Hay un punto focal dominante.
- [ ] La secuencia sello → titular → apoyo → CTA es inequívoca.
- [ ] El copy suena a MAGANDHI como marca establecida.
- [ ] No hay afirmaciones, escasez, descuentos ni reseñas inventadas.
- [ ] El CTA describe la acción y conduce a un destino real.

### Dirección de arte

- [ ] Existe pareja `1600×600` + `1080×1080`.
- [ ] Ninguna dimensión supera 2000px.
- [ ] Móvil fue recompuesto, no recortado automáticamente.
- [ ] PC deja aire a la izquierda y protagonista a la derecha.
- [ ] Móvil protege la zona inferior del texto.
- [ ] No hay texto incrustado en el asset.
- [ ] Cada archivo pesa menos de 300KB o existe una razón documentada.
- [ ] El ámbar sigue siendo detalle, no superficie protagonista.

### Implementación

- [ ] Las dos rutas existen y no producen 404.
- [ ] Los nombres están versionados para evitar caché obsoleta.
- [ ] La variante clara/oscura corresponde a la luminosidad real.
- [ ] Los `aria-label` reflejan correctamente `X de N`.
- [ ] El CTA y el SVG siguen en HTML.
- [ ] No se rompió el uso táctil, teclado, puntos, flechas ni autoavance.
- [ ] Carrusel, Historia y cualquier otra sección conservan parejas de assets independientes.

### Verificación responsive y accesible

Verificar por DOM/CSS y medidas; no hace falta una captura de pantalla para cada tamaño.

- [ ] 390px: caja aproximada `351×351`, imagen móvil cargada, texto sin tercera línea ni solapes.
- [ ] 760px: sigue activo el diseño móvil.
- [ ] 761px: entra el diseño PC sin salto roto.
- [ ] 1280px: carrusel aproximado `1152×432` dentro del riel de 1200px.
- [ ] Pantalla amplia: el riel no supera 1200px y queda centrado.
- [ ] Contraste medido: `4.5:1` normal / `3:1` grande.
- [ ] El significado completo existe en HTML aunque la imagen no se vea.
- [ ] Con `prefers-reduced-motion`, no se obliga autoavance ni animación innecesaria.

Si una inspección visual fuera indispensable, usar **una sola captura recortada por sección**, nunca `fullPage`, máximo `1600×1200`, y verificar sus dimensiones antes de abrirla.

## 11. Criterio final de aprobación

Un banner está terminado cuando:

- comunica una sola idea con claridad;
- parece parte natural del sistema actual aunque la campaña sea nueva;
- funciona como pareja PC/móvil, no como un horizontal mutilado;
- mantiene el carácter boutique, curado y confiable de MAGANDHI;
- tiene evidencia técnica de medidas, rutas, contraste y responsive;
- no rompe otra sección ni introduce deuda silenciosa.

La prueba decisiva no es “se ve bonito”, sino: **¿la composición dirige la mirada, la jerarquía explica la idea y cada elemento cumple una función?** Si la respuesta no es inequívocamente sí, todavía no está listo.
