import { IconButton, Text } from '@/components/ui';
import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AreaFeatureDraft,
  AreaFeatureListItem,
  getDefaultColorForCategory,
} from '@/lib/area-features';
import { saveAreaFeatureDraft } from '@/lib/area-feature-draft-store';
import { getCurrentUserCoordinate } from '@/lib/location';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

export default function ViewAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const blockLongPressUntilRef = useRef(0);
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const areaFeatures = useQuery(api.areaFeatures.listByArea, { areaId: id as Id<'areas'> });

  const polygonGeoJSON = useMemo(() => {
    if (!area) return null;
    const coords = area.polygon.map((p) => [p.longitude, p.latitude] as [number, number]);
    return {
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [[...coords, coords[0]]],
      },
    };
  }, [area]);

  const cameraBounds = useMemo(() => {
    if (!area || area.polygon.length < 2) return null;
    const lngs = area.polygon.map((p) => p.longitude);
    const lats = area.polygon.map((p) => p.latitude);
    return {
      ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
      sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
      paddingTop: 100,
      paddingBottom: 100,
      paddingLeft: 40,
      paddingRight: 40,
    };
  }, [area]);

  const handleGoToMyPosition = useCallback(async () => {
    try {
      const coordinate = await getCurrentUserCoordinate();
      if (!coordinate) {
        Alert.alert('Plats saknas', 'Ge appen platsbehörighet för att centrera kartan.');
        return;
      }

      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: 15,
        animationDuration: 1200,
        animationMode: 'flyTo',
      });
    } catch (error) {
      console.error('Failed to center on user position:', error);
      Alert.alert('Kunde inte hitta position', 'Försök igen om en stund.');
    }
  }, []);

  const openMarkerSheet = useCallback(
    (mode: 'create' | 'actions', draft: AreaFeatureDraft) => {
      const draftId = saveAreaFeatureDraft(draft);
      router.push(`/area/${id}/marker-sheet?mode=${mode}&draftId=${draftId}`);
    },
    [id, router]
  );

  const handleMapLongPress = useCallback(
    (event: GeoJSON.Feature) => {
      if (Date.now() < blockLongPressUntilRef.current) {
        return;
      }

      const coordinates = (event.geometry as GeoJSON.Point).coordinates as [number, number];
      openMarkerSheet('create', {
        mode: 'create',
        areaId: id as Id<'areas'>,
        category: 'tower',
        geometryType: 'point',
        name: '',
        description: '',
        color: getDefaultColorForCategory('tower'),
        point: {
          latitude: coordinates[1],
          longitude: coordinates[0],
        },
        images: [],
      });
    },
    [id, openMarkerSheet]
  );

  const handlePressFeature = useCallback(
    (feature: AreaFeatureListItem) => {
      blockLongPressUntilRef.current = Date.now() + 500;
      openMarkerSheet('actions', {
        mode: feature.source === 'feature' ? 'edit' : 'legacy',
        areaId: id as Id<'areas'>,
        featureId: feature.source === 'feature' ? (feature.id as Id<'areaFeatures'>) : undefined,
        legacyPointId:
          feature.source === 'legacy' ? (feature.id as Id<'areaPoints'>) : undefined,
        category: feature.category,
        geometryType: feature.geometryType,
        name: feature.name,
        description: feature.description ?? '',
        color: feature.color,
        point: feature.point,
        polygon: feature.polygon,
        images: feature.images,
      });
    },
    [id, openMarkerSheet]
  );

  if (area === undefined || areaFeatures === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color="#2c4b31" />
      </View>
    );
  }

  if (area === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3">Området hittades inte</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/outdoors-v12"
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        onLongPress={handleMapLongPress}
      >
        {cameraBounds && (
          <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />
        )}
        <LocationPuck puckBearingEnabled puckBearing="heading" />

        {polygonGeoJSON && (
          <ShapeSource id="area-polygon" shape={polygonGeoJSON}>
            <FillLayer
              id="area-fill"
              style={{ fillColor: 'rgba(34, 197, 94, 0.2)' }}
            />
            <LineLayer
              id="area-line"
              style={{ lineColor: 'rgb(34, 197, 94)', lineWidth: 2 }}
            />
          </ShapeSource>
        )}

        {areaFeatures && (
          <AreaFeatureLayers
            features={areaFeatures}
            idPrefix="area-view-features"
            interactive
            onPressPointFeature={handlePressFeature}
            onPressPolygonFeature={handlePressFeature}
          />
        )}
      </MapView>

      {/* My position button */}
      <View className="absolute bottom-24 left-4">
        <IconButton
          variant="outline"
          onPress={handleGoToMyPosition}
          accessibilityLabel="Gå till min position"
          className="bg-background/90 shadow">
          <Ionicons name="locate" size={22} color="#374151" />
        </IconButton>
      </View>

      {/* Back button */}
      <View className="absolute bottom-10 left-4">
        <IconButton
          variant="outline"
          onPress={() => router.back()}
          className="bg-background/90 shadow">
          <Ionicons name="arrow-back" size={22} color="#374151" />
        </IconButton>
      </View>

      {/* Settings button */}
      <View className="absolute right-4 top-16">
        <IconButton
          variant="outline"
          onPress={() => router.push(`/area/${id}/edit`)}
          className="bg-background/90 shadow">
          <Ionicons name="settings-outline" size={22} color="#374151" />
        </IconButton>
      </View>

      {/* Area name + events button */}
      <View className="absolute bottom-10 right-4 flex-row items-center gap-3">
        <View className="rounded-lg bg-background/90 px-3 py-2 shadow">
          <Text className="text-lg font-semibold">{area.name}</Text>
        </View>
        <IconButton
          onPress={() => router.push(`/area/${id}/events`)}
          size="lg"
          className="bg-primary shadow-lg">
          <Ionicons name="list" size={24} color="white" />
        </IconButton>
      </View>
    </View>
  );
}
