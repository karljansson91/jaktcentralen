import type { AssignedStationMarkerItem } from "@/components/event/assigned-station-marker";
import type { Id } from "@/convex/_generated/dataModel";
import type { AreaFeatureListItem, LatLngPoint } from "@/lib/area-features";
import { getAreaFeatureTargetKey } from "@/lib/area-features";
import type { AreaSatListItem } from "@/lib/area-sats";
import { getMemberInitials } from "@/lib/event-formatting";
import { distanceMeters } from "@/lib/geo";
import type { AssignmentTrail } from "@/lib/hunt-navigation";
import { isMemberEffectivelyInPosition } from "@/lib/hunt-in-position";
import { getInPositionPromptIgnoreKey } from "@/lib/in-position-prompt-ignore";
import { useMemo } from "react";

type Assignment = {
  assignedUser?: { name?: string | null } | null;
  assignedUserId: Id<"users">;
  targetKey: string;
};

type EventMember = {
  _id: Id<"eventMembers">;
  inPositionTargetKey?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  positionSharingDisabled?: boolean;
  userId: Id<"users">;
};

type CurrentUser = {
  _id: Id<"users">;
} | null | undefined;

type AssignedStationMapStateArgs = {
  activeSat: AreaSatListItem | null;
  areaFeatures: AreaFeatureListItem[] | undefined;
  assignments: Assignment[] | undefined;
  currentCoordinate: [number, number] | null;
  currentTime: number;
  currentUser: CurrentUser;
  eventId: string;
  members: EventMember[] | undefined;
};

export function useAssignedStationMapState({
  activeSat,
  areaFeatures,
  assignments,
  currentCoordinate,
  currentTime,
  currentUser,
  eventId,
  members,
}: AssignedStationMapStateArgs) {
  const assignmentPointByTargetKey = useMemo(() => {
    const points = new Map<string, LatLngPoint>();

    for (const feature of areaFeatures ?? []) {
      if (feature.geometryType !== "point" || !feature.point) {
        continue;
      }

      points.set(getAreaFeatureTargetKey(feature), feature.point);
    }

    return points;
  }, [areaFeatures]);

  const memberByUserId = useMemo(
    () => new Map((members ?? []).map((member) => [member.userId, member])),
    [members]
  );

  const readinessSummary = useMemo(() => {
    if (!activeSat || !assignments) return null;

    let confirmed = 0;
    let total = 0;

    for (const assignment of assignments) {
      const point = assignmentPointByTargetKey.get(assignment.targetKey);
      const member = memberByUserId.get(assignment.assignedUserId);
      if (!point || !member) {
        continue;
      }

      total += 1;
      if (isMemberEffectivelyInPosition(member, assignment, point, currentTime)) {
        confirmed += 1;
      }
    }

    return { confirmed, total };
  }, [activeSat, assignmentPointByTargetKey, assignments, currentTime, memberByUserId]);

  const assignedStationMarkers = useMemo(() => {
    if (!activeSat || !areaFeatures || !assignments) return null;

    const assignmentsByTargetKey = new Map(
      assignments.map((assignment) => [assignment.targetKey, assignment])
    );
    return areaFeatures.flatMap((feature) => {
      if (feature.geometryType !== "point" || !feature.point) {
        return [];
      }

      const assignment = assignmentsByTargetKey.get(getAreaFeatureTargetKey(feature));
      if (!assignment) {
        return [];
      }

      const point = assignmentPointByTargetKey.get(assignment.targetKey);
      const member = memberByUserId.get(assignment.assignedUserId);
      const name = assignment.assignedUser?.name?.trim() || "Okänd";
      return [
        {
          confirmed: point
            ? isMemberEffectivelyInPosition(member, assignment, point, currentTime)
            : false,
          coordinates: [feature.point.longitude, feature.point.latitude] as [number, number],
          initials: getMemberInitials(name),
          targetKey: getAreaFeatureTargetKey(feature),
        } satisfies AssignedStationMarkerItem,
      ];
    });
  }, [activeSat, areaFeatures, assignmentPointByTargetKey, assignments, currentTime, memberByUserId]);

  const currentUserAssignedStation = useMemo(() => {
    if (!activeSat || !currentUser || !assignments) return null;

    const assignment = assignments.find(
      (candidate) => candidate.assignedUserId === currentUser._id
    );
    if (!assignment) return null;

    const point = assignmentPointByTargetKey.get(assignment.targetKey);
    if (!point) return null;

    return {
      assignedUserId: assignment.assignedUserId,
      coordinate: [point.longitude, point.latitude] as [number, number],
      point,
      targetKey: assignment.targetKey,
    };
  }, [activeSat, assignmentPointByTargetKey, assignments, currentUser]);

  const currentUserMember = useMemo(() => {
    if (!currentUser) return null;
    return memberByUserId.get(currentUser._id) ?? null;
  }, [currentUser, memberByUserId]);

  const currentUserMemberCoordinate = useMemo(() => {
    if (currentUserMember?.lastLatitude == null || currentUserMember.lastLongitude == null) {
      return null;
    }

    return [currentUserMember.lastLongitude, currentUserMember.lastLatitude] as [number, number];
  }, [currentUserMember]);

  const currentUserMarkedInPosition = Boolean(
    currentUserAssignedStation &&
      currentUserMember?.inPositionTargetKey === currentUserAssignedStation.targetKey
  );
  const currentUserAssignmentPromptIgnoreKey = currentUserAssignedStation
    ? getInPositionPromptIgnoreKey(eventId, currentUserAssignedStation.targetKey)
    : null;
  const currentUserInPositionEffective = Boolean(
    currentUserAssignedStation &&
      currentUserMember &&
      isMemberEffectivelyInPosition(
        currentUserMember,
        currentUserAssignedStation,
        currentUserAssignedStation.point,
        currentTime
      )
  );
  const currentUserAssignmentDistance = useMemo(() => {
    if (!currentCoordinate || !currentUserAssignedStation) {
      return null;
    }

    return distanceMeters(
      { latitude: currentCoordinate[1], longitude: currentCoordinate[0] },
      currentUserAssignedStation.point
    );
  }, [currentCoordinate, currentUserAssignedStation]);
  const isOwnPositionSharingEnabled = !currentUserMember?.positionSharingDisabled;
  const currentMeasurementStartCoordinate = currentCoordinate ?? currentUserMemberCoordinate;

  return {
    assignedStationMarkers,
    currentMeasurementStartCoordinate,
    currentUserAssignedStation,
    currentUserAssignmentDistance,
    currentUserAssignmentPromptIgnoreKey,
    currentUserInPositionEffective,
    currentUserMarkedInPosition,
    currentUserMember,
    currentUserMemberCoordinate,
    isOwnPositionSharingEnabled,
    readinessSummary,
  };
}
