import { drizzleZeroConfig } from "drizzle-zero";
import * as drizzleSchema from "../../packages/db/src/schema";

export default drizzleZeroConfig(drizzleSchema, {
  // Use snake_case for DB column names while keeping camelCase in JS
  casing: "snake_case",

  tables: {
    // Core user table
    user: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      partner: true,
      avatar: true,
      bio: true,
      bannedAt: true,
    },

    // Better-auth tables (not synced to Zero)
    session: false,
    account: false,
    verification: false,

    // Organization tables
    organization: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      createdAt: true,
      metadata: true,
      primaryColor: true,
      customCss: true,
      isPublic: true,
    },
    member: {
      id: true,
      organizationId: true,
      userId: true,
      role: true,
      createdAt: true,
    },
    invitation: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      inviterId: true,
    },

    // Featurebase tables
    board: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      description: true,
      isPublic: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
    feedback: {
      id: true,
      boardId: true,
      title: true,
      description: true,
      status: true,
      authorId: true,
      voteCount: true,
      commentCount: true,
      isApproved: true,
      isPinned: true,
      roadmapLane: true,
      roadmapOrder: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    vote: {
      id: true,
      feedbackId: true,
      userId: true,
      createdAt: true,
    },
    comment: {
      id: true,
      feedbackId: true,
      authorId: true,
      body: true,
      isOfficial: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
    },
    tag: {
      id: true,
      organizationId: true,
      name: true,
      color: true,
      isDoneStatus: true,
      isRoadmapLane: true,
      laneOrder: true,
      createdAt: true,
    },
    feedbackTag: {
      id: true,
      feedbackId: true,
      tagId: true,
    },
    notification: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      feedbackId: true,
      isRead: true,
      createdAt: true,
    },
    adminNote: {
      id: true,
      feedbackId: true,
      authorId: true,
      body: true,
      createdAt: true,
      updatedAt: true,
    },
    release: {
      id: true,
      organizationId: true,
      title: true,
      description: true,
      version: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    releaseItem: {
      id: true,
      releaseId: true,
      feedbackId: true,
      createdAt: true,
    },
  },

  // Define many-to-many relationship for feedback tags
  manyToMany: {
    feedback: {
      tags: ["feedbackTag", "tag"],
      releases: ["releaseItem", "release"],
    },
    tag: {
      feedbacks: ["feedbackTag", "feedback"],
    },
    release: {
      feedbacks: ["releaseItem", "feedback"],
    },
  },
});
