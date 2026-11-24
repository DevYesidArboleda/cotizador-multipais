import type { HttpInterceptorFn } from '@angular/common/http';
import { throwError } from 'rxjs';
import { isAllowedApiUrl } from './strapi-queries';

/**
 * Red de seguridad (CLAUDE.md §7, R-01.23): solo se permiten rutas relativas `/api/...`. Una URL absoluta o ajena
 * aborta la petición antes de salir del navegador. La app nunca añade credenciales a la petición (el proxy de Nginx
 * ya anula cualquier cabecera de autenticación), y el bundle no debe contener literales de credenciales (F-PL.1).
 */
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isAllowedApiUrl(req.url)) {
    return throwError(() => new Error('Solo se permiten rutas relativas /api/...'));
  }
  return next(req);
};
