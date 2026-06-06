/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as animalSightings from "../animalSightings.js";
import type * as areaFeatures from "../areaFeatures.js";
import type * as areaSats from "../areaSats.js";
import type * as areas from "../areas.js";
import type * as eventAccess from "../eventAccess.js";
import type * as eventCleanup from "../eventCleanup.js";
import type * as eventLifecycle from "../eventLifecycle.js";
import type * as eventMembers from "../eventMembers.js";
import type * as eventPointAssignments from "../eventPointAssignments.js";
import type * as eventSats from "../eventSats.js";
import type * as events from "../events.js";
import type * as friends from "../friends.js";
import type * as geometry from "../geometry.js";
import type * as helpers from "../helpers.js";
import type * as issues from "../issues.js";
import type * as messageHelpers from "../messageHelpers.js";
import type * as messages from "../messages.js";
import type * as migrations from "../migrations.js";
import type * as notificationDispatch from "../notificationDispatch.js";
import type * as notificationModel from "../notificationModel.js";
import type * as notifications from "../notifications.js";
import type * as positionTracking from "../positionTracking.js";
import type * as positionTrails from "../positionTrails.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  animalSightings: typeof animalSightings;
  areaFeatures: typeof areaFeatures;
  areaSats: typeof areaSats;
  areas: typeof areas;
  eventAccess: typeof eventAccess;
  eventCleanup: typeof eventCleanup;
  eventLifecycle: typeof eventLifecycle;
  eventMembers: typeof eventMembers;
  eventPointAssignments: typeof eventPointAssignments;
  eventSats: typeof eventSats;
  events: typeof events;
  friends: typeof friends;
  geometry: typeof geometry;
  helpers: typeof helpers;
  issues: typeof issues;
  messageHelpers: typeof messageHelpers;
  messages: typeof messages;
  migrations: typeof migrations;
  notificationDispatch: typeof notificationDispatch;
  notificationModel: typeof notificationModel;
  notifications: typeof notifications;
  positionTracking: typeof positionTracking;
  positionTrails: typeof positionTrails;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  migrations: {
    lib: {
      cancel: FunctionReference<
        "mutation",
        "internal",
        { name: string },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
      cancelAll: FunctionReference<
        "mutation",
        "internal",
        { sinceTs?: number },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; names?: Array<string> },
        Array<{
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }>
      >;
      migrate: FunctionReference<
        "mutation",
        "internal",
        {
          batchSize?: number;
          cursor?: string | null;
          dryRun: boolean;
          fnHandle: string;
          name: string;
          next?: Array<{ fnHandle: string; name: string }>;
          oneBatchOnly?: boolean;
        },
        {
          batchSize?: number;
          cursor?: string | null;
          error?: string;
          isDone: boolean;
          latestEnd?: number;
          latestStart: number;
          name: string;
          next?: Array<string>;
          processed: number;
          state: "inProgress" | "success" | "failed" | "canceled" | "unknown";
        }
      >;
    };
  };
};
