# Log 16 — @devops-engineer: F-PL.9 y F-PL.10 (HITL-3 parte 2)

- **Fecha:** 2026-11-23 · continuado con SendMessage · regla nueva de la ronda: cada supuesto con la salida literal del comando que lo prueba
- Mensaje e informe copiados **sin editar**.

## Mensaje de despacho (literal)

```text
HITL-3 parte 2 — decisión humana: "Corregir F-PL.9 y F-PL.10, aceptar 7 y 8". Commit base ff0138b. Lee (rutas exactas): /home/claude/cotizador-multipais/docs/reviews/REVIEW-PLATFORM.md (F-PL.9, F-PL.10), /home/claude/cotizador-multipais/.github/workflows/ci.yml, /home/claude/cotizador-multipais/frontend/playwright.config.ts.

- F-PL.9: que un test inestable haga fallar el CI aunque pase en el reintento. Usa `--fail-on-flaky-tests` en los comandos `npx playwright test` de los jobs e2e y e2e-postgres de ci.yml (sin tocar frontend/). Antes de usarlo, PRUEBA que la versión instalada lo soporta: `cd frontend && npx playwright --version && npx playwright test --help | grep -n fail-on-flaky` (pega la salida).
- F-PL.10: añade `Authorization` a los greps de seguridad de ci.yml (governance sobre frontend/src y frontend sobre dist/), excluyendo `*.spec.ts` y `src/app/testing/` en el de src (esos tests afirman la AUSENCIA de la cabecera). PRUEBA ambos greps exactamente como quedan en el workflow: ejecuta el comando de src contra frontend/src y, tras `cd frontend && npm run build -- --configuration production`, el comando de dist contra frontend/dist; ambos deben dar 0 coincidencias (pega la salida y el exit code). Borra frontend/dist y .angular al terminar.
Regla de esta ronda (por los logs 06b y 12): todo supuesto debe ir acompañado de la salida literal del comando que lo demuestra. Solo toca .github/workflows/ci.yml. No levantes servidores, no instales herramientas externas, no hagas commit. Verifica también parseo YAML y grep hashFiles = 0. Handoff de CLAUDE.md §6.
```

## Informe (literal)

F-PL.9 y F-PL.10 están corregidos en `/home/claude/cotizador-multipais/.github/workflows/ci.yml`. Ambos greps dan 0 coincidencias y la versión instalada de Playwright soporta `--fail-on-flaky-tests`. Solo toqué ese archivo, y no hice commit.

## Soporte de `--fail-on-flaky-tests`
```
$ cd frontend && npx playwright --version && npx playwright test --help | grep -n fail-on-flaky
Version 1.65.1
21:  --fail-on-flaky-tests            Fail if any test is flagged as flaky
```

## Cambios
- **F-PL.9:** `npx playwright test --fail-on-flaky-tests` en el job `e2e` (línea 138). En `e2e-postgres` (línea 191) el comando queda `npx playwright test --grep @strapi --fail-on-flaky-tests`.
- **F-PL.10, governance (línea 62):** el patrón de `frontend/src` ahora es `bearer |api[_-]?token|STRAPI_[A-Z_]*(TOKEN|SECRET)|localhost:1337|Authorization`, con `--exclude='*.spec.ts' --exclude-dir=testing`.
- **F-PL.10, job `frontend` (línea 87):** el patrón de `dist/` pasa a `bearer |api[_-]?token|STRAPI_[A-Z_]*(TOKEN|SECRET)|localhost:1337|Authorization`. Antes no incluía `STRAPI_*` ni `Authorization`.
- **Limitación de `--exclude-dir=testing`:** GNU grep compara solo el nombre base del directorio, así que excluye cualquier carpeta llamada `testing` bajo `frontend/src`, no únicamente `src/app/testing/`.

## Verificación
**Grep de `frontend/src`**, exactamente como queda en el workflow:
```
sin coincidencias
grep-src-exit=1   (1 = 0 coincidencias)
```
Sin las exclusiones, `Authorization` sí aparece en `frontend/src/app/core/http/api-url.interceptor.spec.ts` y `frontend/src/app/core/country/config-load.spec.ts`. Las exclusiones sirven y esos specs afirman la ausencia de la cabecera.

**Build de producción y grep de `dist/`**, tras `cd frontend && npm run build -- --configuration production`:
```
Application bundle generation complete. [3.578 seconds] - 2026-11-24T03:02:46.345Z
Output location: /home/claude/cotizador-multipais/frontend/dist/frontend
--- grep dist (comando del workflow)
sin coincidencias
grep-exit=1 (1 = 0 coincidencias)
```
Borré `frontend/dist` y `frontend/.angular`, y confirmé con `ls frontend` que ya no están.

**YAML y `hashFiles`:**
```
yaml ok
0
```
El primero es el parseo YAML de todos los `.yml` bajo `.github/`. El segundo es el conteo de `hashFiles` en `.github`.

## Handoff
- **Agente:** @devops-engineer · **Fase:** HITL-3 parte 2 · **Entradas leídas:** `docs/reviews/REVIEW-PLATFORM.md` (F-PL.9, F-PL.10), `.github/workflows/ci.yml`, `frontend/playwright.config.ts`.
- **Archivos modificados:** `/home/claude/cotizador-multipais/.github/workflows/ci.yml`.
- **IDs cubiertos:** F-PL.9, F-PL.10 (F-PL.7 y F-PL.8 aceptados por decisión humana, sin cambios).
- **Verificación ejecutada:** las salidas de arriba. No ejecuté `actionlint`: no hay binario instalado y la regla de mi definición prohíbe instalarlo, así que el workflow queda "no verificado" y su próxima ejecución remota es un checkpoint humano.
- **Pendientes / riesgos:**
  - Con `--fail-on-flaky-tests` y `retries: 1` en CI, cualquier test inestable que pase en el reintento ahora pone el job en rojo.
  - Falta verificar en remoto los jobs `e2e` y `e2e-postgres`, que dependen del daemon Docker.
- **Requiere HITL:** No.

## Contraste del Orquestador
- `grep -n fail-on-flaky-tests .github/workflows/ci.yml` → líneas 138 y 191.
- Comando de la línea 62 extraído del workflow y ejecutado tal cual → exit 1 (0 coincidencias).
- Observación: con la regla "salida literal por supuesto", este informe fue el primero del agente sin supuestos no verificados (comparar con logs 06b y 12).
