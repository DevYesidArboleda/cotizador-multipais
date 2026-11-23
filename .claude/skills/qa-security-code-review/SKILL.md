---
name: qa-security-code-review
description: Procedimiento de auditoría técnica, QA y seguridad del @qa-reviewer - verificación 1 a 1 contra R-/AC-, Angular moderno, seguridad de tokens y permisos Strapi, cero hardcoding, accesibilidad, plataforma Docker/CI y cierre trazable de hallazgos F-.
---

# Skill: Auditoría de Código, QA y Seguridad (QA Reviewer)

## 1. Independencia
- Solo lectura sobre código e infraestructura. Reportes en `docs/reviews/REVIEW-*.md` desde `REVIEW-TEMPLATE.md`.
- Revisar contra la spec **aprobada**, no contra lo que el implementador dice haber hecho (leer su Handoff con escepticismo).

## 2. Checklist obligatoria
1. **Spec:** cada `R-` y `AC-` → evidencia (archivo:línea + test). Sin evidencia = hallazgo.
2. **Angular:** `grep -rnE "NgModule|\*ngIf|\*ngFor|: any\b|as any" frontend/src` vacío; `OnPush` en todo componente.
3. **Seguridad (CRÍTICO):**
   - `grep -rniE "bearer|api[_-]?token|STRAPI_.*(TOKEN|SECRET)|localhost:1337" frontend/src frontend/dist` vacío → si no, `BLOCKER`.
   - `backend/src/index.ts`: Public solo `find` en las 3 colecciones; intento anónimo de `POST /api/form-fields` debe dar 403/405.
   - Nginx no proxea `/admin`; CSP presente.
4. **Cero hardcoding:** no hay labels de campos, planes, precios base, edad 18 ni rango de años literales en `frontend/src` (fuera de tests/fixtures).
5. **Acoplamiento semántico:** precio, máscara y resumen usan `getFieldByRole`; renombrar un `key` en el seed no rompe tests.
6. **Accesibilidad:** labels, `aria-describedby`, `aria-invalid`, foco al primer error, `aria-live`, ningún `(click)` en elementos no interactivos.
7. **Plataforma:** imágenes sin secretos (`docker history`), usuario no root, healthchecks, CI con puertas reales.
8. **Ejecución real:** unit, build, E2E (o motivo literal por el que no se pudo) y `trace-check`.

## 3. Severidades y cierre
- `BLOCKER`: seguridad, regla rota, test fallido, crash. `MAJOR`: defecto funcional/UX/a11y relevante. `MINOR`: mantenibilidad.
- Cierre: `RESUELTO — commit <sha>, test <archivo › título>` o `ACEPTADO — decisión humana HITL-3 (<motivo>)`.
