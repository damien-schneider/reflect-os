/**
 * Server-side Mutators
 *
 * These mutators run on the server with full database access.
 * They can perform authoritative validation that the client cannot.
 *
 * The server mutator wraps client mutators and adds authorization checks
 * before delegating to the shared implementation.
 */

import type { Transaction } from "@rocicorp/zero";
import { PLAN_LIMITS } from "../src/features/subscription/tiers.config";
import type { CreateBoardArgs, Mutators } from "../src/mutators";
import type { Schema } from "../src/zero-schema";

type AuthData = {
  sub: string | null;
};

/**
 * Create server mutators that wrap client mutators with server-side validation.
 * Uses ZQL for type-safe database queries.
 */
export function createServerMutators(
  authData: AuthData,
  clientMutators: Mutators
) {
  return {
    ...clientMutators,

    board: {
      ...clientMutators.board,

      /**
       * Create a board with server-side limit validation.
       * Uses ZQL queries for type-safe database access.
       */
      create: async (tx: Transaction<Schema>, args: CreateBoardArgs) => {
        // 1. Verify user is authenticated
        if (!authData.sub) {
          throw new Error("Unauthorized: Must be logged in to create boards");
        }

        // 2. Verify user is a member of the organization using ZQL
        const members = await tx.query.member
          .where("organizationId", args.organizationId)
          .where("userId", authData.sub)
          .run();

        if (members.length === 0) {
          throw new Error("Forbidden: Not a member of this organization");
        }

        // 3. Get organization data using ZQL
        const organizations = await tx.query.organization
          .where("id", args.organizationId)
          .run();

        if (organizations.length === 0) {
          throw new Error("Organization not found");
        }

        const org = organizations[0];
        const tier = (org.subscriptionTier ??
          "free") as keyof typeof PLAN_LIMITS;

        // 4. Count existing boards using ZQL
        const existingBoards = await tx.query.board
          .where("organizationId", args.organizationId)
          .run();

        const boardCount = existingBoards.length;
        const limit = PLAN_LIMITS[tier]?.boards ?? PLAN_LIMITS.free.boards;

        // 5. Check limit
        if (boardCount >= limit) {
          throw new Error(
            `Board limit reached: You have ${boardCount}/${limit} boards on the ${tier} plan. Please upgrade to create more.`
          );
        }

        // 6. Delegate to client mutator for the actual insert
        await clientMutators.board.create(tx, args);
      },
    },
  } as const;
}
