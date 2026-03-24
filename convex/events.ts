import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";

export const create = mutation({
  args: {
    areaId: v.id("areas"),
    title: v.string(),
    description: v.optional(v.string()),
    joinCode: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify caller owns the area
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized to create events in this area");
    }

    if (args.joinCode !== undefined) {
      if (args.joinCode.length > 50 || args.joinCode !== args.joinCode.toLowerCase()) {
        throw new Error("Join code must be lowercase and max 50 characters");
      }
    }

    const eventId = await ctx.db.insert("events", {
      areaId: args.areaId,
      title: args.title,
      description: args.description,
      creatorId: user._id,
      joinCode: args.joinCode,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    await ctx.db.insert("eventMembers", {
      eventId,
      userId: user._id,
      role: "admin",
      status: "accepted",
    });

    return eventId;
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status === "declined") {
      throw new Error("Not a member of this event");
    }

    return event;
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    joinCode: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Admin access required");
    }

    if (args.joinCode !== undefined) {
      if (args.joinCode.length > 50 || args.joinCode !== args.joinCode.toLowerCase()) {
        throw new Error("Join code must be lowercase and max 50 characters");
      }
    }

    const { eventId, ...updates } = args;
    await ctx.db.patch(eventId, updates);
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Admin access required");
    }

    const members = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_status", (q) => q.eq("eventId", args.eventId))
      .take(500);
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    const trails = await ctx.db
      .query("positionTrails")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(5000);
    for (const t of trails) {
      await ctx.db.delete(t._id);
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(5000);
    for (const m of messages) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.eventId);
  },
});

export const listMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const memberships = await ctx.db
      .query("eventMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "accepted")
      )
      .take(50);

    const events = await Promise.all(
      memberships.map(async (m) => {
        const event = await ctx.db.get(m.eventId);
        return event ? { ...event, role: m.role } : null;
      })
    );

    return events.filter((e) => e !== null);
  },
});

export const listByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify caller owns the area
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("events")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .take(50);
  },
});

export const joinByCode = mutation({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db
      .query("events")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!event) {
      throw new Error("Invalid join code");
    }

    const existing = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", event._id).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      throw new Error("Already a member of this event");
    }

    await ctx.db.insert("eventMembers", {
      eventId: event._id,
      userId: user._id,
      role: "member",
      status: "accepted",
    });

    return event._id;
  },
});
