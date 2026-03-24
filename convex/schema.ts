import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  })
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_clerkId", ["clerkId"])
    .searchIndex("search_name", { searchField: "name" }),

  friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_requesterId_and_status", ["requesterId", "status"])
    .index("by_addresseeId_and_status", ["addresseeId", "status"])
    .index("by_requesterId_and_addresseeId", ["requesterId", "addresseeId"]),

  areas: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    polygon: v.array(
      v.object({ latitude: v.number(), longitude: v.number() })
    ),
  }).index("by_creatorId", ["creatorId"]),

  areaPoints: defineTable({
    areaId: v.id("areas"),
    name: v.string(),
    description: v.optional(v.string()),
    latitude: v.number(),
    longitude: v.number(),
    type: v.union(
      v.literal("pass"),
      v.literal("tower"),
      v.literal("meeting"),
      v.literal("parking"),
      v.literal("other")
    ),
  }).index("by_areaId", ["areaId"]),

  events: defineTable({
    areaId: v.id("areas"),
    title: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    joinCode: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  })
    .index("by_areaId", ["areaId"])
    .index("by_creatorId", ["creatorId"])
    .index("by_joinCode", ["joinCode"]),

  eventMembers: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("invited"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    lastLatitude: v.optional(v.number()),
    lastLongitude: v.optional(v.number()),
    lastHeading: v.optional(v.number()),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_eventId_and_status", ["eventId", "status"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_eventId_and_userId", ["eventId", "userId"]),

  positionTrails: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    latitude: v.number(),
    longitude: v.number(),
    heading: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_eventId_and_userId", ["eventId", "userId"])
    .index("by_eventId", ["eventId"]),

  messages: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    body: v.string(),
  }).index("by_eventId", ["eventId"]),
});
