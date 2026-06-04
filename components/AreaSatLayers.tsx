import { AreaSatListItem } from "@/lib/area-sats";
import { areaFeaturePointToLngLat, polygonCentroid } from "@/lib/area-features";
import {
  FillLayer,
  LineLayer,
  ShapeSource,
  SymbolLayer,
} from "@rnmapbox/maps";
import type { ComponentProps } from "react";

type AreaSatLayersProps = {
  activeSatId?: string | null;
  idPrefix?: string;
  interactive?: boolean;
  onPressSat?: (sat: AreaSatListItem) => void;
  sats: AreaSatListItem[];
};

type ShapeSourcePressEvent = Parameters<
  NonNullable<ComponentProps<typeof ShapeSource>["onPress"]>
>[0];

function buildSatFeatureCollection(sats: AreaSatListItem[], activeSatId?: string | null): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: sats.flatMap((sat) => {
      const outlineCoordinates = sat.polygon.map(areaFeaturePointToLngLat);
      const isActive = String(sat.id) === activeSatId;
      return [
        {
          type: "Feature" as const,
          properties: {
            color: sat.color,
            id: String(sat.id),
            kind: "polygon",
            name: sat.name,
            opacity: isActive ? 0.24 : 0.13,
            width: isActive ? 3 : 1.5,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [[...outlineCoordinates, outlineCoordinates[0]]],
          },
        },
        {
          type: "Feature" as const,
          properties: {
            color: sat.color,
            id: String(sat.id),
            kind: "label",
            name: sat.name,
          },
          geometry: {
            type: "Point" as const,
            coordinates: polygonCentroid(sat.polygon),
          },
        },
      ];
    }),
  };
}

function readSatId(feature?: GeoJSON.Feature) {
  const id = feature?.properties?.id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

export function AreaSatLayers({
  activeSatId,
  idPrefix = "area-sats",
  interactive = false,
  onPressSat,
  sats,
}: AreaSatLayersProps) {
  if (sats.length === 0) {
    return null;
  }

  const satFeatures = buildSatFeatureCollection(sats, activeSatId);
  const satLookup = new Map(sats.map((sat) => [String(sat.id), sat]));

  const handleSatPress = (event: ShapeSourcePressEvent) => {
    if (!interactive || !onPressSat) {
      return;
    }

    const id = readSatId(
      event.features.find((feature) => feature.properties?.kind === "polygon")
    );
    const sat = id ? satLookup.get(id) : null;
    if (sat) {
      onPressSat(sat);
    }
  };

  return (
    <ShapeSource
      id={`${idPrefix}-source`}
      shape={satFeatures}
      onPress={interactive ? handleSatPress : undefined}
    >
      <FillLayer
        id={`${idPrefix}-fill`}
        style={{
          fillColor: ["get", "color"],
          fillOpacity: ["get", "opacity"],
        }}
        filter={["==", ["get", "kind"], "polygon"]}
      />
      <LineLayer
        id={`${idPrefix}-line`}
        style={{
          lineColor: ["get", "color"],
          lineWidth: ["get", "width"],
        }}
        filter={["==", ["get", "kind"], "polygon"]}
      />
      <SymbolLayer
        id={`${idPrefix}-label`}
        style={{
          textField: ["get", "name"],
          textSize: 12,
          textColor: "#1f2937",
          textHaloColor: "#ffffff",
          textHaloWidth: 1.2,
        }}
        filter={["==", ["get", "kind"], "label"]}
      />
    </ShapeSource>
  );
}
