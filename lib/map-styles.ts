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
    id: 'streets',
    label: 'Streets',
    styleURL: 'mapbox://styles/mapbox/streets-v12',
  },
  {
    id: 'outdoors',
    label: 'Outdoors',
    styleURL: 'mapbox://styles/mapbox/outdoors-v12',
  },
  {
    id: 'light',
    label: 'Light',
    styleURL: 'mapbox://styles/mapbox/light-v11',
  },
  {
    id: 'dark',
    label: 'Dark',
    styleURL: 'mapbox://styles/mapbox/dark-v11',
  },
  {
    id: 'satellite',
    label: 'Satellite',
    styleURL: 'mapbox://styles/mapbox/satellite-v9',
  },
  {
    id: 'satelliteStreets',
    label: 'Satellite Streets',
    styleURL: 'mapbox://styles/mapbox/satellite-streets-v12',
  },
  {
    id: 'navigationDay',
    label: 'Navigation Day',
    styleURL: 'mapbox://styles/mapbox/navigation-day-v1',
  },
  {
    id: 'navigationNight',
    label: 'Navigation Night',
    styleURL: 'mapbox://styles/mapbox/navigation-night-v1',
  },
];

export const DEFAULT_MAP_STYLE = MAP_STYLE_OPTIONS.find(
  (option) => option.id === 'outdoors'
) ?? MAP_STYLE_OPTIONS[0];

function getMapStyleById(styleId?: string | null) {
  return MAP_STYLE_OPTIONS.find((option) => option.id === styleId) ?? DEFAULT_MAP_STYLE;
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
    return getMapStyleById(savedStyleId);
  } catch (error) {
    console.error('Failed to load saved map style:', error);
    return DEFAULT_MAP_STYLE;
  }
}

export async function saveMapStyle(styleId: string) {
  const nextStyle = getMapStyleById(styleId);

  try {
    await SecureStore.setItemAsync(MAP_STYLE_STORAGE_KEY, nextStyle.id);
  } catch (error) {
    console.error('Failed to save map style:', error);
  }

  notifyMapStyleChange(nextStyle);
  return nextStyle;
}
