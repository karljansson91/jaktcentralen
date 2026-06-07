import type { MapStyleOption } from '@/lib/map-styles';

export const MAPBOX_OUTDOORS_STYLE_URL = 'mapbox://styles/mapbox/outdoors-v12';
export const MAPBOX_SATELLITE_STYLE_URL = 'mapbox://styles/mapbox/satellite-v9';

const MAPBOX_OUTDOORS_STYLE_API_URL = 'https://api.mapbox.com/styles/v1/mapbox/outdoors-v12';
const HYBRID_SATELLITE_SOURCE_ID = 'jaktcentralen-satellite';
const HYBRID_SATELLITE_LAYER_ID = 'jaktcentralen-satellite-fade';

type MapboxStyleLayer = {
  id: string;
  layout?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  type: string;
  [key: string]: unknown;
};

type MapboxStyleJSON = {
  bearing?: number;
  center?: number[];
  fog?: unknown;
  glyphs?: string;
  imports?: unknown;
  layers?: MapboxStyleLayer[];
  light?: unknown;
  metadata?: Record<string, unknown>;
  name?: string;
  pitch?: number;
  projection?: unknown;
  sources?: Record<string, unknown>;
  sprite?: string;
  terrain?: unknown;
  transition?: unknown;
  version: number;
  zoom?: number;
  [key: string]: unknown;
};

const satelliteSource = {
  tileSize: 256,
  type: 'raster',
  url: 'mapbox://mapbox.satellite',
} as const;

const hybridSatelliteLayer: MapboxStyleLayer = {
  id: HYBRID_SATELLITE_LAYER_ID,
  minzoom: 10,
  paint: {
    'raster-contrast': 0.05,
    'raster-fade-duration': 180,
    'raster-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10.5,
      0,
      12,
      0.18,
      13.4,
      0.58,
      15,
      0.92,
    ],
    'raster-saturation': -0.08,
  },
  source: HYBRID_SATELLITE_SOURCE_ID,
  type: 'raster',
};

let outdoorsStyleJSONPromise: Promise<MapboxStyleJSON> | null = null;
const generatedStyleURLPromises = new Map<string, Promise<string>>();

function cloneStyleSpec(style: MapboxStyleJSON, name: string): MapboxStyleJSON {
  return {
    ...style,
    name,
  };
}

function getMapboxAccessToken() {
  return process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';
}

async function fetchOutdoorsStyleJSON() {
  const accessToken = getMapboxAccessToken();

  if (!accessToken) {
    throw new Error('Mapbox token saknas.');
  }

  const response = await fetch(
    `${MAPBOX_OUTDOORS_STYLE_API_URL}?access_token=${encodeURIComponent(accessToken)}`
  );

  if (!response.ok) {
    throw new Error(`Mapbox kunde inte ladda terrängstilen (${response.status}).`);
  }

  return (await response.json()) as MapboxStyleJSON;
}

function getOutdoorsStyleJSON() {
  outdoorsStyleJSONPromise ??= fetchOutdoorsStyleJSON().catch((error) => {
    outdoorsStyleJSONPromise = null;
    throw error;
  });

  return outdoorsStyleJSONPromise;
}

function insertLayerBefore(
  layers: MapboxStyleLayer[],
  layer: MapboxStyleLayer,
  beforeLayerId: string
) {
  const withoutExistingLayer = layers.filter((currentLayer) => currentLayer.id !== layer.id);
  const beforeLayerIndex = withoutExistingLayer.findIndex(
    (currentLayer) => currentLayer.id === beforeLayerId
  );

  if (beforeLayerIndex === -1) {
    return [...withoutExistingLayer, layer];
  }

  return [
    ...withoutExistingLayer.slice(0, beforeLayerIndex),
    layer,
    ...withoutExistingLayer.slice(beforeLayerIndex),
  ];
}

function widenTextLabelLayers(layers: MapboxStyleLayer[] = []) {
  return layers.map((layer) => {
    if (layer.type !== 'symbol') {
      return layer;
    }

    const layout = layer.layout;
    if (!layout?.['text-field']) {
      return layer;
    }

    return {
      ...layer,
      layout: {
        ...layout,
        'text-max-width': Math.max(
          typeof layout['text-max-width'] === 'number' ? layout['text-max-width'] : 0,
          24
        ),
      },
    };
  });
}

function withStyleMetadata(style: MapboxStyleJSON, mapStyleId: string) {
  return {
    ...style,
    metadata: {
      ...style.metadata,
      'jaktcentralen:mapStyle': mapStyleId,
    },
  };
}

async function buildTerrainStyleURL() {
  const outdoorsStyle = cloneStyleSpec(await getOutdoorsStyleJSON(), 'Terrängkarta');

  return JSON.stringify(
    withStyleMetadata(
      {
        ...outdoorsStyle,
        layers: widenTextLabelLayers(outdoorsStyle.layers),
      },
      'terrain'
    )
  );
}

async function buildHybridStyleURL() {
  const outdoorsStyle = cloneStyleSpec(await getOutdoorsStyleJSON(), 'Hybridkarta');

  return JSON.stringify(
    withStyleMetadata(
      {
        ...outdoorsStyle,
        layers: widenTextLabelLayers(
          insertLayerBefore(outdoorsStyle.layers ?? [], hybridSatelliteLayer, 'contour-line')
        ),
        sources: {
          ...outdoorsStyle.sources,
          [HYBRID_SATELLITE_SOURCE_ID]: satelliteSource,
        },
      },
      'hybrid'
    )
  );
}

function getGeneratedStyleURL(style: MapStyleOption) {
  if (style.variant === 'hybrid') {
    return buildHybridStyleURL();
  }

  return buildTerrainStyleURL();
}

export function resolveGeneratedMapStyleURL(style: MapStyleOption) {
  const styleURLPromise = generatedStyleURLPromises.get(style.id);

  if (styleURLPromise) {
    return styleURLPromise;
  }

  const nextStyleURLPromise = getGeneratedStyleURL(style).catch((error) => {
    generatedStyleURLPromises.delete(style.id);
    console.error('Failed to build generated map style:', error);
    return style.styleURL;
  });

  generatedStyleURLPromises.set(style.id, nextStyleURLPromise);
  return nextStyleURLPromise;
}
