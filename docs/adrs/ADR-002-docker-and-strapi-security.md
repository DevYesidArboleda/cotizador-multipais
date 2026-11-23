# ADR-002: Entorno Docker de Un Solo Comando y Modelo de Seguridad Strapi

- **Estado:** Propuesto (Pendiente HITL-2)
- **Fecha:** 2026-11-23
- **Trazabilidad:** Requisitos Técnicos (Security, Environment), `SPEC-US-01..03`

## Contexto y Problema
El proyecto completo debe iniciarse con un único comando (`docker compose up`) incluyendo datos semilla para Colombia y Chile. En materia de seguridad, ningún token de Strapi con permisos de escritura puede llegar al navegador y los permisos del rol `Public` deben ser mínimos y justificados.

## Drivers de Decisión
1. Arranque determinista y rápido en cualquier máquina con Docker.
2. Cero secretos o tokens con escritura en el bundle Angular.
3. Cero problemas de CORS entre front-end y Strapi.
4. Seed idempotente (reiniciar contenedores no duplica datos).

## Alternativas Consideradas

### Acceso del Front-End a Strapi
1. **Rol `Public` solo lectura (`find`) + Reverse Proxy Nginx `/api` → `strapi:1337` (Elegida):** El catálogo de campos, planes y términos es información pública de cotización. El navegador no recibe ningún API token y consume `/api/...` bajo el mismo origen.
2. **Token Read-Only embebido en Angular:** Todo secreto en un SPA es extraíble desde DevTools; no ofrece mayor protección real que restringir el rol `Public` a lectura sobre 3 colecciones específicas.
3. **Token Full-Access en variables del front-end:** Descartada por ser una vulnerabilidad crítica expresamente prohibida.

### Motor de Base de Datos de Strapi en Docker
1. **SQLite persistido en volumen Docker (Elegida):** Arranque rápido, sin contenedor adicional de BD y 100% reproducible para la prueba técnica.
2. **PostgreSQL en contenedor separado:** Más realista para alta concurrencia en producción, pero añade latencia de arranque y superficie de fallo innecesaria para un entorno local de evaluación.

## Decisión
- Configurar `docker-compose.yml` con dos servicios:
  - `strapi`: Strapi 5 + SQLite en volumen `strapi_data`, healthcheck en `/_health`, bootstrap idempotente con seed CO/CL y permisos estrictos del rol `Public` (`find` únicamente sobre `country`, `form-field` e `insurance-plan`).
  - `frontend`: Build multi-stage de Angular 21+ servido por Nginx en `localhost:4200`, esperando a `strapi` saludable (`condition: service_healthy`), con proxy `/api/` hacia `http://strapi:1337/api/`.

## Consecuencias
- **Positivas:** Experiencia de evaluación "clone & run" con un solo comando; cero tokens expuestos en el navegador; sin configuración manual de CORS.
- **Negativas y Mitigaciones:** SQLite no es apto para múltiples réplicas de Strapi en producción → la configuración de BD queda encapsulada en `backend/config/database.ts` para migrar a PostgreSQL cambiando variables de entorno.
