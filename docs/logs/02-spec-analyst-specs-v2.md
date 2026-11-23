# Log 02 — @spec-analyst: Specs v2 (Fase 2)

- **Fecha:** 2026-11-23 · **Modelo:** sonnet · **Despacho:** Orquestador (Agent, general-purpose con la definición `.claude/agents/spec-analyst.md`) · **Duración:** ~10.4 min · 23 llamadas a herramientas
- Prompt de despacho e informe final copiados **sin editar**.

## Prompt de despacho (literal)

```text
Eres el subagente @spec-analyst de este repositorio. Directorio de trabajo: /home/claude/cotizador-multipais

1. Lee y sigue AL PIE DE LA LETRA tu definición: .claude/agents/spec-analyst.md
2. Lee y aplica la skill: .claude/skills/spec-gap-checklist/SKILL.md
3. Lee el contexto global: CLAUDE.md (reglas, convención de IDs §4, Handoff §6)
4. Entradas: docs/user-stories/US-01.md, US-02.md, US-03.md (texto original, inmutable), docs/adrs/*.md, .claude/skills/strapi-5-docker-seed/SKILL.md (modelo de contenido propuesto) y las specs v1 actuales en docs/specs/SPEC-US-0{1,2,3}.md.

Tarea: reescribe docs/specs/SPEC-US-01.md, SPEC-US-02.md y SPEC-US-03.md al formato v2 de la skill:
- Versión v2, Estado: "Borrador (pendiente HITL-1)".
- Tabla de vacíos GAP-XX.n (pregunta, riesgo, decisión propuesta, ¿requiere humano?). Busca vacíos REALES que la v1 no detectó; contrasta la v1 con la historia original y con el modelo de contenido. Atención especial a: acoplamiento por semanticRole; la historia US-02 dice que el plan se configura con "currency" pero el modelo propuesto la deriva del país (es una desviación de la historia: márcala como DECISIÓN HUMANA REQUERIDA con tu recomendación); validación CC vs CE en Colombia; parámetros por país (legalAge, rango de años); cambio de país a mitad del wizard; recarga en cada paso; plan seleccionado que se despublica entre pasos; qué datos del Paso 1 se muestran en el resumen (¿todos? ¿checkboxes?); copy de UI no cubierto por Strapi.
- Reglas R-XX.n medibles, cada una con origen (historia o GAP) y forma de verificación.
- Criterios AC-XX.n en Gherkin (incluye todos los escenarios de la historia original + los derivados de GAPs).
- Contrato de datos referenciando docs/contracts/strapi-contracts.ts (aún no existe; descríbelo con TS en la spec y anótalo como entrada para @architect) y las queries REST exactas.
- Estados de UI y accesibilidad.
- Matriz de verificación: CADA R- y AC- → tipo de test (unit/E2E) y archivo planificado (p. ej. frontend/src/app/domain/pricing/pricing.spec.ts).
- Fuera de alcance.
- Changelog v1 → v2.
- Cada spec debe referenciar ADR-001 y ADR-002 (y ADR-003 si aplica). Las ADRs existen en docs/adrs/.

Formato de IDs: la columna ID de las tablas debe empezar la fila, p. ej. "| R-01.1 | ..." o "| **R-01.1** | ...", y los escenarios Gherkin con encabezado "### AC-01.1 — título". Usa dos dígitos de historia (01, 02, 03).

Restricciones: NO modifiques nada fuera de docs/specs/. No escribas código. No marques ninguna spec como Aprobado. Escribe en español. Solo usa las herramientas permitidas en tu definición (Read, Write, Edit, Glob, Grep); no uses Bash.

Al terminar responde con: (a) un resumen de los GAP más importantes que la v1 no tenía, (b) la lista de GAP que requieren decisión humana con tu recomendación, y (c) el bloque Handoff exacto de CLAUDE.md §6.
```

## Informe final del subagente (literal)

He reescrito las tres specs al formato v2 de la skill, con estado "Borrador (pendiente HITL-1)", y no he marcado ninguna como Aprobado. No he podido leer el contenido de ADR-001, ADR-002 ni ADR-003.

No he podido listar `docs/adrs/` porque no tuve Glob, Grep ni Bash. Las rutas `docs/adrs/ADR-00{1,2,3}.md` y los nombres `README.md` e `ADR-001-*` que probé no existen. Cada spec referencia ADR-001 y ADR-002 solo por ID, y dice que ADR-003 (despliegue) no aplica. No he contrastado nada con su contenido. El orquestador o `@architect` debe confirmar los nombres de archivo y que no haya contradicciones.

**Cuenta de IDs**

| Spec | GAP | R | AC |
| :--- | :--- | :--- | :--- |
| SPEC-US-01 | 19 | 27 | 27 |
| SPEC-US-02 | 17 | 20 | 20 |
| SPEC-US-03 | 17 | 23 | 26 |

La matriz de verificación tiene una fila por cada R- y AC-, con tipo de test y archivo planificado. Los tipos son Unit, E2E contra Strapi sembrado (E2E-S) y E2E con red mockeada y reloj fijado (E2E-M). El contrato TS está descrito en cada spec como entrada para `@architect`, porque `docs/contracts/strapi-contracts.ts` no existe, con las queries REST exactas. Solo escribí en `docs/specs/`.

**(a) Vacíos importantes que la v1 no detectaba**
- **Acoplamiento semántico (GAP-01.2):** la v1 ni incluía `semanticRole` en el contrato. Ahora hay roles requeridos (`birth_date`, `vehicle_year`, `document_number`) y un estado `config-error` si falta, se duplica o tiene tipo incorrecto. Las reglas R-01.11 y R-01.12 lo hacen medible.
- **Parámetros hardcodeados (GAP-01.3):** la v1 fijaba 18/20/+1 en código. Ahora salen de `country.legalAge`, `vehicleMaxAgeYears` y `vehicleMaxFutureYears`. También salió el `if` por país del formato de moneda: se usa `country.locale` y `currencyCode`.
- **Persistencia por `documentId`, no por `key` (GAP-01.11):** si negocio renombra una `key`, los datos guardados ya no se pierden.
- **Guards sin flag persistido (GAP-01.10):** se revalida con la función pura `validateStep1` contra la configuración vigente. Así un campo requerido nuevo expulsa al usuario al Paso 1.
- **CC vs CE (GAP-01.6):** patrón según la opción elegida, con revalidación al cambiar el tipo.
- **Fechas y normalización (GAP-01.4, 01.7, 01.8):** edad por fecha calendario local sin UTC, con el caso del 29-feb. RUT con Módulo 11 y ejemplos verificados a mano. Placa y patente se normalizan antes de validar.
- **Contrato v1 incoherente con el modelo (GAP-01.18, GAP-02.2):** `coverages` y `benefits` como `string[]` en vez de componentes, `currency` en el plan, `validationRules` en vez de `validation`.
- **Query REST (GAP-01.14, GAP-02.9):** la v1 omitía `status=published` y el `populate` de componentes. Strapi corta en 25 por defecto, y ahora se pide `pageSize=100` y `total > 100` es `config-error`. Alinear la skill `strapi-5-docker-seed` (usa `populate=*`) queda como pendiente para `@cms-engineer`.
- **Precio (GAP-02.3):** la fórmula con flotantes dejaba el redondeo inestable. Pasa a porcentajes enteros con `Math.floor((base*(100+pct)+50)/100)`, con ejemplos y fronteras.
- **Plan elegido cambiante (GAP-02.7):** si se despublica o cambia de precio entre pasos, hay aviso y redirección.
- **US-03:**
  - Máscara con ejemplos corregidos (la v1 contaba los puntos) y casos de longitud 0 y 1.
  - T&C como texto plano, sin `innerHTML`.
  - Aceptación solo en memoria.
  - Doble envío por Enter, recarga y botón Atrás.
  - Tras pagar, los pasos 1 a 3 redirigen a la confirmación hasta "Nueva cotización".
  - `canPay` ahora incluye términos cargados y resumen válido.
  - Fecha local y reloj inyectable en el número de cotización.
  - Sin datos personales en consola ni DOM.
- **Copy de UI (GAP-01.17):** los textos que no vienen de Strapi (botones, avisos, etiquetas) no tenían dueño. Quedan en un catálogo único.

**(b) GAP que requieren decisión humana, con mi recomendación**

| GAP | Decisión | Recomendación |
| :--- | :--- | :--- |
| GAP-02.1 | **Moneda del plan.** La historia dice que el plan se configura con `currency`; el modelo la deriva de `country.currencyCode`. Es una desviación de la historia. | **Opción A:** mantener la derivación y registrar la desviación en el acta de HITL-1. Evita planes con moneda incoherente y el comportamiento visible cumple la historia. La **Opción B** añade `currency` al plan con validación de lifecycle contra el país y solo cambia R-02.19. Elígela solo si se exige cumplir la historia a la letra. |
| GAP-01.2 | Lista de roles requeridos. | `birth_date`, `vehicle_year` y `document_number`: son los que consumen el precio y la máscara. |
| GAP-01.6 | Patrones de CC y CE. | Semilla ficticia: CC `^[0-9]{6,10}$`, CE `^[0-9]{6,7}$`, editables luego desde Strapi. |
| GAP-01.17 | Copy de UI fuera de Strapi. | Catálogo estático `ui-copy.es.ts`. Si negocio quiere editarlo sin deploy, abrir una historia nueva, porque exige ampliar permisos de `Public` (regla 4). |
| GAP-02.4 | Dónde viven los factores de la regla de precio. | Constantes en un único módulo `pricing-rules.ts`, documentadas; moverlas a Strapi queda como mejora futura. |
| GAP-02.7 | Precio o plan cambiado entre pasos. | Aviso `role="status"` sin bloquear el pago. Si negocio prefiere forzar nueva selección al subir el precio, solo cambia R-02.13. |
| GAP-03.1 | Qué datos del Paso 1 aparecen en el resumen. | Todos los campos publicados, por sección y en orden de configuración, sin hardcodear la lista. Checkbox como Sí/No, opcional vacío como "No informado", select por etiqueta, solo `document_number` enmascarado. |
| GAP-03.5 | Cómo se provoca el pago rechazado. | Selector visible "Simulación de pago (solo pruebas)", con "Aprobado" por defecto y modo solo en memoria. Si se rechaza, la alternativa es un parámetro de runtime, no de build. |

**(c) Handoff**
```md
## Handoff
- **Agente:** @spec-analyst · **Fase:** 2 · **Entradas leídas:** [CLAUDE.md, .claude/agents/spec-analyst.md, .claude/skills/spec-gap-checklist/SKILL.md, .claude/skills/strapi-5-docker-seed/SKILL.md, docs/user-stories/US-01.md, docs/user-stories/US-02.md, docs/user-stories/US-03.md, docs/specs/SPEC-US-01.md (v1), docs/specs/SPEC-US-02.md (v1), docs/specs/SPEC-US-03.md (v1)] (docs/adrs/*.md NO se pudo listar ni leer: sin Glob/Grep/Bash y los nombres ADR-00X.md no existen; se referencian solo por ID)
- **Archivos creados/modificados:** [docs/specs/SPEC-US-01.md, docs/specs/SPEC-US-02.md, docs/specs/SPEC-US-03.md]
- **IDs cubiertos:** [GAP-01.1..GAP-01.19, R-01.1..R-01.27, AC-01.1..AC-01.27, GAP-02.1..GAP-02.17, R-02.1..R-02.20, AC-02.1..AC-02.20, GAP-03.1..GAP-03.17, R-03.1..R-03.23, AC-03.1..AC-03.26]
- **Verificación ejecutada:** N/A — agente sin Bash (consistencia de IDs revisada manualmente; trace-check no ejecutado)
- **Pendientes / riesgos:** (1) Contenido de ADR-001/002/003 no contrastado; confirmar nombres de archivo y contradicciones. (2) docs/contracts/strapi-contracts.ts no existe: @architect debe formalizar los tipos TS de SPEC-US-01 §4, SPEC-US-02 §4 y SPEC-US-03 §4 (QuoteState, StrapiCountry, StrapiFormField, StrapiInsurancePlan, PaymentResult). (3) Divergencia para @cms-engineer: la skill strapi-5-docker-seed §5 usa populate=*; las specs piden populate[validation|options|coverages|benefits]=true, status=published, sort con desempate createdAt y pageSize=100. (4) Para @cms-engineer: lifecycle sugerido que valide basePrice entero >= 0 y semilla CC/CE con validationPattern/validationMessage. (5) Los E2E-S que mutan Strapi (AC-01.3, AC-02.19) necesitan un token solo en el runner de E2E, nunca en el bundle (regla 4): coordinar con @devops-engineer/@qa-reviewer. (6) Si GAP-02.1 se resuelve con Opción B, cambia R-02.19 y el modelo del plan. (7) Las specs no se han marcado Aprobado.
- **Requiere HITL:** Sí (HITL-1): GAP-01.2, GAP-01.6, GAP-01.17, GAP-02.1, GAP-02.4, GAP-02.7, GAP-03.1, GAP-03.5
```

---

## Validación del Orquestador (posterior al informe)
- `node scripts/trace-check.mjs` → **OK**: 3 specs, IDs definidos y referencias a ADR-001/002 existentes; advertencias esperadas por ausencia de tests.
- **Desvío del flujo detectado:** el subagente no pudo descubrir los nombres reales de los ADRs (`ADR-001-multi-country-strategy.md`, `ADR-002-docker-and-strapi-security.md`, `ADR-003-cicd-and-free-tier-deploy.md`) porque en este entorno no disponía de herramientas de listado. **Ajuste:** el Orquestador pasa rutas exactas en todo despacho (actualizado `.claude/agents/spec-analyst.md` y `docs/PROMPTS-EJECUCION.md`), y `@architect` contrasta specs vs ADRs en la Fase 3.
- **Hallazgo del subagente a resolver antes de E2E:** AC-01.3 / AC-02.19 requieren mutar Strapi desde el runner E2E → necesitan un token de escritura **solo** en CI (GitHub Secret), nunca en el bundle. Se lleva a HITL-1 y a @devops-engineer.
