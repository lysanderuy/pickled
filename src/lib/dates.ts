// Date-only ("YYYY-MM-DD") and time-of-day helpers shared across services.

// DB time columns read back as "HH:MM:SS"; validator inputs are "HH:MM".
export const toHhmm = (t: string) => t.slice(0, 5);

export const minutesOf = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// A calendar date's weekday is timezone-independent, so UTC math is safe here.
export function dayOfWeekOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

// "YYYY-MM-DD" for the current moment in the given timezone.
export function todayIn(timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
