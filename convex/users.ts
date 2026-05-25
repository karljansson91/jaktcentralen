import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./helpers";
import type { UserIdentity } from "convex/server";
import type { Doc } from "./_generated/dataModel";

const PROFILE_TEXT_MAX_LENGTH = 120;
const PHONE_DIGIT_MIN_SEARCH_LENGTH = 4;

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

function normalizeContactEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/[^\d+]/g, "").trim();
}

function getPhoneSearch(phoneNumber: string | undefined) {
  const digits = phoneNumber?.replace(/\D/g, "") ?? "";
  return digits.length >= PHONE_DIGIT_MIN_SEARCH_LENGTH ? digits : undefined;
}

function normalizeProfileText(value: string, fallback: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.slice(0, PROFILE_TEXT_MAX_LENGTH) || fallback;
}

function getClerkProfile(identity: UserIdentity) {
  return {
    clerkEmail: identity.email ?? "",
    clerkImageUrl: identity.pictureUrl,
    clerkName: getDisplayName(identity),
  };
}

function mergeUsers(...groups: Doc<"users">[][]) {
  const matches = new Map<string, Doc<"users">>();

  for (const group of groups) {
    for (const user of group) {
      matches.set(user._id, user);
    }
  }

  return Array.from(matches.values());
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
    const clerkProfile = getClerkProfile(identity);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...clerkProfile,
        imageUrl: clerkProfile.clerkImageUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      clerkId: identity.subject,
      ...clerkProfile,
      name: clerkProfile.clerkName,
      email: clerkProfile.clerkEmail,
      imageUrl: clerkProfile.clerkImageUrl,
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

    const phoneSearchTerm = searchTerm.replace(/\D/g, "");
    const phoneSearch =
      phoneSearchTerm.length >= PHONE_DIGIT_MIN_SEARCH_LENGTH
        ? ctx.db
            .query("users")
            .withSearchIndex("search_phoneSearch", (q) =>
              q.search("phoneSearch", phoneSearchTerm)
            )
            .take(20)
        : Promise.resolve([]);

    const [nameResults, emailResults, phoneResults] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_name", (q) => q.search("name", searchTerm))
        .take(20),
      ctx.db
        .query("users")
        .withSearchIndex("search_email", (q) => q.search("email", searchTerm))
        .take(20),
      phoneSearch,
    ]);

    const matches = mergeUsers(nameResults, emailResults, phoneResults).filter(
      (u) => u._id !== currentUser._id
    );

    return matches.slice(0, 20);
  },
});

export const updateAppProfile = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    phoneNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const name = normalizeProfileText(args.name, user.clerkName || user.name || "Jägare");
    const email = normalizeContactEmail(args.email);
    const phoneNumber = args.phoneNumber
      ? normalizePhoneNumber(args.phoneNumber)
      : undefined;

    await ctx.db.patch(user._id, {
      email,
      name,
      phoneNumber,
      phoneSearch: getPhoneSearch(phoneNumber),
    });
  },
});
