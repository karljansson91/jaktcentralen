import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { internalMutation } from "./_generated/server";

const migrations = new Migrations<DataModel>(components.migrations);

const LEGACY_POINT_TYPE_TO_CATEGORY = {
  pass: "custom",
  tower: "tower",
  meeting: "meeting",
  parking: "parking",
  other: "custom",
} as const;

const DEFAULT_CATEGORY_COLORS: Record<
  (typeof LEGACY_POINT_TYPE_TO_CATEGORY)[keyof typeof LEGACY_POINT_TYPE_TO_CATEGORY],
  string
> = {
  tower: "#8b5cf6",
  parking: "#6b7280",
  meeting: "#3b82f6",
  custom: "#f59e0b",
};

export const backfillAreaFeaturesFromAreaPoints = migrations.define({
  table: "areaPoints",
  migrateOne: async (ctx, point) => {
    const area = await ctx.db.get(point.areaId);
    if (!area) {
      return;
    }

    const existing = await ctx.db
      .query("areaFeatures")
      .withIndex("by_areaId_and_geometryType", (q) =>
        q.eq("areaId", point.areaId).eq("geometryType", "point")
      )
      .take(500);

    const alreadyBackfilled = existing.some(
      (feature) =>
        feature.geometryType === "point" &&
        feature.name === point.name &&
        feature.point.latitude === point.latitude &&
        feature.point.longitude === point.longitude
    );

    if (alreadyBackfilled) {
      return;
    }

    const category = LEGACY_POINT_TYPE_TO_CATEGORY[point.type];

    await ctx.db.insert("areaFeatures", {
      areaId: point.areaId,
      creatorId: area.creatorId,
      name: point.name,
      category,
      color: DEFAULT_CATEGORY_COLORS[category],
      geometryType: "point",
      point: {
        latitude: point.latitude,
        longitude: point.longitude,
      },
      ...(point.description ? { description: point.description } : {}),
    });
  },
});

export const run = migrations.runner(
  internal.migrations.backfillAreaFeaturesFromAreaPoints
);

export const runOne = migrations.runner();

export const runDryRun = internalMutation({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    return await migrations.runOne(
      ctx,
      internal.migrations.backfillAreaFeaturesFromAreaPoints,
      {
        dryRun: true,
      }
    );
  },
});
