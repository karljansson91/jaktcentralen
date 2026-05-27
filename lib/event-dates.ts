export function normalizeEventDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isValidEventDate(date: Date | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}

export function formatEventInfoDate(date: number): string {
  return new Date(date).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatEventInfoDateRange(startDate: number, endDate?: number): string {
  const startDateLabel = formatEventInfoDate(startDate);
  if (!endDate) {
    return startDateLabel;
  }

  const endDateLabel = formatEventInfoDate(endDate);
  if (startDateLabel === endDateLabel) {
    return startDateLabel;
  }

  return `${startDateLabel} - ${endDateLabel}`;
}
