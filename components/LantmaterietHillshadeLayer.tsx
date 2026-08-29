import { RasterLayer, RasterSource } from '@rnmapbox/maps';
import type { ComponentProps } from 'react';

const DEFAULT_TILESET_URL = 'mapbox://karljansson91.jc-hs-brunskog-512-z13';
const TILESET_URL =
  process.env.EXPO_PUBLIC_LM_HILLSHADE_BRUNSKOG_TILESET_URL ?? DEFAULT_TILESET_URL;
const DEFAULT_OPACITY = 0.35;

type RasterLayerStyle = NonNullable<ComponentProps<typeof RasterLayer>['style']>;

type LantmaterietHillshadeLayerProps = {
  belowLayerID?: string;
  idPrefix?: string;
  opacity?: number;
  visible?: boolean;
};

export function LantmaterietHillshadeLayer({
  belowLayerID,
  idPrefix = 'lm-hillshade-brunskog',
  opacity = DEFAULT_OPACITY,
  visible = true,
}: LantmaterietHillshadeLayerProps) {
  if (!visible || !TILESET_URL) {
    return null;
  }

  return (
    <RasterSource
      id={`${idPrefix}-source`}
      url={TILESET_URL}
      minZoomLevel={8}
      maxZoomLevel={13}
      tileSize={512}
      attribution="© Lantmäteriet"
    >
      <RasterLayer
        id={`${idPrefix}-layer`}
        belowLayerID={belowLayerID}
        sourceID={`${idPrefix}-source`}
        style={
          {
            rasterFadeDuration: 0,
            rasterOpacity: opacity,
          } satisfies RasterLayerStyle
        }
      />
    </RasterSource>
  );
}
