---
name: software-architecture-madr
description: Estándar de arquitectura - ADRs en formato MADR con alternativas reales y fuentes verificadas, estrategia multi-país, seguridad Strapi, CI/CD y despliegue, y contratos TypeScript únicos entre Strapi 5 y Angular.
---

# Skill: Arquitectura MADR y Contratos (Arquitecto)

## 1. Plantilla MADR obligatoria (`docs/adrs/ADR-XXX-titulo.md`)
1. **Metadatos:** Estado (`Propuesto` → `Aceptado` en HITL-2 / `Reemplazado por ADR-YYY`), Fecha, Decisores, Trazabilidad (`US-`, `R-`, `GAP-`).
2. **Contexto y problema.**
3. **Drivers de decisión** priorizados.
4. **Alternativas consideradas (≥ 3)**, cada una con pros/contras honestos. Una alternativa descartada por requisito explícito cuenta solo si se dice qué requisito viola.
5. **Decisión** + diseño concreto (Strapi y Angular / infraestructura).
6. **Consecuencias:** positivas, negativas, mitigaciones, y **cómo se verifica** (test, check de CI o prueba manual).
7. **Fuentes** (enlaces) para afirmaciones sobre versiones o límites de terceros.

## 2. Principios multi-país
- Un build: país resuelto en runtime por ruta (`/:country/quote/...`) → `CountryStore` (signal).
- Diferenciación estructural con colección `Country` relacionada (no i18n 1:1). Parámetros de reglas por país en `Country`.
- Acoplamiento por `semanticRole`, nunca por `key`.

## 3. Contratos (`docs/contracts/strapi-contracts.ts`)
- Strapi 5 responde plano: `{ data: T[], meta: { pagination } }`, cada item con `id` y `documentId` (sin `attributes`).
- Separar tipos crudos (`StrapiFormFieldDto`) de modelos de dominio (`FormFieldConfig`) y declarar los mappers esperados.
- Enums compartidos: `SemanticRole`, `ValidatorKey`, `FieldType`, `FormSection`.

## 4. Invariantes de seguridad
- Cero tokens en el navegador; rol `Public` = `find` en 3 colecciones; `/admin` nunca expuesto a través del proxy del frontend.
