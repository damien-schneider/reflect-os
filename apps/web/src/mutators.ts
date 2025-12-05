/**
 * Zero Custom Mutators
 *
 * This file defines client-side mutators that run optimistically.
 * Server-side validation is handled in the push endpoint.
 *
 * For board creation, the client mutator runs immediately (optimistic),
 * and the server mutator validates the limit. If the server rejects,
 * Zero automatically rolls back the client-side change.
 */

import type { Transaction } from "@rocicorp/zero";
import type { Schema } from "./zero-schema";

// Re-export PLAN_LIMITS from shared config for backwards compatibility
export { PLAN_LIMITS } from "./features/subscription/tiers.config";

export type CreateBoardArgs = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  isPublic?: boolean;
};

/**
 * Create mutators with auth context.
 * AuthData is passed from the Zero provider and used for permission checks.
 */
export function createMutators(_authData?: { sub: string | null }) {
  return {
    board: {
      /**
       * Create a new board (optimistic).
       *
       * Client: Immediately creates the board in local cache.
       * Server: Validates organization membership and board limit,
       *         then commits or rejects.
       */
      create: async (tx: Transaction<Schema>, args: CreateBoardArgs) => {
        const now = Date.now();

        // On client, just insert optimistically
        // Server will validate and rollback if invalid
        await tx.mutate.board.insert({
          id: args.id,
          organizationId: args.organizationId,
          name: args.name,
          slug: args.slug,
          description: args.description ?? "",
          isPublic: args.isPublic ?? false,
          createdAt: now,
          updatedAt: now,
        });
      },
    },
  };
}

export type Mutators = ReturnType<typeof createMutators>;
