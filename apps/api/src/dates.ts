/** Asia/Shanghai calendar-day helpers for planting / harvest date rules. */

const TZ = 'Asia/Shanghai';

/** Return YYYY-MM-DD for a Date or ISO/date string in Asia/Shanghai. */
export function calendarDay(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

/** Parse a date-only (YYYY-MM-DD) or datetime into Shanghai midnight of that calendar day. */
export function parseCalendarDate(value: string): Date {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : calendarDay(value);
  return new Date(`${day}T00:00:00+08:00`);
}

export function todayCalendarDay(): string {
  return calendarDay(new Date());
}
