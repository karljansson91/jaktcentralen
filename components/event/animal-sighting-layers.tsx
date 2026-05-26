import {
  AnimalSightingMapItem,
  formatAnimalSightingMapLabel,
  getAnimalSightingColor,
  getAnimalSightingLabel,
} from '@/lib/animal-sightings';
import { APP_COLORS } from '@/lib/theme';
import { CircleLayer, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import type { ComponentProps } from 'react';

type AnimalSightingLayersProps = {
  currentTime?: number;
  idPrefix: string;
  sightings: AnimalSightingMapItem[];
  onPressSighting?: (sighting: AnimalSightingMapItem) => void;
};

type ShapeSourcePressEvent = Parameters<
  NonNullable<ComponentProps<typeof ShapeSource>['onPress']>
>[0];

const animalSightingCircleStyle = {
  circleColor: ['get', 'color'] as const,
  circleRadius: 11,
  circleStrokeColor: APP_COLORS.surface,
  circleStrokeWidth: 2.5,
} satisfies NonNullable<ComponentProps<typeof CircleLayer>['style']>;

const animalSightingLabelStyle = {
  textAllowOverlap: true,
  textAnchor: 'top' as const,
  textColor: APP_COLORS.text,
  textField: ['get', 'label'] as const,
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'] as const,
  textHaloColor: APP_COLORS.surface,
  textHaloWidth: 1.2,
  textIgnorePlacement: true,
  textOffset: [0, 1.25] as const,
  textSize: 12,
} satisfies NonNullable<ComponentProps<typeof SymbolLayer>['style']>;

function buildAnimalSightingShape(
  sightings: AnimalSightingMapItem[],
  currentTime?: number
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: sightings.map((sighting) => ({
      type: 'Feature',
      properties: {
        id: sighting._id,
        color: getAnimalSightingColor(sighting.animal),
        label:
          currentTime == null
            ? sighting.label ?? getAnimalSightingLabel(sighting.animal)
            : formatAnimalSightingMapLabel(sighting, currentTime),
      },
      geometry: {
        type: 'Point',
        coordinates: [sighting.longitude, sighting.latitude],
      },
    })),
  };
}

function getPressedSightingId(event: ShapeSourcePressEvent) {
  const id = event.features[0]?.properties?.id;
  return typeof id === 'string' ? id : null;
}

export function AnimalSightingLayers({
  currentTime,
  idPrefix,
  sightings,
  onPressSighting,
}: AnimalSightingLayersProps) {
  if (sightings.length === 0) {
    return null;
  }

  const sightingById = new Map(sightings.map((sighting) => [String(sighting._id), sighting]));
  const handlePress = onPressSighting
    ? (event: ShapeSourcePressEvent) => {
        const sightingId = getPressedSightingId(event);
        const sighting = sightingId ? sightingById.get(sightingId) : undefined;
        if (sighting) {
          onPressSighting(sighting);
        }
      }
    : undefined;

  return (
    <ShapeSource
      id={`${idPrefix}-animal-sightings`}
      shape={buildAnimalSightingShape(sightings, currentTime)}
      hitbox={{ width: 44, height: 44 }}
      onPress={handlePress}>
      <CircleLayer id={`${idPrefix}-animal-sighting-circle`} style={animalSightingCircleStyle} />
      <SymbolLayer
        id={`${idPrefix}-animal-sighting-label`}
        style={animalSightingLabelStyle}
      />
    </ShapeSource>
  );
}
