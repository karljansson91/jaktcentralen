import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { getAcceptedEventMembership } from "./eventAccess";
import { isEventEnded } from "../lib/event-lifecycle";
import { getCurrentUser } from "./helpers";
import { recordHuntActivity } from "./huntActivity";
import {
  ANIMAL_SIGHTING_LABELS,
  type AnimalSightingKind,
} from "./animalSightingModel";

const animalValidator = v.union(
  v.literal("elk"),
  v.literal("deer"),
  v.literal("boar"),
  v.literal("fox"),
  v.literal("other")
);

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
  returns: v.id("animalSightings"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

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

    await recordHuntActivity(ctx, {
      activity: {
        kind: "animal_sighting",
        sightingId,
      },
      actor: user,
      eventId: args.eventId,
    });

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
