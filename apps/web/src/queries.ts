/**
 * Zero Queries
 *
 * Zero 0.25 uses named queries that are defined here and registered with Zero.
 * Each query is a function that returns a ZQL expression.
 *
 * The server also runs these queries to resolve what data to sync.
 *
 * SECURITY MODEL:
 * - Queries that return user-specific data use `ctx.userID` for filtering
 * - Public data (organizations, boards marked public) can be queried without auth
 * - Private data requires the user to be a member of the organization
 * - The `isLoggedIn(ctx)` helper throws if authentication is required but missing
 */

import { defineQueries, defineQuery } from "@rocicorp/zero";
import { z } from "zod";
import { zql } from "./schema";
import { getAuthenticatedUserID } from "./zero-context";

// ============================================
// USER QUERIES
// ============================================

const userQueries = {
  byId: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
    zql.user.where("id", id)
  ),

  byIds: defineQuery(
    z.object({ ids: z.array(z.string()) }),
    ({ args: { ids } }) =>
      zql.user.where("id", "IN", ids.length > 0 ? ids : [""])
  ),

  /** User by email - used for invitations and user lookup */
  byEmail: defineQuery(z.object({ email: z.string() }), ({ args: { email } }) =>
    zql.user.where("email", email)
  ),
};

// ============================================
// ORGANIZATION QUERIES
// ============================================

const organizationQueries = {
  byId: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
    zql.organization.where("id", id)
  ),

  bySlug: defineQuery(z.object({ slug: z.string() }), ({ args: { slug } }) =>
    zql.organization.where("slug", slug)
  ),

  /** Organization with members and boards for subscription page */
  bySlugWithRelations: defineQuery(
    z.object({ slug: z.string() }),
    ({ args: { slug } }) =>
      zql.organization.where("slug", slug).related("members").related("boards")
  ),
};

// ============================================
// MEMBER QUERIES
// ============================================

const memberQueries = {
  byOrganizationId: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.member.where("organizationId", organizationId).related("user")
  ),

  // Security: Users can query their own memberships
  byUserId: defineQuery(
    z.object({ userId: z.string() }),
    ({ args: { userId }, ctx }) => {
      const authenticatedUserId = getAuthenticatedUserID(ctx);
      if (authenticatedUserId && authenticatedUserId !== userId) {
        // Return empty result if trying to access another user's memberships
        return zql.member.where("id", "");
      }
      return zql.member.where("userId", userId).related("organization");
    }
  ),

  byUserAndOrg: defineQuery(
    z.object({ userId: z.string(), organizationId: z.string() }),
    ({ args: { userId, organizationId } }) =>
      zql.member.where("userId", userId).where("organizationId", organizationId)
  ),

  /**
   * Query for current user's memberships with organization details.
   * Used for dashboard sync detection and organization listing.
   * Security: Only returns memberships for the authenticated user (via ctx).
   */
  currentUserMemberships: defineQuery(z.object({}), ({ ctx }) => {
    const userId = getAuthenticatedUserID(ctx);
    if (!userId) {
      // Return empty result for unauthenticated users
      return zql.member.where("id", "");
    }
    return zql.member.where("userId", userId).related("organization");
  }),

  /**
   * Check if a specific user is a member of an organization.
   * Used for sync status detection.
   * Note: This is intentionally permissive - it's used to detect if data is synced,
   * not for authorization. The mutator layer handles authorization.
   */
  checkMembership: defineQuery(
    z.object({ userId: z.string(), organizationId: z.string() }),
    ({ args: { userId, organizationId } }) =>
      zql.member.where("userId", userId).where("organizationId", organizationId)
  ),
};

// ============================================
// BOARD QUERIES
// ============================================

const boardQueries = {
  byId: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
    zql.board.where("id", id)
  ),

  byOrganizationId: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.board.where("organizationId", organizationId)
  ),

  byOrgAndSlug: defineQuery(
    z.object({ organizationId: z.string(), slug: z.string() }),
    ({ args: { organizationId, slug } }) =>
      zql.board.where("organizationId", organizationId).where("slug", slug)
  ),
};

// ============================================
// FEEDBACK QUERIES
// ============================================

const feedbackQueries = {
  byId: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
    zql.feedback
      .where("id", id)
      .related("author")
      .related("board")
      .related("tags")
      .related("votes")
      .related("comments", (q) =>
        q.related("author").orderBy("createdAt", "asc")
      )
  ),

  /** Feedback with author and tags (via feedbackTags relation) for detail view */
  byIdWithAuthorAndTags: defineQuery(
    z.object({ id: z.string() }),
    ({ args: { id } }) =>
      zql.feedback
        .where("id", id)
        .related("author")
        .related("feedbackTags", (q) => q.related("tag"))
  ),

  byBoardId: defineQuery(
    z.object({ boardId: z.string() }),
    ({ args: { boardId } }) =>
      zql.feedback
        .where("boardId", boardId)
        .related("author")
        .related("tags")
        .orderBy("createdAt", "desc")
  ),

  byBoardIds: defineQuery(
    z.object({ boardIds: z.array(z.string()), limit: z.number().optional() }),
    ({ args: { boardIds, limit } }) => {
      let query = zql.feedback
        .where("boardId", "IN", boardIds.length > 0 ? boardIds : [""])
        .related("author")
        .related("board")
        .orderBy("createdAt", "desc");

      if (limit) {
        query = query.limit(limit);
      }

      return query;
    }
  ),

  /** Feedback with author relation - for user management pages */
  byBoardIdsWithAuthor: defineQuery(
    z.object({ boardIds: z.array(z.string()) }),
    ({ args: { boardIds } }) =>
      zql.feedback
        .where("boardId", "IN", boardIds.length > 0 ? boardIds : [""])
        .related("author")
  ),

  byAuthorId: defineQuery(
    z.object({ authorId: z.string() }),
    ({ args: { authorId } }) =>
      zql.feedback
        .where("authorId", authorId)
        .related("board")
        .orderBy("createdAt", "desc")
  ),

  withRelations: defineQuery(z.object({}), () => zql.feedback.related("board")),

  /** Feedback by roadmap lane - for calculating sort order */
  byRoadmapLane: defineQuery(
    z.object({ lane: z.string() }),
    ({ args: { lane } }) => zql.feedback.where("roadmapLane", lane)
  ),
};

// ============================================
// VOTE QUERIES
// ============================================

const voteQueries = {
  // Security: Users can only query their own votes
  byUserId: defineQuery(
    z.object({ userId: z.string() }),
    ({ args: { userId }, ctx }) => {
      const authenticatedUserId = getAuthenticatedUserID(ctx);
      if (authenticatedUserId && authenticatedUserId !== userId) {
        // Return empty result if trying to access another user's votes
        return zql.vote.where("id", "");
      }
      return zql.vote.where("userId", userId);
    }
  ),

  byFeedbackId: defineQuery(
    z.object({ feedbackId: z.string() }),
    ({ args: { feedbackId } }) => zql.vote.where("feedbackId", feedbackId)
  ),

  byUserAndFeedback: defineQuery(
    z.object({ userId: z.string(), feedbackId: z.string() }),
    ({ args: { userId, feedbackId }, ctx }) => {
      const authenticatedUserId = getAuthenticatedUserID(ctx);
      if (authenticatedUserId && authenticatedUserId !== userId) {
        return zql.vote.where("id", "");
      }
      return zql.vote.where("userId", userId).where("feedbackId", feedbackId);
    }
  ),
};

// ============================================
// COMMENT QUERIES
// ============================================

const commentQueries = {
  byFeedbackId: defineQuery(
    z.object({ feedbackId: z.string() }),
    ({ args: { feedbackId } }) =>
      zql.comment
        .where("feedbackId", feedbackId)
        .related("author")
        .orderBy("createdAt", "asc")
  ),

  /** Top-level comments (parentId IS null) with replies for comment thread */
  topLevelByFeedbackId: defineQuery(
    z.object({ feedbackId: z.string() }),
    ({ args: { feedbackId } }) =>
      zql.comment
        .where("feedbackId", feedbackId)
        .where("parentId", "IS", null)
        .related("author")
        .related("replies", (q) => q.related("author"))
  ),

  byAuthorId: defineQuery(
    z.object({ authorId: z.string() }),
    ({ args: { authorId } }) =>
      zql.comment
        .where("authorId", authorId)
        .related("feedback", (q) => q.one().related("board"))
        .orderBy("createdAt", "desc")
  ),
};

// ============================================
// TAG QUERIES
// ============================================

const tagQueries = {
  byOrganizationId: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.tag.where("organizationId", organizationId).orderBy("name", "asc")
  ),

  /** Tags ordered by creation date (newest first) - for management UI */
  byOrganizationIdDesc: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.tag
        .where("organizationId", organizationId)
        .orderBy("createdAt", "desc")
  ),
};

// ============================================
// FEEDBACK TAG QUERIES
// ============================================

const feedbackTagQueries = {
  /** Find a feedback tag by feedback and tag IDs */
  byFeedbackAndTag: defineQuery(
    z.object({ feedbackId: z.string(), tagId: z.string() }),
    ({ args: { feedbackId, tagId } }) =>
      zql.feedbackTag.where("feedbackId", feedbackId).where("tagId", tagId)
  ),
};

// ============================================
// ADMIN NOTE QUERIES
// ============================================

const adminNoteQueries = {
  byFeedbackId: defineQuery(
    z.object({ feedbackId: z.string() }),
    ({ args: { feedbackId } }) =>
      zql.adminNote
        .where("feedbackId", feedbackId)
        .related("author")
        .orderBy("createdAt", "desc")
  ),

  // Empty query for when user doesn't have access - must have same return type as byFeedbackId
  empty: defineQuery(z.object({ feedbackId: z.string() }), () =>
    zql.adminNote.where("id", "").related("author").orderBy("createdAt", "desc")
  ),
};

// ============================================
// RELEASE QUERIES
// ============================================

const releaseQueries = {
  byOrganizationId: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.release
        .where("organizationId", organizationId)
        .related("feedbacks")
        .orderBy("createdAt", "desc")
  ),

  /** Releases with release items for changelog management */
  byOrganizationIdWithItems: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.release
        .where("organizationId", organizationId)
        .related("releaseItems")
        .orderBy("createdAt", "desc")
  ),

  byId: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
    zql.release.where("id", id).related("feedbacks")
  ),

  /** Release with release items for detail view */
  byIdWithItems: defineQuery(z.object({ id: z.string() }), ({ args: { id } }) =>
    zql.release.where("id", id).related("releaseItems")
  ),

  /** Release with release items and their feedback for changelog detail page */
  byIdWithItemsAndFeedback: defineQuery(
    z.object({ id: z.string() }),
    ({ args: { id } }) =>
      zql.release
        .where("id", id)
        .related("releaseItems", (q) => q.related("feedback"))
  ),

  published: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.release
        .where("organizationId", organizationId)
        .where("publishedAt", "IS NOT", null)
        .related("feedbacks")
        .orderBy("publishedAt", "desc")
  ),

  /** All releases (drafts and published) with release items and their feedback */
  byOrganizationIdWithItemsAndFeedback: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.release
        .where("organizationId", organizationId)
        .related("releaseItems", (q) =>
          q.related("feedback", (fq) => fq.related("board"))
        )
        .orderBy("publishedAt", "desc")
  ),
};

// ============================================
// CHANGELOG SUBSCRIPTION QUERIES
// ============================================

const changelogSubscriptionQueries = {
  // Security: Users can only query their own subscriptions
  byUserAndOrg: defineQuery(
    z.object({ userId: z.string(), organizationId: z.string() }),
    ({ args: { userId, organizationId }, ctx }) => {
      const authenticatedUserId = getAuthenticatedUserID(ctx);
      if (authenticatedUserId && authenticatedUserId !== userId) {
        return zql.changelogSubscription.where("id", "");
      }
      return zql.changelogSubscription
        .where("userId", userId)
        .where("organizationId", organizationId);
    }
  ),

  // Empty query when no user - must have same args as byUserAndOrg for type compatibility
  empty: defineQuery(
    z.object({ userId: z.string(), organizationId: z.string() }),
    () => zql.changelogSubscription.where("id", "")
  ),
};

// ============================================
// RELEASE ITEM QUERIES
// ============================================

const releaseItemQueries = {
  byReleaseId: defineQuery(
    z.object({ releaseId: z.string() }),
    ({ args: { releaseId } }) => zql.releaseItem.where("releaseId", releaseId)
  ),
};

// ============================================
// NOTIFICATION QUERIES
// ============================================

const notificationQueries = {
  // Security: Notifications are user-specific and filtered by ctx.userID
  byUserId: defineQuery(
    z.object({ userId: z.string() }),
    ({ args: { userId }, ctx }) => {
      // If user is logged in, they can only see their own notifications
      const authenticatedUserId = getAuthenticatedUserID(ctx);
      if (authenticatedUserId && authenticatedUserId !== userId) {
        // Return empty result if trying to access another user's notifications
        return zql.notification.where("id", "");
      }
      return zql.notification
        .where("userId", userId)
        .orderBy("createdAt", "desc");
    }
  ),

  /** Unread notifications for a user */
  unreadByUserId: defineQuery(
    z.object({ userId: z.string() }),
    ({ args: { userId }, ctx }) => {
      const authenticatedUserId = getAuthenticatedUserID(ctx);
      if (authenticatedUserId && authenticatedUserId !== userId) {
        return zql.notification.where("id", "");
      }
      return zql.notification.where("userId", userId).where("isRead", false);
    }
  ),
};

// ============================================
// SUBSCRIPTION (BILLING) QUERIES
// ============================================

const subscriptionQueries = {
  byOrganizationId: defineQuery(
    z.object({ organizationId: z.string() }),
    ({ args: { organizationId } }) =>
      zql.subscription.where("organizationId", organizationId)
  ),
};

// ============================================
// EXPORT QUERIES REGISTRY
// ============================================

export const queries = defineQueries({
  user: userQueries,
  organization: organizationQueries,
  member: memberQueries,
  board: boardQueries,
  feedback: feedbackQueries,
  vote: voteQueries,
  comment: commentQueries,
  tag: tagQueries,
  feedbackTag: feedbackTagQueries,
  adminNote: adminNoteQueries,
  release: releaseQueries,
  releaseItem: releaseItemQueries,
  changelogSubscription: changelogSubscriptionQueries,
  notification: notificationQueries,
  subscription: subscriptionQueries,
});

export type Queries = typeof queries;
