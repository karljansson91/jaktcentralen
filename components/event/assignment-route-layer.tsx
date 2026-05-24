import { APP_COLORS } from '@/lib/theme';
import { LineLayer, ShapeSource } from '@rnmapbox/maps';
import type { AssignmentRoute } from '@/lib/hunt-navigation';

type AssignmentRouteLayerProps = {
  route: AssignmentRoute | null;
  shape: GeoJSON.Feature<GeoJSON.LineString> | null;
};

export function AssignmentRouteLayer({ route, shape }: AssignmentRouteLayerProps) {
  if (!shape) return null;

  return (
    <ShapeSource id="event-assignment-trail" shape={shape}>
      <LineLayer
        id="event-assignment-trail-outline"
        style={{
          lineColor: APP_COLORS.surface,
          lineWidth: 8,
          lineOpacity: 0.86,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
      <LineLayer
        id="event-assignment-trail-line"
        style={{
          lineColor: APP_COLORS.primary,
          lineWidth: 4,
          lineOpacity: 0.92,
          lineDasharray: route?.mode === 'direct' ? [0.2, 2.2] : undefined,
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />
    </ShapeSource>
  );
}
