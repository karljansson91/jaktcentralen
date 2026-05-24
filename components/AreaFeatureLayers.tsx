import {
  AreaFeatureListItem,
  areaFeaturePointToLngLat,
  getAreaFeatureTargetKey,
  polygonCentroid,
} from "@/lib/area-features";
import {
  CircleLayer,
  FillLayer,
  LineLayer,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import type { ComponentProps } from "react";

type AreaFeatureLayersProps = {
  features: AreaFeatureListItem[];
  onPressPointFeature?: (feature: AreaFeatureListItem) => void;
  onPressPolygonFeature?: (feature: AreaFeatureListItem) => void;
  interactive?: boolean;
  hidePointCircles?: boolean;
  idPrefix?: string;
};

type ShapeSourcePressEvent = Parameters<
  NonNullable<ComponentProps<typeof ShapeSource>["onPress"]>
>[0];

type AreaFeatureProperties = {
  id?: string | number;
  kind?: string;
  source?: string;
};

function readAreaFeatureProperties(feature?: GeoJSON.Feature): AreaFeatureProperties | null {
  const properties = feature?.properties;
  if (!properties) {
    return null;
  }

  const id = properties.id;
  const kind = properties.kind;
  const source = properties.source;

  return {
    id: typeof id === "string" || typeof id === "number" ? id : undefined,
    kind: typeof kind === "string" ? kind : undefined,
    source: typeof source === "string" ? source : undefined,
  };
}

function buildPointFeatureCollection(features: AreaFeatureListItem[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features
      .filter(
        (feature): feature is AreaFeatureListItem & { point: NonNullable<AreaFeatureListItem["point"]> } =>
          feature.geometryType === "point" && Boolean(feature.point)
      )
      .map((feature) => ({
        type: "Feature",
        properties: {
          id: feature.id,
          source: feature.source,
          name: feature.name,
          color: feature.color,
        },
        geometry: {
          type: "Point",
          coordinates: areaFeaturePointToLngLat(feature.point),
        },
      })),
  };
}

function buildPolygonFeatureCollection(features: AreaFeatureListItem[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: features.flatMap((feature) => {
        if (feature.geometryType !== "polygon" || !feature.polygon) {
          return [];
        }

        const outlineCoordinates = feature.polygon.map(areaFeaturePointToLngLat);
        return [
          {
            type: "Feature" as const,
            properties: {
              id: feature.id,
              source: feature.source,
              name: feature.name,
              color: feature.color,
              kind: "polygon",
            },
            geometry: {
              type: "Polygon" as const,
              coordinates: [[...outlineCoordinates, outlineCoordinates[0]]],
            },
          },
          {
            type: "Feature" as const,
            properties: {
              id: feature.id,
              source: feature.source,
              name: feature.name,
              color: feature.color,
              kind: "label",
            },
            geometry: {
              type: "Point" as const,
              coordinates: polygonCentroid(feature.polygon),
            },
          },
        ];
      }),
  };
}

export function AreaFeatureLayers({
  features,
  onPressPointFeature,
  onPressPolygonFeature,
  interactive = false,
  hidePointCircles = false,
  idPrefix = "area-features",
}: AreaFeatureLayersProps) {
  const pointFeatures = buildPointFeatureCollection(features);
  const polygonFeatures = buildPolygonFeatureCollection(features);
  const featureLookup = new Map(
    features.map((feature) => [getAreaFeatureTargetKey(feature), feature])
  );

  const handlePointPress = (event: ShapeSourcePressEvent) => {
    if (!interactive || !onPressPointFeature) {
      return;
    }

    const pressed = readAreaFeatureProperties(event.features[0]);
    const key = `${pressed?.source}:${String(pressed?.id)}`;
    const feature = featureLookup.get(key);
    if (feature) {
      onPressPointFeature(feature);
    }
  };

  const handlePolygonPress = (event: ShapeSourcePressEvent) => {
    if (!interactive || !onPressPolygonFeature) {
      return;
    }

    const pressed = readAreaFeatureProperties(
      event.features.find(
        (feature) => readAreaFeatureProperties(feature)?.kind === "polygon"
      )
    );
    const key = `${pressed?.source}:${String(pressed?.id)}`;
    const feature = featureLookup.get(key);
    if (feature) {
      onPressPolygonFeature(feature);
    }
  };

  return (
    <>
      {polygonFeatures.features.length > 0 && (
        <ShapeSource
          id={`${idPrefix}-polygons`}
          shape={polygonFeatures}
          onPress={interactive ? handlePolygonPress : undefined}
        >
          <FillLayer
            id={`${idPrefix}-polygon-fill`}
            style={{
              fillColor: ["get", "color"],
              fillOpacity: 0.18,
            }}
            filter={["==", ["get", "kind"], "polygon"]}
          />
          <LineLayer
            id={`${idPrefix}-polygon-line`}
            style={{
              lineColor: ["get", "color"],
              lineWidth: 2,
            }}
            filter={["==", ["get", "kind"], "polygon"]}
          />
          <SymbolLayer
            id={`${idPrefix}-polygon-label`}
            style={{
              textField: ["get", "name"],
              textSize: 11,
              textColor: "#374151",
              textHaloColor: "#ffffff",
              textHaloWidth: 1,
            }}
            filter={["==", ["get", "kind"], "label"]}
          />
        </ShapeSource>
      )}

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
              circleRadius: 7,
              circleColor: ["get", "color"],
              circleOpacity: hidePointCircles ? 0 : 1,
              circleStrokeColor: "#ffffff",
              circleStrokeOpacity: hidePointCircles ? 0 : 1,
              circleStrokeWidth: 2,
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
            }}
          />
        </ShapeSource>
      )}
    </>
  );
}
