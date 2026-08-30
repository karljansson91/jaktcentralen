import type { Id } from '@/convex/_generated/dataModel';

const OTHER_ANIMAL_SIGHTING_OPTION = {
  value: 'other',
  label: 'Annat',
  color: '#398048',
  icon: 'animal-paw',
} as const;

export const ANIMAL_SIGHTING_OPTIONS = [
  { value: 'elk', label: 'Älg', color: '#C98122', icon: 'animal-elk' },
  { value: 'deer', label: 'Rådjur', color: '#8A6A46', icon: 'animal-deer' },
  { value: 'boar', label: 'Vildsvin', color: '#4B5563', icon: 'animal-boar' },
  { value: 'fox', label: 'Räv', color: '#D24F27', icon: 'animal-fox' },
  OTHER_ANIMAL_SIGHTING_OPTION,
] as const;

export type AnimalSightingType = (typeof ANIMAL_SIGHTING_OPTIONS)[number]['value'];
export type AnimalSightingIconName = (typeof ANIMAL_SIGHTING_OPTIONS)[number]['icon'];
type AnimalSightingOption = (typeof ANIMAL_SIGHTING_OPTIONS)[number];

export type AnimalSightingMapItem = {
  _id: Id<'animalSightings'>;
  animal: string;
  label?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  user?: { name?: string | null } | null;
};

const ANIMAL_SIGHTING_LIVE_WINDOW_MS = 30 * 60_000;

const animalSightingOptionByValue = new Map<string, AnimalSightingOption>(
  ANIMAL_SIGHTING_OPTIONS.map((option) => [option.value, option])
);

export function getAnimalSightingOption(animal: string) {
  return animalSightingOptionByValue.get(animal) ?? OTHER_ANIMAL_SIGHTING_OPTION;
}

export function getAnimalSightingLabel(animal: string) {
  return getAnimalSightingOption(animal).label;
}

export function getAnimalSightingColor(animal: string) {
  return getAnimalSightingOption(animal).color;
}

export function getAnimalSightingIconName(animal: string) {
  return getAnimalSightingOption(animal).icon;
}

function formatAnimalSightingAge(timestamp: number, currentTime: number) {
  const ageMinutes = Math.floor(Math.max(0, currentTime - timestamp) / 60_000);
  if (ageMinutes < 1) {
    return 'Nu';
  }
  if (ageMinutes < 60) {
    return `${ageMinutes} min`;
  }

  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function isAnimalSightingLive(
  sighting: Pick<AnimalSightingMapItem, 'timestamp'>,
  currentTime: number
) {
  return currentTime - sighting.timestamp <= ANIMAL_SIGHTING_LIVE_WINDOW_MS;
}

export function formatAnimalSightingMapLabel(
  sighting: Pick<AnimalSightingMapItem, 'animal' | 'label' | 'timestamp'>,
  currentTime: number
) {
  const label = sighting.label ?? getAnimalSightingLabel(sighting.animal);
  return `${label} · ${formatAnimalSightingAge(sighting.timestamp, currentTime)}`;
}
