/**
 * Seed idempotente y NO destructivo (ADR-002 §3.5 E1). Solo Document Service API.
 * Clave logica: country.code | country.code + key | country.code + slug.
 * Si el registro existe (en borrador o publicado) no se toca. Pasa por los middlewares I0-I5.
 * Controlado por SEED_ON_BOOT (default true).
 */
import type { Core } from '@strapi/strapi';
import { COUNTRY_SEEDS, type CountrySeed } from './seed-data';

const COUNTRY_UID = 'api::country.country';
const FIELD_UID = 'api::form-field.form-field';
const PLAN_UID = 'api::insurance-plan.insurance-plan';

export async function seedIfEnabled(strapi: Core.Strapi): Promise<void> {
  const flag = (process.env.SEED_ON_BOOT ?? 'true').toLowerCase();
  if (flag !== 'true') {
    strapi.log.info('[seed] SEED_ON_BOOT != true: seed omitido.');
    return;
  }
  const counts = { countries: 0, fields: 0, plans: 0 };
  for (const seed of COUNTRY_SEEDS) {
    await seedCountry(strapi, seed, counts);
  }
  strapi.log.info(`[seed] Creados: ${counts.countries} paises, ${counts.fields} campos, ${counts.plans} planes (los existentes no se tocan).`);
}

async function seedCountry(strapi: Core.Strapi, seed: CountrySeed, counts: { countries: number; fields: number; plans: number }): Promise<void> {
  let country = await strapi.documents(COUNTRY_UID).findFirst({ filters: { code: seed.code } });
  if (!country) {
    country = await strapi.documents(COUNTRY_UID).create({
      data: {
        code: seed.code,
        name: seed.name,
        currencyCode: seed.currencyCode,
        localeCode: seed.locale, // `locale` es nombre reservado en Strapi 5; la API lo expone como `locale`
        legalAge: seed.legalAge,
        vehicleMaxAgeYears: seed.vehicleMaxAgeYears,
        vehicleMaxFutureYears: seed.vehicleMaxFutureYears,
        termsTitle: seed.termsTitle,
        termsContent: seed.termsContent,
        termsVersion: seed.termsVersion,
      },
    });
    counts.countries += 1;
  }
  const countryDocumentId = country.documentId;

  for (const f of seed.fields) {
    try {
      const existingKey = await strapi.documents(FIELD_UID).findFirst({
        status: 'draft',
        filters: { key: f.key, country: { documentId: countryDocumentId } },
      });
      if (existingKey) continue;
      if (f.semanticRole !== 'none') {
        // Negocio pudo renombrar la key: el rol ya cubierto cuenta como "existente".
        const existingRole = await strapi.documents(FIELD_UID).findFirst({
          status: 'draft',
          filters: { semanticRole: f.semanticRole, country: { documentId: countryDocumentId } },
        });
        if (existingRole) continue;
      }
      const { validation, options, ...rest } = f;
      await strapi.documents(FIELD_UID).create({
        status: 'published',
        data: {
          ...rest,
          country: countryDocumentId,
          ...(validation ? { validation } : {}),
          ...(options ? { options } : {}),
        } as never,
      });
      counts.fields += 1;
    } catch (err) {
      strapi.log.error(`[seed] Campo ${seed.code}/${f.key} no creado: ${(err as Error).message}`);
    }
  }

  for (const p of seed.plans) {
    try {
      const existing = await strapi.documents(PLAN_UID).findFirst({
        status: 'draft',
        filters: { slug: p.slug, country: { documentId: countryDocumentId } },
      });
      if (existing) continue;
      await strapi.documents(PLAN_UID).create({
        status: 'published',
        data: { ...p, currency: seed.currencyCode, country: countryDocumentId } as never,
      });
      counts.plans += 1;
    } catch (err) {
      strapi.log.error(`[seed] Plan ${seed.code}/${p.slug} no creado: ${(err as Error).message}`);
    }
  }
}
