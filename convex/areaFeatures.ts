import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./helpers";

const categoryValidator = v.union(
  v.literal("tower"),
  v.literal("parking"),
  v.literal("meeting"),
  v.literal("custom")
);

const pointValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

const polygonValidator = v.array(pointValidator);
const imageFileIdsValidator = v.optional(v.array(v.id("_storage")));
const geometryTypeValidator = v.union(v.literal("point"), v.literal("polygon"));

const LEGACY_POINT_TYPE_TO_CATEGORY = {
  pass: "custom",
  tower: "tower",
  meeting: "meeting",
  parking: "parking",
  other: "custom",
} as const;

const DEFAULT_CATEGORY_COLORS: Record<
  Doc<"areaFeatures">["category"],
  string
> = {
  tower: "#8b5cf6",
  parking: "#6b7280",
  meeting: "#3b82f6",
  custom: "#f59e0b",
};

async function verifyAreaCreator(
  ctx: QueryCtx | MutationCtx,
  areaId: Id<"areas">,
  userId: Id<"users">
) {
  const area = await ctx.db.get(areaId);
  if (!area) {
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
    throw new Error("Max 5 images per feature");
  }
}

function ensurePolygonPoints(polygon: { latitude: number; longitude: number }[]) {
  if (polygon.length < 3) {
    throw new Error("Polygon must contain at least 3 points");
  }
}

function ensurePointCategory(category: Doc<"areaFeatures">["category"]) {
  if (category === "tower" || category === "parking" || category === "meeting" || category === "custom") {
    return;
  }
}

function ensureValidSaveTarget({
  areaId,
  featureId,
  legacyPointId,
}: {
  areaId?: Id<"areas">;
  featureId?: Id<"areaFeatures">;
  legacyPointId?: Id<"areaPoints">;
}) {
  const targetCount = Number(Boolean(featureId)) + Number(Boolean(legacyPointId));
  if (targetCount > 1) {
    throw new Error("Feature target is ambiguous");
  }
  if (targetCount === 0 && !areaId) {
    throw new Error("Area is required when creating a feature");
  }
}

async function resolveSaveTarget(
  ctx: MutationCtx,
  args: {
    areaId?: Id<"areas">;
    featureId?: Id<"areaFeatures">;
    legacyPointId?: Id<"areaPoints">;
  },
  userId: Id<"users">
) {
  ensureValidSaveTarget(args);

  if (args.featureId) {
    const feature = await ctx.db.get(args.featureId);
    if (!feature) {
      throw new Error("Feature not found");
    }
    await verifyAreaCreator(ctx, feature.areaId, userId);
    return {
      mode: "feature" as const,
      areaId: feature.areaId,
      creatorId: feature.creatorId,
      featureId: feature._id,
    };
  }

  if (args.legacyPointId) {
    const point = await ctx.db.get(args.legacyPointId);
    if (!point) {
      throw new Error("Point not found");
    }
    const area = await verifyAreaCreator(ctx, point.areaId, userId);
    return {
      mode: "legacy" as const,
      areaId: point.areaId,
      creatorId: area.creatorId,
      legacyPointId: point._id,
    };
  }

  const area = await verifyAreaCreator(ctx, args.areaId!, userId);
  return {
    mode: "create" as const,
    areaId: area._id,
    creatorId: area.creatorId,
  };
}

function buildFeatureDocument(args: {
  areaId: Id<"areas">;
  creatorId: Id<"users">;
  name: string;
  description?: string;
  category: Doc<"areaFeatures">["category"];
  color: string;
  geometryType: "point" | "polygon";
  point?: { latitude: number; longitude: number };
  polygon?: { latitude: number; longitude: number }[];
  imageFileIds?: Id<"_storage">[];
}) {
  const base = {
    areaId: args.areaId,
    creatorId: args.creatorId,
    name: args.name.trim(),
    category: args.geometryType === "polygon" ? "custom" : args.category,
    color: args.color,
    ...(args.description ? { description: args.description } : {}),
    ...(args.imageFileIds ? { imageFileIds: args.imageFileIds } : {}),
  };

  if (args.geometryType === "point") {
    if (!args.point) {
      throw new Error("Point is required");
    }
    return {
      ...base,
      geometryType: "point" as const,
      point: args.point,
    };
  }

  if (args.category !== "custom") {
    throw new Error("Only custom features can be polygons");
  }
  if (!args.polygon) {
    throw new Error("Polygon is required");
  }

  return {
    ...base,
    geometryType: "polygon" as const,
    polygon: args.polygon,
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
    source: "feature" as const,
    name: feature.name,
    category: feature.category,
    color: feature.color,
    geometryType: feature.geometryType,
    images,
    imageUrls: images.map((image) => image.url),
    ...(feature.description ? { description: feature.description } : {}),
    ...(feature.geometryType === "point" ? { point: feature.point } : {}),
    ...(feature.geometryType === "polygon" ? { polygon: feature.polygon } : {}),
  };
}

function mapLegacyPoint(point: Doc<"areaPoints">) {
  const category = LEGACY_POINT_TYPE_TO_CATEGORY[point.type];
  return {
    id: point._id,
    source: "legacy" as const,
    name: point.name,
    category,
    color: DEFAULT_CATEGORY_COLORS[category],
    geometryType: "point" as const,
    point: {
      latitude: point.latitude,
      longitude: point.longitude,
    },
    images: [] as { fileId: Id<"_storage">; url: string }[],
    imageUrls: [] as string[],
    ...(point.description ? { description: point.description } : {}),
  };
}

async function listAreaFeaturesInternal(ctx: QueryCtx, areaId: Id<"areas">) {
  const [features, legacyPoints] = await Promise.all([
    ctx.db
      .query("areaFeatures")
      .withIndex("by_areaId", (q) => q.eq("areaId", areaId))
      .take(500),
    ctx.db
      .query("areaPoints")
      .withIndex("by_areaId", (q) => q.eq("areaId", areaId))
      .take(500),
  ]);

  const mappedFeatures = await Promise.all(
    features.map((feature) => mapFeatureForClient(ctx, feature))
  );

  return [...mappedFeatures, ...legacyPoints.map(mapLegacyPoint)];
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
      throw new Error("Feature not found");
    }
    await verifyAreaCreator(ctx, feature.areaId, user._id);
    return await mapFeatureForClient(ctx, feature);
  },
});

export const getLegacyPoint = query({
  args: { pointId: v.id("areaPoints") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const point = await ctx.db.get(args.pointId);
    if (!point) {
      throw new Error("Point not found");
    }
    await verifyAreaCreator(ctx, point.areaId, user._id);
    return mapLegacyPoint(point);
  },
});

export const save = mutation({
  args: {
    areaId: v.optional(v.id("areas")),
    featureId: v.optional(v.id("areaFeatures")),
    legacyPointId: v.optional(v.id("areaPoints")),
    name: v.string(),
    description: v.optional(v.string()),
    category: categoryValidator,
    color: v.string(),
    geometryType: geometryTypeValidator,
    point: v.optional(pointValidator),
    polygon: v.optional(polygonValidator),
    imageFileIds: imageFileIdsValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    ensureImageLimit(args.imageFileIds);
    if (args.geometryType === "point") {
      ensurePointCategory(args.category);
    } else {
      ensurePolygonPoints(args.polygon ?? []);
    }

    const target = await resolveSaveTarget(
      ctx,
      {
        areaId: args.areaId,
        featureId: args.featureId,
        legacyPointId: args.legacyPointId,
      },
      user._id
    );

    const nextDocument = buildFeatureDocument({
      areaId: target.areaId,
      creatorId: target.creatorId,
      name: args.name,
      description: args.description,
      category: args.category,
      color: args.color,
      geometryType: args.geometryType,
      point: args.point,
      polygon: args.polygon,
      imageFileIds: args.imageFileIds,
    });

    switch (target.mode) {
      case "feature":
        await ctx.db.replace(target.featureId, nextDocument);
        return target.featureId;
      case "legacy": {
        const featureId = await ctx.db.insert("areaFeatures", nextDocument);
        await ctx.db.delete(target.legacyPointId);
        return featureId;
      }
      case "create":
        return await ctx.db.insert("areaFeatures", nextDocument);
    }
  },
});

export const remove = mutation({
  args: {
    featureId: v.optional(v.id("areaFeatures")),
    legacyPointId: v.optional(v.id("areaPoints")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    ensureValidSaveTarget({
      featureId: args.featureId,
      legacyPointId: args.legacyPointId,
    });

    if (args.featureId) {
      const feature = await ctx.db.get(args.featureId);
      if (!feature) {
        throw new Error("Feature not found");
      }
      await verifyAreaCreator(ctx, feature.areaId, user._id);
      await ctx.db.delete(args.featureId);
      return;
    }

    const point = await ctx.db.get(args.legacyPointId!);
    if (!point) {
      throw new Error("Point not found");
    }
    await verifyAreaCreator(ctx, point.areaId, user._id);
    await ctx.db.delete(args.legacyPointId!);
  },
});
