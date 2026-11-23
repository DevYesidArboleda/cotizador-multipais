## Trazabilidad
- **Historia:** US-XX
- **Spec:** `docs/specs/SPEC-US-XX.md` (versión aprobada en HITL-1)
- **ADRs:** ADR-00X
- **Reglas / criterios cubiertos:** R-XX.n, AC-XX.n
- **Review:** `docs/reviews/REVIEW-US-XX.md`

## Checklist
- [ ] Tests con IDs en el título para cada `R-`/`AC-` tocado
- [ ] `node scripts/trace-check.mjs` en verde
- [ ] Sin tokens de Strapi ni URLs absolutas en `frontend/`
- [ ] Probado con teclado (Tab / Shift+Tab / Enter / Space)
- [ ] Logs de la sesión agéntica guardados en `docs/logs/`
