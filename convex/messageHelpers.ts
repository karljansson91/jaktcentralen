import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type TextMessageInput = {
  body: string;
  eventId: Id<"events">;
  type: "text";
  userId: Id<"users">;
};

type AnimalSightingMessageInput = {
  body: string;
  eventId: Id<"events">;
  sightingId: Id<"animalSightings">;
  type: "animal_sighting";
  userId: Id<"users">;
};

type PositionStatusMessageInput = {
  body: string;
  eventId: Id<"events">;
  targetKey: string;
  type: "member_in_position" | "member_left_position";
  userId: Id<"users">;
};

type SatActivatedMessageInput = {
  body: string;
  eventId: Id<"events">;
  satId: Id<"areaSats">;
  type: "sat_activated";
  userId: Id<"users">;
};

type SatClearedMessageInput = {
  body: string;
  eventId: Id<"events">;
  type: "sat_cleared";
  userId: Id<"users">;
};

type HuntMessageInput =
  | TextMessageInput
  | AnimalSightingMessageInput
  | PositionStatusMessageInput
  | SatActivatedMessageInput
  | SatClearedMessageInput;

export async function insertHuntMessage(ctx: MutationCtx, input: HuntMessageInput) {
  return await ctx.db.insert("messages", input);
}

export async function markMembershipReadThroughMessage(
  ctx: MutationCtx,
  membershipId: Id<"eventMembers">,
  messageId: Id<"messages">
) {
  const message = await ctx.db.get(messageId);
  if (message) {
    await ctx.db.patch(membershipId, { lastReadMessageAt: message._creationTime });
  }
}
