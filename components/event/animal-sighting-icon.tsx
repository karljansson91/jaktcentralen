import {
  getAnimalSightingIconName,
  type AnimalSightingIconName
} from '@/lib/animal-sightings';
import { Image as MapboxImage, Images } from '@rnmapbox/maps';
import { useRef } from 'react';
import { Image, type ImageSourcePropType } from 'react-native';

const ANIMAL_SIGHTING_IMAGE_SOURCES: Record<
  AnimalSightingIconName,
  ImageSourcePropType
> = {
  'animal-boar': require('@/assets/icons/animal-sightings/boar.png'),
  'animal-deer': require('@/assets/icons/animal-sightings/deer.png'),
  'animal-elk': require('@/assets/icons/animal-sightings/elk.png'),
  'animal-fox': require('@/assets/icons/animal-sightings/fox.png'),
  'animal-paw': require('@/assets/icons/animal-sightings/paw.png')
};

type MapboxImageRef = { refresh: () => void };

function AnimalSightingMapImage({ name }: { name: AnimalSightingIconName }) {
  const imageRef = useRef<MapboxImageRef>(null);

  return (
    <MapboxImage ref={imageRef} name={name} sdf>
      <Image
        accessible={false}
        source={ANIMAL_SIGHTING_IMAGE_SOURCES[name]}
        style={{ height: 128, width: 128 }}
        onLoad={() => imageRef.current?.refresh()}
      />
    </MapboxImage>
  );
}

export function AnimalSightingMapImages() {
  return (
    <Images>
      {(
        Object.keys(ANIMAL_SIGHTING_IMAGE_SOURCES) as AnimalSightingIconName[]
      ).map((name) => (
        <AnimalSightingMapImage key={name} name={name} />
      ))}
    </Images>
  );
}

type AnimalSightingIconProps = {
  animal: string;
  color: string;
  size: number;
};

export function AnimalSightingIcon({
  animal,
  color,
  size
}: AnimalSightingIconProps) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      accessible={false}
      source={ANIMAL_SIGHTING_IMAGE_SOURCES[getAnimalSightingIconName(animal)]}
      style={{ height: size, tintColor: color, width: size }}
    />
  );
}
