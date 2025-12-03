// Zero schema with permissions
// Tables and relationships are defined natively in zero-schema.ts
// This mirrors the Drizzle schema in packages/db/src/schema.ts

import type { PermissionsConfig } from "@rocicorp/zero";
import {
  ANYONE_CAN,
  definePermissions,
  type ExpressionBuilder,
} from "@rocicorp/zero";

export {
  type AdminNote,
  type Board,
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
  schema,
  type Tag,
  type User,
  type Vote,
} from "@/zero-schema";

import { type Schema, schema } from "@/zero-schema";

// The contents of your decoded JWT.
type AuthData = {
  sub: string | null;
};

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const allowIfLoggedIn = (
    authData: AuthData,
    { cmpLit }: ExpressionBuilder<Schema, keyof Schema["tables"]>
  ) => cmpLit(authData.sub, "IS NOT", null);

  const allowIfOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "organization">
  ) =>
    exists("members", (q) =>
      q.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
    );

  // Organization is publicly visible
  const allowIfOrgPublic = (
    _authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "organization">
  ) => cmp("isPublic", "=", true);

  // Board permissions - public boards can be viewed by anyone
  const allowIfBoardPublic = (
    _authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "board">
  ) => cmp("isPublic", "=", true);

  const allowIfBoardOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "board">
  ) =>
    exists("organization", (q) =>
      q.whereExists("members", (m) =>
        m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
      )
    );

  // Feedback permissions - viewable if board is public or user is org member
  const allowIfFeedbackBoardPublic = (
    _authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "feedback">
  ) => exists("board", (q) => q.where((r) => r.cmp("isPublic", "=", true)));

  const allowIfFeedbackBoardOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "feedback">
  ) =>
    exists("board", (q) =>
      q.whereExists("organization", (org) =>
        org.whereExists("members", (m) =>
          m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
        )
      )
    );

  const allowIfFeedbackAuthor = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "feedback">
  ) => cmp("authorId", "=", authData.sub ?? "");

  // Vote permissions
  const allowIfVoteOwner = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "vote">
  ) => cmp("userId", "=", authData.sub ?? "");

  // Comment permissions
  const allowIfCommentAuthor = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "comment">
  ) => cmp("authorId", "=", authData.sub ?? "");

  const allowIfCommentFeedbackBoardPublic = (
    _authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "comment">
  ) =>
    exists("feedback", (q) =>
      q.whereExists("board", (b) =>
        b.where((r) => r.cmp("isPublic", "=", true))
      )
    );

  const allowIfCommentFeedbackBoardOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "comment">
  ) =>
    exists("feedback", (q) =>
      q.whereExists("board", (b) =>
        b.whereExists("organization", (org) =>
          org.whereExists("members", (m) =>
            m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
          )
        )
      )
    );

  // Tag permissions - viewable by org members or if org is public
  const allowIfTagOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "tag">
  ) =>
    exists("organization", (q) =>
      q.whereExists("members", (m) =>
        m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
      )
    );

  const allowIfTagOrgPublic = (
    _authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "tag">
  ) =>
    exists("organization", (q) => q.where((r) => r.cmp("isPublic", "=", true)));

  // Notification permissions - only own notifications
  const allowIfNotificationOwner = (
    authData: AuthData,
    { cmp }: ExpressionBuilder<Schema, "notification">
  ) => cmp("userId", "=", authData.sub ?? "");

  // Admin note permissions - only org members (admins)
  const allowIfAdminNoteOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "adminNote">
  ) =>
    exists("feedback", (q) =>
      q.whereExists("board", (b) =>
        b.whereExists("organization", (org) =>
          org.whereExists("members", (m) =>
            m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
          )
        )
      )
    );

  // Release permissions - viewable if org is public, editable by org members
  const allowIfReleaseOrgPublic = (
    _authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "release">
  ) =>
    exists("organization", (q) => q.where((r) => r.cmp("isPublic", "=", true)));

  const allowIfReleaseOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "release">
  ) =>
    exists("organization", (q) =>
      q.whereExists("members", (m) =>
        m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
      )
    );

  // ReleaseItem permissions - same as release
  const allowIfReleaseItemOrgPublic = (
    _authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "releaseItem">
  ) =>
    exists("release", (q) =>
      q.whereExists("organization", (org) =>
        org.where((r) => r.cmp("isPublic", "=", true))
      )
    );

  const allowIfReleaseItemOrgMember = (
    authData: AuthData,
    { exists }: ExpressionBuilder<Schema, "releaseItem">
  ) =>
    exists("release", (q) =>
      q.whereExists("organization", (org) =>
        org.whereExists("members", (m) =>
          m.where((r) => r.cmp("userId", "=", authData.sub ?? ""))
        )
      )
    );

  return {
    user: {
      row: {
        select: ANYONE_CAN,
        update: {
          preMutation: [allowIfLoggedIn],
          postMutation: [allowIfLoggedIn],
        },
      },
    },
    organization: {
      row: {
        // Public organizations can be viewed by anyone, private ones only by members
        select: [allowIfOrgPublic, allowIfOrgMember],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfOrgMember],
          postMutation: [allowIfOrgMember],
        },
        delete: [allowIfOrgMember],
      },
    },
    member: {
      row: {
        select: [allowIfLoggedIn],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfLoggedIn],
          postMutation: [allowIfLoggedIn],
        },
        delete: [allowIfLoggedIn],
      },
    },
    invitation: {
      row: {
        select: [allowIfLoggedIn],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfLoggedIn],
          postMutation: [allowIfLoggedIn],
        },
        delete: [allowIfLoggedIn],
      },
    },
    // ============================================
    // FEATUREBASE PERMISSIONS
    // ============================================
    board: {
      row: {
        // Public boards visible to anyone, private boards to org members only
        select: [allowIfBoardPublic, allowIfBoardOrgMember],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfBoardOrgMember],
          postMutation: [allowIfBoardOrgMember],
        },
        delete: [allowIfBoardOrgMember],
      },
    },
    feedback: {
      row: {
        // Viewable if board is public, user is org member, or user is the author
        select: [
          allowIfFeedbackBoardPublic,
          allowIfFeedbackBoardOrgMember,
          allowIfFeedbackAuthor,
        ],
        insert: [allowIfLoggedIn],
        update: {
          // Allow author or org member to update (for editing feedback)
          // Allow any logged-in user for postMutation (needed for vote count updates)
          preMutation: [
            allowIfFeedbackAuthor,
            allowIfFeedbackBoardOrgMember,
            allowIfLoggedIn,
          ],
          postMutation: [
            allowIfFeedbackAuthor,
            allowIfFeedbackBoardOrgMember,
            allowIfLoggedIn,
          ],
        },
        delete: [allowIfFeedbackBoardOrgMember],
      },
    },
    vote: {
      row: {
        select: [allowIfLoggedIn],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfVoteOwner],
          postMutation: [allowIfVoteOwner],
        },
        delete: [allowIfVoteOwner],
      },
    },
    comment: {
      row: {
        // Viewable if feedback's board is public or user is org member
        select: [
          allowIfCommentFeedbackBoardPublic,
          allowIfCommentFeedbackBoardOrgMember,
        ],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfCommentAuthor],
          postMutation: [allowIfCommentAuthor],
        },
        delete: [allowIfCommentAuthor, allowIfCommentFeedbackBoardOrgMember],
      },
    },
    tag: {
      row: {
        // Tags are viewable if org is public or user is member
        select: [allowIfTagOrgPublic, allowIfTagOrgMember],
        insert: [allowIfTagOrgMember],
        update: {
          preMutation: [allowIfTagOrgMember],
          postMutation: [allowIfTagOrgMember],
        },
        delete: [allowIfTagOrgMember],
      },
    },
    feedbackTag: {
      row: {
        select: [allowIfLoggedIn],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfLoggedIn],
          postMutation: [allowIfLoggedIn],
        },
        delete: [allowIfLoggedIn],
      },
    },
    notification: {
      row: {
        // Only own notifications
        select: [allowIfNotificationOwner],
        insert: [allowIfLoggedIn],
        update: {
          preMutation: [allowIfNotificationOwner],
          postMutation: [allowIfNotificationOwner],
        },
        delete: [allowIfNotificationOwner],
      },
    },
    adminNote: {
      row: {
        // Only org members can see/manage admin notes
        select: [allowIfAdminNoteOrgMember],
        insert: [allowIfAdminNoteOrgMember],
        update: {
          preMutation: [allowIfAdminNoteOrgMember],
          postMutation: [allowIfAdminNoteOrgMember],
        },
        delete: [allowIfAdminNoteOrgMember],
      },
    },
    release: {
      row: {
        // Public releases viewable by anyone if org is public, editable only by org members
        select: [allowIfReleaseOrgPublic, allowIfReleaseOrgMember],
        insert: [allowIfReleaseOrgMember],
        update: {
          preMutation: [allowIfReleaseOrgMember],
          postMutation: [allowIfReleaseOrgMember],
        },
        delete: [allowIfReleaseOrgMember],
      },
    },
    releaseItem: {
      row: {
        // Release items follow release permissions
        select: [allowIfReleaseItemOrgPublic, allowIfReleaseItemOrgMember],
        insert: [allowIfReleaseItemOrgMember],
        update: {
          preMutation: [allowIfReleaseItemOrgMember],
          postMutation: [allowIfReleaseItemOrgMember],
        },
        delete: [allowIfReleaseItemOrgMember],
      },
    },
  } satisfies PermissionsConfig<AuthData, Schema>;
});
