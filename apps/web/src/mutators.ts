/**
 * Zero Mutators
 *
 * Zero 0.25 uses named mutators that are defined here and registered with Zero.
 * Each mutator runs optimistically on the client and is then replayed on the server.
 *
 * The server validates and commits/rejects the mutation.
 *
 * SECURITY MODEL:
 * - All write operations use `isLoggedIn(ctx)` to ensure authentication
 * - User-specific data uses `ctx.userID` to prevent cross-user modifications
 * - Organization membership is verified via `verifyOrgMember` helper
 * - Admin operations verify admin role via `verifyOrgAdmin` helper
 * - Subscription limits are enforced via `verifySubscriptionLimit` helper
 * - The server enforces these checks - client optimistic updates are validated server-side
 */

import { defineMutator, defineMutators } from "@rocicorp/zero";
import { z } from "zod";
import {
  PLAN_LIMITS,
  type SubscriptionTier,
} from "./features/subscription/tiers.config";
import { isLoggedIn } from "./zero-context";
import { zql } from "./zero-schema";

// Re-export PLAN_LIMITS from shared config for backwards compatibility
export { PLAN_LIMITS } from "./features/subscription/tiers.config";

// ============================================
// AUTHORIZATION HELPERS
// ============================================

// Note: Using `any` for tx type to avoid TypeScript deep type instantiation errors
// with Zero's complex Transaction/ServerTransaction types. The runtime behavior is correct.

/**
 * Verify that the user is a member of the organization.
 * Throws an error if not a member.
 *
 * @param tx - Zero transaction
 * @param ctx - Zero context (must have userID)
 * @param organizationId - ID of the organization to check membership for
 */
async function verifyOrgMember(
  // biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
  tx: any,
  ctx: { userID: string },
  organizationId: string
): Promise<{ role: string }> {
  const members = (await tx.run(
    zql.member
      .where("userId", ctx.userID)
      .where("organizationId", organizationId)
  )) as Array<{ role: string }>;

  if (members.length === 0) {
    throw new Error("Access denied: You are not a member of this organization");
  }

  return members[0];
}

/**
 * Verify that the user is an admin or owner of the organization.
 * Throws an error if not an admin.
 *
 * @param tx - Zero transaction
 * @param ctx - Zero context (must have userID)
 * @param organizationId - ID of the organization to check admin status for
 */
async function verifyOrgAdmin(
  // biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
  tx: any,
  ctx: { userID: string },
  organizationId: string
): Promise<void> {
  const membership = await verifyOrgMember(tx, ctx, organizationId);

  if (membership.role !== "admin" && membership.role !== "owner") {
    throw new Error("Access denied: Only admins can perform this action");
  }
}

/**
 * Get the organization's subscription tier and limits.
 * Returns the tier's limits configuration.
 *
 * @param tx - Zero transaction
 * @param organizationId - ID of the organization
 */
async function getOrgSubscriptionTier(
  // biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
  tx: any,
  organizationId: string
): Promise<{ tier: SubscriptionTier; limits: (typeof PLAN_LIMITS)["free"] }> {
  const orgs = (await tx.run(
    zql.organization.where("id", organizationId)
  )) as Array<{ subscriptionTier: string | null }>;

  if (orgs.length === 0) {
    throw new Error("Organization not found");
  }

  const tier = (orgs[0].subscriptionTier ?? "free") as SubscriptionTier;
  const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.free;

  return { tier, limits };
}

/**
 * Verify that creating a new resource won't exceed the subscription limit.
 * Throws an error if the limit would be exceeded.
 *
 * @param tx - Zero transaction
 * @param organizationId - ID of the organization
 * @param limitKey - The limit to check (e.g., "boards", "membersPerOrg")
 * @param currentCount - Current count of the resource
 */
async function verifySubscriptionLimit(
  // biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
  tx: any,
  organizationId: string,
  limitKey: keyof (typeof PLAN_LIMITS)["free"],
  currentCount: number
): Promise<void> {
  const { tier, limits } = await getOrgSubscriptionTier(tx, organizationId);
  const limit = limits[limitKey];

  // Boolean limits (feature flags)
  if (typeof limit === "boolean") {
    if (!limit) {
      throw new Error(
        `This feature requires a ${tier === "free" ? "Pro or Team" : "higher"} plan. Please upgrade your subscription.`
      );
    }
    return;
  }

  // Numeric limits
  if (currentCount >= limit) {
    throw new Error(
      `You've reached the maximum of ${limit} ${limitKey === "membersPerOrg" ? "members" : limitKey} on your ${PLAN_LIMITS[tier] === limits ? tier : "current"} plan. Please upgrade your subscription to add more.`
    );
  }
}

/**
 * Get the organization ID from a board ID.
 * Returns null if the board doesn't exist.
 */
async function getOrgIdFromBoardId(
  // biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
  tx: any,
  boardId: string
): Promise<string | null> {
  const boards = (await tx.run(zql.board.where("id", boardId))) as Array<{
    organizationId: string;
  }>;
  return boards.length > 0 ? boards[0].organizationId : null;
}

/**
 * Get the organization ID from a feedback ID (via board).
 * Returns null if the feedback doesn't exist.
 */
async function getOrgIdFromFeedbackId(
  // biome-ignore lint/suspicious/noExplicitAny: Required to avoid TypeScript deep type instantiation error with complex Zero types
  tx: any,
  feedbackId: string
): Promise<string | null> {
  const feedbacks = (await tx.run(
    zql.feedback.where("id", feedbackId).related("board")
  )) as Array<{
    board: { organizationId: string } | null;
  }>;
  return feedbacks.length > 0 && feedbacks[0].board
    ? feedbacks[0].board.organizationId
    : null;
}

// ============================================
// USER MUTATORS
// ============================================

const userMutators = {
  update: defineMutator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      image: z.string().optional(),
      avatar: z.string().optional(),
      bio: z.string().optional(),
      bannedAt: z.number().nullable().optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only update their own profile
      if (args.id !== ctx.userID) {
        throw new Error("Unauthorized: Cannot update another user's profile");
      }
      await tx.mutate.user.update(args);
    }
  ),
};

// ============================================
// ORGANIZATION MUTATORS
// ============================================

const organizationMutators = {
  update: defineMutator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
      logo: z.string().optional(),
      primaryColor: z.string().optional(),
      customCss: z.string().optional(),
      isPublic: z.boolean().optional(),
      changelogSettings: z
        .object({
          autoVersioning: z.boolean().optional(),
          versionIncrement: z.enum(["patch", "minor", "major"]).optional(),
          versionPrefix: z.string().optional(),
        })
        .optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only admins can update organization settings
      await verifyOrgAdmin(tx, ctx, args.id);
      await tx.mutate.organization.update(args);
    }
  ),
};

// ============================================
// BOARD MUTATORS
// ============================================

const boardMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
      isPublic: z.boolean().optional(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org members can create boards
      await verifyOrgMember(tx, ctx, args.organizationId);

      // Subscription limit: Check if org has reached board limit
      const existingBoards = (await tx.run(
        zql.board.where("organizationId", args.organizationId)
      )) as Array<{ id: string }>;
      await verifySubscriptionLimit(
        tx,
        args.organizationId,
        "boards",
        existingBoards.length
      );

      await tx.mutate.board.insert(args);
    }
  ),

  update: defineMutator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      isPublic: z.boolean().optional(),
      updatedAt: z.number().optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org members can update boards
      const orgId = await getOrgIdFromBoardId(tx, args.id);
      if (!orgId) {
        throw new Error("Board not found");
      }
      await verifyOrgMember(tx, ctx, orgId);
      await tx.mutate.board.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can delete boards
      const orgId = await getOrgIdFromBoardId(tx, args.id);
      if (!orgId) {
        throw new Error("Board not found");
      }
      await verifyOrgAdmin(tx, ctx, orgId);
      await tx.mutate.board.delete(args);
    }
  ),
};

// ============================================
// FEEDBACK MUTATORS
// ============================================

const feedbackMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      boardId: z.string(),
      title: z.string(),
      description: z.string(),
      status: z.string().optional(),
      authorId: z.string(),
      voteCount: z.number().optional(),
      commentCount: z.number().optional(),
      isApproved: z.boolean().optional(),
      isPinned: z.boolean().optional(),
      roadmapLane: z.string().nullable().optional(),
      roadmapOrder: z.number().nullable().optional(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Ensure authorId matches the authenticated user
      if (args.authorId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot create feedback as another user");
      }
      // Security: Verify the board exists and user has access to the org
      const orgId = await getOrgIdFromBoardId(tx, args.boardId);
      if (!orgId) {
        throw new Error("Board not found");
      }

      // Subscription limit: Check if board has reached feedback limit
      const existingFeedback = (await tx.run(
        zql.feedback.where("boardId", args.boardId)
      )) as Array<{ id: string }>;
      await verifySubscriptionLimit(
        tx,
        orgId,
        "feedbackPerBoard",
        existingFeedback.length
      );

      // Note: We allow anyone to create feedback on public boards
      // For private boards, membership should be checked
      await tx.mutate.feedback.insert(args);
    }
  ),

  update: defineMutator(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      voteCount: z.number().optional(),
      commentCount: z.number().optional(),
      isApproved: z.boolean().optional(),
      isPinned: z.boolean().optional(),
      roadmapLane: z.string().nullable().optional(),
      roadmapOrder: z.number().nullable().optional(),
      completedAt: z.number().nullable().optional(),
      updatedAt: z.number().optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Get the feedback to check ownership or admin status
      const feedbacks = (await tx.run(
        zql.feedback.where("id", args.id)
      )) as Array<{
        authorId: string;
        boardId: string;
      }>;
      if (feedbacks.length === 0) {
        throw new Error("Feedback not found");
      }
      const feedback = feedbacks[0];

      // Authors can update their own feedback (title, description only)
      // Admins can update all fields (status, approval, roadmap, etc.)
      const isAuthor = feedback.authorId === ctx.userID;
      const orgId = await getOrgIdFromBoardId(tx, feedback.boardId);

      if (!isAuthor && orgId) {
        // Not the author - must be an admin
        await verifyOrgAdmin(tx, ctx, orgId);
      }

      await tx.mutate.feedback.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only the author or an admin can delete feedback
      const feedbacks = (await tx.run(
        zql.feedback.where("id", args.id)
      )) as Array<{
        authorId: string;
        boardId: string;
      }>;
      if (feedbacks.length === 0) {
        throw new Error("Feedback not found");
      }
      const feedback = feedbacks[0];

      const isAuthor = feedback.authorId === ctx.userID;
      if (!isAuthor) {
        const orgId = await getOrgIdFromBoardId(tx, feedback.boardId);
        if (orgId) {
          await verifyOrgAdmin(tx, ctx, orgId);
        }
      }

      await tx.mutate.feedback.delete(args);
    }
  ),
};

// ============================================
// VOTE MUTATORS
// ============================================

const voteMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      feedbackId: z.string(),
      userId: z.string(),
      createdAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only vote as themselves
      if (args.userId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot vote as another user");
      }
      await tx.mutate.vote.insert(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Verify the vote belongs to the user
      const votes = (await tx.run(zql.vote.where("id", args.id))) as Array<{
        userId: string;
      }>;
      if (votes.length === 0) {
        throw new Error("Vote not found");
      }
      if (votes[0].userId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot delete another user's vote");
      }
      await tx.mutate.vote.delete(args);
    }
  ),
};

// ============================================
// COMMENT MUTATORS
// ============================================

const commentMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      feedbackId: z.string(),
      authorId: z.string(),
      body: z.string(),
      isOfficial: z.boolean().optional(),
      parentId: z.string().nullable().optional(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only comment as themselves
      if (args.authorId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot comment as another user");
      }
      // Security: isOfficial can only be set by org admins
      if (args.isOfficial) {
        const orgId = await getOrgIdFromFeedbackId(tx, args.feedbackId);
        if (orgId) {
          await verifyOrgAdmin(tx, ctx, orgId);
        }
      }
      await tx.mutate.comment.insert(args);
    }
  ),

  update: defineMutator(
    z.object({
      id: z.string(),
      body: z.string().optional(),
      isOfficial: z.boolean().optional(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Verify the comment belongs to the user
      const comments = (await tx.run(
        zql.comment.where("id", args.id)
      )) as Array<{
        authorId: string;
        feedbackId: string;
      }>;
      if (comments.length === 0) {
        throw new Error("Comment not found");
      }
      const comment = comments[0];

      if (comment.authorId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot update another user's comment");
      }

      // Security: isOfficial can only be set by org admins
      if (args.isOfficial) {
        const orgId = await getOrgIdFromFeedbackId(tx, comment.feedbackId);
        if (orgId) {
          await verifyOrgAdmin(tx, ctx, orgId);
        }
      }

      await tx.mutate.comment.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only delete their own comments, or admins can delete any
      const comments = (await tx.run(
        zql.comment.where("id", args.id)
      )) as Array<{
        authorId: string;
        feedbackId: string;
      }>;
      if (comments.length === 0) {
        throw new Error("Comment not found");
      }
      const comment = comments[0];

      if (comment.authorId !== ctx.userID) {
        // Not the author - must be an admin
        const orgId = await getOrgIdFromFeedbackId(tx, comment.feedbackId);
        if (orgId) {
          await verifyOrgAdmin(tx, ctx, orgId);
        }
      }

      await tx.mutate.comment.delete(args);
    }
  ),
};

// ============================================
// TAG MUTATORS
// ============================================

const tagMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      name: z.string(),
      color: z.string(),
      isDoneStatus: z.boolean().optional(),
      isRoadmapLane: z.boolean().optional(),
      laneOrder: z.number().optional(),
      createdAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can create tags
      await verifyOrgAdmin(tx, ctx, args.organizationId);
      await tx.mutate.tag.insert(args);
    }
  ),

  update: defineMutator(
    z.object({
      id: z.string(),
      name: z.string().optional(),
      color: z.string().optional(),
      isDoneStatus: z.boolean().optional(),
      isRoadmapLane: z.boolean().optional(),
      laneOrder: z.number().optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can update tags
      const tags = (await tx.run(zql.tag.where("id", args.id))) as Array<{
        organizationId: string;
      }>;
      if (tags.length === 0) {
        throw new Error("Tag not found");
      }
      await verifyOrgAdmin(tx, ctx, tags[0].organizationId);
      await tx.mutate.tag.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can delete tags
      const tags = (await tx.run(zql.tag.where("id", args.id))) as Array<{
        organizationId: string;
      }>;
      if (tags.length === 0) {
        throw new Error("Tag not found");
      }
      await verifyOrgAdmin(tx, ctx, tags[0].organizationId);
      await tx.mutate.tag.delete(args);
    }
  ),
};

// ============================================
// FEEDBACK TAG (JUNCTION) MUTATORS
// ============================================

const feedbackTagMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      feedbackId: z.string(),
      tagId: z.string(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org members can add tags to feedback
      const orgId = await getOrgIdFromFeedbackId(tx, args.feedbackId);
      if (orgId) {
        await verifyOrgMember(tx, ctx, orgId);
      }
      await tx.mutate.feedbackTag.insert(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org members can remove tags from feedback
      const feedbackTags = (await tx.run(
        zql.feedbackTag.where("id", args.id)
      )) as Array<{ feedbackId: string }>;
      if (feedbackTags.length > 0) {
        const orgId = await getOrgIdFromFeedbackId(
          tx,
          feedbackTags[0].feedbackId
        );
        if (orgId) {
          await verifyOrgMember(tx, ctx, orgId);
        }
      }
      await tx.mutate.feedbackTag.delete(args);
    }
  ),
};

// ============================================
// RELEASE MUTATORS
// ============================================

const releaseMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      version: z.string().optional(),
      publishedAt: z.number().nullable().optional(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can create releases
      await verifyOrgAdmin(tx, ctx, args.organizationId);
      await tx.mutate.release.insert(args);
    }
  ),

  update: defineMutator(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      version: z.string().optional(),
      publishedAt: z.number().nullable().optional(),
      updatedAt: z.number().optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can update releases
      const releases = (await tx.run(
        zql.release.where("id", args.id)
      )) as Array<{
        organizationId: string;
      }>;
      if (releases.length === 0) {
        throw new Error("Release not found");
      }
      await verifyOrgAdmin(tx, ctx, releases[0].organizationId);
      await tx.mutate.release.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can delete releases
      const releases = (await tx.run(
        zql.release.where("id", args.id)
      )) as Array<{
        organizationId: string;
      }>;
      if (releases.length === 0) {
        throw new Error("Release not found");
      }
      await verifyOrgAdmin(tx, ctx, releases[0].organizationId);
      await tx.mutate.release.delete(args);
    }
  ),
};

// ============================================
// RELEASE ITEM MUTATORS
// ============================================

const releaseItemMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      releaseId: z.string(),
      feedbackId: z.string(),
      createdAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can add items to releases
      const releases = (await tx.run(
        zql.release.where("id", args.releaseId)
      )) as Array<{
        organizationId: string;
      }>;
      if (releases.length === 0) {
        throw new Error("Release not found");
      }
      await verifyOrgAdmin(tx, ctx, releases[0].organizationId);
      await tx.mutate.releaseItem.insert(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only org admins can remove items from releases
      const releaseItems = (await tx.run(
        zql.releaseItem.where("id", args.id).related("release")
      )) as Array<{ release: { organizationId: string } | null }>;
      if (releaseItems.length > 0 && releaseItems[0].release) {
        await verifyOrgAdmin(tx, ctx, releaseItems[0].release.organizationId);
      }
      await tx.mutate.releaseItem.delete(args);
    }
  ),
};

// ============================================
// CHANGELOG SUBSCRIPTION MUTATORS
// ============================================

const changelogSubscriptionMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      userId: z.string(),
      organizationId: z.string(),
      subscribedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only subscribe themselves
      if (args.userId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot subscribe another user");
      }
      await tx.mutate.changelogSubscription.insert(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only unsubscribe themselves
      const subscriptions = (await tx.run(
        zql.changelogSubscription.where("id", args.id)
      )) as Array<{ userId: string }>;
      if (subscriptions.length > 0 && subscriptions[0].userId !== ctx.userID) {
        throw new Error("Unauthorized: Cannot unsubscribe another user");
      }
      await tx.mutate.changelogSubscription.delete(args);
    }
  ),
};

// ============================================
// ADMIN NOTE MUTATORS
// ============================================

const adminNoteMutators = {
  insert: defineMutator(
    z.object({
      id: z.string(),
      feedbackId: z.string(),
      authorId: z.string(),
      body: z.string(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Admin notes - authorId must match logged in user
      if (args.authorId !== ctx.userID) {
        throw new Error(
          "Unauthorized: Cannot create admin note as another user"
        );
      }
      // Security: Only org admins can create admin notes
      const orgId = await getOrgIdFromFeedbackId(tx, args.feedbackId);
      if (orgId) {
        await verifyOrgAdmin(tx, ctx, orgId);
      }
      await tx.mutate.adminNote.insert(args);
    }
  ),

  update: defineMutator(
    z.object({
      id: z.string(),
      body: z.string().optional(),
      updatedAt: z.number(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only the author (org admin) can update their admin note
      const adminNotes = (await tx.run(
        zql.adminNote.where("id", args.id)
      )) as Array<{ authorId: string; feedbackId: string }>;
      if (adminNotes.length === 0) {
        throw new Error("Admin note not found");
      }
      if (adminNotes[0].authorId !== ctx.userID) {
        throw new Error(
          "Unauthorized: Cannot update another user's admin note"
        );
      }
      await tx.mutate.adminNote.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Only the author or org admin can delete admin notes
      const adminNotes = (await tx.run(
        zql.adminNote.where("id", args.id)
      )) as Array<{ authorId: string; feedbackId: string }>;
      if (adminNotes.length === 0) {
        throw new Error("Admin note not found");
      }
      // Author can delete their own note
      if (adminNotes[0].authorId !== ctx.userID) {
        // If not author, must be org admin
        const orgId = await getOrgIdFromFeedbackId(
          tx,
          adminNotes[0].feedbackId
        );
        if (orgId) {
          await verifyOrgAdmin(tx, ctx, orgId);
        }
      }
      await tx.mutate.adminNote.delete(args);
    }
  ),
};

// ============================================
// NOTIFICATION MUTATORS
// ============================================

const notificationMutators = {
  update: defineMutator(
    z.object({
      id: z.string(),
      isRead: z.boolean().optional(),
    }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only update their own notifications
      const notifications = (await tx.run(
        zql.notification.where("id", args.id)
      )) as Array<{ userId: string }>;
      if (notifications.length > 0 && notifications[0].userId !== ctx.userID) {
        throw new Error(
          "Unauthorized: Cannot update another user's notification"
        );
      }
      await tx.mutate.notification.update(args);
    }
  ),

  delete: defineMutator(
    z.object({ id: z.string() }),
    async ({ tx, args, ctx }) => {
      isLoggedIn(ctx);
      // Security: Users can only delete their own notifications
      const notifications = (await tx.run(
        zql.notification.where("id", args.id)
      )) as Array<{ userId: string }>;
      if (notifications.length > 0 && notifications[0].userId !== ctx.userID) {
        throw new Error(
          "Unauthorized: Cannot delete another user's notification"
        );
      }
      await tx.mutate.notification.delete(args);
    }
  ),
};

// ============================================
// EXPORT MUTATORS REGISTRY
// ============================================

export const mutators = defineMutators({
  user: userMutators,
  organization: organizationMutators,
  board: boardMutators,
  feedback: feedbackMutators,
  vote: voteMutators,
  comment: commentMutators,
  tag: tagMutators,
  feedbackTag: feedbackTagMutators,
  release: releaseMutators,
  releaseItem: releaseItemMutators,
  changelogSubscription: changelogSubscriptionMutators,
  adminNote: adminNoteMutators,
  notification: notificationMutators,
});

export type Mutators = typeof mutators;
