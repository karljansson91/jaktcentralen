import { AreaFeatureLayers } from '@/components/AreaFeatureLayers';
import { GlassSurface, GlassTopNav } from '@/components/glass';
import { Text } from '@/components/ui';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { getMemberInitials } from '@/lib/event-formatting';
import {
  DEFAULT_MAP_STYLE,
  getSavedMapStyle,
  subscribeToMapStyleChanges,
} from '@/lib/map-styles';
import { APP_COLORS } from '@/lib/theme';
import { Slider } from '@expo/ui/community/slider';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
} from '@rnmapbox/maps';
import { useQuery } from 'convex/react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { type ElementRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const REPLAY_COLORS = ['#398048', '#D7832F', '#3D6FB6', '#8B5A9F', '#A33D3D', '#5B7C2A'];

type ReplayPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  user?: { name?: string | null } | null;
  userId: string;
};

type ReplayGroup = {
  color: string;
  initials: string;
  name: string;
  points: ReplayPoint[];
  userId: string;
};

function formatReplayTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString('sv-SE', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  });
}

function buildLineShape(points: ReplayPoint[]) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: points.map((point) => [point.longitude, point.latitude] as [number, number]),
    },
  };
}

function buildPointShape(group: ReplayGroup, point: ReplayPoint) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        properties: {
          initials: group.initials,
          name: group.name,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [point.longitude, point.latitude] as [number, number],
        },
      },
    ],
  };
}

export default function EventTimelineScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<ElementRef<typeof Camera>>(null);
  const [mapStyleURL, setMapStyleURL] = useState(DEFAULT_MAP_STYLE.styleURL);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);

  const event = useQuery(api.events.get, {
    eventId: eventId as Id<'events'>,
  });
  const area = useQuery(
    api.areas.getForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const areaFeatures = useQuery(
    api.areaFeatures.listForEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );
  const replay = useQuery(
    api.positionTrails.listReplayByEvent,
    event ? { eventId: eventId as Id<'events'> } : 'skip'
  );

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
    const coords = area.polygon.map((point) => [point.longitude, point.latitude] as [number, number]);
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
    const lngs = area.polygon.map((point) => point.longitude);
    const lats = area.polygon.map((point) => point.latitude);

    return {
      ne: [Math.max(...lngs), Math.max(...lats)] as [number, number],
      sw: [Math.min(...lngs), Math.min(...lats)] as [number, number],
      paddingTop: Math.max(insets.top + 92, 112),
      paddingBottom: Math.max(insets.bottom + 230, 250),
      paddingLeft: 42,
      paddingRight: 42,
    };
  }, [area, insets.bottom, insets.top]);

  const timeline = useMemo(() => {
    if (!replay) return null;

    const sorted = [...replay].sort((a, b) => a.timestamp - b.timestamp);
    const groups = new Map<string, ReplayGroup>();

    for (const point of sorted) {
      const userId = point.userId.toString();
      const name = point.user?.name?.trim() || 'Okänd jägare';
      let group = groups.get(userId);

      if (!group) {
        group = {
          color: REPLAY_COLORS[groups.size % REPLAY_COLORS.length],
          initials: getMemberInitials(name),
          name,
          points: [],
          userId,
        };
        groups.set(userId, group);
      }

      group.points.push(point);
    }

    return {
      groups: Array.from(groups.values()),
      maxTimestamp: sorted[sorted.length - 1]?.timestamp ?? null,
      minTimestamp: sorted[0]?.timestamp ?? null,
      pointCount: sorted.length,
    };
  }, [replay]);

  const selectedReplayTimestamp =
    timeline?.maxTimestamp == null || timeline.minTimestamp == null
      ? null
      : selectedTimestamp == null
        ? timeline.maxTimestamp
        : Math.min(Math.max(selectedTimestamp, timeline.minTimestamp), timeline.maxTimestamp);

  const visibleGroups = useMemo(() => {
    if (!timeline || selectedReplayTimestamp == null) return [];

    return timeline.groups
      .map((group) => {
        const visiblePoints = group.points.filter(
          (point) => point.timestamp <= selectedReplayTimestamp
        );
        return {
          ...group,
          currentPoint: visiblePoints[visiblePoints.length - 1] ?? null,
          visiblePoints,
        };
      })
      .filter((group) => group.currentPoint !== null);
  }, [selectedReplayTimestamp, timeline]);

  if (event === undefined || area === undefined || areaFeatures === undefined || replay === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    );
  }

  if (event === null || area === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3">Tidslinjen hittades inte</Text>
      </View>
    );
  }

  if (event.endedAt === undefined) {
    return (
      <View className="flex-1 bg-background">
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4 z-10"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <GlassTopNav appearance="screen" title="Jakt tidslinje" onBack={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-base text-muted-foreground">
            Tidslinjen visas när jakten är avslutad.
          </Text>
        </View>
      </View>
    );
  }

  const hasReplay = timeline !== null && timeline.pointCount > 0;
  const minTimestamp = timeline?.minTimestamp ?? 0;
  const maxTimestamp = timeline?.maxTimestamp ?? minTimestamp;
  const canScrub = hasReplay && maxTimestamp > minTimestamp;
  const sliderMax = canScrub ? maxTimestamp : minTimestamp + 1;
  const sliderValue = selectedReplayTimestamp ?? maxTimestamp;

  return (
    <View style={{ flex: 1, backgroundColor: APP_COLORS.background }}>
      <MapView
        style={{ flex: 1 }}
        styleURL={mapStyleURL}
        scrollEnabled
        zoomEnabled
        rotateEnabled={false}
        pitchEnabled={false}
        attributionEnabled={false}>
        {cameraBounds && <Camera ref={cameraRef} bounds={cameraBounds} animationDuration={0} />}

        {polygonGeoJSON && (
          <ShapeSource id="timeline-area-polygon" shape={polygonGeoJSON}>
            <FillLayer id="timeline-area-fill" style={{ fillColor: APP_COLORS.mapAreaFill }} />
            <LineLayer
              id="timeline-area-line"
              style={{ lineColor: APP_COLORS.mapAreaLine, lineWidth: 2.5 }}
            />
          </ShapeSource>
        )}

        {areaFeatures && (
          <AreaFeatureLayers features={areaFeatures} idPrefix="timeline-area-features" />
        )}

        {visibleGroups.map((group, index) =>
          group.visiblePoints.length >= 2 ? (
            <ShapeSource
              key={`trail-${group.userId}`}
              id={`timeline-trail-${index}`}
              shape={buildLineShape(group.visiblePoints)}>
              <LineLayer
                id={`timeline-trail-line-${index}`}
                style={{
                  lineCap: 'round',
                  lineColor: group.color,
                  lineJoin: 'round',
                  lineOpacity: 0.82,
                  lineWidth: 4,
                }}
              />
            </ShapeSource>
          ) : null
        )}

        {visibleGroups.map((group, index) =>
          group.currentPoint ? (
            <ShapeSource
              key={`member-${group.userId}`}
              id={`timeline-member-${index}`}
              shape={buildPointShape(group, group.currentPoint)}>
              <CircleLayer
                id={`timeline-member-circle-${index}`}
                style={{
                  circleColor: group.color,
                  circleRadius: 21,
                  circleStrokeColor: APP_COLORS.surface,
                  circleStrokeWidth: 2.5,
                }}
              />
              <SymbolLayer
                id={`timeline-member-initials-${index}`}
                style={{
                  textAllowOverlap: true,
                  textAnchor: 'center',
                  textColor: APP_COLORS.surface,
                  textField: ['get', 'initials'],
                  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
                  textIgnorePlacement: true,
                  textSize: 16,
                }}
              />
            </ShapeSource>
          ) : null
        )}
      </MapView>

      <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 top-0">
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4"
          style={{ top: Math.max(insets.top, 8) + 8 }}>
          <GlassTopNav
            appearance="floating"
            title={event.title}
            titleBackground
            onBack={() => router.back()}
            rightIcon="time-outline"
          />
        </View>

        <View
          className="absolute left-4 right-4"
          style={{ bottom: Math.max(insets.bottom, 12) + 12 }}>
          <GlassSurface
            className="rounded-[28px]"
            contentClassName="gap-4 px-5 py-4"
            fallbackIntensity={86}>
            <View className="flex-row items-start justify-between gap-4">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-xs font-semibold uppercase tracking-[1.2px] text-muted-foreground">
                  Jakt tidslinje
                </Text>
                <Text className="text-xl font-semibold text-foreground">
                  {hasReplay && selectedReplayTimestamp
                    ? formatReplayTimestamp(selectedReplayTimestamp)
                    : 'Inga spår'}
                </Text>
              </View>
              <View className="rounded-full bg-primary/10 px-3 py-1.5">
                <Text className="text-xs font-semibold text-primary">
                  {visibleGroups.length} jägare
                </Text>
              </View>
            </View>

            {hasReplay ? (
              <Slider
                value={sliderValue}
                minimumValue={minTimestamp}
                maximumValue={sliderMax}
                disabled={!canScrub}
                minimumTrackTintColor={APP_COLORS.primary}
                maximumTrackTintColor="#D8CEC0"
                thumbTintColor={APP_COLORS.primary}
                onValueChange={setSelectedTimestamp}
                style={{ height: 36 }}
              />
            ) : (
              <Text className="text-sm leading-5 text-muted-foreground">
                Det finns inga sparade positioner för den här jakten ännu.
              </Text>
            )}

            {visibleGroups.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {visibleGroups.map((group) => (
                  <View
                    key={group.userId}
                    className="flex-row items-center gap-2 rounded-full bg-background/75 px-3 py-2">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                      {group.name}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </GlassSurface>
        </View>
      </View>
    </View>
  );
}
