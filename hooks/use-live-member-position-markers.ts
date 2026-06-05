import type {
  LiveMemberPositionMarkerItem,
} from "@/components/event/live-member-position-marker";
import type { Id } from "@/convex/_generated/dataModel";
import { getMemberInitials } from "@/lib/event-formatting";
import { useMemo } from "react";

type LiveMember = {
  _id: Id<"eventMembers">;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  positionSharingDisabled?: boolean;
  user?: {
    imageUrl?: string | null;
    name?: string | null;
  } | null;
  userId: Id<"users">;
};

type LiveMemberPositionMarkersArgs = {
  currentUserId?: Id<"users">;
  members: LiveMember[] | undefined;
  showOtherUserPositions: boolean;
};

export function useLiveMemberPositionMarkers({
  currentUserId,
  members,
  showOtherUserPositions,
}: LiveMemberPositionMarkersArgs) {
  return useMemo(() => {
    if (!members || !currentUserId || !showOtherUserPositions) {
      return null;
    }

    const markers: LiveMemberPositionMarkerItem[] = [];
    for (const member of members) {
      if (
        member.userId === currentUserId ||
        member.lastLatitude == null ||
        member.lastLongitude == null
      ) {
        continue;
      }

      const name = member.user?.name?.trim() || "Okänd";
      markers.push({
        coordinates: [member.lastLongitude, member.lastLatitude],
        id: member._id,
        imageUrl: member.user?.imageUrl ?? null,
        initials: getMemberInitials(name),
        name,
        offline: Boolean(member.positionSharingDisabled),
      });
    }

    return markers;
  }, [currentUserId, members, showOtherUserPositions]);
}
