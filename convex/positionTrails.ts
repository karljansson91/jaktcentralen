import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";
import { writeMemberPosition } from "./positionTracking";

export const record = mutation({
  args: {
    eventId: v.id("events"),
    latitude: v.number(),
    longitude: v.number(),
    heading: v.optional(v.number()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await writeMemberPosition(ctx, {
      eventId: args.eventId,
      userId: user._id,
      latitude: args.latitude,
      longitude: args.longitude,
      heading: args.heading,
      timestamp: args.timestamp,
    });
  },
});

export const listByEvent = query({
  args: { eventId: v.id("events") },
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

    return await ctx.db
      .query("positionTrails")
      .withIndex("by_eventId_and_timestamp", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();
  },
});

export const listReplayByEvent = query({
  args: { eventId: v.id("events") },
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

    const trails = await ctx.db
      .query("positionTrails")
      .withIndex("by_eventId_and_timestamp", (q) =>
        q.eq("eventId", args.eventId)
      )
      .collect();

    const usersById = new Map<Id<"users">, Doc<"users"> | null>();
    for (const trail of trails) {
      if (!usersById.has(trail.userId)) {
        usersById.set(trail.userId, await ctx.db.get(trail.userId));
      }
    }

    return trails.map((trail) => ({
      ...trail,
      user: usersById.get(trail.userId) ?? null,
    }));
  },
});

export const listByMember = query({
  args: { eventId: v.id("events"), userId: v.id("users") },
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

    return await ctx.db
      .query("positionTrails")
      .withIndex("by_eventId_and_userId_and_timestamp", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .collect();
  },
});
