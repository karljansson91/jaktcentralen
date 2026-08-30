/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");
const TOKEN_IDENTIFIER = "https://clerk.test|activity-test-user";
const TEST_NOW = Date.UTC(2026, 7, 30, 12);

type SeededHunt = {
  areaId: Id<"areas">;
  eventId: Id<"events">;
  membershipId: Id<"eventMembers">;
  passId: Id<"areaFeatures">;
  satId: Id<"areaSats">;
  userId: Id<"users">;
};

async function seedHunt() {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx): Promise<SeededHunt> => {
    const userId = await ctx.db.insert("users", {
      clerkId: "activity-test-user",
      email: "anna@example.com",
      name: "Anna Andersson",
      tokenIdentifier: TOKEN_IDENTIFIER,
    });
    const areaId = await ctx.db.insert("areas", {
      creatorId: userId,
      name: "Testmarken",
      polygon: [
        { latitude: 59, longitude: 12 },
        { latitude: 59, longitude: 13 },
        { latitude: 60, longitude: 13 },
        { latitude: 60, longitude: 12 },
      ],
    });
    const eventId = await ctx.db.insert("events", {
      areaId,
      creatorId: userId,
      endDate: 4_000_000_000_000,
      startDate: 0,
      title: "Testjakt",
    });
    const membershipId = await ctx.db.insert("eventMembers", {
      eventId,
      role: "admin",
      status: "accepted",
      userId,
    });
    const satId = await ctx.db.insert("areaSats", {
      areaId,
      color: "#398048",
      creatorId: userId,
      name: "Norra såten",
      polygon: [
        { latitude: 59.1, longitude: 12.1 },
        { latitude: 59.1, longitude: 12.9 },
        { latitude: 59.9, longitude: 12.9 },
        { latitude: 59.9, longitude: 12.1 },
      ],
    });
    const passId = await ctx.db.insert("areaFeatures", {
      areaId,
      category: "pass",
      color: "#398048",
      creatorId: userId,
      name: "Pass 1",
      point: { latitude: 59.5, longitude: 12.5 },
    });
    await ctx.db.insert("eventPointAssignments", {
      assignedUserId: userId,
      createdByUserId: userId,
      eventId,
      targetKey: String(passId),
      updatedAt: TEST_NOW,
    });
    return { areaId, eventId, membershipId, passId, satId, userId };
  });

  return {
    asUser: t.withIdentity({ tokenIdentifier: TOKEN_IDENTIFIER }),
    seeded,
    t,
  };
}

async function readEventState(
  t: Awaited<ReturnType<typeof seedHunt>>["t"],
  eventId: Id<"events">,
  membershipId: Id<"eventMembers">
) {
  return await t.run(async (ctx) => ({
    membership: await ctx.db.get(membershipId),
    messages: await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .take(20),
    scheduled: await ctx.db.system
      .query("_scheduled_functions")
      .take(20),
  }));
}

describe("hunt activity", () => {
  test("text messages own read state and schedule chat notifications", async () => {
    const { asUser, seeded, t } = await seedHunt();

    const messageId = await asUser.mutation(api.messages.send, {
      body: "Smyg in från väster",
      eventId: seeded.eventId,
    });

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      _id: messageId,
      body: "Smyg in från väster",
      eventId: seeded.eventId,
      type: "text",
      userId: seeded.userId,
    });
    expect(state.membership?.lastReadMessageAt).toBe(
      state.messages[0]._creationTime
    );
    expect(state.scheduled).toMatchObject([
      { name: "notificationDispatch:sendChatMessage" },
    ]);
  });

  test("image messages normalize captions and schedule chat notifications", async () => {
    const { asUser, seeded, t } = await seedHunt();
    const imageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["image"], { type: "image/jpeg" }))
    );

    const messageId = await asUser.mutation(api.messages.sendImage, {
      body: "  Bildtext  ",
      eventId: seeded.eventId,
      imageFileIds: [imageId],
    });

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    expect(state.messages[0]).toMatchObject({
      _id: messageId,
      body: "Bildtext",
      eventId: seeded.eventId,
      imageFileIds: [imageId],
      type: "image",
      userId: seeded.userId,
    });
    expect(state.membership?.lastReadMessageAt).toBe(
      state.messages[0]._creationTime
    );
    expect(state.scheduled).toMatchObject([
      { name: "notificationDispatch:sendChatMessage" },
    ]);
  });

  test("animal sightings are linked to their exact system message", async () => {
    const { asUser, seeded, t } = await seedHunt();

    const sightingId = await asUser.mutation(api.animalSightings.report, {
      animal: "elk",
      eventId: seeded.eventId,
      latitude: 59.6,
      longitude: 12.6,
    });

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    const sighting = await t.run((ctx) => ctx.db.get(sightingId));
    const messages = await asUser.query(api.messages.list, {
      eventId: seeded.eventId,
      paginationOpts: { cursor: null, numItems: 20 },
    });
    expect(state.messages[0]).toMatchObject({
      body: "Såg älg på kartan.",
      eventId: seeded.eventId,
      sightingId,
      type: "animal_sighting",
      userId: seeded.userId,
    });
    expect(sighting?.messageId).toBe(state.messages[0]._id);
    expect(messages.page[0]).toMatchObject({ animal: "elk", sightingId });
    expect(state.membership?.lastReadMessageAt).toBe(
      state.messages[0]._creationTime
    );
    expect(state.scheduled).toHaveLength(0);
  });

  test("position changes create exact system messages and update read state", async () => {
    const { asUser, seeded, t } = await seedHunt();

    await asUser.mutation(api.eventMembers.markInPosition, {
      eventId: seeded.eventId,
    });
    await asUser.mutation(api.eventMembers.clearInPosition, {
      eventId: seeded.eventId,
    });

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    expect(state.messages).toMatchObject([
      {
        body: "Anna Andersson är på plats.",
        eventId: seeded.eventId,
        targetKey: String(seeded.passId),
        type: "member_in_position",
        userId: seeded.userId,
      },
      {
        body: "Anna Andersson är inte längre markerad på plats.",
        eventId: seeded.eventId,
        targetKey: String(seeded.passId),
        type: "member_left_position",
        userId: seeded.userId,
      },
    ]);
    expect(state.membership?.lastReadMessageAt).toBe(
      state.messages[1]._creationTime
    );
    expect(state.scheduled).toHaveLength(0);
  });

  test("sat changes preserve read state and do not schedule chat notifications", async () => {
    const { asUser, seeded, t } = await seedHunt();

    await asUser.mutation(api.eventSats.saveSetup, {
      assignments: [],
      eventId: seeded.eventId,
      excludedUserIds: [],
      satId: seeded.satId,
      selectedTargetKeys: [],
    });
    await asUser.mutation(api.eventSats.clearSetup, {
      eventId: seeded.eventId,
    });

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    expect(state.messages).toMatchObject([
      {
        body: "Aktiv såt: Norra såten",
        eventId: seeded.eventId,
        satId: seeded.satId,
        type: "sat_activated",
        userId: seeded.userId,
      },
      {
        body: "Aktiv såt rensad.",
        eventId: seeded.eventId,
        type: "sat_cleared",
        userId: seeded.userId,
      },
    ]);
    expect(state.messages[1]).not.toHaveProperty("satId");
    expect(state.membership?.lastReadMessageAt).toBeUndefined();
    expect(state.scheduled).toHaveLength(0);
  });

  test("invalid image counts and missing related documents write nothing", async () => {
    const { asUser, seeded, t } = await seedHunt();
    const imageId = await t.run(async (ctx) =>
      ctx.storage.store(new Blob(["image"], { type: "image/jpeg" }))
    );

    await expect(
      asUser.mutation(api.messages.sendImage, {
        body: "",
        eventId: seeded.eventId,
        imageFileIds: [],
      })
    ).rejects.toThrow("Image messages require at least one image");
    await expect(
      asUser.mutation(api.messages.sendImage, {
        body: "",
        eventId: seeded.eventId,
        imageFileIds: [imageId, imageId, imageId, imageId, imageId],
      })
    ).rejects.toThrow("Max 4 images per message");

    await t.run(async (ctx) => ctx.db.delete(seeded.satId));
    await expect(
      asUser.mutation(api.eventSats.saveSetup, {
        assignments: [],
        eventId: seeded.eventId,
        excludedUserIds: [],
        satId: seeded.satId,
        selectedTargetKeys: [],
      })
    ).rejects.toThrow("Såt not found in this hunt area");

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    expect(state.messages).toHaveLength(0);
    expect(state.scheduled).toHaveLength(0);
  });

  test("rejects activity from an unauthenticated caller", async () => {
    const { seeded, t } = await seedHunt();

    await expect(
      t.mutation(api.messages.send, {
        body: "Ingen ska kunna skicka detta",
        eventId: seeded.eventId,
      })
    ).rejects.toThrow("Unauthenticated");

    const state = await readEventState(t, seeded.eventId, seeded.membershipId);
    expect(state.messages).toHaveLength(0);
    expect(state.scheduled).toHaveLength(0);
  });
});
