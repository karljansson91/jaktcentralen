import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser } from "./helpers";

export const send = mutation({
  args: { huntId: v.id("hunts"), body: v.string() },
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

    return await ctx.db.insert("messages", {
      huntId: args.huntId,
      userId: user._id,
      body: args.body,
    });
  },
});

export const list = query({
  args: { huntId: v.id("hunts"), paginationOpts: paginationOptsValidator },
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

    const results = await ctx.db
      .query("messages")
      .withIndex("by_huntId", (q) => q.eq("huntId", args.huntId))
      .order("desc")
      .paginate(args.paginationOpts);

    // Join user profiles
    const page = await Promise.all(
      results.page.map(async (msg) => ({
        ...msg,
        user: await ctx.db.get(msg.userId),
      }))
    );

    return { ...results, page };
  },
});
