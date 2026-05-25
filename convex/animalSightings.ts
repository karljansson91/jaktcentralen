import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getAcceptedEventMembership } from "./eventAccess";
import { isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";

const animalValidator = v.union(
  v.literal("elk"),
  v.literal("deer"),
  v.literal("boar"),
  v.literal("fox"),
  v.literal("other")
);

type AnimalSightingKind = Doc<"animalSightings">["animal"];

const ANIMAL_SIGHTING_LABELS: Record<AnimalSightingKind, string> = {
  boar: "Vildsvin",
  deer: "Rådjur",
  elk: "Älg",
  fox: "Räv",
  other: "Annat",
};

async function attachUsers(ctx: QueryCtx, sightings: Doc<"animalSightings">[]) {
  const userIds = Array.from(new Set(sightings.map((sighting) => sighting.userId)));
  const usersById = new Map<Id<"users">, Doc<"users"> | null>(
    await Promise.all(
      userIds.map(async (userId) => [userId, await ctx.db.get(userId)] as const)
    )
  );

  return sightings.map((sighting) => ({
    ...sighting,
    label: ANIMAL_SIGHTING_LABELS[sighting.animal],
    user: usersById.get(sighting.userId) ?? null,
  }));
}

export const report = mutation({
  args: {
    eventId: v.id("events"),
    animal: animalValidator,
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const membership = await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const event = await ctx.db.get(args.eventId);
    if (!event || isEventEnded(event)) {
      throw new Error("This hunt has ended");
    }

    const timestamp = Date.now();
    const sightingId = await ctx.db.insert("animalSightings", {
      eventId: args.eventId,
      userId: user._id,
      animal: args.animal,
      latitude: args.latitude,
      longitude: args.longitude,
      timestamp,
    });

    const messageId = await ctx.db.insert("messages", {
      eventId: args.eventId,
      userId: user._id,
      body: `Såg ${ANIMAL_SIGHTING_LABELS[args.animal].toLowerCase()} på kartan.`,
    });
    await ctx.db.patch(sightingId, { messageId });

    const message = await ctx.db.get(messageId);
    if (message) {
      await ctx.db.patch(membership._id, { lastReadMessageAt: message._creationTime });
    }

    return sightingId;
  },
});

export const acknowledge = mutation({
  args: { sightingId: v.id("animalSightings") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const sighting = await ctx.db.get(args.sightingId);
    if (!sighting) {
      throw new Error("Sighting not found");
    }

    await getAcceptedEventMembership(ctx, sighting.eventId, user._id);

    const existing = await ctx.db
      .query("animalSightingAcknowledgements")
      .withIndex("by_sightingId_and_userId", (q) =>
        q.eq("sightingId", args.sightingId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("animalSightingAcknowledgements", {
      eventId: sighting.eventId,
      sightingId: args.sightingId,
      userId: user._id,
      acknowledgedAt: Date.now(),
    });
  },
});

export const listVisible = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const [sightings, acknowledgements] = await Promise.all([
      ctx.db
        .query("animalSightings")
        .withIndex("by_eventId_and_timestamp", (q) => q.eq("eventId", args.eventId))
        .order("desc")
        .take(100),
      ctx.db
        .query("animalSightingAcknowledgements")
        .withIndex("by_eventId_and_userId", (q) =>
          q.eq("eventId", args.eventId).eq("userId", user._id)
        )
        .order("desc")
        .take(500),
    ]);

    const acknowledgedIds = new Set(acknowledgements.map((row) => row.sightingId));
    return await attachUsers(
      ctx,
      sightings.filter((sighting) => !acknowledgedIds.has(sighting._id)).reverse()
    );
  },
});

export const listForReplay = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const sightings = await ctx.db
      .query("animalSightings")
      .withIndex("by_eventId_and_timestamp", (q) => q.eq("eventId", args.eventId))
      .order("asc")
      .take(500);

    return await attachUsers(ctx, sightings);
  },
});
