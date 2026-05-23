import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";
import type { UserIdentity } from "convex/server";

function getDisplayName(identity: UserIdentity) {
  const fullName = [identity.givenName, identity.familyName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const emailName = identity.email?.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  return (
    identity.name?.trim() ||
    fullName ||
    identity.nickname?.trim() ||
    identity.preferredUsername?.trim() ||
    emailName ||
    "Jägare"
  );
}

export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: getDisplayName(identity),
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkId: identity.subject,
      name: getDisplayName(identity),
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl,
    });
  },
});

export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    return user;
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const searchTerm = args.query.trim().toLowerCase();
    if (searchTerm.length < 2) {
      return [];
    }

    const [nameResults, emailResults] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_name", (q) => q.search("name", searchTerm))
        .take(20),
      ctx.db
        .query("users")
        .withSearchIndex("search_email", (q) => q.search("email", searchTerm))
        .take(20),
    ]);

    const matches = new Map(
      [...nameResults, ...emailResults]
        .filter((u) => u._id !== currentUser._id)
        .map((u) => [u._id, u])
    );

    return Array.from(matches.values()).slice(0, 20);
  },
});
