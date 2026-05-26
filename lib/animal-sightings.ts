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

const animalSightingOptionByValue = new Map(
  ANIMAL_SIGHTING_OPTIONS.map((option) => [option.value, option])
);

export function getAnimalSightingLabel(animal: AnimalSightingType) {
  return animalSightingOptionByValue.get(animal)?.label ?? 'Observation';
}

export function getAnimalSightingColor(animal: AnimalSightingType) {
  return animalSightingOptionByValue.get(animal)?.color ?? '#398048';
}

export function formatAnimalSightingAge(timestamp: number, currentTime: number) {
  const ageMinutes = Math.floor(Math.max(0, currentTime - timestamp) / 60_000);
  return ageMinutes < 1 ? 'Nu' : `${ageMinutes} min`;
}

export function formatAnimalSightingMapLabel(
  sighting: Pick<AnimalSightingMapItem, 'animal' | 'label' | 'timestamp'>,
  currentTime: number
) {
  const label = sighting.label ?? getAnimalSightingLabel(sighting.animal);
  return `${label} · ${formatAnimalSightingAge(sighting.timestamp, currentTime)}`;
}
