---
name: ui-ux-accessibility-system
description: Guía UI/UX y accesibilidad WCAG 2.2 AA del cotizador - sistema visual sobrio de insurtech con tokens CSS, wizard de 3 pasos + confirmación, responsive mobile/desktop, estados y navegación 100% por teclado.
---

# Skill: Sistema UI/UX y Accesibilidad (Diseñador)

## 1. Dirección visual (insurtech confiable)
- Tokens como CSS custom properties (`--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-danger`, `--radius-*`, `--space-*`), con ratio de contraste documentado.
- Base: fondo neutro claro, superficies blancas con borde sutil, texto de alto contraste y **un** acento reservado para CTA principal y paso activo. Sin gradientes recargados.
- Precios con `font-variant-numeric: tabular-nums`. Tipografía de sistema o una sola familia web con `font-display: swap`.

## 2. Arquitectura del wizard
- Header: marca ficticia + selector de país (`<select>` o enlaces) que **aísla** el estado por país y lo anuncia.
- Stepper `<nav aria-label="Progreso de cotización">` con `<ol>`, `aria-current="step"`, pasos completados navegables.
- Paso 1: bloques "Datos del tomador" / "Datos del vehículo" (`<fieldset>`), 2 columnas desktop, 1 mobile (< 768 px).
- Paso 2: tarjetas en grid (1/2/3 columnas), plan recomendado con insignia textual "Recomendado" + borde (no solo color).
- Paso 3: resumen (Editar datos / Cambiar plan) + T&C + caja de total y pago simulado (sticky en desktop).
- Confirmación: número de cotización, foco en el título, acción "Nueva cotización".

## 3. WCAG 2.2 AA operable con teclado
- Solo elementos nativos interactivos. Foco visible (`outline` ≥ 2 px, contraste ≥ 3:1). Targets ≥ 44 × 44 px (mobile).
- Cada campo: `<label for>`, ayuda + error vía `aria-describedby`, `aria-invalid`.
- Foco gestionado: primer error al validar; `<h1 tabindex="-1">` al cambiar de paso; alerta de pago rechazado con `role="alert"`.
- `prefers-reduced-motion` respetado; zoom 200 % sin pérdida de contenido.
