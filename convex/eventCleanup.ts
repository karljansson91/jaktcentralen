import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

export async function deleteEventCascade(
  ctx: MutationCtx,
  eventId: Id<"events">
) {
  const [
    members,
    assignments,
    selectedPasses,
    excludedMembers,
    trails,
    sightings,
    sightingAcknowledgements,
    messages,
  ] =
    await Promise.all([
      ctx.db
        .query("eventMembers")
        .withIndex("by_eventId_and_status", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("eventPointAssignments")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("eventSelectedPasses")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("eventAssignmentExcludedMembers")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("positionTrails")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("animalSightings")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("animalSightingAcknowledgements")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect(),
    ]);

  for (const member of members) {
    await ctx.db.delete(member._id);
  }
  for (const assignment of assignments) {
    await ctx.db.delete(assignment._id);
  }
  for (const selectedPass of selectedPasses) {
    await ctx.db.delete(selectedPass._id);
  }
  for (const excludedMember of excludedMembers) {
    await ctx.db.delete(excludedMember._id);
  }
  for (const trail of trails) {
    await ctx.db.delete(trail._id);
  }
  for (const sighting of sightings) {
    await ctx.db.delete(sighting._id);
  }
  for (const acknowledgement of sightingAcknowledgements) {
    await ctx.db.delete(acknowledgement._id);
  }
  for (const message of messages) {
    await ctx.db.delete(message._id);
  }

  await ctx.db.delete(eventId);
}
