import {
  FASTIGHETS_FILL_LAYER_ID,
  FASTIGHETS_LINE_LAYER_ID,
  FASTIGHETS_SOURCE_ID,
  FASTIGHETS_SOURCE_LAYER,
  FASTIGHETS_TILESET_URL,
  buildFastighetGeoJSON,
  type FastighetGeometry,
} from '@/lib/fastighetsindelning';
import { FillLayer, LineLayer, ShapeSource, VectorSource } from '@rnmapbox/maps';

interface FastighetsindelningLayerProps {
  visible: boolean;
}

export function FastighetsindelningLayer({ visible }: FastighetsindelningLayerProps) {
  if (!visible || !FASTIGHETS_TILESET_URL || !FASTIGHETS_SOURCE_LAYER) {
    return null;
  }

  return (
    <VectorSource id={FASTIGHETS_SOURCE_ID} url={FASTIGHETS_TILESET_URL}>
      <FillLayer
        id={FASTIGHETS_FILL_LAYER_ID}
        sourceLayerID={FASTIGHETS_SOURCE_LAYER}
        style={{
          fillColor: 'rgba(37, 99, 235, 0.12)',
          fillOpacity: 1,
        }}
      />
      <LineLayer
        id={FASTIGHETS_LINE_LAYER_ID}
        sourceLayerID={FASTIGHETS_SOURCE_LAYER}
        style={{
          lineColor: 'rgba(29, 78, 216, 0.74)',
          lineWidth: 1.1,
          lineOpacity: 1,
        }}
      />
    </VectorSource>
  );
}

interface SelectedFastighetLayerProps {
  geometry: FastighetGeometry | null;
  idPrefix: string;
}

export function SelectedFastighetLayer({ geometry, idPrefix }: SelectedFastighetLayerProps) {
  if (!geometry) {
    return null;
  }

  return (
    <ShapeSource id={`${idPrefix}-source`} shape={buildFastighetGeoJSON(geometry)}>
      <FillLayer
        id={`${idPrefix}-fill`}
        style={{ fillColor: 'rgba(245, 158, 11, 0.18)' }}
        filter={['==', '$type', 'Polygon']}
      />
      <LineLayer
        id={`${idPrefix}-line`}
        style={{ lineColor: 'rgba(217, 119, 6, 0.72)', lineWidth: 1.6 }}
      />
    </ShapeSource>
  );
}
