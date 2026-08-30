import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { getAnimalSightingLabel } from "../lib/animal-sightings";

const MAX_CHAT_IMAGE_COUNT = 4;
const CHAT_IMAGE_CAPTION_MAX_LENGTH = 2000;

type HuntActor = Pick<Doc<"users">, "_id" | "name">;

type HuntActivity =
  | { body: string; kind: "text_message" }
  | {
      body: string;
      imageFileIds: Id<"_storage">[];
      kind: "image_message";
    }
  | {
      kind: "animal_sighting";
      sightingId: Id<"animalSightings">;
    }
  | {
      kind: "member_in_position";
      targetKey: string;
    }
  | {
      kind: "member_left_position";
      targetKey: string;
    }
  | {
      kind: "sat_activated";
      satId: Id<"areaSats">;
    }
  | { kind: "sat_cleared" };

type RecordHuntActivityArgs = {
  activity: HuntActivity;
  actor: HuntActor;
  eventId: Id<"events">;
};

function normalizeImageCaption(body: string) {
  return body.trim().slice(0, CHAT_IMAGE_CAPTION_MAX_LENGTH);
}

function validateImageFileIds(imageFileIds: Id<"_storage">[]) {
  if (imageFileIds.length === 0) {
    throw new Error("Image messages require at least one image");
  }
  if (imageFileIds.length > MAX_CHAT_IMAGE_COUNT) {
    throw new Error("Max 4 images per message");
  }
}

async function markActorReadThroughMessage(
  ctx: MutationCtx,
  eventId: Id<"events">,
  actorId: Id<"users">,
  messageId: Id<"messages">
) {
  const [membership, message] = await Promise.all([
    ctx.db
      .query("eventMembers")
      .withIndex("by_eventId_and_userId", (q) =>
        q.eq("eventId", eventId).eq("userId", actorId)
      )
      .unique(),
    ctx.db.get(messageId),
  ]);

  if (!membership || membership.status !== "accepted") {
    throw new Error("Not an accepted member");
  }
  if (!message) {
    throw new Error("Message not found");
  }

  await ctx.db.patch(membership._id, {
    lastReadMessageAt: message._creationTime,
  });
}

export async function recordHuntActivity(
  ctx: MutationCtx,
  { activity, actor, eventId }: RecordHuntActivityArgs
) {
  const event = await ctx.db.get(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  let messageId: Id<"messages">;
  let markActorRead = true;
  let notifyChat = false;

  switch (activity.kind) {
    case "text_message":
      messageId = await ctx.db.insert("messages", {
        body: activity.body,
        eventId,
        type: "text",
        userId: actor._id,
      });
      notifyChat = true;
      break;

    case "image_message":
      validateImageFileIds(activity.imageFileIds);
      messageId = await ctx.db.insert("messages", {
        body: normalizeImageCaption(activity.body),
        eventId,
        imageFileIds: activity.imageFileIds,
        type: "image",
        userId: actor._id,
      });
      notifyChat = true;
      break;

    case "animal_sighting": {
      const sighting = await ctx.db.get(activity.sightingId);
      if (
        !sighting ||
        sighting.eventId !== eventId ||
        sighting.userId !== actor._id
      ) {
        throw new Error("Animal sighting not found");
      }
      messageId = await ctx.db.insert("messages", {
        body: `Såg ${getAnimalSightingLabel(sighting.animal).toLowerCase()} på kartan.`,
        eventId,
        sightingId: activity.sightingId,
        type: "animal_sighting",
        userId: actor._id,
      });
      await ctx.db.patch(activity.sightingId, { messageId });
      break;
    }

    case "member_in_position":
      messageId = await ctx.db.insert("messages", {
        body: `${actor.name} är på plats.`,
        eventId,
        targetKey: activity.targetKey,
        type: "member_in_position",
        userId: actor._id,
      });
      break;

    case "member_left_position":
      messageId = await ctx.db.insert("messages", {
        body: `${actor.name} är inte längre markerad på plats.`,
        eventId,
        targetKey: activity.targetKey,
        type: "member_left_position",
        userId: actor._id,
      });
      break;

    case "sat_activated": {
      const sat = await ctx.db.get(activity.satId);
      if (!sat || sat.areaId !== event.areaId) {
        throw new Error("Såt not found in this hunt area");
      }
      messageId = await ctx.db.insert("messages", {
        body: `Aktiv såt: ${sat.name}`,
        eventId,
        satId: activity.satId,
        type: "sat_activated",
        userId: actor._id,
      });
      markActorRead = false;
      break;
    }

    case "sat_cleared":
      messageId = await ctx.db.insert("messages", {
        body: "Aktiv såt rensad.",
        eventId,
        type: "sat_cleared",
        userId: actor._id,
      });
      markActorRead = false;
      break;
  }

  if (markActorRead) {
    await markActorReadThroughMessage(ctx, eventId, actor._id, messageId);
  }
  if (notifyChat) {
    await ctx.scheduler.runAfter(
      0,
      internal.notificationDispatch.sendChatMessage,
      { messageId }
    );
  }

  return messageId;
}
