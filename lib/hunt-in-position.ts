import { distanceMeters, type LatLngPoint } from '@/lib/geo';

export const IN_POSITION_RADIUS_METERS = 75;
export const NEAR_ASSIGNED_POSITION_RADIUS_METERS = 20;
export const IN_POSITION_PROMPT_DELAY_MS = 60_000;
export const FRESH_POSITION_WINDOW_MS = 75_000;

type AssignmentStatusInput = {
  assignedUserId: string;
  targetKey: string;
};

type MemberPositionStatusInput = {
  inPositionTargetKey?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastSeenAt?: number;
  userId: string;
};

export function getMemberAssignmentDistanceMeters(
  member: Pick<MemberPositionStatusInput, 'lastLatitude' | 'lastLongitude'>,
  assignedPoint: LatLngPoint
) {
  if (member.lastLatitude == null || member.lastLongitude == null) {
    return null;
  }

  return distanceMeters(
    { latitude: member.lastLatitude, longitude: member.lastLongitude },
    assignedPoint
  );
}

export function isMemberEffectivelyInPosition(
  member: MemberPositionStatusInput | undefined,
  assignment: AssignmentStatusInput,
  assignedPoint: LatLngPoint,
  now: number
) {
  if (
    !member ||
    member.userId !== assignment.assignedUserId ||
    member.inPositionTargetKey !== assignment.targetKey
  ) {
    return false;
  }

  const hasFreshPosition =
    member.lastSeenAt != null && now - member.lastSeenAt <= FRESH_POSITION_WINDOW_MS;
  if (!hasFreshPosition) {
    return true;
  }

  const distance = getMemberAssignmentDistanceMeters(member, assignedPoint);
  return distance == null || distance <= IN_POSITION_RADIUS_METERS;
}
