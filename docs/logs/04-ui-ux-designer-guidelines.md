# Log 04 — @ui-ux-designer: Guía UI/UX y accesibilidad (Fase 3)

- **Fecha:** 2026-11-23 · **Subagente nativo** `ui-ux-designer` (definición en `.claude/agents/ui-ux-designer.md`, modelo sonnet) · **Duración:** ~6.7 min · 7 llamadas a herramientas · en paralelo con `@architect`
- Prompt de despacho e informe final copiados **sin editar**.

## Prompt de despacho (literal)

```text
Fase 3 — Diseño UI/UX y accesibilidad. Directorio: /home/claude/cotizador-multipais

Sigue tu definición (.claude/agents/ui-ux-designer.md) y la skill /home/claude/cotizador-multipais/.claude/skills/ui-ux-accessibility-system/SKILL.md. Para la dirección visual aplica también los principios de diseño intencional (no plantilla genérica): una identidad sobria de insurtech ficticia, jerarquía clara, tipografía con carácter pero legible.

Entradas (rutas exactas, léelas todas):
- /home/claude/cotizador-multipais/CLAUDE.md
- /home/claude/cotizador-multipais/docs/specs/SPEC-US-01.md (v3, Aprobado)
- /home/claude/cotizador-multipais/docs/specs/SPEC-US-02.md (v3, Aprobado)
- /home/claude/cotizador-multipais/docs/specs/SPEC-US-03.md (v3, Aprobado)
- /home/claude/cotizador-multipais/docs/hitl/HITL-1-specs.md

Tarea: crea /home/claude/cotizador-multipais/docs/specs/UI-UX-GUIDELINES.md con:
1. Marca ficticia y dirección visual (nombre ficticio, sin parecerse a una aseguradora real).
2. Tokens de diseño como CSS custom properties con valores exactos; cada par texto/fondo y foco con su ratio de contraste calculado (≥4.5:1 texto, ≥3:1 UI/foco). Calcula los ratios con la fórmula WCAG y muestra el valor.
3. Layout por pantalla (Paso 1, Paso 2, Paso 3, Confirmación, country-not-found, config-error) en mobile (<768px) y desktop, con wireframes ASCII.
4. Catálogo de estados: loading (skeleton), ready, empty, error recuperable, validation-error, processing, config-error, aviso de precio cambiado (role=status), pago rechazado (role=alert).
5. Orden de foco por pantalla y manejo de foco en cada transición.
6. Microcopy en español del catálogo ui-copy (GAP-01.17): claves y textos para botones, avisos, errores genéricos, selector "Simulación de pago (solo pruebas)".
7. Matriz de accesibilidad: criterio WCAG 2.2 AA → componente → cómo se prueba → IDs R-/AC- relacionados.

Solo escribes ese archivo. Responde con un resumen y el bloque Handoff de CLAUDE.md §6.
```

## Informe final del subagente (literal)

## Resumen

Creé `/home/claude/cotizador-multipais/docs/specs/UI-UX-GUIDELINES.md`, y es el único archivo que escribí.

El documento cubre lo pedido:
- **Marca y dirección visual:** marca ficticia "Linde Auto".
  - Concepto "papel y carretera", con la línea discontinua de carril como motivo.
  - Un único acento azul petróleo.
  - IBM Plex Sans autoalojada.
  - Cifras con `tabular-nums`.
- **Tokens:**
  - Bloque `:root` completo con valores exactos y regla de foco global.
  - Tabla de luminancias.
  - 20 pares de texto y 14 de UI/foco, cada uno con su ratio calculado con la fórmula WCAG.
  - El texto va de 4.89:1 en adelante; los componentes UI y el foco, de 3.95:1 en adelante.
  - Exenciones documentadas.
  - El anillo de foco exige `outline-offset: 2px`, porque sobre el relleno del botón primario daría solo 1.14:1.
- **Layout:** wireframes ASCII en mobile y desktop para Paso 1, 2, 3, confirmación, `/country-not-found` y `config-error`.
  - Plan elegido: borde de 3 px, tinte y texto "Elegido".
  - Plan recomendado: insignia de texto y borde de 2 px, sin depender solo del color.
  - Caja de pago `sticky` solo con ancho >= 1024 px y alto >= 720 px, para no ocultar el foco.
  - El selector de país del header es una lista de enlaces, no un `select` que navega (decisión de GAP-01.9).
- **Estados:** catálogo con 11 estados, cada uno con presentación, ARIA, foco y refs.
  - Los 9 pedidos: loading con skeleton, ready, empty, error recuperable, validation-error, processing, config-error, aviso de precio cambiado (`status`) y pago rechazado (`alert`).
  - Agregué plan no disponible, confirmación y acción deshabilitada.
- **Foco:** orden de Tab por pantalla y por estado. También la tabla de transiciones (cambio de paso, guards, país, atrás/adelante, errores de validación, pago, confirmación). Regla general: al entrar a una pantalla el foco va al `h1`.
- **Microcopy:** unas 130 claves de `ui-copy.es.ts`. Incluyen botones, avisos, errores genéricos, 14 mensajes de `config-error` y el selector "Simulación de pago (solo pruebas)".
- **Matriz:** unas 55 filas de criterios WCAG 2.2 AA, con componente, cómo se cumple, prueba (T1 a T10) y `R-`/`AC-`.

## Pendientes y riesgos (para HITL-2)
- **Verificación:** no tengo Bash. Los ratios los calculé a mano con la fórmula WCAG, con ±0.02 de redondeo y margen amplio sobre los umbrales. La prueba T4 exige un test unitario que los recalcule desde `tokens.css`.
- **P1:** GAP-03.11 dice "el foco no se mueve" al rechazarse el pago. Pero un botón `disabled` pierde el foco. Propongo restaurar el foco a "Pagar" sin enviarlo a la alerta ni al `h1`.
- **P2:** agregué un botón "Reintentar" en `config-error`. Las specs no lo piden.
- **P3:** propongo `autocomplete` por rol (`name`, `tel`, `bday`, `address-level2`) como extensión de R-01.30, que solo exige `email`.
- **P4:** "Linde Auto" es ficticia, pero no pude verificar que no coincida con una marca real.
- **P5:** la fuente autoalojada necesita archivos `woff2`.
- **P6:** los pasos completados del stepper se derivan de datos vigentes, no de un flag. El `@architect` debe confirmarlo.
- **P7 y P8:** P7 es la caja de pago `sticky`, que se puede quitar sin otro efecto. P8 es que el `@qa-reviewer` verifique que no haya literales de UI fuera del catálogo.
- No creé IDs nuevos, para no alterar `trace-check`.
- No pude leer `.claude/agents/ui-ux-designer.md`: no estaba en las rutas exactas del despacho y no tengo herramienta de listado.

## Handoff
- **Agente:** @ui-ux-designer · **Fase:** 3 · **Entradas leídas:** `CLAUDE.md`; `docs/specs/SPEC-US-01.md` (completo, v3), `docs/specs/SPEC-US-02.md` (v3), `docs/specs/SPEC-US-03.md` (v3); `docs/hitl/HITL-1-specs.md`; `.claude/skills/ui-ux-accessibility-system/SKILL.md`. (No leí `.claude/agents/ui-ux-designer.md`, por lo explicado arriba.)
- **Archivos creados/modificados:** `/home/claude/cotizador-multipais/docs/specs/UI-UX-GUIDELINES.md` (nuevo).
- **IDs cubiertos:** R-01.1, R-01.2, R-01.3, R-01.4, R-01.7, R-01.8, R-01.10, R-01.11, R-01.12, R-01.16, R-01.20, R-01.22, R-01.25, R-01.26, R-01.27, R-01.30; R-02.1, R-02.4, R-02.10, R-02.11, R-02.12, R-02.13, R-02.15, R-02.17, R-02.18, R-02.19, R-02.20, R-02.22, R-02.24; R-03.2, R-03.3, R-03.5, R-03.7, R-03.8, R-03.9, R-03.10, R-03.11, R-03.12, R-03.14, R-03.15, R-03.16, R-03.17, R-03.18, R-03.20, R-03.21, R-03.22, R-03.23, R-03.24, R-03.25; AC-01.2, AC-01.4, AC-01.5, AC-01.6, AC-01.7, AC-01.13, AC-01.16, AC-01.21, AC-01.22, AC-01.23, AC-01.24, AC-01.30; AC-02.2, AC-02.3, AC-02.4, AC-02.5, AC-02.9, AC-02.10, AC-02.11, AC-02.13, AC-02.21, AC-02.24; AC-03.2, AC-03.3, AC-03.4, AC-03.5, AC-03.8, AC-03.9, AC-03.11, AC-03.12, AC-03.14, AC-03.15, AC-03.17, AC-03.18, AC-03.19, AC-03.20, AC-03.25, AC-03.26, AC-03.28; GAP-01.9, GAP-01.17, GAP-01.19, GAP-02.5, GAP-02.13, GAP-03.5, GAP-03.11, GAP-03.13.
- **Verificación ejecutada:** N/A — agente sin Bash. Los ratios de contraste se calcularon a mano con la fórmula WCAG y la luminancia de cada color está documentada (§2.3). La prueba T4 (§8.1) exige un test unitario que los recalcule.
- **Pendientes / riesgos:** P1 a P8 (arriba).
- **Requiere HITL:** Sí (HITL-2, junto con los ADRs)

---

## Verificación del Orquestador (posterior al informe)
- **Contraste recalculado con la fórmula WCAG 2.x** (script Python sobre los tokens del documento): 20 pares de texto + 11 de UI/foco + el par foco/acento → **0 diferencias > 0.05** frente a lo declarado; todos cumplen su umbral (texto ≥ 4.5, UI ≥ 3.0; T20 exento por componente inactivo).
- `git status`: el agente solo creó `docs/specs/UI-UX-GUIDELINES.md`.
- **Desvío del Orquestador:** el prompt no incluyó la ruta de la definición del agente (`.claude/agents/ui-ux-designer.md`) pese a la regla de rutas exactas. Impacto bajo: como subagente nativo su definición ya es su prompt de sistema. Ajuste: plantilla de despacho con la definición siempre como primera entrada (`docs/PROMPTS-EJECUCION.md`).
