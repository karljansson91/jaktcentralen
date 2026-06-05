import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { isPolygonInsidePolygon } from "./geometry";
import { getCurrentUser } from "./helpers";

const pointValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

const polygonValidator = v.array(pointValidator);

async function verifyAreaCreator(
  ctx: QueryCtx | MutationCtx,
  areaId: Id<"areas">,
  userId: Id<"users">
) {
  const area = await ctx.db.get(areaId);
  if (!area || area.deletedAt !== undefined) {
    throw new Error("Area not found");
  }
  if (area.creatorId !== userId) {
    throw new Error("Not authorized");
  }
  return area;
}

async function verifyEventMemberAreaId(
  ctx: QueryCtx,
  eventId: Id<"events">,
  userId: Id<"users">
) {
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();

  if (!membership || membership.status === "declined") {
    throw new Error("Not a member of this event");
  }

  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  return event.areaId;
}

function ensurePolygonPoints(polygon: { latitude: number; longitude: number }[]) {
  if (polygon.length < 3) {
    throw new Error("Såten behöver minst tre punkter");
  }
}

async function ensureSatCanBeSaved(
  ctx: QueryCtx | MutationCtx,
  area: Doc<"areas">,
  polygon: { latitude: number; longitude: number }[]
) {
  ensurePolygonPoints(polygon);

  if (!isPolygonInsidePolygon(polygon, area.polygon)) {
    throw new Error("Såten måste ligga inom jaktmarken");
  }
}

function mapSatForClient(sat: Doc<"areaSats">) {
  return {
    id: sat._id,
    areaId: sat.areaId,
    name: sat.name,
    color: sat.color,
    polygon: sat.polygon,
  };
}

export const listByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await verifyAreaCreator(ctx, args.areaId, user._id);
    const sats = await ctx.db
      .query("areaSats")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .take(500);

    return sats.map(mapSatForClient);
  },
});

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const areaId = await verifyEventMemberAreaId(ctx, args.eventId, user._id);
    const sats = await ctx.db
      .query("areaSats")
      .withIndex("by_areaId", (q) => q.eq("areaId", areaId))
      .take(500);

    return sats.map(mapSatForClient);
  },
});

export const get = query({
  args: { satId: v.id("areaSats") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const sat = await ctx.db.get(args.satId);
    if (!sat) {
      throw new Error("Såt not found");
    }
    await verifyAreaCreator(ctx, sat.areaId, user._id);
    return mapSatForClient(sat);
  },
});

export const save = mutation({
  args: {
    areaId: v.optional(v.id("areas")),
    satId: v.optional(v.id("areaSats")),
    name: v.string(),
    color: v.string(),
    polygon: polygonValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const existing = args.satId ? await ctx.db.get(args.satId) : null;
    if (args.satId && !existing) {
      throw new Error("Såt not found");
    }
    if (!existing && !args.areaId) {
      throw new Error("Area is required when creating a såt");
    }

    const area = await verifyAreaCreator(
      ctx,
      existing?.areaId ?? args.areaId!,
      user._id
    );
    await ensureSatCanBeSaved(ctx, area, args.polygon);

    const nextDocument = {
      areaId: area._id,
      creatorId: area.creatorId,
      name: args.name.trim(),
      color: args.color,
      polygon: args.polygon,
    };

    if (existing) {
      await ctx.db.replace(existing._id, nextDocument);
      return existing._id;
    }

    return await ctx.db.insert("areaSats", nextDocument);
  },
});

export const remove = mutation({
  args: { satId: v.id("areaSats") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const sat = await ctx.db.get(args.satId);
    if (!sat) {
      throw new Error("Såt not found");
    }
    await verifyAreaCreator(ctx, sat.areaId, user._id);
    await ctx.db.delete(args.satId);
  },
});
