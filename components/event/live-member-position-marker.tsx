import { Text } from '@/components/ui';
import { APP_COLORS } from '@/lib/theme';
import { MarkerView } from '@rnmapbox/maps';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export type LiveMemberPositionMarkerItem = {
  coordinates: [number, number];
  id: string;
  imageUrl?: string | null;
  initials: string;
  name: string;
  offline?: boolean;
};

type LiveMemberPositionMarkerProps = {
  marker: LiveMemberPositionMarkerItem;
};

export function LiveMemberPositionMarker({ marker }: LiveMemberPositionMarkerProps) {
  return (
    <MarkerView
      key={marker.id}
      coordinate={marker.coordinates}
      anchor={{ x: 0.5, y: 0.5 }}
      allowOverlap
      allowOverlapWithPuck>
      <View
        accessibilityLabel={
          marker.offline
            ? `Senaste position för ${marker.name}`
            : `Position för ${marker.name}`
        }
        accessible
        style={[styles.liveMarker, marker.offline ? styles.liveMarkerOffline : null]}>
        {marker.imageUrl ? (
          <Image source={{ uri: marker.imageUrl }} style={styles.liveMarkerImage} />
        ) : (
          <Text style={styles.liveMarkerText}>{marker.initials}</Text>
        )}
        {marker.offline ? <View style={styles.offlineBadge} /> : null}
      </View>
    </MarkerView>
  );
}

const styles = StyleSheet.create({
  liveMarker: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.surface,
    borderRadius: 17,
    borderWidth: 2,
    boxShadow: '0 4px 12px rgba(49, 52, 68, 0.24)',
    height: 34,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 34,
  },
  liveMarkerOffline: {
    backgroundColor: APP_COLORS.textMuted,
    opacity: 0.86,
  },
  liveMarkerImage: {
    height: 30,
    width: 30,
  },
  liveMarkerText: {
    color: APP_COLORS.surface,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 14,
    textAlign: 'center',
  },
  offlineBadge: {
    backgroundColor: APP_COLORS.textMuted,
    borderColor: APP_COLORS.surface,
    borderRadius: 5,
    borderWidth: 2,
    bottom: 0,
    height: 10,
    position: 'absolute',
    right: 0,
    width: 10,
  },
});
