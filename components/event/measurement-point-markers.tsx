import { Text } from '@/components/ui';
import type { HuntMapMeasurementPoint } from '@/lib/hunt-measurement';
import { APP_COLORS } from '@/lib/theme';
import { MarkerView, PointAnnotation } from '@rnmapbox/maps';
import { useState } from 'react';
import { StyleSheet, Vibration, View } from 'react-native';

type MeasurementPointMarkersProps = {
  onDragPoint: (pointId: string, coordinate: [number, number]) => void;
  points: HuntMapMeasurementPoint[];
};

type DraggingPoint = {
  coordinate: [number, number];
  label: string;
};

function getPayloadCoordinate(payload: GeoJSON.Feature<GeoJSON.Point>): [number, number] {
  const [longitude, latitude] = payload.geometry.coordinates;
  return [longitude, latitude];
}

function getPointLabel(index: number) {
  if (index < 26) {
    return String.fromCharCode(65 + index);
  }

  return String(index + 1);
}

export function MeasurementPointMarkers({ onDragPoint, points }: MeasurementPointMarkersProps) {
  const [draggingPoint, setDraggingPoint] = useState<DraggingPoint | null>(null);

  return (
    <>
      {points.map((point, index) => {
        const label = getPointLabel(index);

        return (
          <PointAnnotation
            key={point.id}
            id={point.id}
            coordinate={point.coordinate}
            draggable
            anchor={{ x: 0.5, y: 0.5 }}
            onDragStart={(payload) => {
              Vibration.vibrate(8);
              setDraggingPoint({ coordinate: getPayloadCoordinate(payload), label });
            }}
            onDrag={(payload) => {
              setDraggingPoint({ coordinate: getPayloadCoordinate(payload), label });
            }}
            onDragEnd={(payload) => {
              setDraggingPoint(null);
              onDragPoint(point.id, getPayloadCoordinate(payload));
            }}>
            <View style={styles.touchTarget}>
              <View style={styles.point}>
                <Text style={styles.pointLabel}>{label}</Text>
              </View>
            </View>
          </PointAnnotation>
        );
      })}

      {draggingPoint ? (
        <MarkerView
          coordinate={draggingPoint.coordinate}
          anchor={{ x: 0.5, y: 0.66 }}
          allowOverlap
          allowOverlapWithPuck
          isSelected>
          <View pointerEvents="none" style={styles.draggingContainer}>
            <View style={styles.draggingHalo} />
            <View style={styles.draggingPoint}>
              <Text style={styles.draggingPointLabel}>{draggingPoint.label}</Text>
            </View>
          </View>
        </MarkerView>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  draggingContainer: {
    alignItems: 'center',
    height: 68,
    justifyContent: 'center',
    transform: [{ translateY: -12 }],
    width: 68,
  },
  draggingHalo: {
    backgroundColor: 'rgba(57, 128, 72, 0.18)',
    borderColor: APP_COLORS.surface,
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: '0 10px 24px rgba(49, 52, 68, 0.3)',
    height: 62,
    position: 'absolute',
    width: 62,
  },
  draggingPoint: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.surface,
    borderRadius: 18,
    borderWidth: 4,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  draggingPointLabel: {
    color: APP_COLORS.surface,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  point: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.surface,
    borderRadius: 15,
    borderWidth: 3,
    boxShadow: '0 6px 14px rgba(49, 52, 68, 0.24)',
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pointLabel: {
    color: APP_COLORS.surface,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  touchTarget: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderRadius: 999,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },
});
