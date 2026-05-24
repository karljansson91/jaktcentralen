import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { isEventEnded } from "./eventLifecycle";

const MIN_TRAIL_DISTANCE_METERS = 10;
const STATIONARY_TRAIL_INTERVAL_MS = 30_000;
const EARTH_RADIUS_METERS = 6_371_000;

type PositionPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

type WriteMemberPositionArgs = {
  eventId: Id<"events">;
  userId: Id<"users">;
  latitude: number;
  longitude: number;
  heading?: number;
  timestamp: number;
};

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(a: PositionPoint, b: PositionPoint) {
  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);

  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function shouldRecordTrailPoint(
  previous: Pick<Doc<"positionTrails">, "latitude" | "longitude" | "timestamp"> | null,
  next: PositionPoint
) {
  if (!previous) {
    return true;
  }

  if (next.timestamp - previous.timestamp >= STATIONARY_TRAIL_INTERVAL_MS) {
    return true;
  }

  return distanceMeters(previous, next) >= MIN_TRAIL_DISTANCE_METERS;
}

export async function writeMemberPosition(
  ctx: MutationCtx,
  args: WriteMemberPositionArgs
) {
  const event = await ctx.db.get(args.eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (isEventEnded(event, args.timestamp)) {
    return { recordedTrail: false, status: "ended" as const };
  }

  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", args.eventId).eq("userId", args.userId)
    )
    .unique();

  if (!membership || membership.status !== "accepted") {
    throw new Error("Not an accepted member");
  }

  await ctx.db.patch(membership._id, {
    lastLatitude: args.latitude,
    lastLongitude: args.longitude,
    lastHeading: args.heading,
    lastSeenAt: args.timestamp,
  });

  const previousTrail = await ctx.db
    .query("positionTrails")
    .withIndex("by_eventId_and_userId_and_timestamp", (q) =>
      q.eq("eventId", args.eventId).eq("userId", args.userId)
    )
    .order("desc")
    .first();

  if (!shouldRecordTrailPoint(previousTrail, args)) {
    return { recordedTrail: false, status: "updated" as const };
  }

  await ctx.db.insert("positionTrails", {
    eventId: args.eventId,
    userId: args.userId,
    latitude: args.latitude,
    longitude: args.longitude,
    heading: args.heading,
    timestamp: args.timestamp,
  });

  return { recordedTrail: true, status: "updated" as const };
}
