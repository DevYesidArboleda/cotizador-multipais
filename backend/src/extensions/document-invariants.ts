/**
 * Invariantes entre documentos I0-I5 (ADR-001 §4.7, skill strapi-5-docker-seed §1).
 * Se implementan como Document Service middleware (no lifecycles de BD: en Strapi 5 se disparan
 * varias veces con Draft & Publish). Los errores son `ValidationError` para que el admin los muestre.
 * El seed pasa por aqui tambien: no puede violar I0-I5.
 */
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

const COUNTRY_UID = 'api::country.country';
const FIELD_UID = 'api::form-field.form-field';
const PLAN_UID = 'api::insurance-plan.insurance-plan';

/** Alineado con CURRENCY_CODES del contrato y el enum de insurance-plan.currency. */
const CURRENCY_ENUM: readonly string[] = ['COP', 'CLP'];

/** Rol exigido por validatorKey (VALIDATOR_REQUIRED_ROLE del contrato). */
const VALIDATOR_ROLE: Readonly<Record<string, string>> = {
  legal_age: 'birth_date',
  vehicle_year_range: 'vehicle_year',
  cl_rut: 'document_number',
};

type Dict = Record<string, unknown>;

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

interface DocContext {
  uid: string;
  action: string;
  params: Dict;
}

/** Extrae el documentId de una relacion en cualquiera de las formas que usan el admin, la API y el seed. */
const refToken = (v: unknown): unknown => {
  if (typeof v === 'string' || typeof v === 'number') return v;
  if (isDict(v)) return v.documentId ?? v.id ?? null;
  return null;
};

/** `undefined` = el payload no toca la relacion; `null` = la deja vacia; otro = referencia. */
const relationFromData = (data: Dict, key: string): unknown => {
  if (!(key in data)) return undefined;
  const raw = data[key];
  if (raw === null) return null;
  if (Array.isArray(raw)) return raw.length ? refToken(raw[0]) : null;
  if (isDict(raw) && ('connect' in raw || 'set' in raw || 'disconnect' in raw)) {
    const pick = (list: unknown): unknown => (Array.isArray(list) && list.length ? refToken(list[list.length - 1]) : null);
    const set = pick(raw.set);
    if (set !== null) return set;
    const connect = pick(raw.connect);
    if (connect !== null) return connect;
    if ('set' in raw && Array.isArray(raw.set) && raw.set.length === 0) return null;
    if (Array.isArray(raw.disconnect) && raw.disconnect.length) return null;
    return undefined;
  }
  return refToken(raw);
};

export function registerDocumentInvariants(strapi: Core.Strapi): void {
  const fail = (msg: string): never => {
    throw new errors.ValidationError(msg);
  };

  const loadCountry = async (ref: unknown): Promise<Dict | null> => {
    if (ref === null || ref === undefined) return null;
    const docs = strapi.documents(COUNTRY_UID);
    const found =
      typeof ref === 'string'
        ? await docs.findOne({ documentId: ref })
        : await docs.findFirst({ filters: { id: ref as number } });
    return isDict(found) ? found : null;
  };

  /** Estado efectivo del documento tras la accion: borrador existente + data entrante. */
  const effectiveState = async (ctx: DocContext, populate: Dict): Promise<{ doc: Dict; countryRef: unknown }> => {
    const data = isDict(ctx.params.data) ? ctx.params.data : {};
    const documentId = str(ctx.params.documentId);
    let existing: Dict = {};
    if (documentId && ctx.action !== 'create') {
      const found = await strapi.documents(ctx.uid as never).findOne({
        documentId,
        status: 'draft',
        populate: populate as never,
      });
      if (isDict(found)) existing = found;
    }
    const fromData = relationFromData(data, 'country');
    const countryRef = fromData !== undefined ? fromData : refToken(existing.country);
    return { doc: { ...existing, ...(ctx.action === 'publish' ? {} : data) }, countryRef };
  };

  const sameCountryDrafts = async (uid: string, countryDocumentId: string, selfId: string | null): Promise<Dict[]> => {
    const rows = await strapi.documents(uid as never).findMany({
      status: 'draft',
      filters: { country: { documentId: countryDocumentId } } as never,
      populate: (uid === FIELD_UID ? { validation: true } : {}) as never,
      limit: 1000,
    });
    return (rows as unknown[]).filter(isDict).filter((r) => r.documentId !== selfId);
  };

  strapi.documents.use(async (rawCtx, next) => {
    const ctx = rawCtx as unknown as DocContext;
    const watched = ctx.uid === FIELD_UID || ctx.uid === PLAN_UID || ctx.uid === COUNTRY_UID;
    const acts = ctx.action === 'create' || ctx.action === 'update' || ctx.action === 'publish';
    if (!watched || !acts) return next();

    const selfId = str(ctx.params.documentId);

    if (ctx.uid === COUNTRY_UID) {
      // I4: no cambiar currencyCode si hay planes del pais con otra moneda.
      const data = isDict(ctx.params.data) ? ctx.params.data : {};
      if (ctx.action === 'update' && selfId && typeof data.currencyCode === 'string') {
        const current = await strapi.documents(COUNTRY_UID).findOne({ documentId: selfId });
        if (isDict(current) && current.currencyCode !== data.currencyCode) {
          for (const status of ['draft', 'published'] as const) {
            const plans = await strapi.documents(PLAN_UID).findMany({
              status,
              filters: { country: { documentId: selfId } } as never,
              limit: 1000,
            });
            const bad = (plans as unknown[]).filter(isDict).filter((p) => p.currency !== data.currencyCode);
            if (bad.length) fail('Actualice primero la moneda de los planes antes de cambiar la moneda del país.');
          }
        }
      }
      return next();
    }

    if (ctx.uid === FIELD_UID) {
      const { doc, countryRef } = await effectiveState(ctx, { validation: true, country: true });
      // I0
      const country = await loadCountry(countryRef);
      if (!country) fail('El campo debe tener un país asignado.');
      const countryDocId = String((country as Dict).documentId);
      const role = str(doc.semanticRole) ?? 'none';

      // I1
      if (role !== 'none') {
        const others = await sameCountryDrafts(FIELD_UID, countryDocId, selfId);
        if (others.some((o) => o.semanticRole === role)) fail(`Ya existe un campo con el rol ${role} en este país`);
      }

      // I5
      const validation = isDict(doc.validation) ? doc.validation : null;
      const vkey = validation ? (str(validation.validatorKey) ?? 'none') : 'none';
      if (vkey in VALIDATOR_ROLE && role !== VALIDATOR_ROLE[vkey]) {
        fail(`El validador ${vkey} solo es compatible con el rol ${VALIDATOR_ROLE[vkey]} (este campo tiene el rol ${role}).`);
      }
      if (vkey === 'depends_on_option_pattern' && !str(validation?.dependsOnRole)) {
        fail('El validador depends_on_option_pattern exige indicar "dependsOnRole" (rol del campo del que depende).');
      }
      return next();
    }

    // PLAN_UID
    const { doc, countryRef } = await effectiveState(ctx, { country: true });
    // I0
    const country = await loadCountry(countryRef);
    if (!country) fail('El plan debe tener un país asignado.');
    const c = country as Dict;
    const countryDocId = String(c.documentId);

    // I3
    const countryCurrency = String(c.currencyCode);
    if (!CURRENCY_ENUM.includes(countryCurrency)) {
      fail(`La moneda ${countryCurrency} del país no existe en el enum de planes: requiere ampliar el enum de moneda (cambio de esquema).`);
    }
    if (doc.currency !== countryCurrency) {
      fail(`La moneda del plan (${String(doc.currency)}) debe coincidir con la moneda del país (${countryCurrency}).`);
    }

    // I2
    if (doc.isRecommended === true && doc.isActive !== false) {
      const others = await sameCountryDrafts(PLAN_UID, countryDocId, selfId);
      if (others.some((o) => o.isRecommended === true && o.isActive === true)) {
        fail('Ya existe un plan recomendado y activo en este país. Quite la marca "recomendado" del otro plan primero.');
      }
    }
    return next();
  });
}
