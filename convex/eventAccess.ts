import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function getAcceptedEventMembership(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events">,
  userId: Id<"users">
) {
  const membership = await ctx.db
    .query("eventMembers")
    .withIndex("by_eventId_and_userId", (q) =>
      q.eq("eventId", eventId).eq("userId", userId)
    )
    .unique();

  if (!membership || membership.status !== "accepted") {
    throw new Error("Not an accepted member");
  }

  return membership;
}
