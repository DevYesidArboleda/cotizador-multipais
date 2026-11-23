import { InjectionToken } from '@angular/core';

/** Reloj inyectable (R-01.13): los tests y `page.clock` fijan "hoy"; la fecha usada es la calendario LOCAL. */
export const NOW = new InjectionToken<() => Date>('NOW', { providedIn: 'root', factory: () => () => new Date() });
