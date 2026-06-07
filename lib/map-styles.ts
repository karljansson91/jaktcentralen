import {
  MAPBOX_OUTDOORS_STYLE_URL,
  MAPBOX_SATELLITE_STYLE_URL,
  resolveGeneratedMapStyleURL,
} from '@/lib/map-style-variants';
import * as SecureStore from 'expo-secure-store';

export type MapStyleOption = {
  description?: string;
  id: string;
  label: string;
  styleURL: string;
  variant?: 'hybrid' | 'terrain';
};

export type TopoSurfaceMode = 'default' | 'hybrid' | 'imagery';

const MAP_STYLE_STORAGE_KEY = 'preferred-area-map-style';
type MapStyleListener = (style: MapStyleOption) => void;
type MapStyleSnapshotListener = () => void;

type MapStyleSnapshot = {
  mapStyle: MapStyleOption;
  mapStyleKey: string;
  mapStyleURL: string;
  topoSurfaceMode: TopoSurfaceMode;
};

const mapStyleListeners = new Set<MapStyleListener>();
const mapStyleSnapshotListeners = new Set<MapStyleSnapshotListener>();

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
  {
    description: 'Terrängkarta på håll, flygbild nära marken.',
    id: 'hybrid',
    label: 'Hybridkarta',
    styleURL: MAPBOX_OUTDOORS_STYLE_URL,
    variant: 'hybrid',
  },
  {
    description: 'Höjdkurvor, vägar, stigar, vatten och marktyper.',
    id: 'outdoors',
    label: 'Terrängkarta',
    styleURL: MAPBOX_OUTDOORS_STYLE_URL,
    variant: 'terrain',
  },
  {
    description: 'Skog, hyggen, åkrar och kantzoner från ovan.',
    id: 'satellite',
    label: 'Flygbild',
    styleURL: MAPBOX_SATELLITE_STYLE_URL,
  },
];

const DEFAULT_MAP_STYLE = MAP_STYLE_OPTIONS.find(
  (option) => option.id === 'hybrid'
) ?? MAP_STYLE_OPTIONS[0];

let cachedMapStyle = DEFAULT_MAP_STYLE;
let mapStyleResolutionRequestId = 0;
let savedMapStylePromise: Promise<MapStyleOption> | null = null;
let cachedMapStyleSnapshot: MapStyleSnapshot = createMapStyleSnapshot(
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_STYLE.styleURL
);

function getMapStyleById(styleId?: string | null) {
  return MAP_STYLE_OPTIONS.find((option) => option.id === styleId) ?? DEFAULT_MAP_STYLE;
}

export function getCachedMapStyle() {
  return cachedMapStyle;
}

function createMapStyleSnapshot(
  mapStyle: MapStyleOption,
  mapStyleURL: string
): MapStyleSnapshot {
  return {
    mapStyle,
    mapStyleKey: mapStyle.id,
    mapStyleURL,
    topoSurfaceMode: getTopoSurfaceMode(mapStyle),
  };
}

function setMapStyleSnapshot(mapStyle: MapStyleOption, mapStyleURL: string) {
  if (
    cachedMapStyleSnapshot.mapStyle === mapStyle &&
    cachedMapStyleSnapshot.mapStyleURL === mapStyleURL
  ) {
    return;
  }

  cachedMapStyleSnapshot = createMapStyleSnapshot(mapStyle, mapStyleURL);
  notifyMapStyleSnapshotChange();
}

export function getMapStyleSnapshot() {
  return cachedMapStyleSnapshot;
}

function resolveMapStyleURL(style: MapStyleOption) {
  if (!style.variant) {
    return Promise.resolve(style.styleURL);
  }

  return resolveGeneratedMapStyleURL(style);
}

function applyMapStyle(style: MapStyleOption) {
  const previousStyle = cachedMapStyle;
  const requestId = mapStyleResolutionRequestId + 1;
  mapStyleResolutionRequestId = requestId;
  cachedMapStyle = style;
  setMapStyleSnapshot(style, style.styleURL);
  if (previousStyle !== style) {
    notifyMapStyleChange(style);
  }

  void resolveMapStyleURL(style)
    .then((resolvedStyleURL) => {
      if (requestId !== mapStyleResolutionRequestId) {
        return;
      }

      setMapStyleSnapshot(style, resolvedStyleURL);
    })
    .catch((error) => {
      console.error('Failed to resolve map style:', error);
    });
}

function getTopoSurfaceMode(style: MapStyleOption): TopoSurfaceMode {
  if (style.id === 'satellite') {
    return 'imagery';
  }

  if (style.variant === 'hybrid') {
    return 'hybrid';
  }

  return 'default';
}

export function subscribeToMapStyleChanges(listener: MapStyleListener) {
  mapStyleListeners.add(listener);
  return () => {
    mapStyleListeners.delete(listener);
  };
}

export function subscribeToMapStyleSnapshot(listener: MapStyleSnapshotListener) {
  mapStyleSnapshotListeners.add(listener);
  return () => {
    mapStyleSnapshotListeners.delete(listener);
  };
}

function notifyMapStyleChange(style: MapStyleOption) {
  mapStyleListeners.forEach((listener) => {
    listener(style);
  });
}

function notifyMapStyleSnapshotChange() {
  mapStyleSnapshotListeners.forEach((listener) => {
    listener();
  });
}

export async function getSavedMapStyle() {
  try {
    const savedStyleId = await SecureStore.getItemAsync(MAP_STYLE_STORAGE_KEY);
    const nextStyle = getMapStyleById(savedStyleId);
    applyMapStyle(nextStyle);
    return cachedMapStyle;
  } catch (error) {
    console.error('Failed to load saved map style:', error);
    return cachedMapStyle;
  }
}

export function ensureSavedMapStyleLoaded() {
  savedMapStylePromise ??= getSavedMapStyle();
  return savedMapStylePromise;
}

export async function saveMapStyle(styleId: string) {
  const nextStyle = getMapStyleById(styleId);
  applyMapStyle(nextStyle);

  try {
    await SecureStore.setItemAsync(MAP_STYLE_STORAGE_KEY, nextStyle.id);
  } catch (error) {
    console.error('Failed to save map style:', error);
  }

  return nextStyle;
}
