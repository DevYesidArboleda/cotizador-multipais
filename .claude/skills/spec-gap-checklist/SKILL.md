---
name: spec-gap-checklist
description: Checklist obligatoria para el rol de Analista de Producto/Specs. Garantiza que cada SPEC-US-XX detecte vacíos reales de negocio, casos borde locales (CO/CL), estados de red y accesibilidad antes de escribir código.
---

# Skill: Checklist de Detección de Vacíos (Analista SDD)

Antes de cerrar cualquier `docs/specs/SPEC-US-XX.md`, valida y documenta una decisión explícita para cada dimensión:

## 1. Contexto Multi-País (Colombia y Chile)
- ¿Cómo entra el usuario a un país específico y qué pasa si escribe un código inválido en la URL (`/pe/quote`)?
- ¿Qué sucede con los datos ya llenados si el usuario cambia de Colombia a Chile en medio del wizard?
- ¿Cómo se diferencian documentos e identificadores (CO: tipo doc + número + placa; CL: RUT con dígito verificador + patente)?

## 2. Configurabilidad Dinámica sin Deploy
- ¿Qué ocurre si negocio agrega, reordena o elimina un campo en Strapi mientras el usuario tenía datos previos en `sessionStorage`?
- ¿Se filtran únicamente registros `published` y, en planes, además `isActive = true`?

## 3. Reglas Temporales y de Negocio
- **Mayoría de edad:** Comparar fecha calendario local sin sesgo UTC (quien cumple 18 hoy es elegible; quien cumple mañana no).
- **Año del vehículo:** Confirmar extremos inclusivos `[añoActual - 20, añoActual + 1]`.
- **Precio simulado:** Fórmula explícita, determinista, sin decimales para COP/CLP y reactiva si el usuario edita el Paso 1.
- **Enmascaramiento:** Definir comportamiento con documentos largos, RUT con puntos/guión y cadenas cortas (`<= 4` caracteres).

## 4. Estados y Resiliencia
- Definir los 4 estados de cada vista: `loading`, `populated`, `empty` y `error` recuperable.
- Guardias de navegación: impedir saltar directamente a Paso 2 o Paso 3 sin completar pasos previos.
- Pago simulado: prevención de doble envío (clic rápido + `Enter`) y escenario determinista de pago rechazado conservando el 100% de los datos.

## 5. Verificabilidad y Trazabilidad
- Cada regla de negocio debe mapearse a al menos 1 test unitario o escenario E2E concreto.
