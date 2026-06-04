import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./helpers";

const categoryValidator = v.union(
  v.literal("pass"),
  v.literal("parking"),
  v.literal("meeting")
);

const pointValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

const imageFileIdsValidator = v.optional(v.array(v.id("_storage")));

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

function ensureImageLimit(imageFileIds?: Id<"_storage">[]) {
  if (imageFileIds && imageFileIds.length > 5) {
    throw new Error("Max 5 images per marker");
  }
}

function ensureValidSaveTarget({
  areaId,
  featureId,
}: {
  areaId?: Id<"areas">;
  featureId?: Id<"areaFeatures">;
}) {
  if (!featureId && !areaId) {
    throw new Error("Area is required when creating a marker");
  }
}

async function resolveSaveTarget(
  ctx: MutationCtx,
  args: {
    areaId?: Id<"areas">;
    featureId?: Id<"areaFeatures">;
  },
  userId: Id<"users">
) {
  ensureValidSaveTarget(args);

  if (args.featureId) {
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error("Marker not found");
    }
    await verifyAreaCreator(ctx, feature.areaId, userId);
    return {
      mode: "feature" as const,
      areaId: feature.areaId,
      creatorId: feature.creatorId,
      featureId: feature._id,
    };
  }

  const area = await verifyAreaCreator(ctx, args.areaId!, userId);
  return {
    mode: "create" as const,
    areaId: area._id,
    creatorId: area.creatorId,
  };
}

async function buildImageUrls(
  ctx: QueryCtx,
  imageFileIds?: Id<"_storage">[]
): Promise<{ fileId: Id<"_storage">; url: string }[]> {
  if (!imageFileIds || imageFileIds.length === 0) {
    return [];
  }

  const urls = await Promise.all(
    imageFileIds.map(async (fileId) => {
      const url = await ctx.storage.getUrl(fileId);
      return url ? { fileId, url } : null;
    })
  );

  return urls.filter((item): item is { fileId: Id<"_storage">; url: string } => item !== null);
}

async function mapFeatureForClient(ctx: QueryCtx, feature: Doc<"areaFeatures">) {
  const images = await buildImageUrls(ctx, feature.imageFileIds);
  return {
    id: feature._id,
    name: feature.name,
    category: feature.category,
    color: feature.color,
    geometryType: "point" as const,
    point: feature.point,
    images,
    imageUrls: images.map((image) => image.url),
    ...(feature.description ? { description: feature.description } : {}),
  };
}

async function listAreaFeaturesInternal(ctx: QueryCtx, areaId: Id<"areas">) {
  const features = await ctx.db
    .query("areaFeatures")
    .withIndex("by_areaId", (q) => q.eq("areaId", areaId))
    .take(500);

  return await Promise.all(features.map((feature) => mapFeatureForClient(ctx, feature)));
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const listByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await verifyAreaCreator(ctx, args.areaId, user._id);
    return await listAreaFeaturesInternal(ctx, args.areaId);
  },
});

export const listForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const areaId = await verifyEventMemberAreaId(ctx, args.eventId, user._id);
    return await listAreaFeaturesInternal(ctx, areaId);
  },
});

export const get = query({
  args: { featureId: v.id("areaFeatures") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error("Marker not found");
    }
    await verifyAreaCreator(ctx, feature.areaId, user._id);
    return await mapFeatureForClient(ctx, feature);
  },
});

export const save = mutation({
  args: {
    areaId: v.optional(v.id("areas")),
    featureId: v.optional(v.id("areaFeatures")),
    name: v.string(),
    description: v.optional(v.string()),
    category: categoryValidator,
    color: v.string(),
    point: pointValidator,
    imageFileIds: imageFileIdsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    ensureImageLimit(args.imageFileIds);

    const target = await resolveSaveTarget(
      ctx,
      {
        areaId: args.areaId,
        featureId: args.featureId,
      },
      user._id
    );

    const nextDocument = {
      areaId: target.areaId,
      creatorId: target.creatorId,
      name: args.name.trim(),
      category: args.category,
      color: args.color,
      point: args.point,
      ...(args.description ? { description: args.description } : {}),
      ...(args.imageFileIds ? { imageFileIds: args.imageFileIds } : {}),
    };

    switch (target.mode) {
      case "feature":
        await ctx.db.replace(target.featureId, nextDocument);
        return target.featureId;
      case "create":
        return await ctx.db.insert("areaFeatures", nextDocument);
    }
  },
});

export const remove = mutation({
  args: {
    featureId: v.id("areaFeatures"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error("Marker not found");
    }
    await verifyAreaCreator(ctx, feature.areaId, user._id);
    await ctx.db.delete(args.featureId);
  },
});
