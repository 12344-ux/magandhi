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

### Perfiles verificados en producción

Cada espacio tiene un perfil propio. **Estas medidas y proporciones son contratos, no recomendaciones.**

| Espacio | Asset PC | Caja PC comprobada a 1280px | Asset móvil | Caja móvil comprobada a 390px |
|---|---:|---:|---:|---:|
| Carrusel hero (banners 1 y 2) | `1600 × 600` · `8:3` | `1152 × 432` | `1080 × 1080` · `1:1` | `351 × 351` |
| Banner Historia (banner 3) | `1600 × 478` · ≈`3,35:1` | `1152 × 344` | `1080 × 1854` · ≈`0,583:1` | `351 × 602` |

El riel común tiene `max-width:1200px`, padding lateral de `24px` en PC y `12px` en móvil. Los contenedores conservan radio de `20px`, recorte interno (`overflow:hidden`) y sombra sutil.

### Regla dura de geometría

- Nunca cambiar el formato, la proporción, la altura CSS ni el espacio ocupado para hacer caber una campaña.
- Primero se identifica **qué espacio** se va a reemplazar; después se diseña dentro del perfil exacto de ese espacio.
- PC y móvil siempre son dos construcciones del mismo concepto, pero no necesariamente comparten proporción entre espacios.
- El móvil de Historia es vertical y alargado; **nunca es cuadrado**.
- La idea se adapta al marco. El marco no se adapta a la idea.

## 3. Entregable obligatorio por cada concepto

Cada campaña requiere una pareja diseñada expresamente para el espacio solicitado:

### Si reemplaza un slide del carrusel hero

1. `banner-{id}-pc.jpg` o `.webp`: **1600 × 600 px**.
2. `banner-{id}-movil.jpg` o `.webp`: **1080 × 1080 px**.

### Si reemplaza el banner Historia

1. `banner-historia-{id}-pc.jpg` o `.webp`: **1600 × 478 px**.
2. `banner-historia-{id}-movil.jpg` o `.webp`: **1080 × 1854 px**.

Reglas duras:

- Nunca entregar una sola imagen para ambos formatos.
- Nunca fabricar móvil con un recorte automático del PC.
- Nunca aplicar las medidas del hero al banner Historia ni viceversa.
- Nunca superar **2000 px en ninguna dimensión**.
- Objetivo de peso: **menos de 300 KB por archivo** sin degradación visible.
- Usar `sRGB`; evitar perfiles de color exóticos.
- Usar nombres semánticos y versionados, por ejemplo `banner-color-compras-v1-pc.webp` y `banner-color-compras-v1-movil.webp`.
- No sobrescribir un nombre publicado si puede quedar en caché. Subir versión (`v2`) y cambiar las rutas en HTML/CSS.
- No reutilizar un asset entre espacios. Aunque dos piezas compartan lenguaje visual, cada una conserva su propia pareja de archivos.

## 4. Retícula y zonas seguras

### Carrusel hero · PC — 1600 × 600

- El contenido HTML ocupa como máximo el **52% izquierdo**.
- Reservar visualmente el **55% izquierdo** como zona tranquila para sello, título, apoyo y CTA.
- Ubicar el producto, persona, objeto o gesto principal en el **40–45% derecho**.
- El punto focal debe sobrevivir a `background-size:cover` y `background-position:center`.
- No poner rostros, producto, logotipo ni detalles esenciales pegados a los bordes.
- El fondo detrás del texto puede tener textura, pero no detalle de alto contraste que rompa la lectura.
- El recorrido visual ideal es izquierda → derecha: primero mensaje, después evidencia visual.

### Carrusel hero · móvil — 1080 × 1080

- El contenido HTML se apoya abajo y puede ocupar hasta el **88% del ancho**.
- Reservar el tercio inferior, especialmente la esquina inferior izquierda, como zona tranquila.
- Recomponer el punto focal hacia la mitad superior o hacia la derecha.
- El sujeto puede crecer respecto a PC; no debe quedar diminuto por conservar el encuadre horizontal.
- Verificar que el sujeto no choque con sello, título, descripción, CTA ni puntos del carrusel.
- No asumir que “responsive” significa cortar: es una **segunda dirección de arte** del mismo concepto.

### Historia · PC — 1600 × 478

- El banner completo es una sola superficie visual; no se divide en “imagen de un lado + fondo de página del otro”.
- La mitad izquierda aloja el texto y la derecha el motivo protagonista.
- Mantener el motivo tono sobre tono, grande y parcialmente recortado por el borde.
- El texto, el motivo y el CTA deben sentirse dentro de una misma pieza continua.

### Historia · móvil — 1080 × 1854

- Es un lienzo vertical alargado, no un cuadrado del hero.
- Se trata como **una segunda pieza completa**, casi otro banner: no se deriva ampliando, estirando ni recortando el JPEG de PC.
- El primer tramo reserva aire para el motivo visual; el texto ocupa el tramo inferior sin cambiar la altura existente de la tarjeta.
- El motivo se renderiza desde el SVG oficial o desde una fuente de resolución suficiente y se compone específicamente para la zona superior derecha.
- La superficie cromática continúa detrás de motivo, título, párrafo y CTA: no aparece un panel arena o crema debajo.
- El motivo debe percibirse completo en la zona visual; no basta con que el archivo correcto cargue si en pantalla solo queda visible un arco o fragmento accidental.
- Conservar la estructura actual que produce aproximadamente `351 × 602px` a 390px de viewport.
- Los gradientes planos deben llevar microtextura controlada o una exportación equivalente que evite banding visible; calidad técnica y peso se equilibran sin superar 300KB.

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

- El fondo real de la página es arena `#EFE7DD`. Un banner **nunca puede confundirse con ese fondo**.
- Superficies base aprobadas para banners:
  - terracota: gradiente de `#79211F` a `#A6332E`;
  - negro profundo: gradiente de `#111111` a `#1D1D1D`.
- Crema `#FAF6F1`, tarjeta `#F2ECE4` y arena `#EFE7DD` no se usan como superficie dominante de banner. Pueden aparecer dentro de una fotografía o como detalle, pero el perímetro de la pieza debe distinguirse inequívocamente de la página.
- Blanco y ámbar se reservan para texto, sello, CTA y detalles de jerarquía.
- El ámbar es un **detalle pequeño**. Nunca un marco o superficie grande junto al terracota; esa combinación protagonista se percibe como comida rápida y rompe el carácter boutique.
- Una campaña como “¿de qué color son tus compras?” puede mostrar varios colores en objetos o señales visuales, pero mantiene una superficie base negra o terracota que la ancla a MAGANDHI.
- El color particular de un producto puede vivir en la fotografía o en detalles menores, pero no reemplaza la estructura cromática de MAGANDHI.
- No introducir un color decorativo nuevo sin una función comunicativa clara.

### Tipografía y texto

Todo texto comunicativo va en HTML, nunca rasterizado dentro del JPG/WebP:

- conserva nitidez en cualquier pantalla;
- permite corregir copy y tildes;
- es accesible y seleccionable;
- evita crear cuatro archivos por cada cambio de frase.

La familia actual es **Poppins**. Jerarquías por espacio:

**Carrusel hero**

- sello: `10–11px`, semibold, mayúsculas, tracking amplio;
- titular PC: `26–46px`; móvil: `23–30px`; peso `700`; interlínea `1.08`;
- apoyo: `13–16.5px`, interlínea `1.5`, máximo `30ch`;
- CTA: `14.5px`, semibold.

**Historia**

- titular: `22–30px`, peso `700`, interlínea `1.15`;
- párrafo: `14.5px`, interlínea `1.65`, máximo `46ch`;
- CTA: `14px`, semibold;
- estas medidas y el padding existente se conservan para no cambiar la altura del banner.

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

## 6. Superficies cromáticas permitidas

La base se elige por intención de campaña, pero siempre debe separarse del fondo arena de la página.

### Terracota MAGANDHI

- Gradiente de `#79211F` a `#A6332E`.
- Para cercanía, identidad de marca, emoción cotidiana y mensajes institucionales como Historia.
- Titular y apoyo blancos.
- Motivo tono sobre tono en rojo claro, grande y discreto.

### Negro profundo

- Gradiente de `#111111` a `#1D1D1D`.
- Para curaduría, anticipación, tecnología, exclusividad o campañas donde los colores protagonistas necesiten resaltar.
- Titular y apoyo blancos.
- El motivo puede usar terracota profundo, manteniendo contraste bajo.

La clase heredada `.hg-slide--claro` puede seguir existiendo en el CSS, pero no convierte el crema en una superficie aprobada para campañas nuevas. No se usa sin una decisión explícita del dueño.

**Unidad de superficie:** cada banner se percibe como una sola pieza cromática. No dejar media tarjeta terracota y media tarjeta arena como consecuencia accidental de la estructura HTML. Una división solo existe si la idea de comunicación la exige explícitamente.

**Contraste obligatorio:** medir el resultado real sobre la imagen final. Texto normal y CTA deben alcanzar como mínimo `4.5:1`; texto grande, `3:1`. El ámbar actual con texto blanco puede no alcanzar `4.5:1`: no convertir esa combinación en regla ciega. Resolver el contraste sin cambiar globalmente la paleta durante un trabajo de campaña; puede usarse texto oscuro sobre ámbar o un tono funcional más oscuro, documentando la decisión.

### Constantes visuales actuales

Estas constantes forman parte del marco aprobado. No se ajustan por campaña:

| Elemento | Valor actual |
|---|---|
| riel exterior | `max-width:1200px`; `24px` laterales PC; `12px` móvil |
| proporción hero | `1600/600` PC; `1/1` móvil |
| proporción Historia | `1600/478` PC; `1080/1854` móvil |
| contenedor | `border-radius:20px`; `overflow:hidden` |
| sombra | `0 14px 40px rgba(17,17,17,.10)` |
| contenido hero PC | centrado vertical; `max-width:52%`; padding horizontal `clamp(24px,4vw,56px)` |
| contenido hero móvil | apoyado abajo; `max-width:88%`; `padding-bottom:34px` |
| estructura Historia PC | grid `1fr 1fr`; texto a la izquierda; motivo a la derecha; fondo continuo en la caja completa |
| estructura Historia móvil | una columna; zona visual superior `220px`; texto debajo; fondo continuo en toda la caja |
| velo hero PC | `linear-gradient(90deg, rgba(17,17,17,.42) 0%, rgba(17,17,17,.12) 48%, transparent 72%)` |
| velo hero móvil | `linear-gradient(180deg, rgba(17,17,17,.12) 0%, rgba(17,17,17,.08) 40%, rgba(17,17,17,.58) 100%)` |
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

Para las superficies terracota y negra se usa la variante oscura con texto blanco; no añadir `hg-slide--claro`. Al agregar o quitar slides:

- actualizar `aria-label="X de N"` en **todas** las diapositivas;
- comprobar que el CTA llega a una ruta real;
- no cambiar las clases ni duplicar la lógica del carrusel;
- no tocar el ritmo de `6000ms`, breakpoints o geometría en un cambio que solo sea de campaña;
- conservar el texto como HTML y los SVG inline;
- verificar que la diapositiva funcione con teclado, swipe, puntos y autoavance.

### Contrato del banner Historia

Historia no es una diapositiva del carrusel. Su fondo responsive pertenece a `.hg-historia__caja`, porque toda la caja debe ser una superficie continua:

```css
.hg-historia__caja{
  background-image:url('banners/banner-historia-{id}-pc.webp');
  background-size:cover;
  background-position:center;
}
@media(max-width:760px){
  .hg-historia__caja{
    background-image:url('banners/banner-historia-{id}-movil.webp');
  }
}
```

`.hg-historia__txt` y `.hg-historia__img` permanecen transparentes. La división interna organiza contenido y espacio visual, pero nunca divide el color del banner. La zona `.hg-historia__img` conserva `min-height:300px` en PC y `220px` en móvil para no alterar la geometría.

## 8. Flujo cuando el dueño llega con una idea

Este es el flujo contractual. El dueño no necesita entregar un diseño terminado: entrega la intención. El sistema la convierte en una campaña coherente dentro del espacio existente y después se afinan detalles.

### Paso 1 — Recibir la idea sin deformarla

Ejemplo de entrada válida:

> “Quiero reemplazar el banner 1 por una campaña sobre de qué color son tus compras, para que las personas identifiquen el color de sus compras y sepan que esta función llegará próximamente”.

Primero se conserva el núcleo de la idea. No se cambia el formato del banner, no se inventa otra campaña y no se llena de mensajes adicionales.

### Paso 2 — Identificar el espacio exacto

Antes de diseñar, declarar cuál perfil se reemplaza:

- slide del hero: `1600×600` PC + `1080×1080` móvil;
- Historia: `1600×478` PC + `1080×1854` móvil.

Las proporciones quedan bloqueadas desde este momento.

### Paso 3 — Traducir la idea a comunicación visual

Definir, sin inventar promesas:

- objetivo de negocio;
- persona a quien se habla;
- una idea principal;
- evidencia o explicación mínima;
- acción esperada y destino real del CTA;
- protagonista visual;
- superficie base terracota o negra;
- recorrido de mirada;
- tratamiento independiente para PC y móvil.

Si la idea permite deducirlo con seguridad, avanzar sin interrogatorio innecesario. Preguntar solo cuando falte una decisión que cambie el sentido, la honestidad o el destino.

Para el ejemplo “color de tus compras”, una traducción coherente sería: superficie negra para separar la pieza del arena y hacer resaltar una familia controlada de colores; un único objeto/sistema visual que represente la compra; mensaje de anticipación, no de función ya disponible; CTA informativo, no una compra engañosa. El copy exacto y los detalles se afinan después de establecer esta dirección.

### Paso 4 — Escribir antes de decorar

Construir:

- sello;
- titular breve;
- apoyo de una frase;
- CTA;
- frase de dirección visual: “punto focal + ubicación + atmósfera”.

Eliminar todo lo que no sostenga la idea principal.

### Paso 5 — Diseñar las dos construcciones

- Crear PC en la medida exacta del espacio elegido.
- Crear móvil como una composición autónoma desde las fuentes originales —SVG, fotografía o ilustración—, no transformando el JPG exportado para PC.
- Recomponer escala, posición, cantidad de aire y zonas seguras para su propia proporción.
- En espacios complejos como Historia, asumir desde el principio que se están diseñando **dos banners coordinados**, no un banner y su recorte.
- Mantener protagonista, luz, tono y significado; no las mismas coordenadas.
- Mantener una superficie base aprobada que se distinga del arena real.
- No incrustar copy en la imagen.
- Exportar con medidas exactas y peso objetivo.

### Paso 6 — Integrar sin rediseñar el marco

- Añadir los dos assets versionados en `banners/`.
- Reemplazar únicamente el espacio solicitado.
- Usar `data-pc`/`data-movil` para el hero o el cambio CSS correspondiente para Historia.
- Mantener intactos riel, proporción, altura, radio, sombra, breakpoint y controles.
- Garantizar que toda la pieza use la superficie elegida; la estructura interna no puede dejar visible accidentalmente el fondo arena.

### Paso 7 — Presentar la primera ejecución y afinar

La primera entrega debe ser una propuesta ya construida y coherente, no una lista de ideas vagas. A partir de ella se afinan copy, color, escala, posición o motivo visual **sin cambiar el formato contratado**.

### Paso 8 — Verificar con evidencia

No declarar “listo” porque la página cargue. Comprobar dimensiones de archivos, caja renderizada, asset correcto por breakpoint, contraste, ausencia de solapes, CTA, peso y separación visual respecto al fondo arena.

## 9. Errores que hacen que deje de parecer MAGANDHI

- Cambiar el formato, la proporción o la altura del espacio para acomodar una idea.
- Diseñar un volante con cinco mensajes dentro del banner.
- Quemar el copy en la imagen.
- Usar el mismo recorte en PC y móvil.
- Ampliar o estirar un JPEG de PC para fabricar la versión móvil.
- Dar por aprobado un móvil porque sus dimensiones son correctas aunque el motivo haya quedado fuera del lienzo.
- Comprimir un gradiente hasta producir bandas visibles.
- Centrar el producto justo debajo del texto.
- Llenar el espacio negativo con adornos sin función.
- Usar dorado/ámbar como aro, marco o fondo protagonista junto al terracota.
- Introducir colores chillones por “llamar la atención”.
- Usar crema o arena como superficie principal hasta que el banner se confunda con la página.
- Colorear solo el panel que antes contenía una imagen y dejar el resto del mismo banner arena por accidente.
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

- [ ] La pareja coincide con el perfil del espacio: hero `1600×600 + 1080×1080` o Historia `1600×478 + 1080×1854`.
- [ ] No se cambió la proporción ni el espacio renderizado existente.
- [ ] Ninguna dimensión supera 2000px.
- [ ] Móvil fue compuesto desde fuentes originales, no recortado ni ampliado desde el JPG de PC.
- [ ] El motivo principal se percibe completo y con intención; no queda reducido a un fragmento accidental.
- [ ] PC deja aire a la izquierda y protagonista a la derecha.
- [ ] Móvil protege la zona inferior del texto.
- [ ] Los gradientes no presentan bandas, bloques ni degradación visible en el dispositivo real.
- [ ] No hay texto incrustado en el asset.
- [ ] Cada archivo pesa menos de 300KB o existe una razón documentada.
- [ ] El ámbar sigue siendo detalle, no superficie protagonista.

### Implementación

- [ ] Las dos rutas existen y no producen 404.
- [ ] Los nombres están versionados para evitar caché obsoleta.
- [ ] La superficie base terracota o negra se distingue claramente del fondo arena.
- [ ] Los `aria-label` reflejan correctamente `X de N`.
- [ ] El CTA y el SVG siguen en HTML.
- [ ] No se rompió el uso táctil, teclado, puntos, flechas ni autoavance.
- [ ] Carrusel, Historia y cualquier otra sección conservan parejas de assets independientes.

### Verificación responsive y accesible

Verificar por DOM/CSS y medidas; no hace falta una captura de pantalla para cada tamaño.

- [ ] 390px · hero: caja aproximada `351×351`, asset móvil cuadrado, texto sin tercera línea ni solapes.
- [ ] 390px · Historia: caja aproximada `351×602`, asset móvil vertical `1080×1854`, superficie cromática continua.
- [ ] 760px: siguen activos ambos diseños móviles.
- [ ] 761px: entran ambos diseños PC sin salto roto.
- [ ] 1280px · hero: caja aproximada `1152×432`.
- [ ] 1280px · Historia: caja aproximada `1152×344`, asset PC `1600×478`, sin panel arena interno.
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
