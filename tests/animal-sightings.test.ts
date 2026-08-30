import { describe, expect, test } from "vitest";
import {
  ANIMAL_SIGHTING_OPTIONS,
  getAnimalSightingColor,
  getAnimalSightingIconName,
  getAnimalSightingLabel,
  getAnimalSightingOption
} from "../lib/animal-sightings";

describe("animal sighting catalog", () => {
  test("defines every supported animal in one catalog", () => {
    expect(ANIMAL_SIGHTING_OPTIONS).toMatchObject([
      { value: "elk", label: "Älg", icon: "animal-elk" },
      { value: "deer", label: "Rådjur", icon: "animal-deer" },
      { value: "boar", label: "Vildsvin", icon: "animal-boar" },
      { value: "fox", label: "Räv", icon: "animal-fox" },
      { value: "other", label: "Annat", icon: "animal-paw" }
    ]);
  });

  test("uses the neutral other option for unknown future animals", () => {
    expect(getAnimalSightingOption("capercaillie")).toBe(
      getAnimalSightingOption("other")
    );
    expect(getAnimalSightingLabel("capercaillie")).toBe("Annat");
    expect(getAnimalSightingColor("capercaillie")).toBe("#398048");
    expect(getAnimalSightingIconName("capercaillie")).toBe("animal-paw");
  });
});
