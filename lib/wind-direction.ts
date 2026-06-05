export type WindDirectionDisplay = {
  arrow: string;
  label: string;
};

const WIND_DIRECTION_DISPLAYS = [
  { arrow: '↑', label: 'N' },
  { arrow: '↗', label: 'NO' },
  { arrow: '→', label: 'O' },
  { arrow: '↘', label: 'SO' },
  { arrow: '↓', label: 'S' },
  { arrow: '↙', label: 'SV' },
  { arrow: '←', label: 'V' },
  { arrow: '↖', label: 'NV' },
] as const satisfies readonly WindDirectionDisplay[];

export function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

export function oppositeDirectionDegrees(degrees: number) {
  return normalizeDegrees(degrees + 180);
}

export function getWindDirectionDisplay(degrees: number): WindDirectionDisplay {
  const index = Math.round(normalizeDegrees(degrees) / 45) % WIND_DIRECTION_DISPLAYS.length;
  return WIND_DIRECTION_DISPLAYS[index];
}
