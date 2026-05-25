import { createScentPlumeFeature } from '@/lib/scent-plume';
import { FillLayer, LineLayer, ShapeSource } from '@rnmapbox/maps';
import { useMemo } from 'react';

type ScentPlumeLayerProps = {
  directionDegrees: number;
  originCoordinate: [number, number];
};

const PLUME_BANDS = [
  {
    fillColor: 'rgba(75, 150, 96, 0.12)',
    id: 'outer',
    lengthMeters: 360,
    lineColor: 'rgba(75, 150, 96, 0.22)',
    spreadDegrees: 72,
  },
  {
    fillColor: 'rgba(75, 150, 96, 0.16)',
    id: 'middle',
    lengthMeters: 270,
    lineColor: 'rgba(75, 150, 96, 0)',
    spreadDegrees: 48,
  },
  {
    fillColor: 'rgba(75, 150, 96, 0.18)',
    id: 'inner',
    lengthMeters: 180,
    lineColor: 'rgba(75, 150, 96, 0)',
    spreadDegrees: 28,
  },
] as const;

export function ScentPlumeLayer({
  directionDegrees,
  originCoordinate,
}: ScentPlumeLayerProps) {
  const features = useMemo(
    () =>
      PLUME_BANDS.map((band) => ({
        ...band,
        feature: createScentPlumeFeature({
          directionDegrees,
          lengthMeters: band.lengthMeters,
          origin: originCoordinate,
          spreadDegrees: band.spreadDegrees,
        }),
      })),
    [directionDegrees, originCoordinate]
  );

  return (
    <>
      {features.map((band) => (
        <ShapeSource key={band.id} id={`scent-plume-${band.id}`} shape={band.feature}>
          <FillLayer
            id={`scent-plume-${band.id}-fill`}
            style={{
              fillColor: band.fillColor,
              fillAntialias: true,
            }}
          />
          <LineLayer
            id={`scent-plume-${band.id}-line`}
            style={{
              lineColor: band.lineColor,
              lineWidth: 1.2,
            }}
          />
        </ShapeSource>
      ))}
    </>
  );
}
