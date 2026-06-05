import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { isPointInPolygon } from "./geometry";
import { isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";
import { insertHuntMessage } from "./messageHelpers";
import type { Doc, Id } from "./_generated/dataModel";

const assignmentInputValidator = v.object({
  assignedUserId: v.id("users"),
  targetKey: v.string(),
});

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

  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  return { event, membership };
}

async function requireEditableEventCreator(
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
    throw new Error("Cannot edit an ended hunt");
  }

  return event;
}

async function clearCurrentSetup(ctx: MutationCtx, eventId: Id<"events">) {
  const [selectedPasses, excludedMembers, assignments, members] = await Promise.all([
    ctx.db
      .query("eventSelectedPasses")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .take(500),
    ctx.db
      .query("eventAssignmentExcludedMembers")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .take(500),
    ctx.db
      .query("eventPointAssignments")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .take(500),
    ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_status", (q) =>
        q.eq("eventId", eventId).eq("status", "accepted")
      )
      .take(500),
  ]);

  for (const row of selectedPasses) {
    await ctx.db.delete(row._id);
  }
  for (const row of excludedMembers) {
    await ctx.db.delete(row._id);
  }
  for (const assignment of assignments) {
    await ctx.db.delete(assignment._id);
  }
  for (const member of members) {
    if (member.inPositionTargetKey) {
      await ctx.db.patch(member._id, {
        inPositionMarkedAt: undefined,
        inPositionTargetKey: undefined,
      });
    }
  }
}

async function getAcceptedMemberIds(ctx: QueryCtx | MutationCtx, eventId: Id<"events">) {
  const members = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_status", (q) =>
      q.eq("eventId", eventId).eq("status", "accepted")
    )
    .take(500);

  return new Set(members.map((member) => member.userId));
}

async function validateSelectedPasses(args: {
  ctx: QueryCtx | MutationCtx;
  event: Doc<"events">;
  sat: Doc<"areaSats">;
  targetKeys: string[];
}) {
  const uniqueTargetKeys = Array.from(new Set(args.targetKeys));
  const validated: Doc<"areaFeatures">[] = [];
  for (const targetKey of uniqueTargetKeys) {
    const feature = await args.ctx.db.get(targetKey as Id<"areaFeatures">);
    if (
      !feature ||
      feature.areaId !== args.event.areaId ||
      feature.category !== "pass" ||
      !isPointInPolygon(feature.point, args.sat.polygon)
    ) {
      throw new Error("Passet hör inte till den valda såten");
    }
    validated.push(feature);
  }

  return validated;
}

export const getSetup = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { event } = await requireEventMember(ctx, args.eventId, user._id);

    const [activeSat, selectedPasses, excludedMembers, assignments] = await Promise.all([
      event.activeSatId ? ctx.db.get(event.activeSatId) : Promise.resolve(null),
      ctx.db
        .query("eventSelectedPasses")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(500),
      ctx.db
        .query("eventAssignmentExcludedMembers")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(500),
      ctx.db
        .query("eventPointAssignments")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(500),
    ]);

    return {
      activeSat: activeSat
        ? {
            id: activeSat._id,
            areaId: activeSat.areaId,
            name: activeSat.name,
            color: activeSat.color,
            polygon: activeSat.polygon,
          }
        : null,
      activeSatId: event.activeSatId ?? null,
      assignments: await Promise.all(
        assignments.map(async (assignment) => ({
          ...assignment,
          assignedUser: await ctx.db.get(assignment.assignedUserId),
        }))
      ),
      excludedUserIds: excludedMembers.map((member) => member.userId),
      selectedTargetKeys: selectedPasses.map((pass) => pass.targetKey),
    };
  },
});

export const saveSetup = mutation({
  args: {
    assignments: v.array(assignmentInputValidator),
    eventId: v.id("events"),
    excludedUserIds: v.array(v.id("users")),
    satId: v.id("areaSats"),
    selectedTargetKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const event = await requireEditableEventCreator(ctx, args.eventId, user._id);
    const sat = await ctx.db.get(args.satId);
    if (!sat || sat.areaId !== event.areaId) {
      throw new Error("Såt not found in this hunt area");
    }

    const selectedPasses = await validateSelectedPasses({
      ctx,
      event,
      sat,
      targetKeys: args.selectedTargetKeys,
    });
    const selectedTargetKeySet = new Set(selectedPasses.map((feature) => String(feature._id)));
    const acceptedMemberIds = await getAcceptedMemberIds(ctx, args.eventId);
    const excludedUserIds = Array.from(new Set(args.excludedUserIds));
    const excludedUserIdSet = new Set(excludedUserIds);
    const assignedUsers = new Set<Id<"users">>();
    const assignedTargets = new Set<string>();

    for (const excludedUserId of excludedUserIds) {
      if (!acceptedMemberIds.has(excludedUserId)) {
        throw new Error("Excluded participant must be part of the hunt");
      }
    }

    for (const assignment of args.assignments) {
      if (!selectedTargetKeySet.has(assignment.targetKey)) {
        throw new Error("Assignment target must be a selected pass");
      }
      if (!acceptedMemberIds.has(assignment.assignedUserId)) {
        throw new Error("Assigned participant must be part of the hunt");
      }
      if (excludedUserIdSet.has(assignment.assignedUserId)) {
        throw new Error("Excluded participant cannot be assigned");
      }
      if (assignedUsers.has(assignment.assignedUserId)) {
        throw new Error("Participant can only have one pass");
      }
      if (assignedTargets.has(assignment.targetKey)) {
        throw new Error("Pass can only have one participant");
      }
      assignedUsers.add(assignment.assignedUserId);
      assignedTargets.add(assignment.targetKey);
    }

    const previousActiveSatId = event.activeSatId;
    await clearCurrentSetup(ctx, args.eventId);

    const now = Date.now();
    await ctx.db.patch(args.eventId, { activeSatId: args.satId });

    for (const targetKey of selectedTargetKeySet) {
      await ctx.db.insert("eventSelectedPasses", {
        createdByUserId: user._id,
        eventId: args.eventId,
        targetKey,
        updatedAt: now,
      });
    }

    for (const userId of excludedUserIds) {
      await ctx.db.insert("eventAssignmentExcludedMembers", {
        createdByUserId: user._id,
        eventId: args.eventId,
        updatedAt: now,
        userId,
      });
    }

    for (const assignment of args.assignments) {
      await ctx.db.insert("eventPointAssignments", {
        assignedUserId: assignment.assignedUserId,
        createdByUserId: user._id,
        eventId: args.eventId,
        targetKey: assignment.targetKey,
        updatedAt: now,
      });
    }

    if (previousActiveSatId !== args.satId) {
      await insertHuntMessage(ctx, {
        body: `Aktiv såt: ${sat.name}`,
        eventId: args.eventId,
        satId: sat._id,
        type: "sat_activated",
        userId: user._id,
      });
    }
  },
});

export const clearSetup = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const event = await requireEditableEventCreator(ctx, args.eventId, user._id);

    await clearCurrentSetup(ctx, args.eventId);
    await ctx.db.patch(args.eventId, { activeSatId: undefined });

    if (event.activeSatId) {
      await insertHuntMessage(ctx, {
        body: "Aktiv såt rensad.",
        eventId: args.eventId,
        type: "sat_cleared",
        userId: user._id,
      });
    }
  },
});
