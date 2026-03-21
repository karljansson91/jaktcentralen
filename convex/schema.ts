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

  hunts: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    area: v.array(v.object({ latitude: v.number(), longitude: v.number() })),
    joinCode: v.optional(v.string()),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  })
    .index("by_creatorId", ["creatorId"])
    .index("by_joinCode", ["joinCode"]),

  huntMembers: defineTable({
    huntId: v.id("hunts"),
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
    .index("by_huntId_and_status", ["huntId", "status"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_huntId_and_userId", ["huntId", "userId"]),

  huntPoints: defineTable({
    huntId: v.id("hunts"),
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
  }).index("by_huntId", ["huntId"]),

  positionTrails: defineTable({
    huntId: v.id("hunts"),
    userId: v.id("users"),
    latitude: v.number(),
    longitude: v.number(),
    heading: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_huntId_and_userId", ["huntId", "userId"])
    .index("by_huntId", ["huntId"]),

  messages: defineTable({
    huntId: v.id("hunts"),
    userId: v.id("users"),
    body: v.string(),
  }).index("by_huntId", ["huntId"]),
});
