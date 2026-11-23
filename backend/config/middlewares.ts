import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  // CORS limitado al propio origen publico (ADR-002 §4.2). El SPA llama a /api en el mismo origen via proxy.
  {
    name: 'strapi::cors',
    config: {
      origin: [env('PUBLIC_URL', 'http://localhost:1337')],
      methods: ['GET', 'HEAD', 'OPTIONS'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
