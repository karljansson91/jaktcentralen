import {
  FASTIGHETS_FILL_LAYER_ID,
  FASTIGHETS_LINE_LAYER_ID,
  FASTIGHETS_SOURCE_ID,
  FASTIGHETS_SOURCE_LAYER,
  FASTIGHETS_TILESET_URL,
} from '@/lib/fastighetsindelning';
import { FillLayer, LineLayer, VectorSource } from '@rnmapbox/maps';

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
