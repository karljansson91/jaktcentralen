import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    area: v.array(v.object({ latitude: v.number(), longitude: v.number() })),
    joinCode: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.joinCode !== undefined) {
      if (args.joinCode.length > 50 || args.joinCode !== args.joinCode.toLowerCase()) {
        throw new Error("Join code must be lowercase and max 50 characters");
      }
    }

    const huntId = await ctx.db.insert("hunts", {
      title: args.title,
      description: args.description,
      creatorId: user._id,
      area: args.area,
      joinCode: args.joinCode,
      startDate: args.startDate,
      endDate: args.endDate,
    });

    await ctx.db.insert("huntMembers", {
      huntId,
      userId: user._id,
      role: "admin",
      status: "accepted",
    });

    return huntId;
  },
});

export const get = query({
  args: { huntId: v.id("hunts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const hunt = await ctx.db.get(args.huntId);
    if (!hunt) {
      throw new Error("Hunt not found");
    }

    const membership = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status === "declined") {
      throw new Error("Not a member of this hunt");
    }

    return hunt;
  },
});

export const update = mutation({
  args: {
    huntId: v.id("hunts"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    area: v.optional(
      v.array(v.object({ latitude: v.number(), longitude: v.number() }))
    ),
    joinCode: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", user._id)
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

    const { huntId, ...updates } = args;
    await ctx.db.patch(huntId, updates);
  },
});

export const remove = mutation({
  args: { huntId: v.id("hunts") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const membership = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", args.huntId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Cascade delete all related data
    const members = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_status", (q) => q.eq("huntId", args.huntId))
      .take(500);
    for (const m of members) {
      await ctx.db.delete(m._id);
    }

    const points = await ctx.db
      .query("huntPoints")
      .withIndex("by_huntId", (q) => q.eq("huntId", args.huntId))
      .take(500);
    for (const p of points) {
      await ctx.db.delete(p._id);
    }

    const trails = await ctx.db
      .query("positionTrails")
      .withIndex("by_huntId", (q) => q.eq("huntId", args.huntId))
      .take(5000);
    for (const t of trails) {
      await ctx.db.delete(t._id);
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_huntId", (q) => q.eq("huntId", args.huntId))
      .take(5000);
    for (const m of messages) {
      await ctx.db.delete(m._id);
    }

    await ctx.db.delete(args.huntId);
  },
});

export const listMyHunts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const memberships = await ctx.db
      .query("huntMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "accepted")
      )
      .take(50);

    const hunts = await Promise.all(
      memberships.map(async (m) => {
        const hunt = await ctx.db.get(m.huntId);
        return hunt ? { ...hunt, role: m.role } : null;
      })
    );

    return hunts.filter((h) => h !== null);
  },
});

export const joinByCode = mutation({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const hunt = await ctx.db
      .query("hunts")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", args.joinCode))
      .unique();

    if (!hunt) {
      throw new Error("Invalid join code");
    }

    const existing = await ctx.db
      .query("huntMembers")
      .withIndex("by_huntId_and_userId", (q) =>
        q.eq("huntId", hunt._id).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      throw new Error("Already a member of this hunt");
    }

    await ctx.db.insert("huntMembers", {
      huntId: hunt._id,
      userId: user._id,
      role: "member",
      status: "accepted",
    });

    return hunt._id;
  },
});
