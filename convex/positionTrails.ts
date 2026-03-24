import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";

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

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status !== "accepted") {
      throw new Error("Not an accepted member");
    }

    await ctx.db.insert("positionTrails", {
      eventId: args.eventId,
      userId: user._id,
      latitude: args.latitude,
      longitude: args.longitude,
      heading: args.heading,
      timestamp: args.timestamp,
    });

    // Update denormalized latest position on eventMembers
    await ctx.db.patch(membership._id, {
      lastLatitude: args.latitude,
      lastLongitude: args.longitude,
      lastHeading: args.heading,
      lastSeenAt: args.timestamp,
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
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .take(5000);
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
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .take(5000);
  },
});
