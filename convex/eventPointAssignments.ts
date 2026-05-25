import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";
import type { Id } from "./_generated/dataModel";

type TargetRef =
  | { source: "feature"; id: Id<"areaFeatures"> }
  | { source: "legacy"; id: Id<"areaPoints"> };

function parseTargetKey(targetKey: string): TargetRef {
  const [source, id, ...rest] = targetKey.split(":");
  if (rest.length > 0 || !id) {
    throw new Error("Invalid assignment target");
  }

  if (source === "feature") {
    return { source, id: id as Id<"areaFeatures"> };
  }
  if (source === "legacy") {
    return { source, id: id as Id<"areaPoints"> };
  }

  throw new Error("Invalid assignment target");
}

async function requireEventMember(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
) {
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();

  if (!membership || membership.status === "declined") {
    throw new Error("Not a member of this event");
  }

  return membership;
}

async function requireEventCreator(
  ctx: MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (event.creatorId !== userId) {
    throw new Error("Creator access required");
  }
  if (isEventEnded(event)) {
    throw new Error("Cannot edit assignments for an ended hunt");
  }

  return event;
}

async function assertTargetBelongsToEventArea(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  targetKey: string
) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const target = parseTargetKey(targetKey);
  if (target.source === "feature") {
    const feature = await ctx.db.get(target.id);
    if (!feature || feature.areaId !== event.areaId || feature.geometryType !== "point") {
      throw new Error("Point marker not found in this hunt area");
    }
    return;
  }

  const point = await ctx.db.get(target.id);
  if (!point || point.areaId !== event.areaId) {
    throw new Error("Point marker not found in this hunt area");
  }
}

async function deleteAssignmentsForTarget(
  ctx: MutationCtx,
  eventId: Id<"events">,
  targetKey: string
) {
  const existing = await ctx.db
    .query("eventPointAssignments")
    .withIndex("by_eventId_and_targetKey", (q) =>
      q.eq("eventId", eventId).eq("targetKey", targetKey)
    )
    .take(10);

  for (const assignment of existing) {
    await clearInPositionForAssignment(ctx, eventId, assignment.assignedUserId, targetKey);
    await ctx.db.delete(assignment._id);
  }
}

async function deleteAssignmentsForUser(
  ctx: MutationCtx,
  eventId: Id<"events">,
  assignedUserId: Id<"users">
) {
  const existing = await ctx.db
    .query("eventPointAssignments")
    .withIndex("by_eventId_and_assignedUserId", (q) =>
      q.eq("eventId", eventId).eq("assignedUserId", assignedUserId)
    )
    .take(10);

  for (const assignment of existing) {
    await clearInPositionForAssignment(
      ctx,
      eventId,
      assignedUserId,
      assignment.targetKey
    );
    await ctx.db.delete(assignment._id);
  }
}

async function clearInPositionForAssignment(
  ctx: MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">,
  targetKey: string
) {
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();

  if (membership?.inPositionTargetKey !== targetKey) {
    return;
  }

  await ctx.db.patch(membership._id, {
    inPositionMarkedAt: undefined,
    inPositionTargetKey: undefined,
  });
}

export const listByEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireEventMember(ctx, args.eventId, user._id);

    const assignments = await ctx.db
      .query("eventPointAssignments")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(500);

    return await Promise.all(
      assignments.map(async (assignment) => ({
        ...assignment,
        assignedUser: await ctx.db.get(assignment.assignedUserId),
        createdByUser: await ctx.db.get(assignment.createdByUserId),
      }))
    );
  },
});

export const assign = mutation({
  args: {
    eventId: v.id("events"),
    targetKey: v.string(),
    assignedUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireEventCreator(ctx, args.eventId, user._id);
    await assertTargetBelongsToEventArea(ctx, args.eventId, args.targetKey);

    const assignedMembership = await requireEventMember(
      ctx,
      args.eventId,
      args.assignedUserId
    );
    if (assignedMembership.status !== "accepted") {
      throw new Error("Participant must have accepted the hunt invite");
    }

    await deleteAssignmentsForTarget(ctx, args.eventId, args.targetKey);
    await deleteAssignmentsForUser(ctx, args.eventId, args.assignedUserId);

    return await ctx.db.insert("eventPointAssignments", {
      assignedUserId: args.assignedUserId,
      createdByUserId: user._id,
      eventId: args.eventId,
      targetKey: args.targetKey,
      updatedAt: Date.now(),
    });
  },
});

export const clear = mutation({
  args: {
    eventId: v.id("events"),
    targetKey: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireEventCreator(ctx, args.eventId, user._id);
    await assertTargetBelongsToEventArea(ctx, args.eventId, args.targetKey);
    await deleteAssignmentsForTarget(ctx, args.eventId, args.targetKey);
  },
});
