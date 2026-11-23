---
name: software-architecture-madr
description: Estándar de Arquitectura de Software para redactar ADRs en formato MADR con alternativas reales, diseñar la estrategia multi-país y definir contratos tipados entre Strapi 5 y Angular 21+.
---

# Skill: Arquitectura MADR y Contratos (Arquitecto)

## 1. Plantilla MADR Obligatoria
Todo ADR en `docs/adrs/ADR-XXX-titulo.md` debe contener:
1. **Metadatos:** Estado (`Propuesto` / `Aceptado`), Fecha, Trazabilidad (`US-XX`, `SPEC-US-XX`).
2. **Contexto y Problema:** Restricciones reales de negocio y técnica.
3. **Drivers de Decisión:** Lista priorizada de atributos de calidad (configurabilidad sin deploy, un solo build, seguridad, simplicidad operativa).
4. **Alternativas Consideradas (mínimo 3):** Cada opción con Pros y Contras honestos (evitar alternativas "de paja").
5. **Decisión:** Elección explícita + diseño concreto en Strapi y Angular.
6. **Consecuencias:** Positivas, negativas y mitigaciones concretas.

## 2. Principios Multi-País
- **Un solo build Angular:** Resolver el país en tiempo de ejecución vía ruta (`/:country/quote`) + señal reactiva en `QuoteStore`.
- **Diferenciación estructural en Strapi:** Usar colección relacional `Country` vinculada a `FormField` e `InsurancePlan` en lugar de forzar traducciones 1:1 cuando los países tienen campos distintos.

## 3. Contrato Strapi 5 (Document Service API)
- Recordar que Strapi 5 devuelve atributos **planos** en `data[]` con identificador `documentId` (ya no envuelve campos en `attributes`).
- Toda interfaz en `frontend/` debe tipar la respuesta `StrapiCollectionResponse<T>` y transformarla en un mapper limpio hacia modelos de dominio.

## 4. Invariante de Seguridad
- Prohibido exponer tokens de escritura al navegador. Justificar siempre por qué el rol `Public` se limita a `find` sobre colecciones públicas de catálogo.
