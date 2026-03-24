import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";

export const invite = mutation({
  args: { eventId: v.id("events"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify current user is accepted member
    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status !== "accepted") {
      throw new Error("Must be an accepted member to invite");
    }

    // Verify target is a friend
    const friendship1 = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_and_addresseeId", (q) =>
        q.eq("requesterId", user._id).eq("addresseeId", args.userId)
      )
      .unique();
    const friendship2 = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_and_addresseeId", (q) =>
        q.eq("requesterId", args.userId).eq("addresseeId", user._id)
      )
      .unique();

    const isFriend =
      (friendship1 && friendship1.status === "accepted") ||
      (friendship2 && friendship2.status === "accepted");
    if (!isFriend) {
      throw new Error("Can only invite friends");
    }

    // Check not already member
    const existing = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .unique();

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

    // Verify current user is admin
    const adminMembership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!adminMembership || adminMembership.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Can't remove the creator
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
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

    return await Promise.all(
      invitations.map(async (inv) => ({
        ...inv,
        event: await ctx.db.get(inv.eventId),
      }))
    );
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

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status !== "accepted") {
      throw new Error("Not an accepted member");
    }

    await ctx.db.patch(membership._id, {
      lastLatitude: args.latitude,
      lastLongitude: args.longitude,
      lastHeading: args.heading,
      lastSeenAt: Date.now(),
    });
  },
});
