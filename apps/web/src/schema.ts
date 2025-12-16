/**
 * Zero schema exports
 *
 * Tables and relationships are defined natively in zero-schema.ts
 * This mirrors the Drizzle schema in packages/db/src/schema.ts
 *
 * Zero 0.25 Migration Status:
 * - Schema updated for Zero 0.25 (auth string, cacheURL, connection API)
 * - Using enableLegacyQueries and enableLegacyMutators for gradual migration
 * - queries.ts and mutators.ts define the new API (ready for future use)
 * - zql builder exported for use in queries.ts
 *
 * TODO: Complete migration by:
 * 1. Implement /api/zero/query and /api/zero/mutate server endpoints
 * 2. Update all z.query.* usages to use queries.* from queries.ts
 * 3. Update all z.mutate.* usages to use zero.mutate(mutators.*) from mutators.ts
 * 4. Remove enableLegacyQueries/enableLegacyMutators flags
 *
 * See https://zero.rocicorp.dev/docs/queries and https://zero.rocicorp.dev/docs/mutators
 */

export {
  type AdminNote,
  type Board,
  type ChangelogSubscription,
  type Comment,
  type Feedback,
  type FeedbackTag,
  type Invitation,
  type Member,
  type Notification,
  type Organization,
  type Release,
  type ReleaseItem,
  type Schema,
  type Subscription,
  schema as default,
  schema,
  type Tag,
  type User,
  type Vote,
  zql,
} from "./zero-schema";

// Auth context type - used in queries/mutators for permissions
export type AuthData = {
  sub: string | null;
};
