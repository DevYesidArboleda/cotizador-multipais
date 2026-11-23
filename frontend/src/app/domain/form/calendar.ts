import type { CalendarDate } from '../../core/contracts/strapi-contracts';

const ISO_DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** `YYYY-MM-DD` sin `new Date(string)` (evita el sesgo UTC); fecha inexistente → `null` (R-01.13). */
export function parseIsoDate(value: string): CalendarDate | null {
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Fecha calendario LOCAL del reloj inyectado (sin UTC) (R-01.13, GAP-01.4). */
export function toLocalCalendarDate(now: Date): CalendarDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/** `true` si `a` es posterior a `b` (comparación por tuplas). */
export function isAfter(a: CalendarDate, b: CalendarDate): boolean {
  if (a.year !== b.year) return a.year > b.year;
  if (a.month !== b.month) return a.month > b.month;
  return a.day > b.day;
}

/**
 * Años cumplidos por fecha calendario local. Quien nació un 29-feb cumple el 1-mar en años no bisiestos
 * porque (3, 1) >= (2, 29) y (2, 28) < (2, 29) (R-01.13, R-02.7).
 */
export function calculateAge(birth: CalendarDate, today: CalendarDate): number {
  const hadBirthday = today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  return today.year - birth.year - (hadBirthday ? 0 : 1);
}
