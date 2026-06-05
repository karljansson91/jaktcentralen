import type { LngLat } from '@/lib/geo';

export const FASTIGHETS_SOURCE_ID = 'lm-fastighetsindelning-source';
export const FASTIGHETS_FILL_LAYER_ID = 'lm-fastighetsindelning-fill';
export const FASTIGHETS_LINE_LAYER_ID = 'lm-fastighetsindelning-line';

const DEFAULT_FASTIGHETS_TILESET_URL = 'mapbox://karljansson91.jc-fastigheter-varmland';
const DEFAULT_FASTIGHETS_SOURCE_LAYER = 'fastighetsomraden';

export const FASTIGHETS_TILESET_URL =
  process.env.EXPO_PUBLIC_LM_FASTIGHETS_TILESET_URL ?? DEFAULT_FASTIGHETS_TILESET_URL;

export const FASTIGHETS_SOURCE_LAYER =
  process.env.EXPO_PUBLIC_LM_FASTIGHETS_SOURCE_LAYER ?? DEFAULT_FASTIGHETS_SOURCE_LAYER;

export type FastighetGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

export type SelectedFastighet = {
  objektidentitet?: string;
  etikett?: string;
  kommunnamn?: string;
  trakt?: string;
};

function readStringProperty(feature: GeoJSON.Feature, key: string) {
  const value = feature.properties?.[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
}

export function readSelectedFastighet(feature: GeoJSON.Feature): SelectedFastighet {
  return {
    objektidentitet: readStringProperty(feature, 'objektidentitet'),
    etikett: readStringProperty(feature, 'etikett'),
    kommunnamn: readStringProperty(feature, 'kommunnamn'),
    trakt: readStringProperty(feature, 'trakt'),
  };
}

export function getFastighetGeometry(feature: GeoJSON.Feature): FastighetGeometry | null {
  if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
    return feature.geometry;
  }
  return null;
}

export function findFastighetFeature(features: GeoJSON.Feature[]) {
  const polygonFeatures = features.filter((feature) => getFastighetGeometry(feature));
  return (
    polygonFeatures.find((feature) => readStringProperty(feature, 'objektidentitet')) ??
    polygonFeatures[0] ??
    null
  );
}

export function buildFastighetGeoJSON(geometry: FastighetGeometry): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry,
  };
}

function toLngLat(position: GeoJSON.Position): LngLat | null {
  const [longitude, latitude] = position;
  if (typeof longitude !== 'number' || typeof latitude !== 'number') {
    return null;
  }
  return [longitude, latitude];
}

function samePoint(a: LngLat, b: LngLat) {
  return a[0] === b[0] && a[1] === b[1];
}

export function getPolygonApplyPoints(geometry: FastighetGeometry) {
  if (geometry.type === 'MultiPolygon') {
    return {
      points: null,
      limitation: 'Fastigheten består av flera ytor och kan inte användas i denna version.',
    };
  }

  // The hunting-area draft model stores a single exterior ring, so interior rings are ignored.
  const ring = geometry.coordinates[0] ?? [];
  const points = ring.map(toLngLat);
  if (points.some((point) => point === null)) {
    return {
      points: null,
      limitation: 'Kunde inte läsa alla punkter i fastighetsgränsen.',
    };
  }

  const openRing = points as LngLat[];
  const normalized =
    openRing.length >= 2 && samePoint(openRing[0], openRing[openRing.length - 1])
      ? openRing.slice(0, -1)
      : openRing;

  if (normalized.length < 3) {
    return {
      points: null,
      limitation: 'Fastighetsgränsen saknar tillräckligt många punkter.',
    };
  }

  return { points: normalized, limitation: null };
}

export function getMapPressLngLat(feature: GeoJSON.Feature): LngLat | null {
  if (feature.geometry.type !== 'Point') {
    return null;
  }
  return toLngLat(feature.geometry.coordinates);
}
