import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getCurrentUser } from "./helpers";

const pointTypeValidator = v.union(
  v.literal("pass"),
  v.literal("tower"),
  v.literal("meeting"),
  v.literal("parking"),
  v.literal("other")
);

async function verifyAreaCreator(
  ctx: QueryCtx | MutationCtx,
  areaId: Id<"areas">,
  userId: Id<"users">
) {
  const area = await ctx.db.get(areaId);
  if (!area) {
    throw new Error("Area not found");
  }
  if (area.creatorId !== userId) {
    throw new Error("Not authorized");
  }
  return area;
}

export const add = mutation({
  args: {
    areaId: v.id("areas"),
    name: v.string(),
    description: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    type: pointTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await verifyAreaCreator(ctx, args.areaId, user._id);

    return await ctx.db.insert("areaPoints", {
      areaId: args.areaId,
      name: args.name,
      description: args.description,
      latitude: args.latitude,
      longitude: args.longitude,
      type: args.type,
    });
  },
});

export const update = mutation({
  args: {
    pointId: v.id("areaPoints"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    type: v.optional(pointTypeValidator),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const point = await ctx.db.get(args.pointId);
    if (!point) {
      throw new Error("Point not found");
    }
    await verifyAreaCreator(ctx, point.areaId, user._id);

    const { pointId, ...updates } = args;
    await ctx.db.patch(pointId, updates);
  },
});

export const remove = mutation({
  args: { pointId: v.id("areaPoints") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const point = await ctx.db.get(args.pointId);
    if (!point) {
      throw new Error("Point not found");
    }
    await verifyAreaCreator(ctx, point.areaId, user._id);
    await ctx.db.delete(args.pointId);
  },
});

export const listByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await verifyAreaCreator(ctx, args.areaId, user._id);

    return await ctx.db
      .query("areaPoints")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .take(200);
  },
});

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

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

    return await ctx.db
      .query("areaPoints")
      .withIndex("by_areaId", (q) => q.eq("areaId", event.areaId))
      .take(200);
  },
});
