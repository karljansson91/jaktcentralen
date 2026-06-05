import type { Id } from '@/convex/_generated/dataModel';

export const ANIMAL_SIGHTING_OPTIONS = [
  { value: 'elk', label: 'Älg', color: '#C98122' },
  { value: 'deer', label: 'Rådjur', color: '#8A6A46' },
  { value: 'boar', label: 'Vildsvin', color: '#4B5563' },
  { value: 'fox', label: 'Räv', color: '#D24F27' },
  { value: 'other', label: 'Annat', color: '#398048' },
] as const;

export type AnimalSightingType = (typeof ANIMAL_SIGHTING_OPTIONS)[number]['value'];

export type AnimalSightingMapItem = {
  _id: Id<'animalSightings'>;
  animal: AnimalSightingType;
  label?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  user?: { name?: string | null } | null;
};

const ANIMAL_SIGHTING_LIVE_WINDOW_MS = 30 * 60_000;

const animalSightingOptionByValue = new Map(
  ANIMAL_SIGHTING_OPTIONS.map((option) => [option.value, option])
);

export function getAnimalSightingLabel(animal: AnimalSightingType) {
  return animalSightingOptionByValue.get(animal)?.label ?? 'Observation';
}

export function getAnimalSightingColor(animal: AnimalSightingType) {
  return animalSightingOptionByValue.get(animal)?.color ?? '#398048';
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
