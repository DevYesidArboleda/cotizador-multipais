import { buildStrapiUrl, isAllowedApiUrl } from './strapi-queries';

describe('[R-01.23] consultas a Strapi', () => {
  it('[R-01.23] la consulta de campos es exactamente la de la spec (published, populate, orden, pageSize 100)', () => {
    expect(buildStrapiUrl('formFields', 'co')).toBe(
      '/api/form-fields?filters[country][code][$eq]=co&status=published&populate[validation]=true&populate[options]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100',
    );
  });

  it('[R-01.23] la consulta del país y la lista de países son las de la spec', () => {
    expect(buildStrapiUrl('country', 'cl')).toBe('/api/countries?filters[code][$eq]=cl');
    expect(buildStrapiUrl('countryList')).toBe('/api/countries?fields[0]=code&fields[1]=name&sort=name:asc&pagination[pageSize]=100');
  });

  it('[R-01.23] solo se producen rutas relativas /api/... y se rechazan URLs absolutas o ajenas', () => {
    expect(isAllowedApiUrl(buildStrapiUrl('formFields', 'co'))).toBe(true);
    expect(isAllowedApiUrl(buildStrapiUrl('country', 'cl'))).toBe(true);
    expect(isAllowedApiUrl('https://cms.example.com/api/countries')).toBe(false);
    expect(isAllowedApiUrl('//cms.example.com/api/countries')).toBe(false);
    expect(isAllowedApiUrl('/admin')).toBe(false);
    expect(buildStrapiUrl('formFields', 'co')).not.toMatch(/populate=\*|https?:|Bearer/);
  });

  it('[R-01.23] el código se codifica: no permite inyectar parámetros', () => {
    expect(buildStrapiUrl('country', 'co&populate=*')).toBe('/api/countries?filters[code][$eq]=co%26populate%3D*');
  });
});

describe('[R-02.2] consulta de planes', () => {
  it('[R-02.2] la consulta de planes es exactamente la de la spec y relativa', () => {
    const url = buildStrapiUrl('insurancePlans', 'co');
    expect(url).toBe(
      '/api/insurance-plans?filters[country][code][$eq]=co&filters[isActive][$eq]=true&status=published&populate[coverages]=true&populate[benefits]=true&sort[0]=order:asc&sort[1]=createdAt:asc&pagination[pageSize]=100',
    );
    expect(isAllowedApiUrl(url)).toBe(true);
    expect(url).not.toMatch(/populate=\*|https?:|Bearer/);
  });
});
