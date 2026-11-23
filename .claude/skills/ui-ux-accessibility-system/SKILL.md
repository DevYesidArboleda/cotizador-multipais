---
name: ui-ux-accessibility-system
description: Guía de Diseño UI/UX y Accesibilidad WCAG AA para el cotizador de seguros. Define sistema visual sobrio, patrón de wizard de 3 pasos, responsive mobile/desktop y navegación 100% por teclado.
---

# Skill: Sistema UI/UX y Accesibilidad (Diseñador)

## 1. Dirección Visual (Insurtech Confiable)
- **Jerarquía limpia:** Fondo neutro claro (`#F8FAFC`), tarjetas blancas con borde sutil `1px` (`#E2E8F0`), texto principal de alto contraste (`#0F172A`) y un único color de acento primario (azul institucional o esmeralda sobrio) reservado para el CTA principal y paso activo.
- **Sin ruido visual:** Evitar gradientes recargados, animaciones distractivas o etiquetas innecesarias. Priorizar claridad en precios, coberturas y errores de validación.
- **Números tabulares:** Usar `font-variant-numeric: tabular-nums` en todos los precios COP/CLP para comparación vertical limpia.

## 2. Arquitectura del Wizard (3 Pasos + Confirmación)
- **Header compacto:** Marca ficticia + selector de país accesible (`Colombia` / `Chile`) que avisa o aísla el estado al cambiar.
- **Indicador de progreso (`<nav aria-label="Progreso de cotización">`):** 3 pasos numerados con `aria-current="step"` en el paso activo y navegación clara hacia pasos ya completados.
- **Paso 1 (Formulario):** Agrupación visual en dos bloques limpios ("Datos del tomador" y "Datos del vehículo"), grilla de 2 columnas en desktop y 1 columna en mobile (`< 768px`).
- **Paso 2 (Planes):** Tarjetas comparables en grid responsive (1 col mobile, 3 cols desktop). El plan recomendado lleva etiqueta textual clara ("Recomendado") + borde destacado (nunca depender solo del color).
- **Paso 3 (Resumen y Pago):** Layout de 2 columnas en desktop (izquierda: resumen con botones "Editar datos" y "Cambiar plan" + T&C; derecha: caja de total y pago simulado).

## 3. Estándar WCAG AA (Operable 100% con Teclado)
- Todos los controles deben ser elementos nativos (`<button>`, `<input>`, `<select>`, `<a>`), nunca `<div>` clickeables.
- Anillo de foco visible en todos los controles (`focus-visible:outline-2 focus-visible:outline-offset-2`).
- Cada campo del Paso 1 vincula `<label [for]="field.key">`, texto de ayuda y mensaje de error mediante `aria-describedby` y `aria-invalid`.
- Al fallar validación o cargar un nuevo paso, gestionar el foco hacia el primer error o el encabezado `<h1>` del nuevo paso.
- Mensajes de error de formulario y rechazo de pago deben anunciarse con `role="alert"` o `aria-live="polite"`.
- Targets táctiles en mobile `>= 44px` de alto.
