import { factories } from '@strapi/strapi';
// Rutas por defecto; Public solo tiene `find`. El middleware fuerza status=published en `find` (ADR-002 §3.2 D1).
export default factories.createCoreRouter('api::insurance-plan.insurance-plan', {
  config: { find: { middlewares: ['global::force-published'] } },
});
