import type { Core } from '@strapi/strapi';
import { registerDocumentInvariants } from './extensions/document-invariants';
import { ensurePublicPermissions, ensureFirstAdmin, ensureNoRegistration, ensureNoDefaultApiTokens } from './extensions/security';
import { seedIfEnabled } from './extensions/seed';

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    registerDocumentInvariants(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureFirstAdmin(strapi);
    await ensureNoRegistration(strapi);
    await ensurePublicPermissions(strapi);
    await ensureNoDefaultApiTokens(strapi);
    await seedIfEnabled(strapi);
  },
};
