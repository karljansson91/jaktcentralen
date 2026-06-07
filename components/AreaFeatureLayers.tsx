import {
  AreaFeatureListItem,
  areaFeaturePointToLngLat,
  getAreaFeatureTargetKey,
} from "@/lib/area-features";
import {
  CircleLayer,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import type { ComponentProps } from "react";

type AreaFeatureLayersProps = {
  features: AreaFeatureListItem[];
  onPressPointFeature?: (feature: AreaFeatureListItem) => void;
  interactive?: boolean;
  hidePointCircles?: boolean;
  idPrefix?: string;
  pointStates?: Record<string, "active" | "muted">;
};

type ShapeSourcePressEvent = Parameters<
  NonNullable<ComponentProps<typeof ShapeSource>["onPress"]>
>[0];

type AreaFeatureProperties = {
  id?: string | number;
};

function readAreaFeatureProperties(feature?: GeoJSON.Feature): AreaFeatureProperties | null {
  const properties = feature?.properties;
  if (!properties) {
    return null;
  }

  const id = properties.id;

  return {
    id: typeof id === "string" || typeof id === "number" ? id : undefined,
  };
}

function buildPointFeatureCollection(
  features: AreaFeatureListItem[],
  pointStates: Record<string, "active" | "muted">
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features
      .map((feature) => ({
        type: "Feature",
        properties: {
          id: feature.id,
          name: feature.name,
          color: feature.color,
          state: pointStates[getAreaFeatureTargetKey(feature)] ?? "normal",
        },
        geometry: {
          type: "Point",
          coordinates: areaFeaturePointToLngLat(feature.point),
        },
      })),
  };
}

export function AreaFeatureLayers({
  features,
  onPressPointFeature,
  interactive = false,
  hidePointCircles = false,
  idPrefix = "area-features",
  pointStates = {},
}: AreaFeatureLayersProps) {
  const pointFeatures = buildPointFeatureCollection(features, pointStates);
  const featureLookup = new Map(
    features.map((feature) => [getAreaFeatureTargetKey(feature), feature])
  );

  const handlePointPress = (event: ShapeSourcePressEvent) => {
    if (!interactive || !onPressPointFeature) {
      return;
    }

    const pressed = readAreaFeatureProperties(event.features[0]);
    const key = String(pressed?.id);
    const feature = featureLookup.get(key);
    if (feature) {
      onPressPointFeature(feature);
    }
  };

  return (
    <>
      {pointFeatures.features.length > 0 && (
        <ShapeSource
          id={`${idPrefix}-points`}
          shape={pointFeatures}
          hitbox={{ width: 28, height: 28 }}
          onPress={interactive ? handlePointPress : undefined}
        >
          <CircleLayer
            id={`${idPrefix}-point-circle`}
            style={{
              circleRadius: [
                "match",
                ["get", "state"],
                "active",
                9,
                "muted",
                6,
                7,
              ],
              circleColor: ["get", "color"],
              circleOpacity: hidePointCircles
                ? 0
                : ["match", ["get", "state"], "muted", 0.42, 1],
              circleStrokeColor: "#ffffff",
              circleStrokeOpacity: hidePointCircles ? 0 : 1,
              circleStrokeWidth: ["match", ["get", "state"], "active", 3, 2],
            }}
          />
          <SymbolLayer
            id={`${idPrefix}-point-label`}
            style={{
              textField: ["get", "name"],
              textSize: 11,
              textOffset: [0, 1.5],
              textAnchor: "top",
              textColor: "#374151",
              textHaloColor: "#ffffff",
              textHaloWidth: 1,
              textMaxWidth: 24,
            }}
          />
        </ShapeSource>
      )}
    </>
  );
}
