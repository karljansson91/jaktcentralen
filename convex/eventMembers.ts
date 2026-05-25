import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAcceptedEventMembership } from "./eventAccess";
import { isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";
import { insertHuntMessage, markMembershipReadThroughMessage } from "./messageHelpers";
import { writeMemberPosition } from "./positionTracking";

function assertEventIsActive(event: Doc<"events">, now: number) {
  if (event.startDate > now || isEventEnded(event, now)) {
    throw new Error("Hunt is not active");
  }
}

export const invite = mutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new Error("Only the hunt creator can invite members");
    }
    if (isEventEnded(event)) {
      throw new Error("Cannot invite members to an ended hunt");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    // Check not already member
    const existing = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .unique();

    if (existing?.status === "declined") {
      await ctx.db.patch(existing._id, {
        role: "member",
        status: "invited",
      });
      return existing._id;
    }

    if (existing) {
      throw new Error("User is already a member or has been invited");
    }

    return await ctx.db.insert("eventMembers", {
      eventId: args.eventId,
      userId: args.userId,
      role: "member",
      status: "invited",
    });
  },
});

export const acceptInvite = mutation({
  args: { memberId: v.id("eventMembers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Membership not found");
    }
    if (member.userId !== user._id) {
      throw new Error("Not authorized");
    }
    if (member.status !== "invited") {
      throw new Error("Not an invitation");
    }
    const event = await ctx.db.get(member.eventId);
    if (!event || isEventEnded(event)) {
      throw new Error("Cannot accept an invite to an ended hunt");
    }
    await ctx.db.patch(args.memberId, { status: "accepted" });
  },
});

export const declineInvite = mutation({
  args: { memberId: v.id("eventMembers") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const member = await ctx.db.get(args.memberId);
    if (!member) {
      throw new Error("Membership not found");
    }
    if (member.userId !== user._id) {
      throw new Error("Not authorized");
    }
    if (member.status !== "invited") {
      throw new Error("Not an invitation");
    }
    await ctx.db.patch(args.memberId, { status: "declined" });
  },
});

export const removeMember = mutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new Error("Creator access required");
    }
    if (args.userId === event.creatorId) {
      throw new Error("Cannot remove the event creator");
    }

    const targetMembership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .unique();

    if (!targetMembership) {
      throw new Error("Member not found");
    }

    await ctx.db.delete(targetMembership._id);
  },
});

export const leave = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId === user._id) {
      throw new Error("Creator cannot leave. Delete the event instead.");
    }

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("Not a member");
    }

    await ctx.db.delete(membership._id);
  },
});

export const promoteMember = mutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const adminMembership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!adminMembership || adminMembership.role !== "admin") {
      throw new Error("Admin access required");
    }

    const targetMembership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .unique();

    if (!targetMembership || targetMembership.status !== "accepted") {
      throw new Error("Target is not an accepted member");
    }

    if (targetMembership.role === "admin") {
      throw new Error("User is already an admin");
    }

    await ctx.db.patch(targetMembership._id, { role: "admin" });
  },
});

export const listMembers = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify caller is a member
    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status === "declined") {
      throw new Error("Not a member of this event");
    }

    const members = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_status", (q) =>
        q.eq("eventId", args.eventId).eq("status", "accepted")
      )
      .take(100);

    return await Promise.all(
      members.map(async (m) => ({
        ...m,
        user: await ctx.db.get(m.userId),
      }))
    );
  },
});

export const listInviteStatuses = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new Error("Creator access required");
    }

    const statuses = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_status", (q) => q.eq("eventId", args.eventId))
      .take(500);

    return await Promise.all(
      statuses.map(async (member) => ({
        ...member,
        user: await ctx.db.get(member.userId),
      }))
    );
  },
});

export const listMyInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const invitations = await ctx.db
      .query("eventMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "invited")
      )
      .take(50);

    const rows = await Promise.all(
      invitations.map(async (inv) => {
        const event = await ctx.db.get(inv.eventId);
        return event && !isEventEnded(event)
          ? {
              ...inv,
              event,
            }
          : null;
      })
    );

    return rows.filter((row) => row !== null);
  },
});

export const updatePosition = mutation({
  args: {
    eventId: v.id("events"),
    latitude: v.number(),
    longitude: v.number(),
    heading: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await writeMemberPosition(ctx, {
      eventId: args.eventId,
      userId: user._id,
      latitude: args.latitude,
      longitude: args.longitude,
      heading: args.heading,
      timestamp: Date.now(),
    });
  },
});

export const markInPosition = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    assertEventIsActive(event, now);

    const membership = await getAcceptedEventMembership(ctx, args.eventId, user._id);
    const assignment = await ctx.db
      .query("eventPointAssignments")
      .withIndex("by_eventId_and_assignedUserId", (q) =>
        q.eq("eventId", args.eventId).eq("assignedUserId", user._id)
      )
      .unique();

    if (!assignment) {
      throw new Error("No assigned pass");
    }

    if (membership.inPositionTargetKey === assignment.targetKey) {
      return membership._id;
    }

    await ctx.db.patch(membership._id, {
      inPositionMarkedAt: now,
      inPositionTargetKey: assignment.targetKey,
    });

    const messageId = await insertHuntMessage(ctx, {
      body: `${user.name} är på plats.`,
      eventId: args.eventId,
      targetKey: assignment.targetKey,
      type: "member_in_position",
      userId: user._id,
    });
    await markMembershipReadThroughMessage(ctx, membership._id, messageId);

    return membership._id;
  },
});

export const clearInPosition = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    assertEventIsActive(event, now);

    const membership = await getAcceptedEventMembership(ctx, args.eventId, user._id);
    const targetKey = membership.inPositionTargetKey;

    if (!targetKey) {
      return membership._id;
    }

    await ctx.db.patch(membership._id, {
      inPositionMarkedAt: undefined,
      inPositionTargetKey: undefined,
    });

    const messageId = await insertHuntMessage(ctx, {
      body: `${user.name} är inte längre markerad på plats.`,
      eventId: args.eventId,
      targetKey,
      type: "member_left_position",
      userId: user._id,
    });
    await markMembershipReadThroughMessage(ctx, membership._id, messageId);

    return membership._id;
  },
});
