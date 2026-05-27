export function formatEventDate(date: Date): string {
  return date.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + days);
  return nextDate;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getCalendarDays(month: Date): Date[] {
  const firstOfMonth = startOfMonth(month);
  const daysBeforeMonday = (firstOfMonth.getDay() + 6) % 7;
  const firstVisibleDay = addDays(firstOfMonth, -daysBeforeMonday);

  return Array.from({ length: 42 }, (_, index) => addDays(firstVisibleDay, index));
}
