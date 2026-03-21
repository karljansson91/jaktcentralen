import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";

export const record = mutation({
  args: {
    huntId: v.id("hunts"),
    latitude: v.number(),
    longitude: v.number(),
    heading: v.optional(v.number()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status !== "accepted") {
      throw new Error("Not an accepted member");
    }

    await ctx.db.insert("positionTrails", {
      huntId: args.huntId,
      userId: user._id,
      latitude: args.latitude,
      longitude: args.longitude,
      heading: args.heading,
      timestamp: args.timestamp,
    });

    // Update denormalized latest position on huntMembers
    await ctx.db.patch(membership._id, {
      lastLatitude: args.latitude,
      lastLongitude: args.longitude,
      lastHeading: args.heading,
      lastSeenAt: args.timestamp,
    });
  },
});

export const listByHunt = query({
  args: { huntId: v.id("hunts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status !== "accepted") {
      throw new Error("Not an accepted member");
    }

    return await ctx.db
      .query("positionTrails")
      .withIndex("by_huntId", (q) => q.eq("huntId", args.huntId))
      .take(5000);
  },
});

export const listByMember = query({
  args: { huntId: v.id("hunts"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status !== "accepted") {
      throw new Error("Not an accepted member");
    }

    return await ctx.db
      .query("positionTrails")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", args.userId)
      )
      .take(5000);
  },
});
