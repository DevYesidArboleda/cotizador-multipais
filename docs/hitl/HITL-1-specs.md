# HITL-1 — Aprobación de Specs (SPEC-US-01..03)

- **Fecha:** 2026-11-23 (15:01–15:10, hora Bogotá)
- **Revisor humano:** Yesid Arboleda (@DevYesidArboleda)
- **Artefactos revisados:** `docs/specs/SPEC-US-01.md`, `SPEC-US-02.md`, `SPEC-US-03.md` — **v2** (commit `c71d390`), informe en `docs/logs/02-spec-analyst-specs-v2.md`
- **Canal:** selección explícita en la interfaz de Claude (preguntas de opción múltiple del Orquestador); respuestas transcritas literalmente abajo.
- **Decisión:** `APROBADO CON CAMBIOS` → el `@spec-analyst` genera **v3** con las correcciones; la aprobación queda efectiva cuando el Orquestador verifique que v3 aplica exactamente estas decisiones y nada más (log `03-spec-analyst-specs-v3.md`).

## Decisiones sobre vacíos
| ID | Propuesta del agente | Decisión humana (literal) | Efecto |
| :--- | :--- | :--- | :--- |
| GAP-02.1 | Opción A (derivar moneda del país) | **"B: currency en el plan"** — *el humano rechaza la recomendación del agente* | `insurance-plan.currency` (enum `COP`/`CLP`) configurado en Strapi + lifecycle que exige `currency === country.currencyCode`; el front usa `country.currencyCode` y trata la diferencia como `config-error`. Cumple la historia a la letra. |
| (riesgo 5 del Handoff) | E2E-S de "campo nuevo sin deploy" (AC-01.3, AC-02.19) necesitaría token de escritura en CI | **"Mock + prueba manual"** | E2E con respuesta de Strapi simulada (Playwright `route`) + prueba manual en vivo en HITL-3. **Ningún token de escritura en ningún entorno.** |
| GAP-01.2 | Roles requeridos `birth_date`, `vehicle_year`, `document_number` | **"Acepto todas"** | Sin cambios |
| GAP-01.6 | CC `^[0-9]{6,10}$`, CE `^[0-9]{6,7}$` | Acepto | Sin cambios |
| GAP-01.17 | Copy de UI en catálogo `ui-copy.es.ts` | Acepto | Sin cambios |
| GAP-02.4 | Factores de precio en `pricing-rules.ts` | Acepto (ver corrección 3: el factor por ciudad se resuelve aparte) | — |
| GAP-02.7 | Aviso `role="status"` sin bloquear | Acepto | Sin cambios |
| GAP-03.1 | Resumen con todos los campos publicados; solo documento enmascarado | Acepto | Sin cambios |
| GAP-03.5 | Selector visible "Simulación de pago (solo pruebas)" | Acepto | Sin cambios |

## Correcciones solicitadas al agente (literal de la selección)
1. **"Correo del tomador"** — campo email obligatorio en CO y CL, configurado en Strapi con su validación.
2. **"Placa CO acepta motos"** — además de `AAA123` (autos), aceptar el formato de moto `AAA12A`.
3. **"Precio ajustado por ciudad"** — factor simulado según ciudad/región, documentado en la regla de precio.

## Nota del Orquestador (para la v3)
- Corrección 2 amplía el formato aceptado en un producto de *seguro de autos*; se implementa solo como patrón configurable en Strapi (sin lógica nueva) y la spec debe dejar explícito que el producto sigue siendo de autos.
- Corrección 3 no debe hardcodear ciudades en Angular (regla 2 de `CLAUDE.md`): el agente debe proponer dónde vive el factor (p. ej. atributo de la opción en Strapi) y justificarlo.

---

## Cierre de HITL-1 (2026-11-23, tras verificar v3)
- **Verificación del Orquestador:** v3 aplica las 5 decisiones y solo eso (`git diff --stat` limitado a las 3 specs; `trace-check` OK, 167 IDs). Ver `docs/logs/03-spec-analyst-specs-v3.md`.
- **Preguntas abiertas por el agente y respuesta humana (literal de la selección):**

| ID | Pregunta | Decisión humana |
| :--- | :--- | :--- |
| GAP-02.18 / GAP-01.22 | Factor por ciudad como `priceAdjustmentPct` opcional en la opción de ciudad en Strapi, rango [-10, +30], ausente = 0 % | **"Apruebo (-10 % a +30 %)"** |
| Riesgo (b)8 | ¿El correo debe ser rol requerido (ausencia en Strapi → `config-error`)? | **"No, que lo decida Strapi"** — GAP-01.2 no se reabre |

- **Decisión final:** `APROBADO`. Las tres specs pasan a estado `Aprobado` (v3). Se desbloquea la Fase 3.
