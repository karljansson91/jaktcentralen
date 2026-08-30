import { v } from "convex/values";

export const shotReportResultValidator = v.union(
  v.literal("fell"),
  v.literal("continued"),
  v.literal("uncertain")
);

export const shotReportStatusValidator = v.union(
  v.literal("active"),
  v.literal("false_report")
);

export const followUpStatusValidator = v.union(
  v.literal("needs_planning"),
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("false_report")
);

export const followUpResolutionValidator = v.union(
  v.literal("game_found"),
  v.literal("game_culled"),
  v.literal("not_found"),
  v.literal("other")
);

export const shooterPositionValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
  timestamp: v.number(),
});

const shotReportActivityBase = {
  actorUserId: v.id("users"),
  eventId: v.id("events"),
  reportId: v.id("shotReports"),
  timestamp: v.number(),
};

export const shotReportActivityValidator = v.union(
  v.object({
    ...shotReportActivityBase,
    kind: v.literal("reported"),
  }),
  v.object({
    ...shotReportActivityBase,
    escapeDirectionDegrees: v.optional(v.number()),
    kind: v.literal("supplemented"),
    note: v.optional(v.string()),
  }),
  v.object({
    ...shotReportActivityBase,
    kind: v.literal("report_updated"),
    nextResult: shotReportResultValidator,
    nextSpeciesId: v.string(),
    nextSpeciesLabel: v.string(),
    previousResult: shotReportResultValidator,
    previousSpeciesId: v.string(),
    previousSpeciesLabel: v.string(),
  }),
  v.object({
    ...shotReportActivityBase,
    assignedUserId: v.id("users"),
    instruction: v.optional(v.string()),
    kind: v.literal("follow_up_planned"),
  }),
  v.object({
    ...shotReportActivityBase,
    kind: v.literal("follow_up_started"),
  }),
  v.object({
    ...shotReportActivityBase,
    kind: v.literal("follow_up_finished"),
    note: v.optional(v.string()),
    resolution: followUpResolutionValidator,
  }),
  v.object({
    ...shotReportActivityBase,
    kind: v.literal("false_report"),
  })
);
