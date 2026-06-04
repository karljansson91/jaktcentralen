import { areaFeaturePointToLngLat, type LatLngPoint } from '@/lib/area-features';
import { CircleLayer, FillLayer, LineLayer, ShapeSource } from '@rnmapbox/maps';
import { useMemo } from 'react';

type PolygonDrawingLayersProps = {
  closeLine?: boolean;
  color: string;
  draggingIndex?: number | null;
  idPrefix?: string;
  lineDasharray?: number[] | null;
  lineWidth?: number;
  points: LatLngPoint[];
  showFill?: boolean;
  showLineHalo?: boolean;
  showMidpoints?: boolean;
  showVertices?: boolean;
};

export function PolygonDrawingLayers({
  closeLine = true,
  color,
  draggingIndex = null,
  idPrefix = 'polygon-drawing',
  lineDasharray = [1.5, 1.1],
  lineWidth = 3,
  points,
  showFill = true,
  showLineHalo = false,
  showMidpoints = false,
  showVertices = true,
}: PolygonDrawingLayersProps) {
  const geometry = useMemo(() => {
    const outline = points.map(areaFeaturePointToLngLat);
    const closedOutline = outline.length >= 3 ? [...outline, outline[0]] : outline;
    const lineOutline = closeLine ? closedOutline : outline;

    const polygon: GeoJSON.Feature<GeoJSON.Polygon> | null =
      outline.length >= 3
        ? {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [closedOutline],
            },
          }
        : null;

    const line: GeoJSON.Feature<GeoJSON.LineString> | null =
      lineOutline.length >= 2
        ? {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: lineOutline,
            },
          }
        : null;

    const vertices: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: outline.map((coordinate, index) => ({
        type: 'Feature',
        properties: {
          dragging: index === draggingIndex,
        },
        geometry: {
          type: 'Point',
          coordinates: coordinate,
        },
      })),
    };

    const midpointFeatures: GeoJSON.Feature<GeoJSON.Point>[] = [];
    for (let index = 0; index < outline.length - 1; index += 1) {
      const current = outline[index];
      const next = outline[index + 1];
      midpointFeatures.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [(current[0] + next[0]) / 2, (current[1] + next[1]) / 2],
        },
      });
    }
    if (outline.length >= 3) {
      const last = outline[outline.length - 1];
      const first = outline[0];
      midpointFeatures.push({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [(last[0] + first[0]) / 2, (last[1] + first[1]) / 2],
        },
      });
    }

    const midpoints: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: midpointFeatures,
    };

    return { line, midpoints, polygon, vertices };
  }, [closeLine, draggingIndex, points]);

  if (points.length === 0) {
    return null;
  }

  return (
    <>
      {showFill && geometry.polygon ? (
        <ShapeSource id={`${idPrefix}-polygon-source`} shape={geometry.polygon}>
          <FillLayer
            id={`${idPrefix}-fill`}
            style={{
              fillColor: color,
              fillOpacity: 0.16,
            }}
          />
        </ShapeSource>
      ) : null}

      {geometry.line && showLineHalo ? (
        <ShapeSource id={`${idPrefix}-line-source`} shape={geometry.line}>
          <LineLayer
            id={`${idPrefix}-line-halo`}
            style={{
              lineColor: '#ffffff',
              lineOpacity: 0.88,
              lineWidth: lineWidth + 3,
            }}
          />
          <LineLayer
            id={`${idPrefix}-line`}
            style={{
              lineColor: color,
              ...(lineDasharray ? { lineDasharray } : {}),
              lineWidth,
            }}
          />
        </ShapeSource>
      ) : geometry.line ? (
        <ShapeSource id={`${idPrefix}-line-source`} shape={geometry.line}>
          <LineLayer
            id={`${idPrefix}-line`}
            style={{
              lineColor: color,
              ...(lineDasharray ? { lineDasharray } : {}),
              lineWidth,
            }}
          />
        </ShapeSource>
      ) : null}

      {showMidpoints && draggingIndex === null && geometry.midpoints.features.length > 0 ? (
        <ShapeSource id={`${idPrefix}-midpoints-source`} shape={geometry.midpoints}>
          <CircleLayer
            id={`${idPrefix}-midpoints`}
            style={{
              circleColor: color,
              circleOpacity: 0.42,
              circleRadius: 2,
            }}
          />
        </ShapeSource>
      ) : null}

      {showVertices ? (
        <ShapeSource id={`${idPrefix}-vertices-source`} shape={geometry.vertices}>
          <CircleLayer
            id={`${idPrefix}-vertices-dragging`}
            filter={['==', ['get', 'dragging'], true]}
            style={{
              circleColor: '#dcfce7',
              circleRadius: 6,
              circleStrokeColor: color,
              circleStrokeWidth: 1.5,
            }}
          />
          <CircleLayer
            id={`${idPrefix}-vertices-normal`}
            filter={['==', ['get', 'dragging'], false]}
            style={{
              circleColor: '#ffffff',
              circleRadius: 3,
              circleStrokeColor: color,
              circleStrokeWidth: 1,
            }}
          />
        </ShapeSource>
      ) : null}
    </>
  );
}
