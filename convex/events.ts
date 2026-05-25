import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { deleteEventCascade } from "./eventCleanup";
import { getEffectiveEndedAt, isEventEnded } from "./eventLifecycle";
import { getCurrentUser } from "./helpers";
import type { Id } from "./_generated/dataModel";

const JOIN_CODE_MIN_LENGTH = 3;
const JOIN_CODE_MAX_LENGTH = 32;
const SAFE_JOIN_CODE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const CUSTOM_ALLOWED_GAME_SPECIES_ID = "custom";

const allowedGameRuleValidator = v.object({
  customLabel: v.optional(v.string()),
  mode: v.union(v.literal("all"), v.literal("selected")),
  note: v.optional(v.string()),
  optionIds: v.array(v.string()),
  speciesId: v.string(),
});

type AllowedGameRuleInput = {
  customLabel?: string;
  mode: "all" | "selected";
  note?: string;
  optionIds: string[];
  speciesId: string;
};

function isCustomAllowedGameSpeciesId(speciesId: string) {
  return (
    speciesId === CUSTOM_ALLOWED_GAME_SPECIES_ID ||
    speciesId.startsWith(`${CUSTOM_ALLOWED_GAME_SPECIES_ID}:`)
  );
}

function validateJoinCodeForStorage(joinCode: string | undefined): string | undefined {
  if (joinCode === undefined) {
    return undefined;
  }

  const trimmed = joinCode.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed !== trimmed.toLowerCase()) {
    throw new Error("Join code must use lowercase letters");
  }
  if (trimmed.length < JOIN_CODE_MIN_LENGTH || trimmed.length > JOIN_CODE_MAX_LENGTH) {
    throw new Error(`Join code must be ${JOIN_CODE_MIN_LENGTH}-${JOIN_CODE_MAX_LENGTH} characters`);
  }
  if (!SAFE_JOIN_CODE_PATTERN.test(trimmed)) {
    throw new Error("Join code may only contain lowercase letters, numbers, and hyphens");
  }

  return trimmed;
}

async function assertJoinCodeAvailable(
  ctx: MutationCtx,
  joinCode: string | undefined,
  currentEventId?: Id<"events">
) {
  if (joinCode === undefined) {
    return;
  }

  const existing = await ctx.db
    .query("events")
    .withIndex("by_joinCode", (q) => q.eq("joinCode", joinCode))
    .first();

  if (existing && existing._id !== currentEventId) {
    throw new Error("Join code is already in use");
  }
}

async function scheduleAutoEnd(ctx: MutationCtx, eventId: Id<"events">, endDate: number) {
  await ctx.scheduler.runAt(Math.max(endDate, Date.now()), internal.events.autoEnd, {
    eventId,
    scheduledEndDate: endDate,
  });
}

function normalizeAllowedGame(
  rules: AllowedGameRuleInput[] | undefined
): AllowedGameRuleInput[] | undefined {
  if (!rules || rules.length === 0) {
    return undefined;
  }

  const normalized = rules.flatMap((rule) => {
    const speciesId = rule.speciesId.trim();
    if (!speciesId) {
      return [];
    }

    const customLabel = rule.customLabel?.trim();
    if (isCustomAllowedGameSpeciesId(speciesId) && !customLabel) {
      return [];
    }

    const optionIds =
      rule.mode === "selected" ? Array.from(new Set(rule.optionIds.map((id) => id.trim()).filter(Boolean))) : [];

    return [
      {
        speciesId,
        mode: optionIds.length > 0 ? ("selected" as const) : ("all" as const),
        optionIds,
        ...(customLabel ? { customLabel } : {}),
        ...(rule.note?.trim() ? { note: rule.note.trim() } : {}),
      },
    ];
  });

  return normalized.length > 0 ? normalized : undefined;
}

async function requireEventAdmin(ctx: MutationCtx, eventId: Id<"events">, userId: Id<"users">) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }
  if (isEventEnded(event)) {
    throw new Error("Cannot edit an ended hunt");
  }

  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();

  if (event.creatorId !== userId && membership?.role !== "admin") {
    throw new Error("Admin access required");
  }

  return event;
}

export const create = mutation({
  args: {
    areaId: v.id("areas"),
    title: v.string(),
    description: v.optional(v.string()),
    joinCode: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.number(),
    allowedGame: v.optional(v.array(allowedGameRuleValidator)),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify caller owns the area
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized to create events in this area");
    }

    const joinCode = validateJoinCodeForStorage(args.joinCode);
    await assertJoinCodeAvailable(ctx, joinCode);

    const eventId = await ctx.db.insert("events", {
      areaId: args.areaId,
      title: args.title,
      description: args.description,
      creatorId: user._id,
      joinCode,
      startDate: args.startDate,
      endDate: args.endDate,
      allowedGame: normalizeAllowedGame(args.allowedGame),
    });

    await ctx.db.insert("eventMembers", {
      eventId,
      userId: user._id,
      role: "admin",
      status: "accepted",
    });

    await scheduleAutoEnd(ctx, eventId, args.endDate);

    return eventId;
  },
});

export const updateAllowedGame = mutation({
  args: {
    allowedGame: v.optional(v.array(allowedGameRuleValidator)),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await requireEventAdmin(ctx, args.eventId, user._id);

    await ctx.db.patch(args.eventId, {
      allowedGame: normalizeAllowedGame(args.allowedGame),
    });
  },
});

export const get = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    const membership = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", args.eventId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.status === "declined") {
      throw new Error("Not a member of this event");
    }

    return event;
  },
});

export const update = mutation({
  args: {
    eventId: v.id("events"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    joinCode: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new Error("Creator access required");
    }

    const previousEndDate = event.endDate;
    const { eventId, joinCode: rawJoinCode, ...updates } = args;
    const joinCode = validateJoinCodeForStorage(rawJoinCode);
    await assertJoinCodeAvailable(ctx, joinCode, eventId);

    const patch = rawJoinCode === undefined ? updates : { ...updates, joinCode };
    await ctx.db.patch(eventId, patch);

    if (updates.endDate !== undefined && updates.endDate !== previousEndDate) {
      await scheduleAutoEnd(ctx, eventId, updates.endDate);
    }
  },
});

export const remove = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new Error("Creator access required");
    }

    await deleteEventCascade(ctx, args.eventId);
  },
});

export const end = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }
    if (event.creatorId !== user._id) {
      throw new Error("Creator access required");
    }
    const now = Date.now();
    if (event.endedAt !== undefined) {
      return;
    }

    await ctx.db.patch(args.eventId, {
      endedAt: event.endDate <= now ? event.endDate : now,
    });
  },
});

export const autoEnd = internalMutation({
  args: {
    eventId: v.id("events"),
    scheduledEndDate: v.number(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.endedAt !== undefined || event.endDate !== args.scheduledEndDate) {
      return;
    }
    if (event.endDate > Date.now()) {
      return;
    }

    await ctx.db.patch(args.eventId, { endedAt: event.endDate });
  },
});

export const listMyEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const memberships = await ctx.db
      .query("eventMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "accepted")
      )
      .take(50);

    const events = await Promise.all(
      memberships.map(async (m) => {
        const event = await ctx.db.get(m.eventId);
        return event ? { ...event, role: m.role } : null;
      })
    );
    const existingEvents = events.filter((event) => event !== null);

    const now = Date.now();
    return existingEvents.filter((event) => !isEventEnded(event, now));
  },
});

export const listMyEndedEvents = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    const memberships = await ctx.db
      .query("eventMembers")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", user._id).eq("status", "accepted")
      )
      .take(100);

    const events = await Promise.all(
      memberships.map(async (m) => {
        const event = await ctx.db.get(m.eventId);
        return event ? { ...event, role: m.role } : null;
      })
    );
    const existingEvents = events.filter((event) => event !== null);

    const now = Date.now();
    return existingEvents
      .filter((event) => isEventEnded(event, now))
      .sort(
        (a, b) =>
          (getEffectiveEndedAt(b, now) ?? 0) - (getEffectiveEndedAt(a, now) ?? 0)
      );
  },
});

export const listByArea = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    // Verify caller owns the area
    const area = await ctx.db.get(args.areaId);
    if (!area) {
      throw new Error("Area not found");
    }
    if (area.creatorId !== user._id) {
      throw new Error("Not authorized");
    }

    return await ctx.db
      .query("events")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .take(50);
  },
});

export const joinByCode = mutation({
  args: { joinCode: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const joinCode = args.joinCode.trim().toLowerCase();

    const event = await ctx.db
      .query("events")
      .withIndex("by_joinCode", (q) => q.eq("joinCode", joinCode))
      .unique();

    if (!event) {
      throw new Error("Invalid join code");
    }
    if (isEventEnded(event)) {
      throw new Error("This hunt has ended");
    }

    const existing = await ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", event._id).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      throw new Error("Already a member of this event");
    }

    await ctx.db.insert("eventMembers", {
      eventId: event._id,
      userId: user._id,
      role: "member",
      status: "accepted",
    });

    return event._id;
  },
});
