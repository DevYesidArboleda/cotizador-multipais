import type { Core } from '@strapi/strapi';

/**
 * ADR-002 §3.2 D1 / riesgo 1: en las rutas `find` publicas de form-field e insurance-plan se
 * sobrescribe `status` con `published`, ignorando lo que envie el cliente (`?status=draft`,
 * `st%61tus=draft`, `status[]=draft`). Corre despues de `strapi::query`, que ya parseo la query.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: { query: Record<string, unknown> }, next: () => Promise<unknown>) => {
    ctx.query = { ...ctx.query, status: 'published' };
    // `ctx.query` es un setter sobre la query string; por si la version lo ignora, se deja traza solo en debug.
    strapi.log.debug('force-published: status=published aplicado');
    return next();
  };
};
