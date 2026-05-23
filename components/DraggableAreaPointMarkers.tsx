import {
  AreaFeatureListItem,
  LatLngPoint,
  areaFeaturePointToLngLat,
  getAreaFeatureTargetKey,
} from "@/lib/area-features";
import { MarkerView, PointAnnotation } from "@rnmapbox/maps";
import { useState } from "react";
import { View } from "react-native";

type PointFeature = AreaFeatureListItem & {
  point: NonNullable<AreaFeatureListItem["point"]>;
};

type DraggingPoint = {
  color: string;
  coordinate: [number, number];
};

type DraggableAreaPointMarkersProps = {
  features: AreaFeatureListItem[];
  onPressPointFeature?: (feature: AreaFeatureListItem) => void;
  onDragStartPointFeature?: (feature: AreaFeatureListItem) => void;
  onDragEndPointFeature?: (feature: AreaFeatureListItem, point: LatLngPoint) => void;
  idPrefix?: string;
};

function getPayloadCoordinate(payload: GeoJSON.Feature<GeoJSON.Point>): [number, number] {
  const [longitude, latitude] = payload.geometry.coordinates;
  return [longitude, latitude];
}

export function DraggableAreaPointMarkers({
  features,
  onPressPointFeature,
  onDragStartPointFeature,
  onDragEndPointFeature,
  idPrefix = "draggable-area-points",
}: DraggableAreaPointMarkersProps) {
  const [draggingPoint, setDraggingPoint] = useState<DraggingPoint | null>(null);
  const pointFeatures = features.filter(
    (feature): feature is PointFeature =>
      feature.geometryType === "point" && Boolean(feature.point)
  );

  return (
    <>
      {pointFeatures.map((feature) => {
        const featureKey = getAreaFeatureTargetKey(feature);

        return (
          <PointAnnotation
            key={featureKey}
            id={`${idPrefix}-${feature.source}-${String(feature.id)}`}
            coordinate={areaFeaturePointToLngLat(feature.point)}
            draggable
            anchor={{ x: 0.5, y: 0.5 }}
            onSelected={() => onPressPointFeature?.(feature)}
            onDragStart={(payload) => {
              setDraggingPoint({
                color: feature.color,
                coordinate: getPayloadCoordinate(payload),
              });
              onDragStartPointFeature?.(feature);
            }}
            onDrag={(payload) => {
              setDraggingPoint({
                color: feature.color,
                coordinate: getPayloadCoordinate(payload),
              });
            }}
            onDragEnd={(payload) => {
              const [longitude, latitude] = payload.geometry.coordinates;
              setDraggingPoint(null);
              onDragEndPointFeature?.(feature, { latitude, longitude });
            }}
          >
            <View
              collapsable={false}
              style={{
                width: 72,
                height: 72,
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.01)",
                borderRadius: 999,
                justifyContent: "center",
              }}
            >
              <View
                collapsable={false}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  backgroundColor: feature.color,
                  borderWidth: 2,
                  borderColor: "#ffffff",
                }}
              />
            </View>
          </PointAnnotation>
        );
      })}

      {draggingPoint ? (
        <MarkerView
          coordinate={draggingPoint.coordinate}
          anchor={{ x: 0.5, y: 0.68 }}
          allowOverlap
          allowOverlapWithPuck
          isSelected
        >
          <View
            pointerEvents="none"
            style={{
              width: 64,
              height: 64,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ translateY: -12 }],
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 58,
                height: 58,
                borderRadius: 999,
                backgroundColor: `${draggingPoint.color}2e`,
                borderWidth: 1,
                borderColor: "#ffffff",
                boxShadow: "0 10px 24px rgba(49, 52, 68, 0.3)",
              }}
            />
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: draggingPoint.color,
                borderWidth: 4,
                borderColor: "#ffffff",
              }}
            />
          </View>
        </MarkerView>
      ) : null}
    </>
  );
}
