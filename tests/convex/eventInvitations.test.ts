/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");
const INVITEE_TOKEN = "https://clerk.test|invitee";
const TEST_NOW = Date.UTC(2026, 7, 30, 12);
const TEST_DAY_START = Date.UTC(2026, 7, 30);
const TEST_DAY_END_BOUNDARY = TEST_DAY_START + 24 * 60 * 60 * 1000;

type InvitationStatus = "accepted" | "declined" | "invited";

async function seedInvitation({
  endDate = 4_000_000_000_000,
  endedAt,
  status = "invited",
}: {
  endDate?: number;
  endedAt?: number;
  status?: InvitationStatus;
} = {}) {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const creatorId = await ctx.db.insert("users", {
      clerkId: "invite-creator",
      email: "jaktledare@example.com",
      name: "Jaktledaren",
      tokenIdentifier: "https://clerk.test|invite-creator",
    });
    const inviteeId = await ctx.db.insert("users", {
      clerkId: "invitee",
      email: "jagare@example.com",
      name: "Inbjuden Jägare",
      tokenIdentifier: INVITEE_TOKEN,
    });
    const areaId = await ctx.db.insert("areas", {
      creatorId,
      name: "Tallskogen",
      polygon: [
        { latitude: 59, longitude: 12 },
        { latitude: 59, longitude: 13 },
        { latitude: 60, longitude: 13 },
      ],
    });
    const eventId = await ctx.db.insert("events", {
      areaId,
      creatorId,
      endDate,
      endedAt,
      startDate: TEST_DAY_START,
      title: "Premiärjakten",
    });
    const memberId = await ctx.db.insert("eventMembers", {
      eventId,
      role: "member",
      status,
      userId: inviteeId,
    });

    return { eventId, inviteeId, memberId };
  });

  return {
    asInvitee: t.withIdentity({ tokenIdentifier: INVITEE_TOKEN }),
    seeded,
    t,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("active hunt invitations", () => {
  test("lists an active invitation and removes it after acceptance", async () => {
    const { asInvitee, seeded, t } = await seedInvitation();

    await expect(
      asInvitee.query(api.eventMembers.listMyInvitations, {})
    ).resolves.toEqual([
      {
        _id: seeded.memberId,
        areaName: "Tallskogen",
        event: {
          _id: seeded.eventId,
          endDate: 4_000_000_000_000,
          startDate: TEST_DAY_START,
          title: "Premiärjakten",
        },
      },
    ]);

    await asInvitee.mutation(api.eventMembers.acceptInvite, {
      memberId: seeded.memberId,
    });

    const membership = await t.run((ctx) => ctx.db.get(seeded.memberId));
    expect(membership?.status).toBe("accepted");
    await expect(
      asInvitee.query(api.eventMembers.listMyInvitations, {})
    ).resolves.toEqual([]);
  });

  test("removes an invitation after it is declined", async () => {
    const { asInvitee, seeded, t } = await seedInvitation();

    await asInvitee.mutation(api.eventMembers.declineInvite, {
      memberId: seeded.memberId,
    });

    const membership = await t.run((ctx) => ctx.db.get(seeded.memberId));
    expect(membership?.status).toBe("declined");
    await expect(
      asInvitee.query(api.eventMembers.listMyInvitations, {})
    ).resolves.toEqual([]);
  });

  test("hides manually ended invitations and rejects both responses", async () => {
    const { asInvitee, seeded } = await seedInvitation({ endedAt: TEST_NOW });

    await expect(
      asInvitee.query(api.eventMembers.listMyInvitations, {})
    ).resolves.toEqual([]);
    await expect(
      asInvitee.mutation(api.eventMembers.acceptInvite, {
        memberId: seeded.memberId,
      })
    ).rejects.toThrow("Cannot accept an invite to an ended hunt");
    await expect(
      asInvitee.mutation(api.eventMembers.declineInvite, {
        memberId: seeded.memberId,
      })
    ).rejects.toThrow("Cannot decline an invite to an ended hunt");
  });

  test("keeps the selected end date inclusive through the whole calendar day", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TEST_NOW);
    const { asInvitee, seeded } = await seedInvitation({
      endDate: TEST_DAY_START,
    });

    await expect(
      asInvitee.query(api.eventMembers.listMyInvitations, {})
    ).resolves.toHaveLength(1);

    vi.setSystemTime(TEST_DAY_END_BOUNDARY);

    await expect(
      asInvitee.query(api.eventMembers.listMyInvitations, {})
    ).resolves.toEqual([]);
    await expect(
      asInvitee.mutation(api.eventMembers.acceptInvite, {
        memberId: seeded.memberId,
      })
    ).rejects.toThrow("Cannot accept an invite to an ended hunt");
    await expect(
      asInvitee.mutation(api.eventMembers.declineInvite, {
        memberId: seeded.memberId,
      })
    ).rejects.toThrow("Cannot decline an invite to an ended hunt");
  });

  test("does not expose invitations to unauthenticated callers", async () => {
    const { t } = await seedInvitation();

    await expect(t.query(api.eventMembers.listMyInvitations, {})).rejects.toThrow(
      "Unauthenticated"
    );
  });
});
