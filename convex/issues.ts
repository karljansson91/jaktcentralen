import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getCurrentUser } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";

const ISSUE_TITLE_MAX_LENGTH = 120;
const ISSUE_DESCRIPTION_MAX_LENGTH = 4000;
const DEFAULT_ISSUE_LIMIT = 100;
const MAX_ISSUE_LIMIT = 200;
const MAX_ISSUE_IMAGE_COUNT = 4;
const AGENT_ISSUER = "codex-agent";
const AGENT_TOKEN_IDENTIFIER = "codex-agent:issues";

const issueTypeValidator = v.union(v.literal("bug"), v.literal("feature"));
const issueStatusValidator = v.union(
  v.literal("triage"),
  v.literal("ready_to_implement"),
  v.literal("ongoing"),
  v.literal("completed")
);
const issueImageFileIdsValidator = v.optional(v.array(v.id("_storage")));

type IssueStatus = Doc<"issues">["status"];
type IssueType = Doc<"issues">["type"];
type IssuePatch = {
  description?: string;
  status?: IssueStatus;
  title?: string;
  type?: IssueType;
};

function boundedLimit(limit?: number) {
  if (limit === undefined) {
    return DEFAULT_ISSUE_LIMIT;
  }

  if (!Number.isFinite(limit)) {
    return DEFAULT_ISSUE_LIMIT;
  }

  return Math.min(Math.max(Math.floor(limit), 1), MAX_ISSUE_LIMIT);
}

function normalizeTitle(title: string) {
  const normalized = title.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new Error("Title is required");
  }
  return normalized.slice(0, ISSUE_TITLE_MAX_LENGTH);
}

function normalizeDescription(description: string) {
  const normalized = description.trim();
  if (!normalized) {
    throw new Error("Description is required");
  }
  return normalized.slice(0, ISSUE_DESCRIPTION_MAX_LENGTH);
}

function normalizeScreenPath(screenPath?: string) {
  const normalized = screenPath?.trim();
  return normalized ? normalized.slice(0, 240) : undefined;
}

function normalizeImageFileIds(imageFileIds?: Id<"_storage">[]) {
  if (!imageFileIds || imageFileIds.length === 0) {
    return undefined;
  }

  if (imageFileIds.length > MAX_ISSUE_IMAGE_COUNT) {
    throw new Error("Max 4 images per issue");
  }

  return imageFileIds;
}

function getReporterSnapshot(user: Doc<"users">) {
  return {
    reporterEmail: user.email || undefined,
    reporterName: user.name || user.email || "Jägare",
    reporterUserId: user._id,
  };
}

async function buildIssueImages(
  ctx: QueryCtx,
  imageFileIds?: Id<"_storage">[]
): Promise<{ fileId: Id<"_storage">; url: string }[]> {
  if (!imageFileIds || imageFileIds.length === 0) {
    return [];
  }

  const images = await Promise.all(
    imageFileIds.map(async (fileId) => {
      const url = await ctx.storage.getUrl(fileId);
      return url ? { fileId, url } : null;
    })
  );

  return images.filter((image): image is { fileId: Id<"_storage">; url: string } => image !== null);
}

async function getIssueView(
  ctx: QueryCtx,
  issue: Doc<"issues">,
  reporter?: Doc<"users"> | null
) {
  const screenshotUrl = issue.screenshotFileId
    ? await ctx.storage.getUrl(issue.screenshotFileId)
    : null;
  const images = await buildIssueImages(ctx, issue.imageFileIds);

  return {
    ...issue,
    images,
    imageUrls: images.map((image) => image.url),
    reporter: reporter
      ? {
          _id: reporter._id,
          email: reporter.email,
          imageUrl: reporter.imageUrl,
          name: reporter.name,
        }
      : null,
    screenshotUrl,
  };
}

async function getIssueViews(ctx: QueryCtx, issues: Doc<"issues">[]) {
  const reporterIds = Array.from(
    new Set(
      issues
        .map((issue) => issue.reporterUserId)
        .filter((reporterId): reporterId is Id<"users"> => reporterId !== undefined)
    )
  );
  const reporterEntries = await Promise.all(
    reporterIds.map(async (reporterId) => [reporterId, await ctx.db.get(reporterId)] as const)
  );
  const reporters = new Map(reporterEntries);

  return await Promise.all(
    issues.map((issue) =>
      getIssueView(ctx, issue, issue.reporterUserId ? reporters.get(issue.reporterUserId) : null)
    )
  );
}

async function listIssueViews(ctx: QueryCtx, limit?: number) {
  const issues = await ctx.db
    .query("issues")
    .withIndex("by_createdAt")
    .order("desc")
    .take(boundedLimit(limit));

  return await getIssueViews(ctx, issues);
}

async function getIssueById(ctx: QueryCtx, issueId: Id<"issues">) {
  const issue = await ctx.db.get(issueId);
  if (!issue) {
    return null;
  }

  const reporter = issue.reporterUserId ? await ctx.db.get(issue.reporterUserId) : null;
  return await getIssueView(ctx, issue, reporter);
}

async function assertAgentAccess(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (
    identity?.issuer !== AGENT_ISSUER ||
    identity.tokenIdentifier !== AGENT_TOKEN_IDENTIFIER
  ) {
    throw new Error("Agent access required");
  }
}

async function updateIssue(
  ctx: MutationCtx,
  issueId: Id<"issues">,
  patch: IssuePatch,
  updatedByUserId?: Id<"users">
) {
  const issue = await ctx.db.get(issueId);
  if (!issue) {
    throw new Error("Issue not found");
  }

  const updates: Partial<Doc<"issues">> = {
    updatedAt: Date.now(),
  };
  if (updatedByUserId !== undefined) {
    updates.updatedByUserId = updatedByUserId;
  }

  if (patch.title !== undefined) {
    updates.title = normalizeTitle(patch.title);
  }
  if (patch.description !== undefined) {
    updates.description = normalizeDescription(patch.description);
  }
  if (patch.type !== undefined) {
    updates.type = patch.type;
  }
  if (patch.status !== undefined) {
    updates.status = patch.status;
  }

  await ctx.db.patch(issueId, updates);
}

async function removeIssue(ctx: MutationCtx, issueId: Id<"issues">) {
  const issue = await ctx.db.get(issueId);
  if (!issue) {
    return;
  }

  const fileIds = new Set<Id<"_storage">>();
  if (issue.screenshotFileId) {
    fileIds.add(issue.screenshotFileId);
  }
  for (const fileId of issue.imageFileIds ?? []) {
    fileIds.add(fileId);
  }

  await Promise.all(Array.from(fileIds).map((fileId) => ctx.storage.delete(fileId)));
  await ctx.db.delete(issueId);
}

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return await listIssueViews(ctx, args.limit);
  },
});

export const get = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    return await getIssueById(ctx, args.issueId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    description: v.string(),
    imageFileIds: issueImageFileIdsValidator,
    screenPath: v.optional(v.string()),
    screenshotFileId: v.optional(v.id("_storage")),
    title: v.string(),
    type: issueTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const now = Date.now();
    const imageFileIds = normalizeImageFileIds(args.imageFileIds);

    return await ctx.db.insert("issues", {
      ...getReporterSnapshot(user),
      createdAt: now,
      description: normalizeDescription(args.description),
      ...(imageFileIds ? { imageFileIds } : {}),
      screenPath: normalizeScreenPath(args.screenPath),
      screenshotFileId: args.screenshotFileId,
      status: "triage",
      title: normalizeTitle(args.title),
      type: args.type,
      updatedAt: now,
      updatedByUserId: user._id,
    });
  },
});

export const update = mutation({
  args: {
    description: v.string(),
    issueId: v.id("issues"),
    status: issueStatusValidator,
    title: v.string(),
    type: issueTypeValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const { issueId, ...patch } = args;
    await updateIssue(ctx, issueId, patch, user._id);
  },
});

export const remove = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    await removeIssue(ctx, args.issueId);
  },
});

export const agentList = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx);
    return await listIssueViews(ctx, args.limit);
  },
});

export const agentGet = query({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx);
    return await getIssueById(ctx, args.issueId);
  },
});

export const agentCreate = mutation({
  args: {
    description: v.string(),
    title: v.string(),
    type: issueTypeValidator,
  },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx);

    const now = Date.now();
    return await ctx.db.insert("issues", {
      createdAt: now,
      description: normalizeDescription(args.description),
      reporterName: "Codex",
      status: "triage",
      title: normalizeTitle(args.title),
      type: args.type,
      updatedAt: now,
    });
  },
});

export const agentUpdate = mutation({
  args: {
    description: v.optional(v.string()),
    issueId: v.id("issues"),
    status: v.optional(issueStatusValidator),
    title: v.optional(v.string()),
    type: v.optional(issueTypeValidator),
  },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx);
    const { issueId, ...patch } = args;
    await updateIssue(ctx, issueId, patch);
  },
});

export const agentSetStatus = mutation({
  args: {
    issueId: v.id("issues"),
    status: issueStatusValidator,
  },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx);
    await updateIssue(ctx, args.issueId, { status: args.status });
  },
});

export const agentRemove = mutation({
  args: { issueId: v.id("issues") },
  handler: async (ctx, args) => {
    await assertAgentAccess(ctx);
    await removeIssue(ctx, args.issueId);
  },
});
