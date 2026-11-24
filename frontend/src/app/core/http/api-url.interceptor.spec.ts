import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('[F-PL.1][R-01.23] el bundle no contiene literales de credenciales', () => {
  const dir = join(process.cwd(), 'src', 'app');
  const sources = ['core/http/api-url.interceptor.ts', 'core/api/strapi-api.service.ts', 'core/http/strapi-queries.ts'];

  it('[F-PL.1][R-01.23] el interceptor y el cliente HTTP no contienen Authorization, Bearer ni api_token (punto [9] del smoke)', () => {
    for (const file of sources) {
      const code = readFileSync(join(dir, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(code, file).not.toMatch(/Bearer |api_token|STRAPI_\w*TOKEN|Authorization/i);
    }
  });
});
