# UI-UX-GUIDELINES — Sistema visual, layout, estados, foco y accesibilidad del Cotizador

- **Versión:** v1 · **Estado:** Borrador (pendiente de revisión en **HITL-2**, junto con los ADRs)
- **Autor:** `@ui-ux-designer` · **Fase:** 3
- **Specs de origen (aprobadas en HITL-1, v3):** `docs/specs/SPEC-US-01.md`, `SPEC-US-02.md`, `SPEC-US-03.md`
- **Contexto global:** `CLAUDE.md` §3 (reglas 2, 3, 6, 7), §4 (rutas únicas), §7 (estados como unión discriminada).
- **Alcance:** solo diseño (tokens, layout, estados, foco, copy, matriz). No contiene código Angular ni lógica de negocio. Los fragmentos CSS son la definición de los tokens y de dos reglas de foco, no implementación de componentes.
- **Cómo se enlazan las decisiones:** cada sección cita los `R-`/`AC-` que justifican la decisión. No se crean IDs nuevos (para no alterar `scripts/trace-check.mjs`); las decisiones se citan por número de sección (`§2.3`).

---

## 1. Marca ficticia y dirección visual

### 1.1 Marca

- **Nombre ficticio:** **Linde Auto** ("linde" = borde o límite de un camino). Subtítulo de contexto: "Cotizador de seguros de autos".
- Es una marca inventada para este ejercicio. No debe parecerse a una aseguradora real de Colombia ni de Chile. **Pendiente de HITL-2:** una búsqueda rápida de marcas registradas con ese nombre antes de publicar en Render (no se pudo hacer desde este agente).
- El pie de página lo declara siempre (CLAUDE regla 5): "Linde Auto es una marca ficticia. Esta cotización es una simulación sin valor contractual." (`footer.disclaimer`).
- Sin logotipo gráfico: el wordmark es texto ("Linde Auto", peso 600) precedido de un motivo de **línea de carril** (tres guiones horizontales, decorativo, `aria-hidden`). El wordmark en el header **no es un enlace** (no existe una página de inicio; evita salir del flujo por error).

### 1.2 Dirección visual (intencional)

| Decisión | Detalle | Por qué |
| :--- | :--- | :--- |
| Concepto | "Papel y carretera": fondo cálido tipo papel, tinta casi negra y un único acento azul petróleo. El motivo recurrente es la **línea discontinua de carril** (conector del stepper, filete del header, separador del bloque de pago). | Sobrio y confiable (seguro), con un rasgo propio que no es una plantilla genérica. |
| Un solo acento | Azul petróleo `#0B5C6B` reservado para: botón primario, paso activo/completado, radio/checkbox marcados, enlaces y plan elegido. | Skill `ui-ux-accessibility-system` §1: un acento solo para CTA y paso activo. Evita competir con estados (rojo, verde, ámbar). |
| Tipografía | **IBM Plex Sans** (400, 500, 600), una sola familia, autoalojada (`font-display: swap`), con fallback `system-ui`. Títulos en 600 con `letter-spacing: -0.01em`; cifras y precios con `font-variant-numeric: tabular-nums`. | Carácter (formas técnicas y cálidas, buen `ñ`/tildes) y legibilidad; una familia cumple la skill. Autoalojada: sin CDN externo (privacidad y despliegue gratuito sin dependencia de terceros). Requiere subconjunto latin + latin-ext (`ñ`, `á`, `¿`). |
| Jerarquía | Un `h1` por pantalla (tamaño fluido), `h2` por bloque, precio final como el elemento tipográfico más grande de cada tarjeta/caja (1.75 rem, 600). | Los precios son lo que el usuario compara (R-02.5, R-02.6). |
| Superficies | Páginas sobre `--color-bg`; tarjetas y campos sobre `--color-surface` (blanco) con borde 1 px. Sombra mínima (`--shadow-card`). Sin gradientes ni glassmorphism. | Skill §1. |
| Formas | Radios 8 px (controles) y 12 px (tarjetas). Botones 48 px de alto. | Objetivo táctil >= 44 px (skill §3, WCAG 2.5.8). |
| Tono del copy | Español neutro, tuteo ("Elige tu plan"), frases cortas, sin jerga técnica salvo en `config-error` (que va dirigido al equipo de contenido). | Aplica a ambos países sin regionalismos. |
| Modo | Solo claro (`color-scheme: light`). Modo oscuro fuera de alcance de v1 (cada par de colores adicional exigiría su matriz de contraste). | Alcance acotado. |

---

## 2. Tokens de diseño

### 2.1 Método de contraste

Fórmula WCAG 2.x: canal sRGB `c = valor/255`; lineal `c_lin = c / 12.92` si `c <= 0.04045`, si no `((c + 0.055) / 1.055)^2.4`; luminancia `L = 0.2126 R + 0.7152 G + 0.0722 B`; ratio `= (L_claro + 0.05) / (L_oscuro + 0.05)`.

> **Nota de verificación:** este agente no tiene Bash. Los ratios se calcularon a mano con la fórmula (precisión de ±0.02 por redondeo; todas las combinaciones tienen margen mayor que ese error respecto del umbral). Para cerrar el riesgo, §8 (prueba T4) exige un test unitario que lea `tokens.css`, calcule los ratios y falle si alguno baja del umbral. Los valores de `L` de la tabla 2.3 permiten a cualquier revisor reproducir el cálculo.

Umbrales: texto normal >= 4.5:1 (1.4.3); componentes de UI, bordes que identifican un control y anillo de foco >= 3:1 (1.4.11, 2.4.7). Ejemplo resuelto: texto `--color-text` (`L = 0.0171`) sobre blanco: `(1 + 0.05) / (0.0171 + 0.05) = 15.65`.

### 2.2 Tokens (CSS custom properties, valores exactos)

Archivo destino: `frontend/src/styles/tokens.css` (lo implementa `@frontend-engineer`; no se renombran los tokens sin actualizar esta guía).

```css
:root {
  color-scheme: light;

  /* Superficies */
  --color-bg:              #F6F4EF; /* fondo de página (papel) */
  --color-surface:         #FFFFFF; /* tarjetas, campos, header */
  --color-surface-sunken:  #E1DED6; /* skeleton, botón deshabilitado (no lleva texto de énfasis) */
  --color-divider:         #D5D0C4; /* filetes decorativos (no identifican controles) */

  /* Texto */
  --color-text:            #1B2430; /* texto principal (tinta) */
  --color-text-muted:      #4A5563; /* ayudas, metadatos, placeholder */
  --color-text-disabled:   #5F6977; /* texto de botón deshabilitado */
  --color-text-on-accent:  #FFFFFF; /* texto sobre acento y sobre tinta */

  /* Acento (único) */
  --color-accent:          #0B5C6B;
  --color-accent-hover:    #08474F;
  --color-accent-tint:     #E3F0F2; /* fondo del plan elegido, avisos informativos */

  /* Bordes de controles (identifican el componente, >= 3:1) */
  --color-border-control:  #6B7685;

  /* Foco */
  --color-focus:           #1E40AF;

  /* Semánticos */
  --color-danger:          #B3261E;
  --color-danger-tint:     #FBE9E7;
  --color-success:         #1E6B3A;
  --color-success-tint:    #E4F3E8;
  --color-warning-text:    #6B4A00;
  --color-warning-border:  #8A5A00;
  --color-warning-tint:    #FFF4D6;
  --color-ink-badge:       #1B2430; /* insignia "Recomendado" y borde del recomendado */

  /* Tipografía */
  --font-family: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-size-xs:   0.875rem;                          /* 14 px: ayudas, errores, metadatos (mínimo permitido) */
  --font-size-base: 1rem;                              /* 16 px: cuerpo, campos (evita zoom automático en iOS) */
  --font-size-lg:   1.125rem;
  --font-size-h2:   1.25rem;
  --font-size-h1:   clamp(1.5rem, 1.15rem + 1.4vw, 2.125rem);
  --font-size-price: 1.75rem;
  --line-height-base: 1.5;
  --line-height-tight: 1.25;
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-strong: 600;

  /* Espaciado (rejilla de 4 px) */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;     --space-5: 1.5rem;   --space-6: 2rem;
  --space-7: 3rem;     --space-8: 4rem;

  /* Forma, bordes, sombra */
  --radius-control: 0.5rem;   /* 8 px */
  --radius-card:    0.75rem;  /* 12 px */
  --radius-pill:    999px;
  --border-width:        1px;
  --border-width-strong: 2px;  /* error, recomendado */
  --border-width-selected: 3px; /* plan elegido */
  --shadow-card: 0 1px 2px rgba(27, 36, 48, 0.08);

  /* Objetivos y foco */
  --size-target-min: 2.75rem;  /* 44 px */
  --size-button-height: 3rem;  /* 48 px */
  --focus-ring-width: 3px;
  --focus-ring-offset: 2px;

  /* Layout */
  --container-max: 70rem;      /* 1120 px */
  --form-max: 50rem;           /* 800 px */
  --aside-width: 22.5rem;      /* 360 px, caja de pago (desktop) */

  /* Movimiento */
  --motion-fast: 120ms;
  --motion-skeleton: 1600ms;
}

@media (prefers-reduced-motion: reduce) {
  :root { --motion-fast: 0.01ms; --motion-skeleton: 0.01ms; }
}
```

Breakpoints (constantes de diseño; las custom properties no funcionan dentro de `@media`): **mobile `< 768px`**, **desktop `>= 768px`**, y un sub-corte **`>= 1024px`** (rejilla de 3 planes y caja de pago fija). Todo el CSS usa `rem`/`%` para que el zoom de texto al 200 % no rompa el layout.

Regla de foco global (única fuente, aplica a todos los interactivos):

```css
:focus-visible {
  outline: var(--focus-ring-width) solid var(--color-focus);
  outline-offset: var(--focus-ring-offset); /* el anillo nunca toca el color del botón: se apoya en el fondo de la superficie */
}
@media (forced-colors: active) { :focus-visible { outline-color: Highlight; } }
```

### 2.3 Luminancias de referencia

| Token | Hex | L (luminancia relativa) |
| :--- | :--- | :--- |
| `--color-surface` | `#FFFFFF` | 1.0000 |
| `--color-bg` | `#F6F4EF` | 0.9053 |
| `--color-accent-tint` | `#E3F0F2` | 0.8507 |
| `--color-success-tint` | `#E4F3E8` | 0.8642 |
| `--color-warning-tint` | `#FFF4D6` | 0.9082 |
| `--color-danger-tint` | `#FBE9E7` | 0.8455 |
| `--color-surface-sunken` | `#E1DED6` | 0.7311 |
| `--color-text` / `--color-ink-badge` | `#1B2430` | 0.0171 |
| `--color-text-muted` | `#4A5563` | 0.0885 |
| `--color-text-disabled` | `#5F6977` | 0.1387 |
| `--color-accent` | `#0B5C6B` | 0.0879 |
| `--color-accent-hover` | `#08474F` | 0.0512 |
| `--color-border-control` | `#6B7685` | 0.1779 |
| `--color-focus` | `#1E40AF` | 0.0704 |
| `--color-danger` | `#B3261E` | 0.1106 |
| `--color-success` | `#1E6B3A` | 0.1109 |
| `--color-warning-text` | `#6B4A00` | 0.0802 |
| `--color-warning-border` | `#8A5A00` | 0.1272 |

### 2.4 Pares de color verificados

**Texto (umbral 4.5:1)**

| # | Primer plano | Fondo | Uso | Ratio | Cumple |
| :--- | :--- | :--- | :--- | :--- | :--- |
| T1 | `--color-text` | `--color-surface` | cuerpo, labels, valores | **15.65** | Sí |
| T2 | `--color-text` | `--color-bg` | texto sobre la página | **14.24** | Sí |
| T3 | `--color-text` | `--color-accent-tint` | contenido del plan elegido | **13.42** | Sí |
| T4 | `--color-text` | `--color-warning-tint` | texto base de avisos | **14.28** | Sí |
| T5 | `--color-text` | `--color-danger-tint` | texto de contexto en alertas | **13.35** | Sí |
| T6 | `--color-text-muted` | `--color-surface` | ayudas, placeholder, metadatos | **7.58** | Sí |
| T7 | `--color-text-muted` | `--color-bg` | pie de página, textos secundarios | **6.90** | Sí |
| T8 | `--color-text-muted` | `--color-accent-tint` | metadatos dentro del plan elegido | **6.50** | Sí |
| T9 | `--color-text-on-accent` | `--color-accent` | botón primario, paso activo | **7.62** | Sí |
| T10 | `--color-text-on-accent` | `--color-accent-hover` | botón primario en hover | **10.37** | Sí |
| T11 | `--color-accent` | `--color-surface` | enlaces, botón secundario | **7.62** | Sí |
| T12 | `--color-accent` | `--color-bg` | enlaces sobre la página | **6.93** | Sí |
| T13 | `--color-accent` | `--color-accent-tint` | enlaces dentro del plan elegido | **6.53** | Sí |
| T14 | `--color-danger` | `--color-surface` | mensaje de error de campo | **6.54** | Sí |
| T15 | `--color-danger` | `--color-bg` | error sobre la página | **5.95** | Sí |
| T16 | `--color-danger` | `--color-danger-tint` | título de alerta (error, pago rechazado, config-error) | **5.57** | Sí |
| T17 | `--color-success` | `--color-success-tint` | texto de éxito (confirmación) | **5.68** | Sí |
| T18 | `--color-warning-text` | `--color-warning-tint` | aviso de precio cambiado / plan no disponible | **7.36** | Sí |
| T19 | `--color-text-on-accent` | `--color-ink-badge` | insignia "Recomendado" | **15.65** | Sí |
| T20 | `--color-text-disabled` | `--color-surface-sunken` | botón deshabilitado (componente inactivo: exento por 1.4.3, se mantiene legible) | **4.14** | Exento (supera 3:1) |

**Componentes de UI, bordes y foco (umbral 3:1)**

| # | Elemento | Fondo adyacente | Ratio | Cumple |
| :--- | :--- | :--- | :--- | :--- |
| U1 | Borde de campo/select/checkbox desmarcado/radio (`--color-border-control`) | `--color-surface` | **4.61** | Sí |
| U2 | Mismo borde sobre | `--color-bg` | **4.19** | Sí |
| U3 | Mismo borde sobre | `--color-accent-tint` | **3.95** | Sí |
| U4 | Anillo de foco (`--color-focus`) | `--color-surface` | **8.72** | Sí |
| U5 | Anillo de foco | `--color-bg` | **7.93** | Sí |
| U6 | Anillo de foco | `--color-accent-tint` | **7.48** | Sí |
| U7 | Anillo de foco | `--color-danger-tint` | **7.44** | Sí |
| U8 | Anillo de foco | `--color-warning-tint` | **7.96** | Sí |
| U9 | Anillo de foco | `--color-success-tint` | **7.59** | Sí |
| U10 | Borde de campo inválido (`--color-danger`, 2 px) | `--color-surface` | **6.54** | Sí |
| U11 | Borde del plan elegido (`--color-accent`, 3 px) | `--color-surface` / `--color-bg` | **7.62** / **6.93** | Sí |
| U12 | Borde del plan recomendado (`--color-ink-badge`, 2 px) | `--color-surface` | **15.65** | Sí |
| U13 | Radio/checkbox marcado (relleno `--color-accent`) | `--color-surface` | **7.62** | Sí |
| U14 | Borde del aviso de precio (`--color-warning-border`, barra izquierda 4 px) | `--color-warning-tint` / `--color-surface` | **5.41** / **5.92** | Sí |

**Exenciones documentadas (no requieren ratio):** `--color-divider` (filetes decorativos, ratio con blanco aprox. 1.5:1, no identifica ningún control), conector discontinuo del stepper (decorativo; el estado se comunica con texto y `aria-current`), skeleton (decorativo, `aria-hidden`).

**Regla de uso:** el foco solo se dibuja con `outline` + `outline-offset: 2px`. Nunca debe estar pegado al relleno de un botón: `--color-focus` sobre `--color-accent` da solo 1.14:1, por eso el desplazamiento de 2 px es obligatorio (el anillo se apoya en el fondo de la superficie, ratios U4 a U9).

**El color nunca es el único canal** (1.4.1, R-01.25, R-02.10): error = icono + texto + borde 2 px; recomendado = insignia con texto + borde 2 px; elegido = radio marcado + borde 3 px + texto "Elegido"; paso activo = número en círculo relleno + texto + `aria-current`.

### 2.5 Objetivos táctiles y texto

- Botones: alto 48 px, ancho mínimo 44 px. Campos: alto 48 px. Radios/checkbox: control de 24 px dentro de una fila de al menos 44 px de alto, con toda la fila clicable (`label`).
- Enlaces independientes ("Editar datos", "Cambiar plan", países): `min-height: 44px` por relleno. Enlaces en línea dentro de un párrafo quedan exentos (2.5.8).
- Mínimo de texto 14 px (`--font-size-xs`); campos a 16 px.
- Texto legible con espaciado forzado (1.4.12): ningún contenedor con altura fija; todos crecen con el contenido.

---

## 3. Estructura común (todas las pantallas)

Referencias: R-01.25, R-02.18, R-03.20, AC-01.24, AC-02.13, AC-03.25.

```
Header (no fijo)
  - Skip link "Saltar al contenido principal" (visible solo con foco)
  - Wordmark "Linde Auto" (texto, no enlace)
  - <nav aria-label="País"> enlaces a cada país (de GET /api/countries); el actual con aria-current="true" + marca visible
Stepper <nav aria-label="Progreso de cotización"><ol> (pasos 1-3; no se muestra en confirmación ni en country-not-found)
<main id="main" tabindex="-1">  (un h1 por pantalla, tabindex="-1")
Footer (aviso de marca ficticia)
```

### 3.1 Selector de país (decisión de GAP-01.9)

- Es una lista de **enlaces** (no un `select` que cambia de contexto al elegir; evita 3.2.2). Texto = `country.name` de Strapi. Al activar un enlace se navega a `/:country/quote/step-1` del país elegido; el estado del otro país no se toca ni se avisa con modal (R-01.20, AC-01.16).
- Texto de ayuda visible bajo el selector en desktop y dentro de un `title`-less texto en mobile: "Tus datos de cada país se guardan por separado en esta pestaña." (`header.country.hint`).
- Si la lista de países no carga (Strapi caído), el header muestra solo el nombre/código del país actual como texto plano (sin enlaces) y **no** muestra error propio: el error recuperable lo presenta el contenido principal (R-01.22).
- Mobile: el wordmark ocupa la primera fila y la lista de países la segunda (envuelve con `flex-wrap`), cada enlace con 44 px de alto.

### 3.2 Stepper

- `<ol>` con tres `<li>`; cada paso tiene un círculo con el número (o una marca de verificación si está completado) y el texto del paso.
- Estado de cada paso **derivado** de los datos vigentes, nunca de un flag guardado (R-01.10): completado = `validateStep1` sin errores (paso 1) / plan elegido válido (paso 2). Completado y navegable = `<a>`; actual = `<span aria-current="step">`; pendiente = `<span>` (no enlace).
- Nombre accesible de cada paso: "Paso N: {nombre}, {completado|paso actual|pendiente}" (clave `stepper.item.*`). Los textos de pasos no activos se ocultan visualmente en mobile con la técnica visually-hidden (siguen en el árbol de accesibilidad; no `display:none`).
- Conector entre pasos: línea discontinua (`border-top: 2px dashed --color-divider`), decorativa.

### 3.3 Título del documento (2.4.2)

`{h1} · Paso {n} de 3 · Linde Auto ({país})`; confirmación: `Cotización confirmada · Linde Auto ({país})`; country-not-found: `País no encontrado · Linde Auto`. Se actualiza en cada navegación (también con atrás/adelante).

---

## 4. Layout por pantalla

Convención de los wireframes: `[ ]` campo, `( )` radio, `[x]` checkbox marcado, `[ Botón ]`, `====` filete de carril (discontinuo en el diseño). Los campos del Paso 1 son un ejemplo con el seed (Colombia); en producción salen de Strapi (R-01.2, R-01.3) y el layout nunca depende de `key` ni de `semanticRole` (CLAUDE regla 3): solo del `type`.

Contenedor: ancho máximo `--container-max`, relleno lateral 16 px (mobile) / 24 px (desktop) / 32 px (>= 1024 px).

### 4.1 Paso 1 `/:country/quote/step-1` (US-01)

**Mobile (< 768 px)** — una columna; botón "Continuar" a todo el ancho.

```
+----------------------------------------+
| Linde Auto                             |
| Colombia | Chile                       |
+----------------------------------------+
|  (1)- - -( 2 )- - -( 3 )               |
|  Paso 1 de 3: Tus datos                |
+----------------------------------------+
| Tus datos y los de tu vehículo   <h1>  |
| Los campos con * son obligatorios.     |
|                                        |
| Datos del tomador            <fieldset>|
|  Nombre completo *                     |
|  [______________________________]      |
|  Tipo de documento *                   |
|  [Selecciona una opción      v ]       |
|  Número de documento *                 |
|  [______________________________]      |
|  ! Mensaje de error (si aplica)        |
|  Fecha de nacimiento *                 |
|  [dd/mm/aaaa                   ]       |
|  Correo electrónico *                  |
|  [______________________________]      |
|                                        |
| Datos del vehículo           <fieldset>|
|  Placa *   [__________________]        |
|  Año *     [______]                    |
|  [x] Uso particular                    |
|                                        |
| (aria-live) Hay 2 errores...           |
| [          Continuar                 ] |
+----------------------------------------+
| Linde Auto es una marca ficticia...    |
+----------------------------------------+
```

**Desktop (>= 768 px)** — formulario centrado en una tarjeta de `--form-max` (800 px); cada `fieldset` es una rejilla de 2 columnas (`gap` 24 px); los `checkbox` ocupan la fila completa (`grid-column: 1 / -1`, decidido por `type`, no por rol). El orden del DOM coincide con la lectura visual izquierda-derecha y de arriba abajo (1.3.2, 2.4.3). "Continuar" alineado a la derecha, ancho automático.

```
+--------------------------------------------------------------------+
| Linde Auto                       Colombia | Chile                   |
|                       Tus datos de cada país se guardan por separado|
+--------------------------------------------------------------------+
|        (1)- - - - - - - - ( 2 )- - - - - - - - ( 3 )               |
|        Tus datos           Tu plan              Resumen y pago      |
+--------------------------------------------------------------------+
|              +------------------------------------------+          |
|              | Tus datos y los de tu vehículo      <h1> |          |
|              | Los campos con * son obligatorios.       |          |
|              | Datos del tomador                        |          |
|              |  Nombre completo *   Tipo de documento * |          |
|              |  [______________]    [Selecciona      v] |          |
|              |  Número documento *  Fecha nacimiento *  |          |
|              |  [______________]    [dd/mm/aaaa      ] |          |
|              |  Correo electrónico *                    |          |
|              |  [______________]                        |          |
|              | Datos del vehículo                       |          |
|              |  Placa *             Año *               |          |
|              |  [______________]    [______]            |          |
|              |  [x] Uso particular                      |          |
|              |  Hay 2 errores...        [ Continuar ]   |          |
|              +------------------------------------------+          |
+--------------------------------------------------------------------+
```

Anatomía de campo (todos los tipos, R-01.3, R-01.4, R-01.25): `label` (600) con `*` decorativo `aria-hidden` y `aria-required="true"` en el control; el control; `helpText` en `--color-text-muted` 14 px; mensaje de error (icono + texto, `--color-danger`, 14 px) con `aria-describedby` = `[ayuda, error]`. Un solo mensaje por campo (R-01.4). Borde del campo inválido 2 px `--color-danger` (U10).

Atributo de propósito de entrada (1.3.5), derivado del `semanticRole` y nunca del `key` (R-01.12): `email` -> `autocomplete="email" inputmode="email" spellcheck="false"` (R-01.30, **obligatorio por spec**). **Propuesta** (extensión de R-01.30, requiere confirmación en HITL-2): `full_name` -> `autocomplete="name"`, `phone` -> `autocomplete="tel"` + `inputmode="tel"`, `birth_date` -> `autocomplete="bday"`, `city` -> `autocomplete="address-level2"`; el resto sin `autocomplete`.

### 4.2 Paso 2 `/:country/quote/step-2` (US-02)

Un `fieldset` con `legend` ("Planes disponibles para {país}") y radios nativos con el mismo `name`. La tarjeta es visual: el `label` del radio contiene solo el nombre del plan, y un pseudo-elemento `::after` del label (posicionamiento absoluto sobre toda la tarjeta) hace clicable la tarjeta completa sin meter coberturas y beneficios en el nombre accesible (R-02.18). `aria-describedby` del radio = `[id precio final, id insignia Recomendado si aplica]`.

Estados visuales de la tarjeta: normal (borde 1 px `--color-border-control`); **recomendado** (borde 2 px `--color-ink-badge` + insignia "Recomendado" arriba, R-02.10); **elegido** (borde 3 px `--color-accent` + fondo `--color-accent-tint` + texto "Elegido", `aria-hidden` porque el radio ya lo anuncia); foco (anillo en la tarjeta mediante `:has(input:focus-visible)`, 3 px a 2 px de distancia, U4 a U6). Cifras con `tabular-nums`; precio final en 1.75 rem; si difiere, "Precio base {precio}" en 14 px muted (GAP-02.5, sin porcentajes, R-02.24).

**Mobile** — tarjetas apiladas, orden de Strapi. Botones apilados: "Volver" (secundario) y "Continuar al resumen" (primario) a todo el ancho.

```
+----------------------------------------+
| (cabecera + stepper: paso 2 de 3)      |
| Elige tu plan                     <h1> |
| [status: El precio de tu plan cambió.  |
|          Ahora es $ 1.100.000]  (si aplica)
| Planes disponibles para Colombia <legend>
| +------------------------------------+ |
| | [Recomendado]                      | |
| | (o) Plan Plus                      | |
| | Descripción corta                  | |
| |        $ 1.220.000                 | |
| |        Precio base $ 1.000.000     | |
| | Coberturas                         | |
| |  - Daños a terceros  Límite: ...   | |
| | Beneficios                         | |
| |  - Asistencia en carretera         | |
| +------------------------------------+ |
| (más tarjetas)                         |
| Elige un plan para continuar           |
| [ Volver ]                             |
| [ Continuar al resumen ] (disabled)    |
+----------------------------------------+
```

**Desktop** — rejilla de planes: 2 columnas de 768 a 1023 px, **3 columnas** desde 1024 px (`repeat(auto-fit, minmax(17rem, 1fr))`, el mismo componente). Botones en una fila: "Volver" a la izquierda, "Continuar al resumen" a la derecha, con el texto de ayuda a la izquierda del primario.

```
+--------------------------------------------------------------------+
|  (cabecera + stepper)                                              |
|  Elige tu plan                                                <h1> |
|  +----------------+ +================+ +----------------+          |
|  | (o) Plan Basic | | [Recomendado]  | | (o) Plan Full  |          |
|  | desc.          | | (o) Plan Plus  | | desc.          |          |
|  | $ 850.000      | | $ 1.220.000    | | $ 1.560.000    |          |
|  | Coberturas ... | | Coberturas ... | | Coberturas ... |          |
|  | Beneficios ... | | Beneficios ... | | Beneficios ... |          |
|  +----------------+ +================+ +----------------+          |
|  [ Volver ]        Elige un plan para continuar   [Continuar ...]  |
+--------------------------------------------------------------------+
```

Las tarjetas de una fila comparten alto (`align-items: stretch`); las coberturas y los beneficios se omiten si el plan no los trae (R-02.4).

### 4.3 Paso 3 `/:country/quote/step-3` (US-03)

Tres bloques de resumen en este orden (R-03.2): tomador, vehículo, plan. Cada bloque es una `section` con `h2`, una lista de definición `<dl>` (etiqueta/valor), y un enlace de edición (`Editar datos` en tomador y vehículo, `Cambiar plan` en plan). Los dos enlaces "Editar datos" llevan texto oculto adicional ("del tomador", "del vehículo") para distinguir su propósito (2.4.4) sin romper la etiqueta visible (2.5.3). Valores: `select` = etiqueta, `date` = formato del país, checkbox = Sí/No, opcional vacío = "No informado", documento enmascarado, correo completo (R-03.3, R-03.4, R-03.24). El texto de los valores nunca se pone en `title`, `aria-label` ni `data-*` (R-03.5, R-03.23).

Términos: región con `role="region"`, `aria-labelledby` al `termsTitle`, `tabindex="0"`, altura máxima 16 rem con `overflow: auto`, `termsVersion` junto al título, párrafos de texto plano (R-03.7). La región necesita anillo de foco visible (U4, U5). Si el contenido es más alto que el viewport al 400 % de zoom, la región sigue desplazable con teclado.

Selector de simulación: `fieldset` con `legend` "Simulación de pago (solo pruebas)", borde **discontinuo** `--color-border-control` y etiqueta con fondo `--color-warning-tint` para que sea inequívoco que no es un control de producción; radios "Aprobado" (marcado) y "Rechazado"; texto "No se usa ninguna tarjeta ni se hace ningún cobro." (R-03.21, AC-03.26).

**Mobile** — una columna, sin elementos fijos (evita tapar el foco, 2.4.11). El bloque "Pago" va al final.

```
+----------------------------------------+
| (cabecera + stepper: paso 3 de 3)      |
| Revisa tu cotización              <h1> |
| Datos del tomador          Editar datos|
|  Nombre completo ........ Ana Pérez   |
|  Documento ............... ******4050  |
|  Correo ........ ana.perez@example.com |
| Datos del vehículo         Editar datos|
|  Placa .................... ABC123     |
|  Teléfono ............. No informado   |
| Tu plan                    Cambiar plan|
|  Plan Plus                             |
|  Descripción corta                     |
|  Coberturas: Daños a terceros, ...     |
|  Precio final ........... $ 1.180.000  |
| Términos y condiciones  Versión 1.0    |
|  +----------------------------------+  |
|  | párrafo 1 ... (región con scroll)|  |
|  +----------------------------------+  |
| [x] Acepto los términos y condiciones  |
| Simulación de pago (solo pruebas)      |
|  (o) Aprobado  ( ) Rechazado           |
| ==== Pago ============================ |
| [status: aviso de precio, si aplica]   |
| [alert: Pago rechazado..., si aplica]  |
| Total $ 1.180.000                      |
| Acepta los términos para continuar     |
| [ Pagar ] (disabled)                   |
+----------------------------------------+
```

**Desktop (>= 1024 px)** — dos columnas `1fr / --aside-width`. Izquierda: resumen, términos y casilla. Derecha (`<aside aria-label="Pago">`, orden del DOM posterior a la izquierda): selector de simulación, total, avisos, ayuda y "Pagar". La columna derecha usa `position: sticky; top: 24px` **solo si** `min-height: 720px` y `min-width: 1024px` (a menor alto o más zoom vuelve al flujo normal para no tapar contenido enfocado, 2.4.11, 1.4.10). Entre 768 y 1023 px: una columna, el bloque de pago al final (igual que mobile) con ancho máximo 36 rem.

```
+--------------------------------------------------------------------+
|  (cabecera + stepper)                                              |
|  Revisa tu cotización                                         <h1> |
|  +-----------------------------------------+ +-------------------+ |
|  | Datos del tomador          Editar datos | | Simulación de pago| |
|  |  ...                                    | | (solo pruebas)    | |
|  | Datos del vehículo         Editar datos | |  (o) Aprobado     | |
|  |  ...                                    | |  ( ) Rechazado    | |
|  | Tu plan                    Cambiar plan | | ================= | |
|  |  ...                                    | | Total $ 1.180.000 | |
|  | Términos y condiciones     Versión 1.0  | | [alert/status]    | |
|  |  +-----------------------------------+  | | Acepta los        | |
|  |  | párrafos (región con scroll)      |  | | términos...       | |
|  |  +-----------------------------------+  | | [ Pagar ]         | |
|  | [x] Acepto los términos y condiciones   | |   (sticky)        | |
|  +-----------------------------------------+ +-------------------+ |
+--------------------------------------------------------------------+
```

### 4.4 Confirmación `/:country/quote/confirmation` (US-03)

Sin stepper ni botón de pago (AC-03.18). El `h1` recibe el foco; un `role="status"` con la frase "Tu cotización {número} fue confirmada." se inserta en una región que ya existe en el DOM (R-03.14). Datos en `<dl>`: Número de cotización (tamaño 1.75 rem, `tabular-nums`), Plan, Precio final. **No** muestra documento ni correo (R-03.5, R-03.24). Nota de simulación visible. Una sola acción: "Nueva cotización" (botón primario; es un `button` porque ejecuta una acción de borrado de estado, R-03.15).

**Mobile y desktop** comparten estructura; desktop centra la tarjeta a 36 rem.

```
+----------------------------------------+
| Linde Auto            Colombia | Chile |
+----------------------------------------+
|  (check) Cotización confirmada    <h1> |
|  [status] Tu cotización COT-CO-... fue |
|           confirmada.                  |
|  Número de cotización                  |
|  COT-CO-20261123-7B2E                  |
|  Plan ............ Plan Plus           |
|  Precio final .... $ 1.180.000         |
|  Esto es una simulación: no se hizo    |
|  ningún cobro ni se emitió una póliza. |
|  [ Nueva cotización ]                  |
+----------------------------------------+
```

El icono de verificación es decorativo (`aria-hidden`); el estado de éxito se comunica con texto, color `--color-success` sobre `--color-success-tint` (T17).

### 4.5 `/country-not-found` (R-01.1, AC-01.5)

Header sin selector de país (la lista es el contenido). Sin stepper. `h1` enfocado. Lista de enlaces generada con `GET /api/countries` (ninguna lista en el código), cada enlace como "botón de enlace" de 48 px de alto. Mobile: una columna a todo el ancho; desktop: rejilla de hasta 3 columnas.

```
+----------------------------------------+
| Linde Auto                             |
+----------------------------------------+
| No encontramos ese país           <h1> |
| El país que buscas no está disponible. |
| Elige uno de la lista.                 |
| <nav aria-label="Países disponibles">  |
|  [ Colombia ]                          |
|  [ Chile    ]                          |
+----------------------------------------+
```

Si la lista falla: estado `error` recuperable ("Reintentar"); si viene vacía: `country.notFound.empty` ("No hay países configurados por ahora.").

### 4.6 `config-error` (R-01.11, R-02.19, R-02.22, R-03.7, R-03.25)

Se muestra **dentro del paso** donde ocurre (cabecera y stepper visibles), reemplazando el contenido: no se renderiza formulario, lista de planes, resumen, términos ni botón de avance/pago. Tarjeta con barra izquierda de 4 px `--color-danger`, fondo `--color-danger-tint`, icono decorativo, título "Error de configuración", mensaje que **nombra** el rol/campo/plan, línea de orientación al equipo de contenido, y botón secundario "Reintentar" (refetch; ver pendiente P2).

```
+----------------------------------------+
| (cabecera + stepper)                   |
| Tus datos y los de tu vehículo    <h1> |
| +[!]-------------------------------+   |
| | Error de configuración   (alert) |   |
| | Falta el campo con rol           |   |
| | birth_date.                      |   |
| | Avisa al equipo de contenido...  |   |
| | [ Reintentar ]                   |   |
| +----------------------------------+   |
+----------------------------------------+
```

El rol o nombre técnico se muestra en `<code>` (fuente del sistema monoespaciada para esa parte), con ratio T16. En desktop la tarjeta tiene ancho máximo `--form-max` y se centra.

---

## 5. Catálogo de estados

Todo estado es parte de una unión discriminada por vista (CLAUDE §7; R-01.22, R-02.15, R-03.18). La pantalla nunca queda en blanco. Las regiones `role="status"` y `aria-live` existen en el DOM **antes** de recibir contenido (si no, algunos lectores no anuncian el primer mensaje); `role="alert"` puede insertarse con su contenido.

| Estado | Dónde | Disparador | Presentación | ARIA | Foco | Refs |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `loading` | Pasos 1, 2, 3, country-not-found | Petición de país/campos/planes/términos en curso | Skeleton con la forma del contenido + texto visible "Cargando…" | Contenedor `aria-busy="true"`; texto en `role="status"`; skeleton `aria-hidden="true"` | `h1` ya enfocado al entrar; no se mueve | R-01.22, R-02.15, R-03.18 |
| `ready` | Pasos 1, 2, 3 | Datos válidos cargados | Contenido completo | Landmarks y encabezados normales | Primer elemento tras el `h1` en Tab | R-01.2, R-02.14, R-03.2 |
| `empty` | Paso 1 (0 campos), Paso 2 (0 planes válidos) | Respuesta 200 sin elementos | Tarjeta informativa neutra (`--color-accent-tint`), sin botón de avance; Paso 2 con "Volver al formulario" | Texto estático (no alerta) | Sin cambio (`h1`) | R-01.22, R-02.15, AC-01.23, AC-02.4 |
| `error` (recuperable) | Pasos 1, 2, 3, country-not-found | Red, timeout 10 s, 4xx/5xx | Tarjeta con barra `--color-danger`, mensaje y botón "Reintentar"; Paso 3 mantiene el pago deshabilitado | `role="alert"` | Al pulsar "Reintentar": foco al `h1` y vuelve a `loading` (el botón desaparece y no puede quedar el foco en él) | R-01.22, R-02.15, R-03.18, AC-01.22, AC-02.11, AC-03.17 |
| `validation-error` | Paso 1 (por campo), Paso 1 (resumen de conteo) | `blur` de un campo tocado; "Continuar" con >= 1 error; redirección del guard | Por campo: borde 2 px, icono + texto. Resumen visible sobre "Continuar": "Hay N errores..." | Campo: `aria-invalid="true"`, `aria-describedby`; resumen: `aria-live="polite"`, `aria-atomic="true"` | Al enviar: primer control inválido (orden del DOM). Al `blur`: no se mueve | R-01.4, R-01.7, R-01.25, R-01.26, AC-01.2, AC-01.24 |
| `processing` | Paso 3 | Clic o Enter en "Pagar" | Botón `disabled`, texto "Procesando pago…" con indicador giratorio (se detiene con reduced motion y queda el texto); casilla y selector de simulación también deshabilitados | `aria-busy="true"` en el botón y en la caja de pago | Ver §6.5: al terminar se devuelve al botón "Pagar" si el foco se perdió | R-03.9, R-03.11, AC-03.3, AC-03.8, AC-03.9 |
| `config-error` | Pasos 1, 2, 3 | Rol requerido ausente/duplicado/incompatible, patrón inválido, parámetros del país inválidos, `total > 100`, locale/moneda inválidos, `plan.currency` distinta, `priceAdjustmentPct` inválido, términos vacíos | Tarjeta de §4.6; sin precio, sin formulario, sin avance ni pago | `role="alert"` | `h1` (ya enfocado) | R-01.11, R-02.19, R-02.22, R-03.7, R-03.25, AC-01.7, AC-02.21, AC-02.24, AC-03.15, AC-03.28 |
| `price-changed` (aviso) | Pasos 2 y 3 | Precio recalculado distinto de `priceSeenAtSelection` | Aviso con barra izquierda 4 px `--color-warning-border`, fondo `--color-warning-tint`, texto `--color-warning-text` (T18); no bloquea nada | `role="status"` (polite) | No mueve el foco | R-02.13, R-03.17, AC-02.10, AC-03.12 |
| `plan-unavailable` (aviso) | Paso 2 (tras limpiar la selección) | `documentId` guardado ausente de la lista fresca | Mismo estilo que `price-changed`; "Continuar al resumen" deshabilitado | `role="status"` | Redirección desde el Paso 3: `h1` del Paso 2 | R-02.12, R-03.1, AC-02.9, AC-03.11 |
| `payment-rejected` | Paso 3 | Simulación `rejected` o excepción inesperada | Alerta sobre "Pagar" (barra y título `--color-danger` sobre `--color-danger-tint`, T16), "Pagar" reactivado, datos y casilla conservados | `role="alert"` | Ver §6.5 | R-03.12, AC-03.4 |
| `confirmation` | Confirmación | Pago aprobado | §4.4 | `h1` enfocado + `role="status"` con el número | `h1` | R-03.14, AC-03.3, AC-03.19 |
| `disabled-action` | "Continuar al resumen", "Pagar" | Sin plan / términos sin aceptar o sin cargar | Botón `disabled` nativo (T20) **y** texto de ayuda visible adyacente (T6) que dice por qué | `disabled` nativo; ayuda con id referenciado por `aria-describedby` del botón | Un botón `disabled` no recibe foco: la ayuda es texto visible y el conjunto se lee en el flujo | R-02.11, R-03.9, AC-02.3, AC-03.2 |

### 5.1 Skeleton (loading)

- Formas: Paso 1 = 6 pares etiqueta/campo + botón; Paso 2 = 3 tarjetas (1 en mobile); Paso 3 = 3 bloques + región de términos; country-not-found = 2 botones.
- Color `--color-surface-sunken` (decorativo, exento), pulso de opacidad 1.0 a 0.6 de `--motion-skeleton` (1600 ms, sin parpadeos rápidos; 2.3.1). Con `prefers-reduced-motion: reduce` sin animación. La región de texto "Cargando…" es lo que se anuncia.
- Los títulos de paso (`h1`) y el stepper se muestran siempre (no forman parte del skeleton) para que la orientación no cambie al cargar (3.2.3).
- Evita saltos de layout: las alturas del skeleton aproximan las del contenido final.

### 5.2 Anuncios `aria-live`: reglas anti-ruido

- Una sola región `polite` para el conteo de errores del Paso 1, otra para avisos de precio/plan por paso, otra para el estado de carga. No se anuncia cada error de campo individual al hacer `blur` (el error queda disponible por `aria-describedby` cuando el usuario regresa al campo).
- Los mensajes se reemplazan, no se acumulan.
- `role="alert"` solo para: `error` recuperable, `config-error` y `payment-rejected`.

---

## 6. Orden de foco y manejo de foco

Regla general (R-01.25, GAP-01.19): al **entrar** a cualquier pantalla por navegación (enlace, atrás/adelante, redirección de guard, "Reintentar"), el foco va al `h1` (`tabindex="-1"`) una vez montado, y el título del documento se actualiza (§3.3). El `h1` existe también durante `loading`, así que el foco nunca espera a los datos. Por eso el orden de Tab siguiente parte del contenido, no del header; con `Shift+Tab` el usuario llega al stepper y al selector de país.

El foco programático solo se usa en: `h1` al cambiar de pantalla, primer control inválido al enviar, botón "Pagar" tras un pago rechazado cuando se perdió el foco. Nunca en elementos que se desmontan en el mismo ciclo.

### 6.1 Orden de Tab por pantalla (secuencia completa)

| Pantalla | Orden |
| :--- | :--- |
| Común (inicio de toda pantalla con layout) | 1) Skip link "Saltar al contenido principal" (aparece al enfocarse, va a `main`). 2) Enlaces del selector de país (solo si cargó). 3) Enlaces de pasos completados del stepper. 4) Contenido de la pantalla. |
| Paso 1 `ready` | `h1` (foco inicial) -> campos en el orden de Strapi: sección tomador, luego vehículo (R-01.2); cada campo es una sola parada (label+control) -> "Continuar". Sin paradas en ayudas ni errores (se leen por `aria-describedby`). |
| Paso 1 `error` / `config-error` | `h1` -> "Reintentar". En `empty`: `h1` sin más paradas. |
| Paso 2 `ready` | `h1` -> grupo de radios (**una** parada: el radio marcado, o el primero si no hay selección; flechas mueven y marcan, `Space` marca; sin deselección) -> "Volver" -> "Continuar al resumen" (omitido en Tab mientras esté `disabled`; se vuelve alcanzable al elegir plan). |
| Paso 2 `empty` | `h1` -> "Volver al formulario". `error`: `h1` -> "Reintentar". |
| Paso 3 `ready` | `h1` -> "Editar datos" (tomador) -> "Editar datos" (vehículo) -> "Cambiar plan" -> región de términos (`tabindex="0"`) -> casilla "Acepto los términos y condiciones" -> selector de simulación (**una** parada, flechas entre Aprobado/Rechazado) -> "Pagar" (si está `disabled` se omite). |
| Paso 3 `error` / `config-error` | `h1` -> (enlaces de edición si el resumen se muestra; si no, "Reintentar"). El pago permanece fuera de la secuencia (R-03.18, R-03.25). |
| Confirmación | `h1` (foco inicial) -> "Nueva cotización". |
| `/country-not-found` | `h1` (foco inicial) -> enlaces de países en orden alfabético por nombre (el que devuelve Strapi, `sort=name:asc`). |

El orden del DOM es el orden visual en todos los breakpoints: no se usa `order` de flex/grid ni posicionamiento que lo altere, también en la caja de pago (queda al final del DOM, a la derecha en desktop) (1.3.2, 2.4.3).

### 6.2 Transiciones del wizard

| Transición | Gatillo | Foco destino | Anuncio | Refs |
| :--- | :--- | :--- | :--- | :--- |
| Paso 1 -> Paso 2 | "Continuar" sin errores | `h1` del Paso 2 | Título del documento nuevo; `h1` leído al recibir foco | R-01.7, R-02.18 |
| Paso 2 -> Paso 3 | "Continuar al resumen" | `h1` del Paso 3 | Ídem | R-02.11, R-03.20 |
| Paso 2/3 -> Paso 1 | "Volver", "Editar datos", enlace del stepper | `h1` del Paso 1 (valores conservados) | Ídem | R-01.8, R-03.16, AC-01.4 |
| Paso 3 -> Paso 2 | "Cambiar plan", "Volver" | `h1` del Paso 2 (plan marcado si sigue disponible) | Ídem | R-03.16, AC-03.14 |
| Guard del Paso 2/3 redirige a Paso 1 | Datos inválidos o rol/campo nuevo requerido | `h1` del Paso 1; los campos con error quedan marcados (tocados) y el resumen de conteo anuncia "Hay N errores" | `aria-live` conteo | R-01.10, R-02.1, AC-01.21, AC-02.5 |
| Guard del Paso 3 redirige a Paso 2 | Sin plan / plan no disponible | `h1` del Paso 2 + aviso `role="status"` "El plan elegido ya no está disponible" | `role="status"` | R-03.1, R-02.12, AC-03.5, AC-03.11 |
| Cualquier paso -> confirmación | Pago aprobado, o guard con `confirmation` presente (atrás, URL directa) | `h1` de la confirmación | `role="status"` con el número (solo si viene del pago; en una redirección por atrás no se repite el estado) | R-03.14, AC-03.18 |
| Confirmación -> Paso 1 | "Nueva cotización" | `h1` del Paso 1 con formulario vacío | Título del documento | R-03.15, AC-03.20 |
| Cambio de país | Enlace del selector, URL, atrás | `h1` del Paso 1 del país nuevo | Título del documento incluye el país | R-01.20, AC-01.16 |
| Redirección de entrada (`/`, `/:country`, mayúsculas) | Carga inicial | `h1` del Paso 1 | Ídem | R-01.1, AC-01.6 |
| País inexistente | `/pe/...` | `h1` de `/country-not-found` | Ídem | R-01.1, AC-01.5 |
| Atrás/adelante del navegador | Historial | `h1` de la pantalla destino (el mismo comportamiento que una navegación) | Título | R-03.14 |

No se restaura el scroll al `h1` si ya está visible; si el `h1` queda fuera del viewport se desplaza con `scroll-margin-top: var(--space-5)`. `scroll-padding` global de 16 px para que el foco programático no quede pegado al borde. Como ningún elemento (header, barra o caja de pago) es fijo salvo la caja de pago de Paso 3 en el caso descrito, el foco nunca queda oculto (2.4.11).

### 6.3 Validación del Paso 1 (R-01.7, R-01.26, GAP-01.19)

1. El usuario recorre con Tab; al salir (`blur`) de un campo tocado se valida y se muestra su error. Un campo no tocado no muestra error antes del primer envío.
2. El error desaparece en cuanto el valor es válido (mismo ciclo).
3. Al pulsar "Continuar" con errores: **el foco va al primer control inválido en orden del DOM** (también si está dentro de un `fieldset`); el resumen visible "Hay N errores en el formulario..." se actualiza en la región `aria-live="polite"`; la URL sigue en `step-1`.
4. Con `Shift+Tab` desde ese control el usuario vuelve hacia arriba sin saltos.
5. Cambiar el tipo de documento revalida el número (R-01.16, AC-01.13): si pasa a inválido, el mensaje aparece en el campo número sin mover el foco (el usuario sigue en el `select`) y el cambio se refleja en `aria-invalid` y en el texto del campo.
6. Los selects y la fecha usan controles nativos (el teclado y el lector los soportan sin trabajo extra).

### 6.4 Selección de plan (R-02.11, R-02.18, AC-02.13)

Grupo de radios nativos: `Tab` entra al grupo, flechas arriba/abajo (y izquierda/derecha) mueven el foco **y** marcan; `Space` marca el radio enfocado; no hay deselección. El anuncio es el nativo: nombre del plan, "elegido", posición, más la descripción (precio, "Recomendado"). Al marcar, "Continuar al resumen" se habilita y desaparece el texto de ayuda "Elige un plan para continuar" (sustituido por un texto de estado vacío). El cambio de habilitación se anuncia por la región `aria-live` del paso ("Plan elegido: {nombre}, {precio}" con `plans.selected.announce`).

### 6.5 Pago: procesando, rechazado y aprobado (R-03.11, R-03.12, R-03.14, GAP-03.11)

- **Procesando:** el botón pasa a `disabled` + `aria-busy="true"` en el mismo ciclo. Un botón deshabilitado pierde el foco real en algunos navegadores, así que el diseño asume que el foco se perderá.
- **Rechazado:** `isProcessing` se libera; aparece la alerta `role="alert"` ("Pago rechazado...") sobre el botón; el botón se rehabilita y **el foco se devuelve programáticamente a "Pagar"** si `document.activeElement` ya no es un control de la caja de pago. De esa forma Enter reintenta de inmediato sin recorrer la página. La alerta se anuncia por `role="alert"`, no por el movimiento de foco. Esto aclara la frase "el foco no se mueve" de GAP-03.11: no se envía el foco a la alerta ni al `h1`; solo se restaura donde estaba (ver pendiente P1).
- **Aprobado:** navegación a `/confirmation` y foco al `h1` (§6.2). La caja de pago desaparece del DOM; no queda foco colgando.
- **Reintento tras cambiar el selector a "Aprobado":** el cambio de radio no dispara nada; el usuario pulsa "Pagar".

### 6.6 Errores y reintentos (R-01.22, R-02.15, R-03.18)

Con `role="alert"` el contenido se anuncia al aparecer. "Reintentar" es un `button` que, al pulsarse, mueve el foco al `h1` y cambia el estado a `loading`. Si el reintento falla, vuelve a `error` con el mismo anuncio y el foco permanece en el `h1`; el usuario encuentra de nuevo "Reintentar" con un Tab. Los datos del usuario y la selección no se pierden (AC-01.22, AC-02.11, AC-03.17).

### 6.7 Región de términos y teclado (R-03.7, AC-03.25)

La región de términos tiene `tabindex="0"`, rol `region` con nombre `termsTitle`, anillo de foco visible y se desplaza con flechas y `Page Down`. Es una parada de Tab antes de la casilla. No se obliga a leer hasta el final (fuera de alcance, SPEC-US-03 §7).

---

## 7. Microcopy en español (catálogo `ui-copy`, GAP-01.17)

Archivo destino: `frontend/src/app/i18n/ui-copy.es.ts` (lo implementa `@frontend-engineer`). Este catálogo es la **única** fuente de texto de interfaz que no viene de Strapi (R-01.27, R-02.20, R-03.22): ninguna plantilla lleva literales. Claves en notación de puntos; `{nombre}` indica un valor interpolado; pluralización por clave (`.one`/`.other`). Los textos de campos, opciones, planes, coberturas, beneficios y T&C **no** están aquí (vienen de Strapi, regla 2). El catálogo cubre el chrome; nombres de sección como "Datos del tomador" son chrome (la sección en Strapi solo es el enum `policyholder`/`vehicle`).

### 7.1 Marca, estructura y navegación

| Clave | Texto |
| :--- | :--- |
| `brand.name` | Linde Auto |
| `brand.tagline` | Cotizador de seguros de autos |
| `a11y.skipLink` | Saltar al contenido principal |
| `header.country.label` | País |
| `header.country.current` | país actual |
| `header.country.hint` | Tus datos de cada país se guardan por separado en esta pestaña. |
| `stepper.label` | Progreso de cotización |
| `stepper.step1` | Tus datos |
| `stepper.step2` | Tu plan |
| `stepper.step3` | Resumen y pago |
| `stepper.item.completed` | Paso {n}: {nombre}, completado |
| `stepper.item.current` | Paso {n}: {nombre}, paso actual |
| `stepper.item.pending` | Paso {n}: {nombre}, pendiente |
| `stepper.progress` | Paso {n} de {total}: {nombre} |
| `footer.disclaimer` | Linde Auto es una marca ficticia. Esta cotización es una simulación sin valor contractual. |
| `title.pattern` | {titulo} · {progreso} · Linde Auto ({pais}) |

### 7.2 Títulos de pantalla (`h1`)

| Clave | Texto |
| :--- | :--- |
| `step1.title` | Tus datos y los de tu vehículo |
| `step2.title` | Elige tu plan |
| `step3.title` | Revisa tu cotización |
| `confirmation.title` | Cotización confirmada |
| `countryNotFound.title` | No encontramos ese país |

### 7.3 Botones y acciones

| Clave | Texto |
| :--- | :--- |
| `button.continue` | Continuar |
| `button.continueToSummary` | Continuar al resumen |
| `button.back` | Volver |
| `button.backToForm` | Volver al formulario |
| `button.retry` | Reintentar |
| `button.pay` | Pagar |
| `button.pay.processing` | Procesando pago… |
| `button.newQuote` | Nueva cotización |
| `link.editData` | Editar datos |
| `link.editData.policyholder.sr` | del tomador |
| `link.editData.vehicle.sr` | del vehículo |
| `link.changePlan` | Cambiar plan |

### 7.4 Formulario (Paso 1)

| Clave | Texto |
| :--- | :--- |
| `form.requiredNote` | Los campos marcados con * son obligatorios. |
| `form.requiredMarker` | * |
| `form.select.placeholder` | Selecciona una opción |
| `form.section.policyholder` | Datos del tomador |
| `form.section.vehicle` | Datos del vehículo |
| `validation.summary.one` | Hay 1 error en el formulario. Revísalo para continuar. |
| `validation.summary.other` | Hay {count} errores en el formulario. Revísalos para continuar. |
| `validation.summary.none` | (vacío; la región permanece en el DOM sin texto) |

El mensaje de cada campo inválido es siempre `errorMessage` o `validationMessage` de Strapi (R-01.4): **no existe copy genérico de error de campo** en el catálogo.

### 7.5 Estados genéricos

| Clave | Texto |
| :--- | :--- |
| `loading.generic` | Cargando… |
| `loading.step1` | Cargando el formulario… |
| `loading.plans` | Cargando los planes… |
| `loading.summary` | Cargando tu resumen… |
| `loading.countries` | Cargando los países… |
| `error.network.title` | No pudimos cargar la información |
| `error.network.body` | Revisa tu conexión e inténtalo de nuevo. Tus datos están guardados. |
| `empty.step1.title` | Aún no hay campos configurados para {pais} |
| `empty.step1.body` | Este formulario todavía no está disponible. Vuelve a intentarlo más tarde. |
| `empty.step2.title` | No hay planes disponibles por ahora |
| `empty.step2.body` | Por ahora no tenemos planes activos para {pais}. Puedes volver al formulario y revisar tus datos. |
| `countryNotFound.body` | El país que buscas no está disponible. Elige uno de la lista. |
| `countryNotFound.list.label` | Países disponibles |
| `countryNotFound.empty` | No hay países configurados por ahora. |

### 7.6 Errores de configuración (`config-error`)

| Clave | Texto |
| :--- | :--- |
| `config.title` | Error de configuración |
| `config.hint` | Avisa al equipo de contenido para corregirlo. Mientras tanto no se muestra ningún precio y no se puede continuar. |
| `config.role.missing` | Falta el campo con rol {rol}. |
| `config.role.duplicate` | Hay más de un campo con rol {rol}. |
| `config.role.type` | El campo con rol {rol} tiene un tipo incompatible (se esperaba {tipoEsperado}). |
| `config.validator.incompatible` | La validación {validador} no es compatible con el campo de rol {rol}. |
| `config.pattern.invalid` | El patrón de validación del campo {campo} no es válido. |
| `config.country.params` | Los parámetros del país (edad legal o rango de años del vehículo) no son válidos. |
| `config.pagination` | Hay más de 100 elementos configurados; el cotizador no puede mostrarlos todos. |
| `config.pricing.missingInput` | No se pudo calcular el precio: falta o no es válido el dato con rol {rol}. |
| `config.locale.invalid` | El formato regional o la moneda del país no son válidos. |
| `config.currency.mismatch` | El plan {plan} usa la moneda {monedaPlan}, pero el país usa {monedaPais}. |
| `config.city.invalid` | El ajuste de la opción {opcion} del campo {campo} no es válido. |
| `config.city.role` | El campo con rol city está duplicado o no es de tipo selección. |
| `config.terms.empty` | Los términos y condiciones de este país están vacíos. |

### 7.7 Paso 2 (planes)

| Clave | Texto |
| :--- | :--- |
| `plans.group.legend` | Planes disponibles para {pais} |
| `plans.select.help` | Elige un plan para continuar |
| `plans.selected.announce` | Plan elegido: {plan}, {precio}. |
| `plan.recommended` | Recomendado |
| `plan.selected` | Elegido |
| `plan.price.final` | Precio final |
| `plan.price.base` | Precio base {precio} |
| `plan.coverages` | Coberturas |
| `plan.coverage.limit` | Límite: {limite} |
| `plan.benefits` | Beneficios |
| `notice.price.changed` | El precio de tu plan cambió. Ahora es {precio}. |
| `notice.plan.unavailable` | El plan que elegiste ya no está disponible. Elige otro para continuar. |

### 7.8 Paso 3 (resumen y pago)

| Clave | Texto |
| :--- | :--- |
| `summary.section.policyholder` | Datos del tomador |
| `summary.section.vehicle` | Datos del vehículo |
| `summary.section.plan` | Tu plan |
| `summary.notInformed` | No informado |
| `summary.yes` | Sí |
| `summary.no` | No |
| `summary.plan.coverages` | Coberturas |
| `summary.plan.finalPrice` | Precio final |
| `terms.version` | Versión {version} |
| `terms.accept` | Acepto los términos y condiciones |
| `pay.box.label` | Pago |
| `pay.total` | Total |
| `pay.help.terms` | Acepta los términos para continuar |
| `pay.help.summary` | Revisa los datos del resumen para continuar |
| `pay.help.loading` | Espera a que carguen los términos |
| `pay.rejected.title` | Pago rechazado |
| `pay.rejected.body` | El pago fue rechazado en la simulación. Tus datos se conservaron: puedes intentarlo de nuevo. |
| `simulation.legend` | Simulación de pago (solo pruebas) |
| `simulation.approved` | Aprobado |
| `simulation.rejected` | Rechazado |
| `simulation.hint` | Este control solo sirve para probar el flujo. No se usa ninguna tarjeta ni se hace ningún cobro. |

### 7.9 Confirmación

| Clave | Texto |
| :--- | :--- |
| `confirmation.announce` | Tu cotización {numero} fue confirmada. |
| `confirmation.number.label` | Número de cotización |
| `confirmation.plan.label` | Plan |
| `confirmation.price.label` | Precio final |
| `confirmation.simulationNote` | Esto es una simulación: no se realizó ningún cobro ni se emitió una póliza. |

**Reglas de redacción:** frases en tuteo; sin signos de exclamación; los mensajes de error dicen qué ocurrió y qué hacer; ningún texto incluye datos del usuario (documento, correo, nombre) salvo el número de cotización y el nombre del plan; las cifras de moneda siempre llegan ya formateadas por `formatPrice` (R-02.5).

---

## 8. Matriz de accesibilidad (WCAG 2.2 AA)

### 8.1 Pruebas (cómo se verifica)

| Código | Prueba | Herramienta |
| :--- | :--- | :--- |
| T1 | Escaneo automático por pantalla y por estado (`loading`, `ready`, `error`, `config-error`, `validation-error`, `payment-rejected`) con etiquetas `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`; cero violaciones | `@axe-core/playwright` en `frontend/e2e/*-a11y.spec.ts` |
| T2 | Recorrido solo con teclado de cada flujo (Tab, Shift+Tab, Enter, Space, flechas) y aserción de `document.activeElement` tras cada transición (§6) | Playwright E2E |
| T3 | Aserciones de atributos (`aria-invalid`, `aria-describedby`, `aria-required`, `aria-current`, `aria-busy`, `autocomplete`, `role`) | Playwright E2E |
| T4 | Test unitario de contraste de tokens: lee `tokens.css`, calcula los ratios de §2.4 con la fórmula WCAG y falla si alguno baja de su umbral | Unit (`design-tokens.spec.ts`) |
| T5 | Reflow: viewport 320 x 256 y zoom de texto 200 %; sin scroll horizontal y sin pérdida de contenido (1.4.4, 1.4.10) | Playwright (`setViewportSize`, CSS de zoom) |
| T6 | Espaciado de texto forzado (1.4.12): inyectar `line-height 1.5`, `letter-spacing 0.12em`, `word-spacing 0.16em`, `p-margin 2em` y comprobar que nada se corta | Playwright |
| T7 | `prefers-reduced-motion: reduce` y `forced-colors: active` emulados | Playwright (`emulateMedia`) |
| T8 | Medición de tamaño de objetivo (>= 44 x 44 px en mobile) con `boundingBox()` | Playwright |
| T9 | Prueba manual con lector de pantalla (NVDA + Firefox/Chrome y VoiceOver en iOS) del flujo completo, en el registro de HITL-3 | Manual-HITL3 |
| T10 | Revisión estática: literales de UI fuera del catálogo, `div`/`span` clicables, `outline: none` sin sustituto, `tabindex` positivo, `title` con datos personales | `@qa-reviewer` |

Todo test lleva el ID en el título (`it('[R-01.25] ...')`, CLAUDE §4).

### 8.2 Criterios, componentes y refs

| WCAG 2.2 | Niv. | Componente(s) | Cómo se cumple | Prueba | R-/AC- |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1.1.1 Contenido no textual | A | Iconos de estado, motivo de carril, skeleton | Decorativos con `aria-hidden="true"`; el significado va en texto | T1, T10 | R-01.25 |
| 1.3.1 Información y relaciones | A | Campos, `fieldset`/`legend`, `dl` del resumen, stepper `ol`, radios de plan | `label for`, `fieldset`, `legend`, `dl`, `ol` y encabezados jerárquicos (un `h1`, `h2` por bloque) | T1, T3 | R-01.3, R-01.25, R-02.18, R-03.2, AC-01.24 |
| 1.3.2 Secuencia significativa | A | Layout de las 6 pantallas, caja de pago | El orden del DOM = el orden visual; sin `order` ni posicionamiento que lo altere | T2, T10 | R-01.2, R-02.14, R-03.2 |
| 1.3.3 Características sensoriales | A | Instrucciones | Ninguna instrucción depende de color, forma o posición ("Los campos con * son obligatorios") | T10 | R-01.25 |
| 1.3.4 Orientación | AA | Todas | Sin bloqueo de orientación | T5 | R-01.25 |
| 1.3.5 Propósito de la entrada | AA | Control con rol `email` (spec); `full_name`, `phone`, `birth_date`, `city` (propuesta) | `autocomplete` derivado del `semanticRole` (§4.1) | T3 | R-01.30, AC-01.30 |
| 1.4.1 Uso del color | A | Error, recomendado, elegido, paso activo, aviso de precio | Icono/texto/borde/insignia además del color (§2.4) | T1, T3 | R-01.25, R-02.10, AC-02.2 |
| 1.4.3 Contraste mínimo | AA | Todo el texto | Tabla T1 a T19 (>= 4.89:1 el mínimo; T20 exento) | T4, T1 | R-01.25, R-02.10 |
| 1.4.4 Cambio de tamaño del texto | AA | Todo el layout | `rem`, sin alturas fijas, zoom 200 % | T5 | R-01.25 |
| 1.4.5 Imágenes de texto | AA | Wordmark | Texto real (sin imágenes de texto) | T10 | R-01.25 |
| 1.4.10 Reflow | AA | Rejillas del Paso 1, 2, 3, stepper, header | 320 px sin scroll bidireccional; a zoom 400 % pasa a una columna; caja de pago sin `sticky` en poca altura | T5 | R-01.25, R-02.18, R-03.20 |
| 1.4.11 Contraste no textual | AA | Bordes de campo, radios/checkbox, anillo de foco, borde de plan elegido/recomendado | Tabla U1 a U14 (>= 3.95:1) | T4 | R-01.25, R-02.10 |
| 1.4.12 Espaciado del texto | AA | Tarjetas, botones, avisos | Contenedores sin alto fijo, `min-height` en lugar de `height` | T6 | R-01.25 |
| 1.4.13 Contenido en hover o foco | AA | (no aplica) | No hay tooltips ni menús emergentes; ayudas siempre visibles | T10 | R-01.25 |
| 2.1.1 Teclado | A | Wizard completo, radios de plan y simulación, región de términos | Solo elementos nativos; la región de términos con `tabindex="0"` | T2 | R-01.25, R-02.18, R-03.20, AC-01.24, AC-02.13, AC-03.25 |
| 2.1.2 Sin trampa de teclado | A | Región de términos con scroll, grupos de radios | Tab sale siempre de la región y del grupo | T2 | R-03.7, R-03.20 |
| 2.1.4 Atajos de teclado | A | (no aplica) | Sin atajos de una sola tecla | T10 | R-01.25 |
| 2.2.1 Tiempo ajustable | A | Timeout de 10 s, latencia de 1 s del pago | No son límites de tiempo para el usuario; el timeout lleva a `error` recuperable | T2 | R-01.22, R-03.10 |
| 2.2.2 Pausar, detener, ocultar | A | Skeleton, indicador de `processing` | Pulso lento, sin parpadeo, parte del estado de carga (esencial), sin animación con `reduced-motion` | T7 | R-01.22, R-03.11 |
| 2.3.1 Tres destellos | A | Skeleton | Un pulso de 1.6 s (< 3 por segundo) | T7 | R-01.22 |
| 2.4.1 Evitar bloques | A | Skip link, `main`, landmarks | "Saltar al contenido principal"; además el foco va al `h1` en cada pantalla | T2 | R-01.25 |
| 2.4.2 Título de la página | A | `<title>` | Patrón de §3.3, actualizado en cada navegación | T3 | R-01.25 |
| 2.4.3 Orden del foco | A | Todas las pantallas | §6.1 y §6.2 | T2 | R-01.7, R-02.18, R-03.20, AC-01.24 |
| 2.4.4 Propósito del enlace | A | "Editar datos" x2, "Cambiar plan", países | Texto oculto que desambigua, `aria-current` en el país actual | T3 | R-03.16 |
| 2.4.6 Encabezados y etiquetas | AA | `h1`/`h2`, labels | Descriptivos y únicos por pantalla | T1 | R-01.25 |
| 2.4.7 Foco visible | AA | Todo interactivo, tarjetas de plan, región de términos | `:focus-visible` 3 px, `--color-focus` (U4 a U9) | T1, T2 | R-01.25 |
| 2.4.11 Foco no oculto (mín.) | AA | Caja de pago sticky, header | Header no fijo; caja de pago `sticky` solo con >= 1024 px y alto >= 720 px; `scroll-padding` | T2, T5 | R-03.20 |
| 2.4.13 Apariencia del foco | AAA | (referencia, no exigido) | El anillo de 3 px con alto contraste cumple lo esencial | T4 | R-01.25 |
| 2.5.1 Gestos de puntero | A | (no aplica) | Sin gestos multipunto ni de trayecto | T10 | R-01.25 |
| 2.5.2 Cancelación del puntero | A | Botones, tarjetas de plan | La acción se dispara en `click`/`up`, no en `down` | T2 | R-02.11 |
| 2.5.3 Etiqueta en el nombre | A | "Editar datos" con sufijo oculto, "Pagar" | El texto visible está contenido al inicio del nombre accesible | T3 | R-03.16 |
| 2.5.7 Movimientos de arrastre | AA | (no aplica) | No hay arrastre; todo por clic/teclado | T10 | R-02.11 |
| 2.5.8 Tamaño del objetivo (mín.) | AA | Botones, campos, radios, enlaces independientes | >= 44 x 44 px (supera el mínimo de 24 px) | T8 | R-01.25, R-02.18, R-03.20 |
| 3.1.1 Idioma de la página | A | `<html lang="es">` | `es` fijo (el catálogo es solo `es`, GAP-01.17) | T1 | R-01.27 |
| 3.2.1 Al recibir el foco | A | Todos los controles | El foco nunca dispara cambios de contexto | T2 | R-01.26 |
| 3.2.2 Al introducir datos | A | Selector de país, tipo de documento, simulación de pago | País = enlaces (no `select` que navega); cambiar tipo de documento solo revalida; el selector de simulación no dispara el pago | T2 | R-01.16, R-01.20, R-03.21 |
| 3.2.3 Navegación coherente | AA | Header, stepper, botones | Misma posición y orden en los 3 pasos; "Volver" a la izquierda y primario a la derecha (desktop) | T10 | R-02.17 |
| 3.2.4 Identificación coherente | AA | "Continuar", "Volver", "Reintentar", "Editar datos" | Misma etiqueta y estilo en todos los pasos (catálogo único) | T10 | R-01.27, R-02.20, R-03.22 |
| 3.2.6 Ayuda coherente | A | (no aplica) | No hay mecanismo de ayuda/contacto en alcance | T10 | (sin ID) |
| 3.3.1 Identificación de errores | A | Mensaje de campo, resumen de conteo | Texto junto al campo + conteo; `aria-invalid` | T3, T2 | R-01.4, R-01.7, AC-01.2, AC-01.24 |
| 3.3.2 Etiquetas o instrucciones | A | `label`, `helpText`, `*` y nota de obligatorios | Etiqueta siempre visible (el placeholder no la reemplaza) | T1 | R-01.3, R-01.25 |
| 3.3.3 Sugerencia ante errores | AA | `errorMessage`/`validationMessage` de Strapi | La redacción del mensaje es de negocio; la guía exige que diga qué hacer (§7.4) | T10 | R-01.4, R-01.12 |
| 3.3.4 Prevención de errores (legales y financieros) | AA | Paso 3 completo | Revisión (resumen) + edición + confirmación (casilla de términos y botón explícito); el pago es simulado | T2 | R-03.8, R-03.9, R-03.16 |
| 3.3.7 Entrada redundante | A | Pasos 1 a 3 | Datos guardados en `sessionStorage` y reaparecen al volver; no se pide ningún dato dos veces | T2 | R-01.8, R-02.17, AC-01.4 |
| 3.3.8 Autenticación accesible (mín.) | AA | (no aplica) | No hay autenticación | T10 | (sin ID) |
| 4.1.2 Nombre, rol, valor | A | Radios, casilla, botones, regiones, stepper | Elementos nativos; `disabled`, `aria-busy`, `aria-current`, `aria-checked` nativo | T1, T3 | R-03.9, R-03.11, R-02.18 |
| 4.1.3 Mensajes de estado | AA | Resumen de errores, avisos de precio/plan, carga, rechazo de pago, confirmación | `role="status"`/`aria-live="polite"` y `role="alert"` según §5.2 | T3, T9 | R-01.7, R-01.22, R-02.12, R-02.13, R-03.12, R-03.14, AC-01.24, AC-02.9, AC-02.10, AC-03.4 |

---

## 9. Cumplimiento con CLAUDE.md y trazabilidad de decisiones clave

| Decisión de este documento | Regla de `CLAUDE.md` / spec que la respalda |
| :--- | :--- |
| Layout por `type`, no por `key` ni por rol | Reglas 2 y 3; R-01.3, R-01.12 |
| Textos de UI solo del catálogo `ui-copy` | Regla 2; GAP-01.17, R-01.27, R-02.20, R-03.22 |
| Selector de país como enlaces; sin aviso modal al cambiar | Regla 6; GAP-01.9, R-01.20, AC-01.16 |
| Wizard solo con teclado, WCAG 2.2 AA, mobile y desktop | Regla 7; R-01.25, R-02.18, R-03.20 |
| Ningún dato personal en `title`, `aria-label`, `data-*` | Regla 5; R-03.5, R-03.23, GAP-03.14 |
| Selector de simulación visible y etiquetado | GAP-03.5, R-03.21, AC-03.26 |
| Fuente autoalojada (sin CDN) | Regla 4 (nada externo en el bundle) y despliegue gratuito (`ADR-003`) |

---

## Handoff

- **Agente:** @ui-ux-designer · **Fase:** 3 · **Entradas leídas:** `CLAUDE.md`; `docs/specs/SPEC-US-01.md` (completo, v3), `docs/specs/SPEC-US-02.md` (v3), `docs/specs/SPEC-US-03.md` (v3); `docs/hitl/HITL-1-specs.md`; `.claude/skills/ui-ux-accessibility-system/SKILL.md`. (No se leyó `.claude/agents/ui-ux-designer.md`: no estaba en la lista de entradas exactas del despacho y este agente no tiene herramienta de listado.)
- **Archivos creados/modificados:** `docs/specs/UI-UX-GUIDELINES.md` (nuevo).
- **IDs cubiertos:** R-01.1, R-01.2, R-01.3, R-01.4, R-01.7, R-01.8, R-01.10, R-01.11, R-01.12, R-01.16, R-01.20, R-01.22, R-01.25, R-01.26, R-01.27, R-01.30; R-02.1, R-02.4, R-02.10, R-02.11, R-02.12, R-02.13, R-02.15, R-02.17, R-02.18, R-02.19, R-02.20, R-02.22, R-02.24; R-03.2, R-03.3, R-03.5, R-03.7, R-03.8, R-03.9, R-03.10, R-03.11, R-03.12, R-03.14, R-03.15, R-03.16, R-03.17, R-03.18, R-03.20, R-03.21, R-03.22, R-03.23, R-03.24, R-03.25; AC-01.2, AC-01.4, AC-01.5, AC-01.6, AC-01.7, AC-01.13, AC-01.16, AC-01.21, AC-01.22, AC-01.23, AC-01.24, AC-01.30; AC-02.2, AC-02.3, AC-02.4, AC-02.5, AC-02.9, AC-02.10, AC-02.11, AC-02.13, AC-02.21, AC-02.24; AC-03.2, AC-03.3, AC-03.4, AC-03.5, AC-03.8, AC-03.9, AC-03.11, AC-03.12, AC-03.14, AC-03.15, AC-03.17, AC-03.18, AC-03.19, AC-03.20, AC-03.25, AC-03.26, AC-03.28; GAP-01.9, GAP-01.17, GAP-01.19, GAP-02.5, GAP-02.13, GAP-03.5, GAP-03.11, GAP-03.13.
- **Verificación ejecutada:** N/A — agente sin Bash. Los ratios de contraste (§2.4) se calcularon a mano con la fórmula WCAG y están documentados con la luminancia de cada color (§2.3) para reproducirlos; la prueba T4 (§8.1) exige un test unitario que los recalcule desde `tokens.css`.
- **Pendientes / riesgos:**
  - **P1 (foco tras pago rechazado):** GAP-03.11 dice "el foco no se mueve". Un botón `disabled` (R-03.11) pierde el foco en algunos navegadores; esta guía propone restaurar el foco programáticamente a "Pagar" (§6.5), sin enviarlo a la alerta ni al `h1`. Confirmar en HITL-2; no cambia ningún R-/AC-.
  - **P2 (botón "Reintentar" en `config-error`):** las specs no lo piden; se propone como botón secundario (refetch) porque negocio puede corregir Strapi sin recargar. Si se rechaza, se elimina sin afectar a nada más.
  - **P3 (`autocomplete` por rol):** R-01.30 solo exige `email`; §4.1 propone `name`, `tel`, `bday`, `address-level2` para otros roles (derivados del rol, nunca del `key`). Requiere confirmación (extensión de alcance de US-01).
  - **P4 (marca):** "Linde Auto" es ficticia; no se pudo verificar que no coincida con una marca real.
  - **P5 (fuente):** IBM Plex Sans autoalojada requiere los archivos `woff2` (latin + latin-ext) bajo `frontend/`; lo implementa `@frontend-engineer` (licencia OFL). Si se prefiere cero archivos, el fallback es `system-ui` sin cambios en los tokens de contraste.
  - **P6 (stepper):** los pasos "completados" se derivan de datos vigentes (`validateStep1`, plan válido), no de un flag (R-01.10); el `@architect` debe confirmarlo en la arquitectura del estado.
  - **P7 (caja de pago sticky):** limitada a >= 1024 px y alto >= 720 px para respetar 2.4.11 y 1.4.10; si el equipo prefiere no tener elementos fijos, basta quitar `position: sticky` (sin otro efecto).
  - **P8 (catálogo de copy):** `ui-copy.es.ts` debe incluir todas las claves de §7; el `@qa-reviewer` verifica por revisión estática que no haya literales de UI en plantillas (R-01.27).
- **Requiere HITL:** Sí (HITL-2, junto con los ADRs)
