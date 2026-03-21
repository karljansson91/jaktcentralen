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

async function verifyAcceptedMember(
  ctx: QueryCtx | MutationCtx,
  huntId: Id<"hunts">,
  userId: Id<"users">
) {
  const membership = await ctx.db
    .query("huntMembers")
    .withIndex("by_huntId_and_userId", (q) =>
      q.eq("huntId", huntId).eq("userId", userId)
    )
    .unique();
  if (!membership || membership.status !== "accepted") {
    throw new Error("Not an accepted member");
  }
  return membership;
}

export const add = mutation({
  args: {
    huntId: v.id("hunts"),
    name: v.string(),
    description: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    type: pointTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await verifyAcceptedMember(ctx, args.huntId, user._id);

    return await ctx.db.insert("huntPoints", {
      huntId: args.huntId,
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
    pointId: v.id("huntPoints"),
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
    await verifyAcceptedMember(ctx, point.huntId, user._id);

    const { pointId, ...updates } = args;
    await ctx.db.patch(pointId, updates);
  },
});

export const remove = mutation({
  args: { pointId: v.id("huntPoints") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const point = await ctx.db.get(args.pointId);
    if (!point) {
      throw new Error("Point not found");
    }
    await verifyAcceptedMember(ctx, point.huntId, user._id);
    await ctx.db.delete(args.pointId);
  },
});

export const listByHunt = query({
  args: { huntId: v.id("hunts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await verifyAcceptedMember(ctx, args.huntId, user._id);

    return await ctx.db
      .query("huntPoints")
      .withIndex("by_huntId", (q) => q.eq("huntId", args.huntId))
      .take(200);
  },
});
