import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";

export const sendRequest = mutation({
  args: { addresseeId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    if (args.addresseeId === user._id) {
      throw new Error("Cannot send friend request to yourself");
    }

    // Check both directions for existing friendship
    const existing1 = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_and_addresseeId", (q) =>
        q.eq("requesterId", user._id).eq("addresseeId", args.addresseeId)
      )
      .unique();
    if (existing1) {
      throw new Error("Friend request already exists");
    }

    const existing2 = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_and_addresseeId", (q) =>
        q.eq("requesterId", args.addresseeId).eq("addresseeId", user._id)
      )
      .unique();
    if (existing2) {
      throw new Error("Friend request already exists");
    }

    return await ctx.db.insert("friendships", {
      requesterId: user._id,
      addresseeId: args.addresseeId,
      status: "pending",
    });
  },
});

export const acceptRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friendship not found");
    }
    if (friendship.addresseeId !== user._id) {
      throw new Error("Not authorized");
    }
    if (friendship.status !== "pending") {
      throw new Error("Request is not pending");
    }
    await ctx.db.patch(args.friendshipId, { status: "accepted" });
  },
});

export const declineRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friendship not found");
    }
    if (friendship.addresseeId !== user._id) {
      throw new Error("Not authorized");
    }
    if (friendship.status !== "pending") {
      throw new Error("Request is not pending");
    }
    await ctx.db.delete(args.friendshipId);
  },
});

export const removeFriend = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) {
      throw new Error("Friendship not found");
    }
    if (
      friendship.requesterId !== user._id &&
      friendship.addresseeId !== user._id
    ) {
      throw new Error("Not authorized");
    }
    if (friendship.status !== "accepted") {
      throw new Error("Not an accepted friendship");
    }
    await ctx.db.delete(args.friendshipId);
  },
});

export const listFriends = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_and_status", (q) =>
        q.eq("requesterId", user._id).eq("status", "accepted")
      )
      .take(100);

    const asAddressee = await ctx.db
      .query("friendships")
      .withIndex("by_addresseeId_and_status", (q) =>
        q.eq("addresseeId", user._id).eq("status", "accepted")
      )
      .take(100);

    const friends = await Promise.all([
      ...asRequester.map(async (f) => ({
        friendshipId: f._id,
        user: await ctx.db.get(f.addresseeId),
      })),
      ...asAddressee.map(async (f) => ({
        friendshipId: f._id,
        user: await ctx.db.get(f.requesterId),
      })),
    ]);

    return friends.filter((f) => f.user !== null);
  },
});

export const listPendingReceived = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const pending = await ctx.db
      .query("friendships")
      .withIndex("by_addresseeId_and_status", (q) =>
        q.eq("addresseeId", user._id).eq("status", "pending")
      )
      .take(100);

    return await Promise.all(
      pending.map(async (f) => ({
        friendshipId: f._id,
        user: await ctx.db.get(f.requesterId),
      }))
    );
  },
});

export const listPendingSent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const pending = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_and_status", (q) =>
        q.eq("requesterId", user._id).eq("status", "pending")
      )
      .take(100);

    return await Promise.all(
      pending.map(async (f) => ({
        friendshipId: f._id,
        user: await ctx.db.get(f.addresseeId),
      }))
    );
  },
});
