export function normalizeMapHeading(heading: number) {
  return ((heading % 360) + 360) % 360;
}

export function getMapHeadingDelta(a: number, b: number) {
  const diff = Math.abs(normalizeMapHeading(a) - normalizeMapHeading(b));
  return Math.min(diff, 360 - diff);
}
