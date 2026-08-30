import type { Doc } from "./_generated/dataModel";

export type AnimalSightingKind = Doc<"animalSightings">["animal"];

export const ANIMAL_SIGHTING_LABELS: Record<AnimalSightingKind, string> = {
  boar: "Vildsvin",
  deer: "Rådjur",
  elk: "Älg",
  fox: "Räv",
  other: "Annat",
};
