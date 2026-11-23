import { factories } from '@strapi/strapi';
// Rutas por defecto: el rol Public solo recibe `find` (bootstrap). El resto responde 403 sin token.
export default factories.createCoreRouter('api::country.country');
