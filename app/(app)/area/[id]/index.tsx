import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { AreaActionsMenu } from '@/components/area/area-actions-menu';
import { DraggableAreaPointMarkers } from '@/components/DraggableAreaPointMarkers';
import { GlassFloatingButton, GlassTopNav } from '@/components/glass';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getAreaFeatureTargetKey } from '@/lib/area-features';
import { useAreaMarkerGestures } from '@/hooks/use-area-marker-gestures';
import { getCurrentUserCoordinate } from '@/lib/location';
import {
  getCachedMapStyle,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
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
  const { back } = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const [mapStyleURL, setMapStyleURL] = useState(() => getCachedMapStyle().styleURL);
  const area = useQuery(api.areas.get, { areaId: id as Id<'areas'> });
  const areaFeatures = useQuery(api.areaFeatures.listByArea, { areaId: id as Id<'areas'> });
  const {
    draggedPointOverrides,
    handleDropFeature,
    handleMapLongPress,
    handlePressFeature,
    handleStartDraggingFeature,
    resetMarkerGestureLocks,
  } = useAreaMarkerGestures(id as Id<'areas'>);

  useEffect(() => {
    return subscribeToMapStyleChanges((style) => {
      setMapStyleURL(style.styleURL);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      resetMarkerGestureLocks();

      void getSavedMapStyle().then((style) => {
        if (!cancelled) {
          setMapStyleURL((current) => (current === style.styleURL ? current : style.styleURL));
        }
      });

      return () => {
        cancelled = true;
      };
    }, [resetMarkerGestureLocks])
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
      paddingTop: Math.max(insets.top + 92, 112),
      paddingBottom: Math.max(insets.bottom + 96, 120),
      paddingLeft: 40,
      paddingRight: 40,
    };
  }, [area, insets.bottom, insets.top]);

  const visibleAreaFeatures = useMemo(() => {
    if (!areaFeatures) {
      return areaFeatures;
    }

    return areaFeatures.map((feature) => {
      const override = draggedPointOverrides[getAreaFeatureTargetKey(feature)];
      if (!override || feature.geometryType !== 'point') {
        return feature;
      }

      return {
        ...feature,
        point: override,
      };
    });
  }, [areaFeatures, draggedPointOverrides]);

  const renderAreaActionsMenu = useCallback(
    () => <AreaActionsMenu areaId={id as Id<'areas'>} />,
    [id]
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

        {visibleAreaFeatures && (
          <AreaFeatureLayers
            features={visibleAreaFeatures}
            idPrefix="area-view-features"
            interactive
            hidePointCircles
            onPressPolygonFeature={handlePressFeature}
          />
        )}

        {visibleAreaFeatures && (
          <DraggableAreaPointMarkers
            features={visibleAreaFeatures}
            idPrefix="area-view-point-markers"
            onPressPointFeature={handlePressFeature}
            onDragStartPointFeature={handleStartDraggingFeature}
            onDragEndPointFeature={(feature, point) => {
              void handleDropFeature(feature, point);
            }}
          />
        )}
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          className="absolute left-4 right-4"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <GlassTopNav
            appearance="floating"
            title={area.name}
            onBack={() => back()}
            renderRightAccessory={renderAreaActionsMenu}
          />
        </View>

        <View
          className="absolute left-4"
          style={{ bottom: Math.max(insets.bottom, 16) + 8 }}>
          <GlassFloatingButton
            icon="locate"
            onPress={handleGoToMyPosition}
            accessibilityLabel="Gå till min position"
            surfaceClassName="size-12"
            tone="dark"
          />
        </View>
      </View>
    </View>
  );
}
