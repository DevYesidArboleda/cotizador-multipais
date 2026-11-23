import type { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { isAllowedApiUrl } from './strapi-queries';

/**
 * Red de seguridad (CLAUDE.md §7, R-01.23): solo se permiten rutas relativas `/api/...` y nunca se envía
 * `Authorization`. Una URL absoluta o ajena aborta la petición antes de salir del navegador.
 */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isAllowedApiUrl(req.url)) {
    return throwError(() => new Error('Solo se permiten rutas relativas /api/...'));
  }
  return next(req.headers.has('Authorization') ? req.clone({ headers: req.headers.delete('Authorization') }) : req);
};
