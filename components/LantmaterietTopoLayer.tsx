import type { TopoSurfaceMode } from '@/lib/map-styles';
import { FillLayer, LineLayer, SymbolLayer, VectorSource } from '@rnmapbox/maps';
import { useMemo, type ComponentProps } from 'react';

const DEFAULT_TILESET_URL = 'mapbox://karljansson91.jc-topo-varmland';
const TILESET_URL = process.env.EXPO_PUBLIC_LM_TOPO_TILESET_URL ?? DEFAULT_TILESET_URL;

const LAYERS = {
  contours: 'contours',
  labels: 'labels',
  landcover: 'landcover',
  paths: 'paths',
  powerLines: 'power_lines',
  roads: 'roads',
  streams: 'streams',
  wetland: 'wetland',
} as const;

type LantmaterietTopoLayerProps = {
  idPrefix: string;
  surfaceMode?: TopoSurfaceMode;
};

type FillLayerStyle = NonNullable<ComponentProps<typeof FillLayer>['style']>;
type SymbolLayerStyle = NonNullable<ComponentProps<typeof SymbolLayer>['style']>;
type LineLayerStyle = NonNullable<ComponentProps<typeof LineLayer>['style']>;

const landcoverFillBaseStyle = {
  fillColor: [
    'match',
    ['get', 'class'],
    'Sjö',
    '#BFE3F5',
    'Vattendragsyta',
    '#BFE3F5',
    'Anlagt vatten',
    '#C8E9F7',
    'Barr- och blandskog',
    '#CBEAB4',
    'Lövskog',
    '#D4EFBF',
    'Öppen mark',
    '#EFE8C8',
    'Åker',
    '#F2E5B5',
    'Industri- och handelsbebyggelse',
    '#DDD7C7',
    'Låg bebyggelse',
    '#E3DCCB',
    '#CBEAB4',
  ] as const,
};

const landcoverDefaultFillOpacity = [
  'match',
  ['get', 'class'],
  'Sjö',
  1,
  'Vattendragsyta',
  1,
  'Anlagt vatten',
  1,
  'Industri- och handelsbebyggelse',
  0.58,
  'Låg bebyggelse',
  0.54,
  0.82,
] as const;

const landcoverHybridFillOpacity = [
  'interpolate',
  ['linear'],
  ['zoom'],
  10,
  [
    'match',
    ['get', 'class'],
    'Sjö',
    0.68,
    'Vattendragsyta',
    0.68,
    'Anlagt vatten',
    0.68,
    'Industri- och handelsbebyggelse',
    0.42,
    'Låg bebyggelse',
    0.38,
    0.58,
  ],
  13,
  [
    'match',
    ['get', 'class'],
    'Sjö',
    0.36,
    'Vattendragsyta',
    0.36,
    'Anlagt vatten',
    0.36,
    'Industri- och handelsbebyggelse',
    0.2,
    'Låg bebyggelse',
    0.18,
    0.28,
  ],
  15,
  0.08,
  17,
  0,
] as const;

function getLandcoverFillStyle(surfaceMode: TopoSurfaceMode) {
  return {
    ...landcoverFillBaseStyle,
    fillOpacity: (
      surfaceMode === 'imagery'
        ? 0
        : surfaceMode === 'hybrid'
          ? landcoverHybridFillOpacity
          : landcoverDefaultFillOpacity
    ) as FillLayerStyle['fillOpacity'],
  } satisfies FillLayerStyle;
}

const wetlandFillBaseStyle = {
  fillColor: [
    'match',
    ['get', 'class'],
    'Sankmark, våt',
    '#E7D3A7',
    'Sankmark, fast',
    '#EADAB6',
    '#EADAB6',
  ] as const,
};

const wetlandHybridFillOpacity = [
  'interpolate',
  ['linear'],
  ['zoom'],
  10,
  0.22,
  13,
  0.12,
  15,
  0.04,
  17,
  0,
] as const;

function getWetlandFillStyle(surfaceMode: TopoSurfaceMode) {
  return {
    ...wetlandFillBaseStyle,
    fillOpacity: (
      surfaceMode === 'imagery'
        ? 0
        : surfaceMode === 'hybrid'
          ? wetlandHybridFillOpacity
          : 0.32
    ) as FillLayerStyle['fillOpacity'],
  } satisfies FillLayerStyle;
}

const wetlandOutlineStyle = {
  lineColor: '#C9A06F',
  lineDasharray: [1.2, 1.1] as const,
  lineOpacity: 0.5,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.45,
    14,
    0.9,
    17,
    1.25,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const waterOutlineCasingStyle = {
  lineColor: '#0A0F14',
  lineDasharray: [0.7, 1.15] as const,
  lineOpacity: 0.66,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    9,
    0.55,
    14,
    1,
    17,
    1.5,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const waterOutlineStyle = {
  lineColor: '#03A6DE',
  lineOpacity: 0.95,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    9,
    0.9,
    14,
    1.6,
    17,
    2.2,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const streamLineStyle = {
  lineCap: 'round' as const,
  lineColor: '#08A9DE',
  lineJoin: 'round' as const,
  lineOpacity: 0.92,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.7,
    13,
    1.35,
    16,
    2.4,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const contourLineStyle = {
  lineColor: '#9B6046',
  lineOpacity: 0.9,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.48,
    14,
    0.82,
    17,
    1.25,
  ] as const,
} satisfies LineLayerStyle;

const contourHaloStyle = {
  lineColor: '#F6E7C6',
  lineOpacity: 0.54,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    1,
    14,
    1.55,
    17,
    2.25,
  ] as const,
} satisfies LineLayerStyle;

const contourLabelFilter = [
  'all',
  ['has', 'elevation'],
  ['==', ['%', ['to-number', ['get', 'elevation']], 10], 0],
] as const;

const contourLabelStyle = {
  symbolPlacement: 'line',
  symbolSpacing: 280,
  textAllowOverlap: false,
  textColor: '#5F5537',
  textField: ['to-string', ['get', 'elevation']] as const,
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'] as const,
  textHaloColor: 'rgba(255, 250, 224, 0.9)',
  textHaloWidth: 1.2,
  textIgnorePlacement: false,
  textKeepUpright: true,
  textPitchAlignment: 'map',
  textRotationAlignment: 'map',
  textSize: [
    'interpolate',
    ['linear'],
    ['zoom'],
    11,
    8.5,
    14,
    10,
    17,
    12,
  ] as const,
} satisfies SymbolLayerStyle;

const roadCasingStyle = {
  lineCap: 'round' as const,
  lineColor: '#EEECE4',
  lineJoin: 'round' as const,
  lineOpacity: 0.72,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    1.45,
    14,
    2.5,
    17,
    4,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const roadLineStyle = {
  lineCap: 'round' as const,
  lineColor: '#9A9FA1',
  lineJoin: 'round' as const,
  lineOpacity: 0.72,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.65,
    14,
    1.05,
    17,
    1.7,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const pathCasingStyle = {
  lineCap: 'round' as const,
  lineColor: '#FFF4CF',
  lineDasharray: [2, 1.35] as const,
  lineJoin: 'round' as const,
  lineOpacity: 0.9,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    11,
    1.8,
    14,
    2.6,
    17,
    3.8,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const pathLineStyle = {
  lineCap: 'round' as const,
  lineColor: '#D28B1E',
  lineDasharray: [2, 1.35] as const,
  lineJoin: 'round' as const,
  lineOpacity: 0.96,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    11,
    0.8,
    14,
    1.2,
    17,
    1.7,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const powerLineStyle = {
  lineColor: '#0B0B0B',
  lineDasharray: [5, 2, 0.6, 2] as const,
  lineOpacity: 0.84,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.85,
    15,
    1.25,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

const labelStyle = {
  textAllowOverlap: false,
  textColor: [
    'match',
    ['get', 'category'],
    'water',
    '#2E6E88',
    'terrain',
    '#3F463E',
    '#343C38',
  ] as const,
  textField: ['get', 'name'] as const,
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'] as const,
  textHaloColor: 'rgba(222, 241, 202, 0.86)',
  textHaloWidth: 1.6,
  textIgnorePlacement: false,
  textMaxWidth: 24,
  textSize: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    10,
    14,
    12,
    17,
    15,
  ] as const,
} satisfies SymbolLayerStyle;

const waterClassFilter = [
  'match',
  ['get', 'class'],
  'Sjö',
  true,
  'Vattendragsyta',
  true,
  'Anlagt vatten',
  true,
  false,
] as const;

export function LantmaterietTopoLayer({
  idPrefix,
  surfaceMode = 'default',
}: LantmaterietTopoLayerProps) {
  const landcoverFillStyle = useMemo(
    () => getLandcoverFillStyle(surfaceMode),
    [surfaceMode]
  );
  const wetlandFillStyle = useMemo(
    () => getWetlandFillStyle(surfaceMode),
    [surfaceMode]
  );

  if (!TILESET_URL) {
    return null;
  }

  return (
    <VectorSource
      key={`${idPrefix}-${surfaceMode}`}
      id={`${idPrefix}-source`}
      maxZoomLevel={13}
      url={TILESET_URL}>
      <FillLayer
        id={`${idPrefix}-landcover-fill`}
        sourceLayerID={LAYERS.landcover}
        style={landcoverFillStyle}
      />
      <FillLayer
        id={`${idPrefix}-wetland-fill`}
        sourceLayerID={LAYERS.wetland}
        style={wetlandFillStyle}
      />
      <LineLayer
        id={`${idPrefix}-wetland-outline`}
        sourceLayerID={LAYERS.wetland}
        style={wetlandOutlineStyle}
      />
      <LineLayer
        id={`${idPrefix}-water-outline-casing`}
        sourceLayerID={LAYERS.landcover}
        filter={waterClassFilter}
        style={waterOutlineCasingStyle}
      />
      <LineLayer
        id={`${idPrefix}-water-outline`}
        sourceLayerID={LAYERS.landcover}
        filter={waterClassFilter}
        style={waterOutlineStyle}
      />
      <LineLayer
        id={`${idPrefix}-streams-line`}
        sourceLayerID={LAYERS.streams}
        style={streamLineStyle}
      />
      <LineLayer
        id={`${idPrefix}-contours-halo`}
        sourceLayerID={LAYERS.contours}
        style={contourHaloStyle}
      />
      <LineLayer
        id={`${idPrefix}-contours-line`}
        sourceLayerID={LAYERS.contours}
        style={contourLineStyle}
      />
      <SymbolLayer
        id={`${idPrefix}-contours-label`}
        sourceLayerID={LAYERS.contours}
        filter={contourLabelFilter}
        minZoomLevel={11}
        style={contourLabelStyle}
      />
      <LineLayer
        id={`${idPrefix}-roads-casing`}
        sourceLayerID={LAYERS.roads}
        style={roadCasingStyle}
      />
      <LineLayer
        id={`${idPrefix}-roads-line`}
        sourceLayerID={LAYERS.roads}
        style={roadLineStyle}
      />
      <LineLayer
        id={`${idPrefix}-paths-casing`}
        sourceLayerID={LAYERS.paths}
        style={pathCasingStyle}
      />
      <LineLayer
        id={`${idPrefix}-paths-line`}
        sourceLayerID={LAYERS.paths}
        style={pathLineStyle}
      />
      <LineLayer
        id={`${idPrefix}-power-lines-line`}
        sourceLayerID={LAYERS.powerLines}
        style={powerLineStyle}
      />
      <SymbolLayer
        id={`${idPrefix}-labels`}
        sourceLayerID={LAYERS.labels}
        style={labelStyle}
      />
    </VectorSource>
  );
}
