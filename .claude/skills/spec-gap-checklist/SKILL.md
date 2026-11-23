---
name: spec-gap-checklist
description: Checklist obligatoria del Analista SDD. Garantiza que cada SPEC-US-XX detecte vacíos reales (GAP-), defina reglas medibles (R-) y criterios Gherkin (AC-) trazables a tests, cubriendo multi-país CO/CL, configurabilidad sin deploy, acoplamiento semántico, estados de red y accesibilidad.
---

# Skill: Checklist de Detección de Vacíos (Analista SDD)

## 0. Formato obligatorio de la spec
```
# SPEC-US-XX — Título
- Historia origen: docs/user-stories/US-XX.md · Versión: vN · Estado: Borrador | Aprobado (HITL-1, fecha)
- ADRs relacionados · Specs relacionadas
## 1. Vacíos detectados (tabla: ID GAP | Pregunta | Riesgo si no se decide | Decisión propuesta | ¿Requiere humano?)
## 2. Reglas de negocio (tabla: ID R | Regla medible | Origen: historia/GAP | Verificación)
## 3. Criterios de aceptación (Gherkin, cada escenario con ID AC)
## 4. Contrato de datos (referencia a docs/contracts/strapi-contracts.ts + query REST exacta)
## 5. Estados de UI y accesibilidad
## 6. Matriz de verificación (ID → tipo de test → archivo planificado)
## 7. Fuera de alcance
## Changelog
```

## 1. Contexto multi-país (CO/CL)
- Entrada al país (ruta), código inválido (`/pe/...`), cambio de país a mitad del wizard (¿aislamiento o aviso?).
- Diferencias de documento e identificador: CO tipo (CC/CE) + número + placa; CL RUT con DV Módulo 11 + patente (formatos nuevo `BBBB12` y antiguo `BB1234`).
- Moneda y formato: COP/CLP sin decimales, locale `es-CO` / `es-CL`. La moneda **se deriva del país**, no del plan.

## 2. Configurabilidad dinámica sin deploy
- Agregar / quitar / reordenar / despublicar campos y planes: comportamiento con datos previos en `sessionStorage`.
- Solo `published`; en planes además `isActive = true`.
- **Acoplamiento semántico:** ¿qué lógica depende de un campo concreto (precio, máscara, edad, validación cruzada)? Debe resolverse por `semanticRole`. ¿Qué pasa si negocio borra el campo con un rol requerido? (error de configuración visible, no crash).
- ¿Qué parámetros de reglas viven en Strapi? (edad mínima, rango de años, patrones por tipo de documento).
- Validaciones que dependen de otro campo (p. ej. patrón del número según el tipo de documento elegido).

## 3. Reglas temporales y de negocio
- Mayoría de edad en fecha calendario local, sin sesgo UTC (cumple 18 hoy → válido; mañana → inválido). Fechas futuras.
- Año del vehículo con extremos inclusivos explícitos y parametrizables.
- Precio simulado: fórmula determinista, redondeo, sin decimales, reactiva a cambios del Paso 1, documentada con ejemplos numéricos.
- Enmascaramiento: documentos largos, RUT con puntos/guion, cadenas ≤ 4 caracteres.

## 4. Estados y resiliencia
- 4 estados por vista (`loading`, `ready`, `empty`, `error` recuperable) + `config-error`.
- Guards: no saltar a pasos posteriores; recarga del navegador en cada paso.
- Pago simulado: doble envío (doble clic + `Enter`), rechazo determinista, reintento sin pérdida de datos, timeout.

## 5. Accesibilidad
- Labels, `aria-describedby`, `aria-invalid`, foco al primer error / encabezado del paso, anuncios `aria-live`, selección de plan con teclado.

## 6. Verificabilidad y trazabilidad
- Cada `R-` y `AC-` mapea a ≥ 1 test con el ID en su título. Ninguna regla queda "verificada manualmente" sin justificación.
