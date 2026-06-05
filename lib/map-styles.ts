import * as SecureStore from 'expo-secure-store';

export type MapStyleOption = {
  id: string;
  label: string;
  styleURL: string;
};

const MAP_STYLE_STORAGE_KEY = 'preferred-area-map-style';
type MapStyleListener = (style: MapStyleOption) => void;
const mapStyleListeners = new Set<MapStyleListener>();

export const MAP_STYLE_OPTIONS: MapStyleOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    styleURL: 'mapbox://styles/mapbox/standard',
  },
  {
    id: 'outdoors',
    label: 'Terräng',
    styleURL: 'mapbox://styles/mapbox/outdoors-v12',
  },
  {
    id: 'satellite',
    label: 'Satellit',
    styleURL: 'mapbox://styles/mapbox/satellite-v9',
  },
];

const DEFAULT_MAP_STYLE = MAP_STYLE_OPTIONS.find(
  (option) => option.id === 'outdoors'
) ?? MAP_STYLE_OPTIONS[0];

let cachedMapStyle = DEFAULT_MAP_STYLE;

function getMapStyleById(styleId?: string | null) {
  return MAP_STYLE_OPTIONS.find((option) => option.id === styleId) ?? DEFAULT_MAP_STYLE;
}

export function getCachedMapStyle() {
  return cachedMapStyle;
}

export function subscribeToMapStyleChanges(listener: MapStyleListener) {
  mapStyleListeners.add(listener);
  return () => {
    mapStyleListeners.delete(listener);
  };
}

function notifyMapStyleChange(style: MapStyleOption) {
  mapStyleListeners.forEach((listener) => {
    listener(style);
  });
}

export async function getSavedMapStyle() {
  try {
    const savedStyleId = await SecureStore.getItemAsync(MAP_STYLE_STORAGE_KEY);
    cachedMapStyle = getMapStyleById(savedStyleId);
    return cachedMapStyle;
  } catch (error) {
    console.error('Failed to load saved map style:', error);
    return cachedMapStyle;
  }
}

export async function saveMapStyle(styleId: string) {
  const nextStyle = getMapStyleById(styleId);
  cachedMapStyle = nextStyle;

  try {
    await SecureStore.setItemAsync(MAP_STYLE_STORAGE_KEY, nextStyle.id);
  } catch (error) {
    console.error('Failed to save map style:', error);
  }

  notifyMapStyleChange(nextStyle);
  return nextStyle;
}
