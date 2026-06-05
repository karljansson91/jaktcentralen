import { Migrations } from "@convex-dev/migrations";
import { components, internal } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations);

export const removeAreaDescriptions = migrations.define({
  table: "areas",
  migrateOne: async (ctx, area) => {
    if (area.description === undefined) {
      return;
    }

    await ctx.db.patch(area._id, { description: undefined });
  },
});

export const runRemoveAreaDescriptions = migrations.runner(
  internal.migrations.removeAreaDescriptions
);

export const runOne = migrations.runner();
