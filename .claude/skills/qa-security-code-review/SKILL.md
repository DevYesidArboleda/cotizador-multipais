---
name: qa-security-code-review
description: Procedimiento de auditoría técnica, QA y seguridad para el rol @qa-reviewer. Cubre verificación contra Specs, permisos mínimos de Strapi, ausencia de tokens en cliente, accesibilidad y reporte trazable.
---

# Skill: Auditoría de Código, QA y Seguridad (QA Reviewer)

## 1. Regla de Independencia
- El revisor trabaja estrictamente en **solo lectura** sobre `frontend/` y `backend/`.
- Todo hallazgo se documenta en `docs/reviews/REVIEW-US-XX.md` usando `docs/reviews/REVIEW-TEMPLATE.md`.

## 2. Checklist de Auditoría Obligatoria
1. **Cumplimiento de Spec:** Verificar 1 a 1 cada escenario Gherkin y cada regla de negocio de `SPEC-US-XX.md`.
2. **Angular 21+:** Buscar con `Grep` que no existan `NgModule`, `*ngIf`, `*ngFor` ni `any` sin justificación.
3. **Seguridad Strapi (CRÍTICO):**
   - Buscar en `frontend/` cualquier rastro de `Authorization: Bearer`, `STRAPI_TOKEN` o claves de escritura. Si existe → marcar como `BLOCKER`.
   - Verificar en `backend/src/index.ts` que el rol `Public` solo habilite `find` en las 3 colecciones permitidas.
4. **Cero hardcoding de contenido:** Comprobar que los campos del Paso 1, planes y T&C no estén hardcodeados en el front-end.
5. **Accesibilidad por teclado:** Verificar etiquetas `<label for>`, `aria-describedby`, `aria-invalid`, manejo de foco al fallar validación y ausencia de `<div (click)>`.
6. **Ejecución real de pruebas:** Correr pruebas unitarias, build de producción y prueba E2E; registrar el resultado literal en el reporte.

## 3. Severidades y Cierre Trazable
- **`BLOCKER`:** Impide aprobar (fallo de seguridad, regla de negocio rota, test fallido, crash).
- **`MAJOR`:** Defecto funcional/UX/accesibilidad relevante que debe corregirse antes de QA.
- **`MINOR`:** Mejora de legibilidad o mantenimiento.
- Todo hallazgo corregido debe cerrarse indicando archivo modificado y test que prueba la corrección.
