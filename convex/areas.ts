import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteEventCascade } from "./eventCleanup";
import { getCurrentUser } from "./helpers";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    polygon: v.array(
      v.object({ latitude: v.number(), longitude: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const areaId = await ctx.db.insert("areas", {
      name: args.name,
      description: args.description,
      creatorId: user._id,
      polygon: args.polygon,
    });

    return areaId;
  },
});

export const get = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized");
    }
    return area;
  },
});

export const update = mutation({
  args: {
    areaId: v.id("areas"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    polygon: v.optional(
      v.array(v.object({ latitude: v.number(), longitude: v.number() }))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized");
    }

    const { areaId, ...updates } = args;
    await ctx.db.patch(areaId, updates);
  },
});

export const remove = mutation({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized");
    }

    const points = await ctx.db
      .query("areaPoints")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .collect();
    for (const p of points) {
      await ctx.db.delete(p._id);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .collect();
    for (const event of events) {
      await deleteEventCascade(ctx, event._id);
    }

    await ctx.db.delete(args.areaId);
  },
});

export const getForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify caller is a member of the event
    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status === "declined") {
      throw new Error("Not a member of this event");
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const area = await ctx.db.get(event.areaId);
    if (!area) {
      throw new Error("Area not found");
    }

    return area;
  },
});

export const listMyAreas = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    return await ctx.db
      .query("areas")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", user._id))
      .take(50);
  },
});
