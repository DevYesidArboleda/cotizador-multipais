/** Fixtures de planes (datos FICTICIOS, solo pruebas). */
import type { InsurancePlan, ValidInsurancePlan } from '../core/contracts/strapi-contracts';

let seq = 0;

export function planOf(overrides: Partial<InsurancePlan> = {}): InsurancePlan {
  seq += 1;
  return {
    documentId: `plan-${seq}`,
    slug: `plan-${seq}`,
    name: `Plan ${seq}`,
    shortDescription: null,
    basePrice: 1000,
    declaredCurrency: 'COP',
    coverages: [],
    benefits: [],
    order: seq,
    isRecommended: false,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function validPlanOf(overrides: Partial<ValidInsurancePlan> = {}): ValidInsurancePlan {
  const base = planOf();
  return { ...base, name: base.name ?? 'Plan', basePrice: 1000, declaredCurrency: 'COP', ...overrides } as ValidInsurancePlan;
}
