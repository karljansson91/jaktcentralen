import { AreaViewSummary } from '@/components/area/area-view-summary';
import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { IconButton, Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  AreaFeatureDraft,
  AreaFeatureListItem,
  LatLngPoint,
  getDefaultColorForCategory,
} from '@/lib/area-features';
import {
  calculatePolygonHectares,
  formatHectares,
  formatInterestPointCount,
} from '@/lib/area-metrics';
import { saveAreaFeatureDraft } from '@/lib/area-feature-draft-store';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  DEFAULT_MAP_STYLE,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ViewAreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const blockLongPressUntilRef = useRef(0);
  const [mapStyleURL, setMapStyleURL] = useState(DEFAULT_MAP_STYLE.styleURL);
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const areaFeatures = useQuery(api.areaFeatures.listByArea, { areaId: id as Id<'areas'> });

  useEffect(() => {
    return subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void getSavedMapStyle().then((style) => {
        if (!cancelled) {
          setMapStyleURL(style.styleURL);
        }
      });

      return () => {
        cancelled = true;
      };
    }, [])
  );

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
      paddingTop: Math.max(insets.top + 150, 160),
      paddingBottom: Math.max(insets.bottom + 96, 120),
      paddingLeft: 40,
      paddingRight: 40,
    };
  }, [area, insets.bottom, insets.top]);

  const hectaresLabel = useMemo(() => {
    if (!area) return '0 ha';
    return formatHectares(calculatePolygonHectares(area.polygon));
  }, [area]);

  const interestPointLabel = useMemo(
    () => formatInterestPointCount(areaFeatures?.length ?? 0),
    [areaFeatures]
  );

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

  const openCreateMarkerAtPoint = useCallback(
    (point: LatLngPoint) => {
      openMarkerSheet('create', {
        mode: 'create',
        areaId: id as Id<'areas'>,
        category: 'tower',
        geometryType: 'point',
        name: '',
        description: '',
        color: getDefaultColorForCategory('tower'),
        point,
        images: [],
      });
    },
    [id, openMarkerSheet]
  );

  const handleMapLongPress = useCallback(
    (event: GeoJSON.Feature) => {
      if (Date.now() < blockLongPressUntilRef.current) {
        return;
      }

      const coordinates = (event.geometry as GeoJSON.Point).coordinates as [number, number];
      openCreateMarkerAtPoint({
        latitude: coordinates[1],
        longitude: coordinates[0],
      });
    },
    [openCreateMarkerAtPoint]
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

  const handleOpenAreaActions = useCallback(() => {
    router.push(`/area/${id}/actions`);
  }, [id, router]);

  if (area === undefined || areaFeatures === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
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
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        attributionEnabled={false}
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
              style={{ fillColor: APP_COLORS.mapAreaFill }}
            />
            <LineLayer
              id="area-line"
              style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 2 }}
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

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          className="absolute left-2 right-2"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <AreaViewSummary
            name={area.name}
            hectaresLabel={hectaresLabel}
            interestPointLabel={interestPointLabel}
            onBack={() => router.back()}
            onOpenActions={handleOpenAreaActions}
          />
        </View>

        <View
          className="absolute left-4"
          style={{ bottom: Math.max(insets.bottom, 16) + 8 }}>
          <IconButton
            variant="outline"
            size="lg"
            onPress={handleGoToMyPosition}
            accessibilityLabel="Gå till min position"
            className="bg-card"
            style={{ boxShadow: '0 7px 18px rgba(49, 52, 68, 0.16)' }}>
            <Ionicons name="locate" size={22} color={APP_COLORS.text} />
          </IconButton>
        </View>
      </View>
    </View>
  );
}
