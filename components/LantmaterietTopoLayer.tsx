import { FillLayer, LineLayer, SymbolLayer, VectorSource } from '@rnmapbox/maps';
import type { ComponentProps } from 'react';

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
  visible: boolean;
};

const landcoverFillStyle = {
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
  fillOpacity: [
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
  ] as const,
} satisfies NonNullable<ComponentProps<typeof FillLayer>['style']>;

const wetlandFillStyle = {
  fillColor: [
    'match',
    ['get', 'class'],
    'Sankmark, våt',
    '#E7D3A7',
    'Sankmark, fast',
    '#EADAB6',
    '#EADAB6',
  ] as const,
  fillOpacity: 0.32,
} satisfies NonNullable<ComponentProps<typeof FillLayer>['style']>;

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
  lineColor: '#BDAE78',
  lineOpacity: 0.54,
  lineWidth: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10,
    0.32,
    14,
    0.58,
    17,
    0.95,
  ] as const,
} satisfies NonNullable<ComponentProps<typeof LineLayer>['style']>;

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
} satisfies NonNullable<ComponentProps<typeof SymbolLayer>['style']>;

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

export function LantmaterietTopoLayer({ idPrefix, visible }: LantmaterietTopoLayerProps) {
  if (!visible || !TILESET_URL) {
    return null;
  }

  return (
    <VectorSource id={`${idPrefix}-source`} url={TILESET_URL}>
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
        id={`${idPrefix}-contours-line`}
        sourceLayerID={LAYERS.contours}
        style={contourLineStyle}
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
