/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");
const LEADER_TOKEN = "https://clerk.test|shot-leader";
const REPORTER_TOKEN = "https://clerk.test|shot-reporter";
const HELPER_TOKEN = "https://clerk.test|shot-helper";
const OUTSIDER_TOKEN = "https://clerk.test|shot-outsider";

async function seedHunt() {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const leaderId = await ctx.db.insert("users", {
      clerkId: "shot-leader",
      email: "leader@example.com",
      name: "Lena Jaktledare",
      tokenIdentifier: LEADER_TOKEN,
    });
    const reporterId = await ctx.db.insert("users", {
      clerkId: "shot-reporter",
      email: "reporter@example.com",
      name: "Rolf Rapportör",
      tokenIdentifier: REPORTER_TOKEN,
    });
    const helperId = await ctx.db.insert("users", {
      clerkId: "shot-helper",
      email: "helper@example.com",
      name: "Hanna Eftersök",
      tokenIdentifier: HELPER_TOKEN,
    });
    await ctx.db.insert("users", {
      clerkId: "shot-outsider",
      email: "outsider@example.com",
      name: "Olle Utanför",
      tokenIdentifier: OUTSIDER_TOKEN,
    });
    const areaId = await ctx.db.insert("areas", {
      creatorId: leaderId,
      name: "Skottmarken",
      polygon: [
        { latitude: 59, longitude: 12 },
        { latitude: 59, longitude: 13 },
        { latitude: 60, longitude: 13 },
      ],
    });
    const eventId = await ctx.db.insert("events", {
      areaId,
      creatorId: leaderId,
      endDate: 4_000_000_000_000,
      startDate: 0,
      title: "Skottjakt",
    });
    await Promise.all([
      ctx.db.insert("eventMembers", {
        eventId,
        role: "admin",
        status: "accepted",
        userId: leaderId,
      }),
      ctx.db.insert("eventMembers", {
        eventId,
        role: "member",
        status: "accepted",
        userId: reporterId,
      }),
      ctx.db.insert("eventMembers", {
        eventId,
        role: "member",
        status: "accepted",
        userId: helperId,
      }),
    ]);
    return { eventId, helperId, leaderId, reporterId };
  });

  return {
    asHelper: t.withIdentity({ tokenIdentifier: HELPER_TOKEN }),
    asLeader: t.withIdentity({ tokenIdentifier: LEADER_TOKEN }),
    asOutsider: t.withIdentity({ tokenIdentifier: OUTSIDER_TOKEN }),
    asReporter: t.withIdentity({ tokenIdentifier: REPORTER_TOKEN }),
    seeded,
    t,
  };
}

function reportArgs(
  eventId: Id<"events">,
  operationKey: string,
  result: "fell" | "continued" | "uncertain" = "continued"
) {
  return {
    eventId,
    operationKey,
    result,
    shooterPosition: {
      latitude: 59.499,
      longitude: 12.499,
      timestamp: 1_788_120_000_000,
    },
    shotLatitude: 59.5,
    shotLongitude: 12.5,
    speciesId: "elk",
  } as const;
}

async function readReportState(
  t: Awaited<ReturnType<typeof seedHunt>>["t"],
  eventId: Id<"events">
) {
  return await t.run(async (ctx) => ({
    activities: await ctx.db
      .query("shotReportActivities")
      .withIndex("by_eventId_and_timestamp", (q) => q.eq("eventId", eventId))
      .collect(),
    followUps: await ctx.db
      .query("followUps")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect(),
    messages: await ctx.db
      .query("messages")
      .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
      .collect(),
    reports: await ctx.db
      .query("shotReports")
      .withIndex("by_eventId_and_reportedAt", (q) => q.eq("eventId", eventId))
      .collect(),
  }));
}

describe("shot reports", () => {
  test.each([
    ["fell", false],
    ["continued", true],
    ["uncertain", true],
  ] as const)("creates %s reports with the correct follow-up", async (result, hasFollowUp) => {
    const { asReporter, seeded, t } = await seedHunt();

    const reportId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, `create-${result}`, result)
    );
    const state = await readReportState(t, seeded.eventId);

    expect(state.reports).toHaveLength(1);
    expect(state.reports[0]).toMatchObject({
      _id: reportId,
      reporterUserId: seeded.reporterId,
      result,
      shooterPosition: reportArgs(seeded.eventId, "ignored").shooterPosition,
      speciesId: "elk",
      speciesLabel: "Älg",
      status: "active",
    });
    expect(state.followUps).toHaveLength(hasFollowUp ? 1 : 0);
    if (hasFollowUp) {
      expect(state.followUps[0]).toMatchObject({
        reportId,
        status: "needs_planning",
      });
    }
    expect(state.activities).toMatchObject([
      { actorUserId: seeded.reporterId, kind: "reported", reportId },
    ]);
    expect(state.messages).toMatchObject([
      {
        body: `Skott rapporterat: Älg – ${
          result === "fell"
            ? "föll på plats"
            : result === "continued"
              ? "gick vidare"
              : "osäkert"
        }.`,
        reportId,
        type: "shot_report",
      },
    ]);
    expect(state.reports[0].messageId).toBe(state.messages[0]._id);
  });

  test("uses the operation key to make report creation idempotent", async () => {
    const { asReporter, seeded, t } = await seedHunt();
    const firstId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, "same-operation")
    );
    const secondId = await asReporter.mutation(api.shotReports.report, {
      ...reportArgs(seeded.eventId, "same-operation", "uncertain"),
      speciesId: "fox",
    });

    expect(secondId).toBe(firstId);
    const state = await readReportState(t, seeded.eventId);
    expect(state.reports).toHaveLength(1);
    expect(state.followUps).toHaveLength(1);
    expect(state.activities).toHaveLength(1);
    expect(state.messages).toHaveLength(1);
  });

  test("lets every accepted participant supplement but not rewrite the report", async () => {
    const { asHelper, asOutsider, asReporter, seeded } = await seedHunt();
    const reportId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, "supplement")
    );

    await asHelper.mutation(api.shotReports.addSupplement, {
      escapeDirectionDegrees: 225,
      note: "Spår mot bäcken",
      reportId,
    });
    await expect(
      asHelper.mutation(api.shotReports.updateReport, {
        reportId,
        result: "uncertain",
        speciesId: "boar",
      })
    ).rejects.toThrow("Not authorized to edit this report");
    await expect(
      asOutsider.mutation(api.shotReports.addSupplement, {
        note: "Ska inte sparas",
        reportId,
      })
    ).rejects.toThrow("Not an accepted member");

    const details = await asReporter.query(api.shotReports.getDetails, {
      currentTime: Date.now(),
      reportId,
    });
    expect(details.activities).toMatchObject([
      { kind: "reported" },
      {
        actor: { name: "Hanna Eftersök" },
        escapeDirectionDegrees: 225,
        kind: "supplemented",
        note: "Spår mot bäcken",
      },
    ]);
  });

  test("enforces planning roles and preserves every follow-up status", async () => {
    const { asHelper, asLeader, asReporter, seeded, t } = await seedHunt();
    const reportId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, "follow-up")
    );

    await expect(
      asReporter.mutation(api.shotReports.planFollowUp, {
        assignedUserId: seeded.helperId,
        reportId,
      })
    ).rejects.toThrow("Leader access required");
    await asLeader.mutation(api.shotReports.planFollowUp, {
      assignedUserId: seeded.helperId,
      instruction: "Börja vid skottplatsen",
      reportId,
    });
    await asHelper.mutation(api.shotReports.startFollowUp, { reportId });
    await asHelper.mutation(api.shotReports.finishFollowUp, {
      note: "Spåret upphörde vid vägen",
      reportId,
      resolution: "not_found",
    });

    const state = await readReportState(t, seeded.eventId);
    expect(state.followUps[0]).toMatchObject({
      assignedUserId: seeded.helperId,
      instruction: "Börja vid skottplatsen",
      resolution: "not_found",
      resolutionNote: "Spåret upphörde vid vägen",
      status: "completed",
    });
    expect(state.activities.map((activity) => activity.kind)).toEqual([
      "reported",
      "follow_up_planned",
      "follow_up_started",
      "follow_up_finished",
    ]);
  });

  test.each([
    "game_found",
    "game_culled",
    "not_found",
    "other",
  ] as const)("stores the %s follow-up resolution", async (resolution) => {
    const { asHelper, asLeader, asReporter, seeded, t } = await seedHunt();
    const reportId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, `resolution-${resolution}`)
    );
    await asLeader.mutation(api.shotReports.planFollowUp, {
      assignedUserId: seeded.helperId,
      reportId,
    });
    await asHelper.mutation(api.shotReports.startFollowUp, { reportId });
    await asLeader.mutation(api.shotReports.finishFollowUp, {
      reportId,
      resolution,
    });

    const state = await readReportState(t, seeded.eventId);
    expect(state.followUps[0]).toMatchObject({ resolution, status: "completed" });
  });

  test("locks the reporter after follow-up starts while the leader may mark false", async () => {
    const { asHelper, asLeader, asReporter, seeded, t } = await seedHunt();
    const reportId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, "edit-permissions")
    );

    await asReporter.mutation(api.shotReports.updateReport, {
      reportId,
      result: "uncertain",
      speciesId: "fox",
    });
    await asLeader.mutation(api.shotReports.planFollowUp, {
      assignedUserId: seeded.helperId,
      reportId,
    });
    await asHelper.mutation(api.shotReports.startFollowUp, { reportId });
    await expect(
      asReporter.mutation(api.shotReports.updateReport, {
        reportId,
        result: "fell",
        speciesId: "elk",
      })
    ).rejects.toThrow("Not authorized to edit this report");
    await expect(
      asReporter.mutation(api.shotReports.markFalseReport, { reportId })
    ).rejects.toThrow("Not authorized to edit this report");
    await asLeader.mutation(api.shotReports.markFalseReport, { reportId });

    const state = await readReportState(t, seeded.eventId);
    expect(state.reports[0].status).toBe("false_report");
    expect(state.followUps[0].status).toBe("false_report");
    expect(state.activities.at(-1)?.kind).toBe("false_report");
  });

  test("makes all report mutations read-only after the hunt ends", async () => {
    const { asLeader, asReporter, seeded, t } = await seedHunt();
    const reportId = await asReporter.mutation(
      api.shotReports.report,
      reportArgs(seeded.eventId, "ended")
    );
    await t.run((ctx) => ctx.db.patch(seeded.eventId, { endedAt: Date.now() }));

    await expect(
      asReporter.mutation(api.shotReports.addSupplement, {
        note: "För sent",
        reportId,
      })
    ).rejects.toThrow("Hunt is not active");
    await expect(
      asLeader.mutation(api.shotReports.planFollowUp, {
        assignedUserId: seeded.helperId,
        reportId,
      })
    ).rejects.toThrow("Hunt is not active");
    await expect(
      asReporter.mutation(
        api.shotReports.report,
        reportArgs(seeded.eventId, "new-after-end")
      )
    ).rejects.toThrow("Hunt is not active");

    const details = await asReporter.query(api.shotReports.getDetails, {
      currentTime: 4_000_000_000_001,
      reportId,
    });
    expect(details).toMatchObject({
      canEdit: false,
      canManageFollowUp: false,
      canPlanFollowUp: false,
      canSupplement: false,
      eventEnded: true,
    });
  });
});
