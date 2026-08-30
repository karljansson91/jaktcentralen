import { APP_COLORS } from '@/lib/theme';
import { getShotReportResultColor, getShotReportResultLabel } from '@/lib/shot-reports';
import { CircleLayer, ShapeSource, SymbolLayer } from '@rnmapbox/maps';
import type { ComponentProps } from 'react';

export type ShotReportMapItem = {
  _id: string;
  reportedAt: number;
  result: string;
  shotLatitude: number;
  shotLongitude: number;
  speciesLabel: string;
  status: string;
};

type ShotReportLayersProps<T extends ShotReportMapItem> = {
  idPrefix: string;
  onPressReport?: (report: T) => void;
  reports: T[];
};

type ShapeSourcePressEvent = Parameters<
  NonNullable<ComponentProps<typeof ShapeSource>['onPress']>
>[0];

const circleStyle = {
  circleColor: ['get', 'color'] as const,
  circleOpacity: ['get', 'opacity'] as const,
  circleRadius: 16,
  circleStrokeColor: APP_COLORS.surface,
  circleStrokeWidth: 2.5,
} satisfies NonNullable<ComponentProps<typeof CircleLayer>['style']>;

const iconStyle = {
  textAllowOverlap: true,
  textColor: APP_COLORS.surface,
  textField: '!',
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
  textIgnorePlacement: true,
  textSize: 18,
} satisfies NonNullable<ComponentProps<typeof SymbolLayer>['style']>;

const labelStyle = {
  textAllowOverlap: true,
  textAnchor: 'top' as const,
  textColor: APP_COLORS.text,
  textField: ['get', 'label'] as const,
  textFont: ['DIN Pro Medium', 'Arial Unicode MS Regular'],
  textHaloColor: APP_COLORS.surface,
  textHaloWidth: 1.2,
  textIgnorePlacement: true,
  textOffset: [0, 1.75] as const,
  textSize: 12,
} satisfies NonNullable<ComponentProps<typeof SymbolLayer>['style']>;

function buildShape(reports: ShotReportMapItem[]) {
  return {
    type: 'FeatureCollection' as const,
    features: reports.map((report) => ({
      type: 'Feature' as const,
      properties: {
        color:
          report.status === 'false_report'
            ? APP_COLORS.textMuted
            : getShotReportResultColor(report.result),
        id: report._id,
        label: `${report.speciesLabel} · ${
          report.status === 'false_report'
            ? 'Felrapporterat'
            : getShotReportResultLabel(report.result)
        }`,
        opacity: report.status === 'false_report' ? 0.62 : 1,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [report.shotLongitude, report.shotLatitude] as [number, number],
      },
    })),
  };
}

function getPressedReportId(event: ShapeSourcePressEvent) {
  const id = event.features?.[0]?.properties?.id;
  return typeof id === 'string' ? id : null;
}

export function ShotReportLayers<T extends ShotReportMapItem>({
  idPrefix,
  onPressReport,
  reports,
}: ShotReportLayersProps<T>) {
  const handlePress = onPressReport
    ? (event: ShapeSourcePressEvent) => {
        const id = getPressedReportId(event);
        const report = id ? reports.find((candidate) => candidate._id === id) : null;
        if (report) {
          onPressReport(report);
        }
      }
    : undefined;

  return (
    <ShapeSource
      id={`${idPrefix}-shot-reports`}
      hitbox={{ height: 48, width: 48 }}
      onPress={handlePress}
      shape={buildShape(reports)}>
      <CircleLayer id={`${idPrefix}-shot-report-circle`} style={circleStyle} />
      <SymbolLayer id={`${idPrefix}-shot-report-icon`} style={iconStyle} />
      <SymbolLayer id={`${idPrefix}-shot-report-label`} style={labelStyle} />
    </ShapeSource>
  );
}
