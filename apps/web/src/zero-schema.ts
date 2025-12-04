/**
 * Native Zero Schema
 * Defines the Zero schema using native Zero schema builders for full TypeScript type safety.
 * This schema mirrors the Drizzle schema in packages/db/src/schema.ts.
 *
 * When you update the Drizzle schema, update this file accordingly to keep them in sync.
 */

import {
  boolean,
  createSchema,
  json,
  number,
  type Row,
  relationships,
  string,
  table,
} from "@rocicorp/zero";

// ============================================
// TABLE DEFINITIONS
// ============================================

const userTable = table("user")
  .columns({
    id: string(),
    name: string(),
    email: string(),
    emailVerified: boolean().optional(),
    image: string().optional(),
    createdAt: number().optional(),
    updatedAt: number().optional(),
    partner: boolean().optional(),
    avatar: string().optional(),
    bio: string().optional(),
    bannedAt: number().optional().from("banned_at"),
  })
  .primaryKey("id");

const organizationTable = table("organization")
  .columns({
    id: string(),
    name: string(),
    slug: string(),
    logo: string().optional(),
    createdAt: number().optional(),
    metadata: string().optional(),
    primaryColor: string().optional().from("primary_color"),
    customCss: string().optional().from("custom_css"),
    isPublic: boolean().optional().from("is_public"),
    changelogSettings: json<{
      autoVersioning?: boolean;
      versionIncrement?: "patch" | "minor" | "major";
      versionPrefix?: string;
    }>()
      .optional()
      .from("changelog_settings"),
  })
  .primaryKey("id");

const memberTable = table("member")
  .columns({
    id: string(),
    organizationId: string(),
    userId: string(),
    role: string(),
    createdAt: number().optional(),
  })
  .primaryKey("id");

const invitationTable = table("invitation")
  .columns({
    id: string(),
    organizationId: string(),
    email: string(),
    role: string().optional(),
    status: string(),
    expiresAt: number(),
    createdAt: number().optional(),
    inviterId: string(),
  })
  .primaryKey("id");

const boardTable = table("board")
  .columns({
    id: string(),
    organizationId: string().from("organization_id"),
    name: string(),
    slug: string(),
    description: string().optional(),
    isPublic: boolean().optional().from("is_public"),
    settings: json<{
      allowAnonymousVoting?: boolean;
      requireApproval?: boolean;
      defaultStatus?: string;
    }>().optional(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const feedbackTable = table("feedback")
  .columns({
    id: string(),
    boardId: string().from("board_id"),
    title: string(),
    description: string(),
    status: string().optional(),
    authorId: string().from("author_id"),
    voteCount: number().optional().from("vote_count"),
    commentCount: number().optional().from("comment_count"),
    isApproved: boolean().optional().from("is_approved"),
    isPinned: boolean().optional().from("is_pinned"),
    roadmapLane: string().optional().from("roadmap_lane"),
    roadmapOrder: number().optional().from("roadmap_order"),
    completedAt: number().optional().from("completed_at"),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const voteTable = table("vote")
  .columns({
    id: string(),
    feedbackId: string().from("feedback_id"),
    userId: string().from("user_id"),
    createdAt: number().from("created_at"),
  })
  .primaryKey("id");

const commentTable = table("comment")
  .columns({
    id: string(),
    feedbackId: string().from("feedback_id"),
    authorId: string().from("author_id"),
    body: string(),
    isOfficial: boolean().optional().from("is_official"),
    parentId: string().optional().from("parent_id"),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const tagTable = table("tag")
  .columns({
    id: string(),
    organizationId: string().from("organization_id"),
    name: string(),
    color: string(),
    isDoneStatus: boolean().optional().from("is_done_status"),
    isRoadmapLane: boolean().optional().from("is_roadmap_lane"),
    laneOrder: number().optional().from("lane_order"),
    createdAt: number().from("created_at"),
  })
  .primaryKey("id");

const feedbackTagTable = table("feedbackTag")
  .from("feedback_tag")
  .columns({
    id: string(),
    feedbackId: string().from("feedback_id"),
    tagId: string().from("tag_id"),
  })
  .primaryKey("id");

const notificationTable = table("notification")
  .columns({
    id: string(),
    userId: string().from("user_id"),
    type: string(),
    title: string(),
    message: string(),
    feedbackId: string().optional().from("feedback_id"),
    isRead: boolean().optional().from("is_read"),
    createdAt: number().from("created_at"),
  })
  .primaryKey("id");

const adminNoteTable = table("adminNote")
  .from("admin_note")
  .columns({
    id: string(),
    feedbackId: string().from("feedback_id"),
    authorId: string().from("author_id"),
    body: string(),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const releaseTable = table("release")
  .columns({
    id: string(),
    organizationId: string().from("organization_id"),
    title: string(),
    description: string().optional(),
    version: string().optional(),
    publishedAt: number().optional().from("published_at"),
    createdAt: number().from("created_at"),
    updatedAt: number().from("updated_at"),
  })
  .primaryKey("id");

const releaseItemTable = table("releaseItem")
  .from("release_item")
  .columns({
    id: string(),
    releaseId: string().from("release_id"),
    feedbackId: string().from("feedback_id"),
    createdAt: number().from("created_at"),
  })
  .primaryKey("id");

// ============================================
// RELATIONSHIPS
// ============================================

const userRelationships = relationships(userTable, ({ many }) => ({
  members: many({
    sourceField: ["id"],
    destField: ["userId"],
    destSchema: memberTable,
  }),
  feedbacks: many({
    sourceField: ["id"],
    destField: ["authorId"],
    destSchema: feedbackTable,
  }),
  votes: many({
    sourceField: ["id"],
    destField: ["userId"],
    destSchema: voteTable,
  }),
  comments: many({
    sourceField: ["id"],
    destField: ["authorId"],
    destSchema: commentTable,
  }),
  notifications: many({
    sourceField: ["id"],
    destField: ["userId"],
    destSchema: notificationTable,
  }),
}));

const organizationRelationships = relationships(
  organizationTable,
  ({ many }) => ({
    members: many({
      sourceField: ["id"],
      destField: ["organizationId"],
      destSchema: memberTable,
    }),
    invitations: many({
      sourceField: ["id"],
      destField: ["organizationId"],
      destSchema: invitationTable,
    }),
    boards: many({
      sourceField: ["id"],
      destField: ["organizationId"],
      destSchema: boardTable,
    }),
    tags: many({
      sourceField: ["id"],
      destField: ["organizationId"],
      destSchema: tagTable,
    }),
    releases: many({
      sourceField: ["id"],
      destField: ["organizationId"],
      destSchema: releaseTable,
    }),
  })
);

const memberRelationships = relationships(memberTable, ({ one }) => ({
  user: one({
    sourceField: ["userId"],
    destField: ["id"],
    destSchema: userTable,
  }),
  organization: one({
    sourceField: ["organizationId"],
    destField: ["id"],
    destSchema: organizationTable,
  }),
}));

const invitationRelationships = relationships(invitationTable, ({ one }) => ({
  organization: one({
    sourceField: ["organizationId"],
    destField: ["id"],
    destSchema: organizationTable,
  }),
  inviter: one({
    sourceField: ["inviterId"],
    destField: ["id"],
    destSchema: userTable,
  }),
}));

const boardRelationships = relationships(boardTable, ({ many, one }) => ({
  organization: one({
    sourceField: ["organizationId"],
    destField: ["id"],
    destSchema: organizationTable,
  }),
  feedbacks: many({
    sourceField: ["id"],
    destField: ["boardId"],
    destSchema: feedbackTable,
  }),
}));

const feedbackRelationships = relationships(feedbackTable, ({ many, one }) => ({
  board: one({
    sourceField: ["boardId"],
    destField: ["id"],
    destSchema: boardTable,
  }),
  author: one({
    sourceField: ["authorId"],
    destField: ["id"],
    destSchema: userTable,
  }),
  votes: many({
    sourceField: ["id"],
    destField: ["feedbackId"],
    destSchema: voteTable,
  }),
  comments: many({
    sourceField: ["id"],
    destField: ["feedbackId"],
    destSchema: commentTable,
  }),
  feedbackTags: many({
    sourceField: ["id"],
    destField: ["feedbackId"],
    destSchema: feedbackTagTable,
  }),
  adminNotes: many({
    sourceField: ["id"],
    destField: ["feedbackId"],
    destSchema: adminNoteTable,
  }),
  releaseItems: many({
    sourceField: ["id"],
    destField: ["feedbackId"],
    destSchema: releaseItemTable,
  }),
  // Many-to-many through feedbackTag to get tags
  tags: many(
    {
      sourceField: ["id"],
      destField: ["feedbackId"],
      destSchema: feedbackTagTable,
    },
    {
      sourceField: ["tagId"],
      destField: ["id"],
      destSchema: tagTable,
    }
  ),
  // Many-to-many through releaseItem to get releases
  releases: many(
    {
      sourceField: ["id"],
      destField: ["feedbackId"],
      destSchema: releaseItemTable,
    },
    {
      sourceField: ["releaseId"],
      destField: ["id"],
      destSchema: releaseTable,
    }
  ),
}));

const voteRelationships = relationships(voteTable, ({ one }) => ({
  feedback: one({
    sourceField: ["feedbackId"],
    destField: ["id"],
    destSchema: feedbackTable,
  }),
  user: one({
    sourceField: ["userId"],
    destField: ["id"],
    destSchema: userTable,
  }),
}));

const commentRelationships = relationships(commentTable, ({ many, one }) => ({
  feedback: one({
    sourceField: ["feedbackId"],
    destField: ["id"],
    destSchema: feedbackTable,
  }),
  author: one({
    sourceField: ["authorId"],
    destField: ["id"],
    destSchema: userTable,
  }),
  parent: one({
    sourceField: ["parentId"],
    destField: ["id"],
    destSchema: commentTable,
  }),
  replies: many({
    sourceField: ["id"],
    destField: ["parentId"],
    destSchema: commentTable,
  }),
}));

const tagRelationships = relationships(tagTable, ({ many, one }) => ({
  organization: one({
    sourceField: ["organizationId"],
    destField: ["id"],
    destSchema: organizationTable,
  }),
  feedbackTags: many({
    sourceField: ["id"],
    destField: ["tagId"],
    destSchema: feedbackTagTable,
  }),
  // Many-to-many through feedbackTag to get feedbacks
  feedbacks: many(
    {
      sourceField: ["id"],
      destField: ["tagId"],
      destSchema: feedbackTagTable,
    },
    {
      sourceField: ["feedbackId"],
      destField: ["id"],
      destSchema: feedbackTable,
    }
  ),
}));

const feedbackTagRelationships = relationships(feedbackTagTable, ({ one }) => ({
  feedback: one({
    sourceField: ["feedbackId"],
    destField: ["id"],
    destSchema: feedbackTable,
  }),
  tag: one({
    sourceField: ["tagId"],
    destField: ["id"],
    destSchema: tagTable,
  }),
}));

const notificationRelationships = relationships(
  notificationTable,
  ({ one }) => ({
    user: one({
      sourceField: ["userId"],
      destField: ["id"],
      destSchema: userTable,
    }),
    feedback: one({
      sourceField: ["feedbackId"],
      destField: ["id"],
      destSchema: feedbackTable,
    }),
  })
);

const adminNoteRelationships = relationships(adminNoteTable, ({ one }) => ({
  feedback: one({
    sourceField: ["feedbackId"],
    destField: ["id"],
    destSchema: feedbackTable,
  }),
  author: one({
    sourceField: ["authorId"],
    destField: ["id"],
    destSchema: userTable,
  }),
}));

const releaseRelationships = relationships(releaseTable, ({ many, one }) => ({
  organization: one({
    sourceField: ["organizationId"],
    destField: ["id"],
    destSchema: organizationTable,
  }),
  releaseItems: many({
    sourceField: ["id"],
    destField: ["releaseId"],
    destSchema: releaseItemTable,
  }),
  // Many-to-many through releaseItem to get feedbacks
  feedbacks: many(
    {
      sourceField: ["id"],
      destField: ["releaseId"],
      destSchema: releaseItemTable,
    },
    {
      sourceField: ["feedbackId"],
      destField: ["id"],
      destSchema: feedbackTable,
    }
  ),
}));

const releaseItemRelationships = relationships(releaseItemTable, ({ one }) => ({
  release: one({
    sourceField: ["releaseId"],
    destField: ["id"],
    destSchema: releaseTable,
  }),
  feedback: one({
    sourceField: ["feedbackId"],
    destField: ["id"],
    destSchema: feedbackTable,
  }),
}));

// ============================================
// CREATE SCHEMA
// ============================================

export const schema = createSchema({
  tables: [
    userTable,
    organizationTable,
    memberTable,
    invitationTable,
    boardTable,
    feedbackTable,
    voteTable,
    commentTable,
    tagTable,
    feedbackTagTable,
    notificationTable,
    adminNoteTable,
    releaseTable,
    releaseItemTable,
  ],
  relationships: [
    userRelationships,
    organizationRelationships,
    memberRelationships,
    invitationRelationships,
    boardRelationships,
    feedbackRelationships,
    voteRelationships,
    commentRelationships,
    tagRelationships,
    feedbackTagRelationships,
    notificationRelationships,
    adminNoteRelationships,
    releaseRelationships,
    releaseItemRelationships,
  ],
});

// ============================================
// TYPE EXPORTS
// ============================================

export type Schema = typeof schema;

// Row types for each table - using schema property for proper type inference
export type User = Row<typeof userTable.schema>;
export type Organization = Row<typeof organizationTable.schema>;
export type Member = Row<typeof memberTable.schema>;
export type Invitation = Row<typeof invitationTable.schema>;
export type Board = Row<typeof boardTable.schema>;
export type Feedback = Row<typeof feedbackTable.schema>;
export type Vote = Row<typeof voteTable.schema>;
export type Comment = Row<typeof commentTable.schema>;
export type Tag = Row<typeof tagTable.schema>;
export type FeedbackTag = Row<typeof feedbackTagTable.schema>;
export type Notification = Row<typeof notificationTable.schema>;
export type AdminNote = Row<typeof adminNoteTable.schema>;
export type Release = Row<typeof releaseTable.schema>;
export type ReleaseItem = Row<typeof releaseItemTable.schema>;
