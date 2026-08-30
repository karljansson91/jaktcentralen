import type { AllowedGameRule } from './allowed-game';
import { getAllowedGameSpeciesLabel } from './allowed-game';
import type { AnimalSightingType } from './animal-sightings';

export const SHOT_REPORT_RESULT_OPTIONS = [
  { value: 'fell', label: 'Föll på plats', color: '#398048' },
  { value: 'continued', label: 'Gick vidare', color: '#C98122' },
  { value: 'uncertain', label: 'Osäkert', color: '#A33D3D' },
] as const;

export type ShotReportResult = (typeof SHOT_REPORT_RESULT_OPTIONS)[number]['value'];

const FOLLOW_UP_STATUS_OPTIONS = [
  { value: 'needs_planning', label: 'Behöver planeras' },
  { value: 'planned', label: 'Planerat' },
  { value: 'in_progress', label: 'Pågår' },
  { value: 'completed', label: 'Avslutat' },
  { value: 'false_report', label: 'Felrapporterat' },
] as const;

export const FOLLOW_UP_RESOLUTION_OPTIONS = [
  { value: 'game_found', label: 'Vilt funnet' },
  { value: 'game_culled', label: 'Vilt fällt' },
  { value: 'not_found', label: 'Ej funnet' },
  { value: 'other', label: 'Annat' },
] as const;

export type FollowUpResolution =
  (typeof FOLLOW_UP_RESOLUTION_OPTIONS)[number]['value'];

export const ESCAPE_DIRECTION_OPTIONS = [
  { degrees: 0, label: 'N' },
  { degrees: 45, label: 'NO' },
  { degrees: 90, label: 'Ö' },
  { degrees: 135, label: 'SO' },
  { degrees: 180, label: 'S' },
  { degrees: 225, label: 'SV' },
  { degrees: 270, label: 'V' },
  { degrees: 315, label: 'NV' },
] as const;

const DEFAULT_SHOT_SPECIES = [
  { id: 'elk', label: 'Älg' },
  { id: 'roe_deer', label: 'Rådjur' },
  { id: 'boar', label: 'Vildsvin' },
  { id: 'fox', label: 'Räv' },
  { id: 'other', label: 'Annat' },
] as const;

export type ShotSpeciesOption = { id: string; label: string };

export function getShotSpeciesOptions(
  allowedGame?: AllowedGameRule[] | null
): ShotSpeciesOption[] {
  if (!allowedGame || allowedGame.length === 0) {
    return Array.from(DEFAULT_SHOT_SPECIES);
  }

  return allowedGame.map((rule) => ({
    id: rule.speciesId,
    label: getAllowedGameSpeciesLabel(rule),
  }));
}

export function getShotSpeciesAnimal(speciesId: string): AnimalSightingType {
  switch (speciesId) {
    case 'elk':
      return 'elk';
    case 'roe_deer':
    case 'fallow_deer':
    case 'red_deer':
      return 'deer';
    case 'boar':
      return 'boar';
    case 'fox':
      return 'fox';
    default:
      return 'other';
  }
}

export function getShotReportResultLabel(result: string) {
  return SHOT_REPORT_RESULT_OPTIONS.find((option) => option.value === result)?.label ?? 'Okänt';
}

export function formatShotReportChatBody(speciesLabel: string, result: ShotReportResult) {
  return `Skott rapporterat: ${speciesLabel} – ${getShotReportResultLabel(result).toLowerCase()}.`;
}

export function getShotReportResultColor(result: string) {
  return SHOT_REPORT_RESULT_OPTIONS.find((option) => option.value === result)?.color ?? '#4B5563';
}

export function getFollowUpStatusLabel(status: string) {
  return FOLLOW_UP_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'Okänd';
}

export function getFollowUpResolutionLabel(resolution: string) {
  return (
    FOLLOW_UP_RESOLUTION_OPTIONS.find((option) => option.value === resolution)?.label ?? 'Annat'
  );
}

export function getEscapeDirectionLabel(degrees: number) {
  return ESCAPE_DIRECTION_OPTIONS.find((option) => option.degrees === degrees)?.label ?? `${degrees}°`;
}

export function requiresFollowUp(result: ShotReportResult) {
  return result === 'continued' || result === 'uncertain';
}
