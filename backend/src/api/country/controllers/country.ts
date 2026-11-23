import { factories } from '@strapi/strapi';

type Row = Record<string, unknown>;

/**
 * `locale` es un nombre de atributo RESERVADO en Strapi 5 (se oculta en queries y respuestas), pero el
 * contrato (StrapiCountryDto.locale) lo exige. El atributo se guarda como `localeCode` y la API REST
 * lo expone como `locale`, de modo que el contrato no cambia.
 */
const expose = (row: unknown): unknown => {
  if (typeof row !== 'object' || row === null) return row;
  const { localeCode, ...rest } = row as Row;
  return { ...rest, locale: localeCode ?? null };
};

export default factories.createCoreController('api::country.country', () => ({
  async find(ctx) {
    const res = (await super.find(ctx)) as { data?: unknown; meta?: unknown };
    return { ...res, data: Array.isArray(res.data) ? res.data.map(expose) : res.data };
  },
  async findOne(ctx) {
    const res = (await super.findOne(ctx)) as { data?: unknown; meta?: unknown };
    return { ...res, data: expose(res.data) };
  },
}));
