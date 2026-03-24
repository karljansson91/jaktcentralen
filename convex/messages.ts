import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser } from "./helpers";

export const send = mutation({
  args: { eventId: v.id("events"), body: v.string() },
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

    return await ctx.db.insert("messages", {
      eventId: args.eventId,
      userId: user._id,
      body: args.body,
    });
  },
});

export const list = query({
  args: { eventId: v.id("events"), paginationOpts: paginationOptsValidator },
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

    const results = await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
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
