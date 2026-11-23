# Cotizador Multi-País de Seguro Automotriz (Colombia y Chile)

Aplicación web multi-país construida con **Angular 21+**, **Strapi 5+** y **Docker Compose**, siguiendo un flujo **Spec-Driven Development (SDD)** operado con **Claude Code**.

## Arranque en un solo comando

### Prerrequisitos
- Docker y Docker Compose v2+

### Ejecutar el proyecto completo
```bash
cp .env.example .env
docker compose up --build
```

Una vez saludables los contenedores:
- **Aplicación Angular (Colombia):** `http://localhost:4200/co/quote`
- **Aplicación Angular (Chile):** `http://localhost:4200/cl/quote`
- **Strapi Admin Panel:** `http://localhost:1337/admin`

> El *seed* de Strapi se ejecuta automáticamente al iniciar el contenedor `strapi` de forma idempotente (no duplica registros al reiniciar).

## Cómo validar un cambio en Strapi sin desplegar código
1. Ingresa al panel de Strapi (`http://localhost:1337/admin`).
2. Ve a **Content Manager → Form Field → Create new entry**.
3. Configura etiqueta, `key`, tipo (ej. `checkbox`), orden, país (`Colombia` o `Chile`) y pulsa **Publish**.
4. Recarga la aplicación Angular en ese país: el nuevo campo aparecerá inmediatamente sin reconstruir ni desplegar el front-end.

## Pruebas (Unitarias y E2E)
```bash
# Pruebas unitarias (validadores, cálculo de precio simulado, enmascaramiento y estado)
cd frontend && npm test

# Prueba E2E de flujo completo (Playwright)
cd frontend && npm run e2e
```

## Trazabilidad del Flujo Agéntico
- **Flujo completo y diagrama:** [`FLOW.md`](./FLOW.md)
- **Contexto global de agentes:** [`CLAUDE.md`](./CLAUDE.md)
- **Equipo de subagentes:** `.claude/agents/`
- **Skills personalizadas:** `.claude/skills/`
- **ADRs:** `docs/adrs/`
- **Especificaciones (Specs):** `docs/specs/`
- **Evidencia de Code Reviews:** `docs/reviews/`
- **Logs sin editar de sesiones:** `docs/logs/`

## Requisitos no cumplidos (si aplica)
- *Ninguno al momento de la planificación. Si al finalizar algún requisito queda parcial o adaptado (por ejemplo, herramienta alternativa gratuita), documéntalo aquí con justificación explícita.*
