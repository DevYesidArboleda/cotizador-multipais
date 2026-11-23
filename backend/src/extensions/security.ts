/**
 * Seguridad de Strapi en bootstrap (ADR-002 §4.2). Todo es idempotente.
 *  - Rol Public: SOLO find en country, form-field e insurance-plan; se revoca lo demas.
 *  - users-permissions: allow_register = false.
 *  - Primer admin desde STRAPI_ADMIN_EMAIL / STRAPI_ADMIN_PASSWORD si no hay admins.
 *  - Nunca se crean API tokens ni transfer tokens.
 */
import type { Core } from '@strapi/strapi';

const PUBLIC_ALLOWED: readonly string[] = [
  'api::country.country.find',
  'api::form-field.form-field.find',
  'api::insurance-plan.insurance-plan.find',
];

const PERMISSION_UID = 'plugin::users-permissions.permission';
const ROLE_UID = 'plugin::users-permissions.role';

export async function ensurePublicPermissions(strapi: Core.Strapi): Promise<void> {
  const role = await strapi.db.query(ROLE_UID).findOne({ where: { type: 'public' } });
  if (!role) {
    strapi.log.warn('[security] Rol Public no encontrado; permisos no aplicados.');
    return;
  }
  const current = (await strapi.db.query(PERMISSION_UID).findMany({
    where: { role: role.id },
    limit: 10000,
  })) as Array<{ id: number; action: string }>;

  let revoked = 0;
  for (const p of current) {
    if (!PUBLIC_ALLOWED.includes(p.action)) {
      await strapi.db.query(PERMISSION_UID).delete({ where: { id: p.id } });
      revoked += 1;
    }
  }
  let granted = 0;
  for (const action of PUBLIC_ALLOWED) {
    if (!current.some((p) => p.action === action)) {
      await strapi.db.query(PERMISSION_UID).create({ data: { action, role: role.id } });
      granted += 1;
    }
  }
  strapi.log.info(`[security] Permisos Public: ${granted} concedidos, ${revoked} revocados (solo find en 3 tipos).`);
}

export async function ensureNoRegistration(strapi: Core.Strapi): Promise<void> {
  const store = strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' });
  const value = ((await store.get({})) ?? {
    unique_email: true,
    email_reset_password: null,
    email_confirmation: false,
    email_confirmation_redirection: null,
    default_role: 'authenticated',
  }) as Record<string, unknown>;
  if (value.allow_register !== false) {
    await store.set({ value: { ...value, allow_register: false } });
    strapi.log.info('[security] users-permissions allow_register = false');
  }
}

export async function ensureFirstAdmin(strapi: Core.Strapi): Promise<void> {
  const email = process.env.STRAPI_ADMIN_EMAIL;
  const password = process.env.STRAPI_ADMIN_PASSWORD;
  const adminService = strapi.service('admin::user');
  const hasAdmin = (await adminService.exists()) as boolean;
  if (hasAdmin) return;
  if (!email || !password) {
    if (process.env.NODE_ENV === 'production') {
      strapi.log.warn(
        '[security] No hay administrador y faltan STRAPI_ADMIN_EMAIL/STRAPI_ADMIN_PASSWORD: ' +
          'registre el super-admin en /admin ANTES de publicar la URL.',
      );
    }
    return;
  }
  const superAdmin = (await strapi.service('admin::role').getSuperAdmin()) as { id: number } | null;
  if (!superAdmin) {
    strapi.log.warn('[security] Rol super-admin no disponible; admin inicial no creado.');
    return;
  }
  await adminService.create({
    email: email.toLowerCase(),
    firstname: 'Admin',
    lastname: 'Cotizador',
    password,
    registrationToken: null,
    isActive: true,
    roles: [superAdmin.id],
  });
  strapi.log.info('[security] Administrador inicial creado desde variables de entorno.');
}

/**
 * Strapi crea por defecto los tokens "Read Only" y "Full Access". HITL-1: no debe existir ningun token.
 * Se revocan los dos presets en cada arranque; cualquier otro token se reporta como advertencia.
 */
export async function ensureNoDefaultApiTokens(strapi: Core.Strapi): Promise<void> {
  const service = strapi.service('admin::api-token');
  const tokens = (await strapi.db
    .query('admin::api-token')
    .findMany({ select: ['id', 'name', 'type'], limit: 1000 })) as Array<{ id: number; name: string; type: string }>;
  for (const t of tokens) {
    const isPreset =
      (t.name === 'Read Only' && t.type === 'read-only') || (t.name === 'Full Access' && t.type === 'full-access');
    if (isPreset) {
      await service.revoke(t.id);
      strapi.log.info(`[security] Token por defecto "${t.name}" revocado (HITL-1: sin tokens).`);
    } else {
      strapi.log.warn(`[security] Existe un API token no previsto ("${t.name}"). HITL-1 exige ninguno; revíselo en el admin.`);
    }
  }
}
