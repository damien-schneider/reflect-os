import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

// ============================================
// CORE USER TABLE
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  partner: boolean("partner").notNull().default(false),
  avatar: text("avatar"),
  bio: text("bio"),
  bannedAt: bigint("banned_at", { mode: "number" }),
});

// ============================================
// BETTER-AUTH TABLES
// ============================================

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    activeOrganizationId: text("activeOrganizationId"),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

// ============================================
// ORGANIZATION TABLES
// ============================================

export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .notNull()
    .defaultNow(),
  metadata: text("metadata"),
  primaryColor: text("primary_color"),
  customCss: text("custom_css"),
  isPublic: boolean("is_public").notNull().default(false),
});

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("member_organizationId_idx").on(table.organizationId),
    index("member_userId_idx").on(table.userId),
  ]
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role"),
    status: text("status").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .notNull()
      .defaultNow(),
    inviterId: text("inviterId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("invitation_organizationId_idx").on(table.organizationId),
    index("invitation_email_idx").on(table.email),
  ]
);

// ============================================
// FEATUREBASE TABLES
// ============================================

export const board = pgTable(
  "board",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(true),
    settings: jsonb("settings").$type<{
      allowAnonymousVoting?: boolean;
      requireApproval?: boolean;
      defaultStatus?: string;
    }>(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (table) => [unique().on(table.organizationId, table.slug)]
);

export const feedback = pgTable("feedback", {
  id: text("id").primaryKey(),
  boardId: text("board_id")
    .notNull()
    .references(() => board.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull(), // Tiptap JSON content
  status: text("status").notNull().default("open"), // "open" | "under_review" | "planned" | "in_progress" | "completed" | "closed"
  authorId: text("author_id")
    .notNull()
    .references(() => user.id),
  voteCount: integer("vote_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  isApproved: boolean("is_approved").notNull().default(true),
  isPinned: boolean("is_pinned").notNull().default(false),
  roadmapLane: text("roadmap_lane"), // "now" | "next" | "later" | null (not on roadmap)
  roadmapOrder: integer("roadmap_order"), // sort order within the lane
  completedAt: bigint("completed_at", { mode: "number" }), // timestamp when marked as done
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const vote = pgTable(
  "vote",
  {
    id: text("id").primaryKey(),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [unique().on(table.feedbackId, table.userId)]
);

export const comment = pgTable("comment", {
  id: text("id").primaryKey(),
  feedbackId: text("feedback_id")
    .notNull()
    .references(() => feedback.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id),
  body: text("body").notNull(), // Tiptap JSON content
  isOfficial: boolean("is_official").notNull().default(false),
  parentId: text("parent_id"), // Self-reference handled in relations
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const tag = pgTable("tag", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull(), // hex color
  isDoneStatus: boolean("is_done_status").notNull().default(false), // Whether this tag represents a "Done" status in roadmap
  isRoadmapLane: boolean("is_roadmap_lane").notNull().default(false), // Whether this tag can be used as a roadmap lane
  laneOrder: integer("lane_order"), // Order in roadmap lanes (if isRoadmapLane)
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const feedbackTag = pgTable(
  "feedback_tag",
  {
    id: text("id").primaryKey(),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
  },
  (table) => [unique().on(table.feedbackId, table.tagId)]
);

export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "status_change" | "new_comment" | "vote_milestone"
  title: text("title").notNull(),
  message: text("message").notNull(),
  feedbackId: text("feedback_id").references(() => feedback.id, {
    onDelete: "cascade",
  }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const adminNote = pgTable("admin_note", {
  id: text("id").primaryKey(),
  feedbackId: text("feedback_id")
    .notNull()
    .references(() => feedback.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id),
  body: text("body").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// ============================================
// CHANGELOG/RELEASE TABLES
// ============================================

export const release = pgTable("release", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"), // Optional rich text description
  version: text("version"), // Optional version number (e.g., "v1.2.0")
  publishedAt: bigint("published_at", { mode: "number" }), // When the release was published (null = draft)
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const releaseItem = pgTable(
  "release_item",
  {
    id: text("id").primaryKey(),
    releaseId: text("release_id")
      .notNull()
      .references(() => release.id, { onDelete: "cascade" }),
    feedbackId: text("feedback_id")
      .notNull()
      .references(() => feedback.id, { onDelete: "cascade" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [unique().on(table.releaseId, table.feedbackId)]
);

// ============================================
// RELATIONS (for Drizzle query builder)
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  feedbacks: many(feedback),
  votes: many(vote),
  comments: many(comment),
  notifications: many(notification),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  boards: many(board),
  tags: many(tag),
  releases: many(release),
}));

export const memberRelations = relations(member, ({ one }) => ({
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

export const boardRelations = relations(board, ({ one, many }) => ({
  organization: one(organization, {
    fields: [board.organizationId],
    references: [organization.id],
  }),
  feedbacks: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one, many }) => ({
  board: one(board, {
    fields: [feedback.boardId],
    references: [board.id],
  }),
  author: one(user, {
    fields: [feedback.authorId],
    references: [user.id],
  }),
  votes: many(vote),
  comments: many(comment),
  feedbackTags: many(feedbackTag),
  adminNotes: many(adminNote),
  releaseItems: many(releaseItem),
}));

export const voteRelations = relations(vote, ({ one }) => ({
  feedback: one(feedback, {
    fields: [vote.feedbackId],
    references: [feedback.id],
  }),
  user: one(user, {
    fields: [vote.userId],
    references: [user.id],
  }),
}));

export const commentRelations = relations(comment, ({ one, many }) => ({
  feedback: one(feedback, {
    fields: [comment.feedbackId],
    references: [feedback.id],
  }),
  author: one(user, {
    fields: [comment.authorId],
    references: [user.id],
  }),
  parent: one(comment, {
    fields: [comment.parentId],
    references: [comment.id],
    relationName: "commentReplies",
  }),
  replies: many(comment, { relationName: "commentReplies" }),
}));

export const tagRelations = relations(tag, ({ one, many }) => ({
  organization: one(organization, {
    fields: [tag.organizationId],
    references: [organization.id],
  }),
  feedbackTags: many(feedbackTag),
}));

export const feedbackTagRelations = relations(feedbackTag, ({ one }) => ({
  feedback: one(feedback, {
    fields: [feedbackTag.feedbackId],
    references: [feedback.id],
  }),
  tag: one(tag, {
    fields: [feedbackTag.tagId],
    references: [tag.id],
  }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  feedback: one(feedback, {
    fields: [notification.feedbackId],
    references: [feedback.id],
  }),
}));

export const adminNoteRelations = relations(adminNote, ({ one }) => ({
  feedback: one(feedback, {
    fields: [adminNote.feedbackId],
    references: [feedback.id],
  }),
  author: one(user, {
    fields: [adminNote.authorId],
    references: [user.id],
  }),
}));

export const releaseRelations = relations(release, ({ one, many }) => ({
  organization: one(organization, {
    fields: [release.organizationId],
    references: [organization.id],
  }),
  releaseItems: many(releaseItem),
}));

export const releaseItemRelations = relations(releaseItem, ({ one }) => ({
  release: one(release, {
    fields: [releaseItem.releaseId],
    references: [release.id],
  }),
  feedback: one(feedback, {
    fields: [releaseItem.feedbackId],
    references: [feedback.id],
  }),
}));
