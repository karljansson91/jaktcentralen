import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getAcceptedEventMembership } from "./eventAccess";
import { getCurrentUser } from "./helpers";
import { recordHuntActivity } from "./huntActivity";
import {
  followUpResolutionValidator,
  shooterPositionValidator,
  shotReportResultValidator,
} from "./shotReportValidators";
import { isEventActive, isEventEnded } from "../lib/event-lifecycle";
import {
  formatShotReportChatBody,
  getShotSpeciesOptions,
  requiresFollowUp,
  type ShotReportResult,
} from "../lib/shot-reports";

const MAX_OPERATION_KEY_LENGTH = 128;
const MAX_NOTE_LENGTH = 2000;
const MAX_INSTRUCTION_LENGTH = 1000;

type ShotReportContext = {
  event: Doc<"events">;
  followUp: Doc<"followUps"> | null;
  isLeader: boolean;
  membership: Doc<"eventMembers">;
  report: Doc<"shotReports">;
};

function normalizeRequiredText(value: string, field: string, maxLength: number) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${field} is required`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
  return normalized;
}

function normalizeOptionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  if (normalized.length > maxLength) {
    throw new Error("Text is too long");
  }
  return normalized;
}

function assertCoordinate(latitude: number, longitude: number) {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid coordinate");
  }
}

function assertEscapeDirection(degrees: number | undefined) {
  if (
    degrees !== undefined &&
    (!Number.isFinite(degrees) || degrees < 0 || degrees >= 360)
  ) {
    throw new Error("Invalid escape direction");
  }
}

function assertActiveEvent(event: Doc<"events">, now: number) {
  if (!isEventActive(event, now)) {
    throw new Error("Hunt is not active");
  }
}

function getSpeciesLabel(event: Doc<"events">, speciesId: string) {
  const option = getShotSpeciesOptions(event.allowedGame).find(
    (candidate) => candidate.id === speciesId
  );
  if (!option) {
    throw new Error("Species is not available for this hunt");
  }
  return option.label;
}

async function getFollowUp(
  ctx: QueryCtx | MutationCtx,
  reportId: Id<"shotReports">
) {
  return await ctx.db
    .query("followUps")
    .withIndex("by_reportId", (q) => q.eq("reportId", reportId))
    .unique();
}

async function getReportContext(
  ctx: QueryCtx | MutationCtx,
  reportId: Id<"shotReports">,
  userId: Id<"users">
): Promise<ShotReportContext> {
  const report = await ctx.db.get(reportId);
  if (!report) {
    throw new Error("Shot report not found");
  }

  const [event, membership, followUp] = await Promise.all([
    ctx.db.get(report.eventId),
    getAcceptedEventMembership(ctx, report.eventId, userId),
    getFollowUp(ctx, reportId),
  ]);
  if (!event) {
    throw new Error("Event not found");
  }

  return {
    event,
    followUp,
    isLeader: event.creatorId === userId || membership.role === "admin",
    membership,
    report,
  };
}

function canReporterEdit(
  context: Pick<ShotReportContext, "followUp" | "report">,
  userId: Id<"users">
) {
  if (context.report.reporterUserId !== userId) {
    return false;
  }
  return !context.followUp || context.followUp.startedAt === undefined;
}

function assertReportEditable(context: ShotReportContext, userId: Id<"users">) {
  if (context.report.status !== "active") {
    throw new Error("Shot report is marked as false");
  }
  if (!context.isLeader && !canReporterEdit(context, userId)) {
    throw new Error("Not authorized to edit this report");
  }
}

function assertCanManageFollowUp(
  context: ShotReportContext,
  userId: Id<"users">
) {
  if (
    !context.isLeader &&
    context.followUp?.assignedUserId !== userId
  ) {
    throw new Error("Not authorized to manage this follow-up");
  }
}

async function insertFollowUp(
  ctx: MutationCtx,
  eventId: Id<"events">,
  reportId: Id<"shotReports">,
  now: number
) {
  return await ctx.db.insert("followUps", {
    createdAt: now,
    eventId,
    reportId,
    status: "needs_planning",
    updatedAt: now,
  });
}

async function reconcileFollowUpForResult(
  ctx: MutationCtx,
  context: ShotReportContext,
  result: ShotReportResult,
  now: number
) {
  if (requiresFollowUp(result)) {
    if (!context.followUp) {
      await insertFollowUp(ctx, context.report.eventId, context.report._id, now);
      return;
    }
    if (context.followUp.status === "false_report") {
      await ctx.db.patch(context.followUp._id, {
        assignedUserId: undefined,
        completedAt: undefined,
        instruction: undefined,
        resolution: undefined,
        resolutionNote: undefined,
        status: "needs_planning",
        updatedAt: now,
      });
    }
    return;
  }

  if (context.followUp && context.followUp.status !== "false_report") {
    await ctx.db.patch(context.followUp._id, {
      completedAt: now,
      status: "false_report",
      updatedAt: now,
    });
  }
}

export const report = mutation({
  args: {
    eventId: v.id("events"),
    operationKey: v.string(),
    result: shotReportResultValidator,
    shooterPosition: v.optional(shooterPositionValidator),
    shotLatitude: v.number(),
    shotLongitude: v.number(),
    speciesId: v.string(),
  },
  returns: v.id("shotReports"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);

    const operationKey = normalizeRequiredText(
      args.operationKey,
      "Operation key",
      MAX_OPERATION_KEY_LENGTH
    );
    const existing = await ctx.db
      .query("shotReports")
      .withIndex("by_eventId_and_reporterUserId_and_operationKey", (q) =>
        q
          .eq("eventId", args.eventId)
          .eq("reporterUserId", user._id)
          .eq("operationKey", operationKey)
      )
      .unique();
    if (existing) {
      return existing._id;
    }

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    const now = Date.now();
    assertActiveEvent(event, now);
    assertCoordinate(args.shotLatitude, args.shotLongitude);
    if (args.shooterPosition) {
      assertCoordinate(
        args.shooterPosition.latitude,
        args.shooterPosition.longitude
      );
    }

    const speciesLabel = getSpeciesLabel(event, args.speciesId);
    const reportId = await ctx.db.insert("shotReports", {
      eventId: args.eventId,
      operationKey,
      reportedAt: now,
      reporterUserId: user._id,
      result: args.result,
      shooterPosition: args.shooterPosition,
      shotLatitude: args.shotLatitude,
      shotLongitude: args.shotLongitude,
      speciesId: args.speciesId,
      speciesLabel,
      status: "active",
      updatedAt: now,
    });

    if (requiresFollowUp(args.result)) {
      await insertFollowUp(ctx, args.eventId, reportId, now);
    }
    await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      eventId: args.eventId,
      kind: "reported",
      reportId,
      timestamp: now,
    });
    const messageId = await recordHuntActivity(ctx, {
      activity: { kind: "shot_report", reportId },
      actor: user,
      eventId: args.eventId,
    });
    await ctx.db.patch(reportId, { messageId });
    return reportId;
  },
});

export const updateReport = mutation({
  args: {
    reportId: v.id("shotReports"),
    result: shotReportResultValidator,
    speciesId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const now = Date.now();
    assertActiveEvent(context.event, now);
    assertReportEditable(context, user._id);

    const speciesLabel = getSpeciesLabel(context.event, args.speciesId);
    if (
      context.report.speciesId === args.speciesId &&
      context.report.result === args.result
    ) {
      return null;
    }

    await ctx.db.patch(args.reportId, {
      result: args.result,
      speciesId: args.speciesId,
      speciesLabel,
      updatedAt: now,
    });
    await reconcileFollowUpForResult(ctx, context, args.result, now);
    await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      eventId: context.report.eventId,
      kind: "report_updated",
      nextResult: args.result,
      nextSpeciesId: args.speciesId,
      nextSpeciesLabel: speciesLabel,
      previousResult: context.report.result,
      previousSpeciesId: context.report.speciesId,
      previousSpeciesLabel: context.report.speciesLabel,
      reportId: args.reportId,
      timestamp: now,
    });

    if (context.report.messageId) {
      await ctx.db.patch(context.report.messageId, {
        body: formatShotReportChatBody(speciesLabel, args.result),
      });
    }
    return null;
  },
});

export const addSupplement = mutation({
  args: {
    escapeDirectionDegrees: v.optional(v.number()),
    note: v.optional(v.string()),
    reportId: v.id("shotReports"),
  },
  returns: v.id("shotReportActivities"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const now = Date.now();
    assertActiveEvent(context.event, now);
    if (context.report.status !== "active") {
      throw new Error("Shot report is marked as false");
    }

    assertEscapeDirection(args.escapeDirectionDegrees);
    const note = normalizeOptionalText(args.note, MAX_NOTE_LENGTH);
    if (args.escapeDirectionDegrees === undefined && note === undefined) {
      throw new Error("Add a direction or note");
    }

    return await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      escapeDirectionDegrees: args.escapeDirectionDegrees,
      eventId: context.report.eventId,
      kind: "supplemented",
      note,
      reportId: args.reportId,
      timestamp: now,
    });
  },
});

export const planFollowUp = mutation({
  args: {
    assignedUserId: v.id("users"),
    instruction: v.optional(v.string()),
    reportId: v.id("shotReports"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const now = Date.now();
    assertActiveEvent(context.event, now);
    if (!context.isLeader) {
      throw new Error("Leader access required");
    }
    if (!context.followUp || context.followUp.status === "false_report") {
      throw new Error("Follow-up not found");
    }
    if (
      context.followUp.status === "in_progress" ||
      context.followUp.status === "completed"
    ) {
      throw new Error("Follow-up has already started");
    }
    await getAcceptedEventMembership(ctx, context.report.eventId, args.assignedUserId);

    const instruction = normalizeOptionalText(
      args.instruction,
      MAX_INSTRUCTION_LENGTH
    );
    await ctx.db.patch(context.followUp._id, {
      assignedUserId: args.assignedUserId,
      instruction,
      status: "planned",
      updatedAt: now,
    });
    await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      assignedUserId: args.assignedUserId,
      eventId: context.report.eventId,
      instruction,
      kind: "follow_up_planned",
      reportId: args.reportId,
      timestamp: now,
    });
    return null;
  },
});

export const startFollowUp = mutation({
  args: { reportId: v.id("shotReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const now = Date.now();
    assertActiveEvent(context.event, now);
    if (!context.followUp) {
      throw new Error("Follow-up not found");
    }
    assertCanManageFollowUp(context, user._id);
    if (
      context.followUp.status !== "needs_planning" &&
      context.followUp.status !== "planned"
    ) {
      throw new Error("Follow-up cannot be started");
    }

    await ctx.db.patch(context.followUp._id, {
      startedAt: now,
      status: "in_progress",
      updatedAt: now,
    });
    await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      eventId: context.report.eventId,
      kind: "follow_up_started",
      reportId: args.reportId,
      timestamp: now,
    });
    return null;
  },
});

export const finishFollowUp = mutation({
  args: {
    note: v.optional(v.string()),
    reportId: v.id("shotReports"),
    resolution: followUpResolutionValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const now = Date.now();
    assertActiveEvent(context.event, now);
    if (!context.followUp || context.followUp.status !== "in_progress") {
      throw new Error("Follow-up is not in progress");
    }
    assertCanManageFollowUp(context, user._id);

    const note = normalizeOptionalText(args.note, MAX_NOTE_LENGTH);
    await ctx.db.patch(context.followUp._id, {
      completedAt: now,
      resolution: args.resolution,
      resolutionNote: note,
      status: "completed",
      updatedAt: now,
    });
    await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      eventId: context.report.eventId,
      kind: "follow_up_finished",
      note,
      reportId: args.reportId,
      resolution: args.resolution,
      timestamp: now,
    });
    return null;
  },
});

export const markFalseReport = mutation({
  args: { reportId: v.id("shotReports") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const now = Date.now();
    assertActiveEvent(context.event, now);
    assertReportEditable(context, user._id);

    await ctx.db.patch(args.reportId, {
      status: "false_report",
      updatedAt: now,
    });
    if (context.followUp) {
      await ctx.db.patch(context.followUp._id, {
        completedAt: now,
        status: "false_report",
        updatedAt: now,
      });
    }
    await ctx.db.insert("shotReportActivities", {
      actorUserId: user._id,
      eventId: context.report.eventId,
      kind: "false_report",
      reportId: args.reportId,
      timestamp: now,
    });
    return null;
  },
});

export const listMapReports = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);
    const [reports, followUps] = await Promise.all([
      ctx.db
        .query("shotReports")
        .withIndex("by_eventId_and_reportedAt", (q) =>
          q.eq("eventId", args.eventId)
        )
        .order("asc")
        .take(200),
      ctx.db
        .query("followUps")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .take(200),
    ]);
    const followUpByReportId = new Map(
      followUps.map((followUp) => [followUp.reportId, followUp])
    );
    const reporterIds = Array.from(
      new Set(reports.map((report) => report.reporterUserId))
    );
    const reporters = new Map(
      await Promise.all(
        reporterIds.map(async (reporterId) => [
          reporterId,
          await ctx.db.get(reporterId),
        ] as const)
      )
    );

    return reports.map((report) => ({
      ...report,
      followUp: followUpByReportId.get(report._id) ?? null,
      reporter: reporters.get(report.reporterUserId) ?? null,
    }));
  },
});

export const listTimeline = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await getAcceptedEventMembership(ctx, args.eventId, user._id);
    const [activities, reports] = await Promise.all([
      ctx.db
        .query("shotReportActivities")
        .withIndex("by_eventId_and_timestamp", (q) =>
          q.eq("eventId", args.eventId)
        )
        .order("asc")
        .take(500),
      ctx.db
        .query("shotReports")
        .withIndex("by_eventId_and_reportedAt", (q) =>
          q.eq("eventId", args.eventId)
        )
        .order("asc")
        .take(200),
    ]);
    const reportsById = new Map(reports.map((report) => [report._id, report]));
    const userIds = Array.from(
      new Set(
        activities.flatMap((activity) => [
          activity.actorUserId,
          ...(activity.kind === "follow_up_planned"
            ? [activity.assignedUserId]
            : []),
        ])
      )
    );
    const usersById = new Map(
      await Promise.all(
        userIds.map(async (userId) => [userId, await ctx.db.get(userId)] as const)
      )
    );

    return activities.flatMap((activity) => {
      const report = reportsById.get(activity.reportId);
      if (!report) {
        return [];
      }
      return [{
        ...activity,
        actor: usersById.get(activity.actorUserId) ?? null,
        assignedUser:
          activity.kind === "follow_up_planned"
            ? usersById.get(activity.assignedUserId) ?? null
            : null,
        report,
      }];
    });
  },
});

export const getDetails = query({
  args: {
    currentTime: v.number(),
    reportId: v.id("shotReports"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const context = await getReportContext(ctx, args.reportId, user._id);
    const activities = await ctx.db
      .query("shotReportActivities")
      .withIndex("by_reportId_and_timestamp", (q) =>
        q.eq("reportId", args.reportId)
      )
      .order("asc")
      .take(200);
    const userIds = Array.from(
      new Set([
        context.report.reporterUserId,
        ...activities.flatMap((activity) => [
          activity.actorUserId,
          ...(activity.kind === "follow_up_planned"
            ? [activity.assignedUserId]
            : []),
        ]),
        ...(context.followUp?.assignedUserId
          ? [context.followUp.assignedUserId]
          : []),
      ])
    );
    const usersById = new Map(
      await Promise.all(
        userIds.map(async (userId) => [userId, await ctx.db.get(userId)] as const)
      )
    );
    const ended = isEventEnded(context.event, args.currentTime);
    const canEdit =
      !ended &&
      context.report.status === "active" &&
      (context.isLeader || canReporterEdit(context, user._id));
    const canManageFollowUp =
      !ended &&
      context.report.status === "active" &&
      (context.isLeader || context.followUp?.assignedUserId === user._id);

    return {
      activities: activities.map((activity) => ({
        ...activity,
        actor: usersById.get(activity.actorUserId) ?? null,
        assignedUser:
          activity.kind === "follow_up_planned"
            ? usersById.get(activity.assignedUserId) ?? null
            : null,
      })),
      canEdit,
      canManageFollowUp,
      canPlanFollowUp: !ended && context.isLeader,
      canSupplement: !ended && context.report.status === "active",
      eventEnded: ended,
      followUp: context.followUp
        ? {
            ...context.followUp,
            assignedUser: context.followUp.assignedUserId
              ? usersById.get(context.followUp.assignedUserId) ?? null
              : null,
          }
        : null,
      report: context.report,
      reporter: usersById.get(context.report.reporterUserId) ?? null,
    };
  },
});
