export const JOIN_CODE_MIN_LENGTH = 3;
export const JOIN_CODE_MAX_LENGTH = 32;

const SAFE_JOIN_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function formatJoinCodeInput(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-');
}

export function validateJoinCode(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed !== trimmed.toLowerCase()) {
    return 'Jaktkoden måste vara med små bokstäver.';
  }

  if (trimmed.length < JOIN_CODE_MIN_LENGTH) {
    return `Jaktkoden måste vara minst ${JOIN_CODE_MIN_LENGTH} tecken.`;
  }

  if (trimmed.length > JOIN_CODE_MAX_LENGTH) {
    return `Jaktkoden får vara max ${JOIN_CODE_MAX_LENGTH} tecken.`;
  }

  if (!SAFE_JOIN_CODE_PATTERN.test(trimmed)) {
    return 'Använd bara små bokstäver, siffror och bindestreck.';
  }

  return undefined;
}

export function normalizeJoinCodeForDisplay(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, JOIN_CODE_MAX_LENGTH)
    .replace(/-$/g, '');
}

function formatDateToken(date: Date | undefined): string {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, '0');
  const day = String(safeDate.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function createJoinCodeSuggestions(areaName: string | undefined, startDate: Date | undefined): string[] {
  const base = normalizeJoinCodeForDisplay(areaName || 'jakt') || 'jakt';
  const dateToken = formatDateToken(startDate);
  const yearToken = dateToken.slice(0, 4);
  const candidates = [
    `${base}-${dateToken}`,
    `${base}-${yearToken}`,
    `${base}-jakt`,
  ].map(normalizeJoinCodeForDisplay);

  return Array.from(new Set(candidates)).filter(
    (candidate) => !validateJoinCode(candidate)
  );
}
