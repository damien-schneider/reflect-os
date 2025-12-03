import { scryptAsync } from "@noble/hashes/scrypt.js";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { nanoid } from "nanoid";
import postgres from "postgres";
import * as schema from "./schema";

// Load environment variables from root .env
config({ path: "../../.env" });

// Get database URL from environment or use default local dev URL
const DATABASE_URL =
  process.env.DATABASE_URL ||
  process.env.ZERO_UPSTREAM_DB ||
  "postgres://user:password@localhost:5430/postgres";

// Hash password using better-auth's exact scrypt format
async function hashPassword(password: string): Promise<string> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Buffer.from(saltBytes).toString("hex");
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: 16_384,
    p: 1,
    r: 16,
    dkLen: 64,
    maxmem: 128 * 16_384 * 16 * 2,
  });
  return `${salt}:${Buffer.from(key).toString("hex")}`;
}

async function seed() {
  console.log("🌱 Starting database seed...");

  const client = postgres(DATABASE_URL);
  const db = drizzle(client, { schema });

  try {
    // Clean up existing data (in reverse order of dependencies)
    console.log("🧹 Cleaning up existing data...");
    await db.delete(schema.adminNote);
    await db.delete(schema.notification);
    await db.delete(schema.releaseItem);
    await db.delete(schema.release);
    await db.delete(schema.feedbackTag);
    await db.delete(schema.tag);
    await db.delete(schema.comment);
    await db.delete(schema.vote);
    await db.delete(schema.feedback);
    await db.delete(schema.board);
    await db.delete(schema.invitation);
    await db.delete(schema.member);
    await db.delete(schema.organization);
    await db.delete(schema.verification);
    await db.delete(schema.account);
    await db.delete(schema.session);
    await db.delete(schema.user);

    // Create users
    console.log("👥 Creating users...");
    const now = Date.now();

    // Hash password for test user using better-auth's scrypt format
    const hashedPassword = await hashPassword("password");

    const users = await db
      .insert(schema.user)
      .values([
        {
          id: "user_test",
          name: "Test User",
          email: "test@mail.com",
          emailVerified: true,
          partner: false,
        },
        {
          id: "user_admin",
          name: "Admin User",
          email: "admin@example.com",
          emailVerified: true,
          partner: true,
        },
        {
          id: "user_1",
          name: "Alice Johnson",
          email: "alice@example.com",
          emailVerified: true,
          partner: false,
          bio: "Product enthusiast",
        },
        {
          id: "user_2",
          name: "Bob Smith",
          email: "bob@example.com",
          emailVerified: true,
          partner: false,
        },
        {
          id: "user_3",
          name: "Charlie Brown",
          email: "charlie@example.com",
          emailVerified: false,
          partner: false,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${users.length} users`);

    // Create account with password for test user (better-auth credential provider)
    console.log("🔐 Creating test user account with password...");
    await db.insert(schema.account).values({
      id: nanoid(),
      accountId: "user_test",
      providerId: "credential",
      userId: "user_test",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(
      `  ✅ Created account for test@mail.com with password "password"`
    );

    // Create organization
    console.log("🏢 Creating organization...");
    const [organization] = await db
      .insert(schema.organization)
      .values({
        id: "org_1",
        name: "Acme Inc",
        slug: "acme",
        logo: null,
        metadata: null,
        primaryColor: "#6366f1",
        customCss: null,
      })
      .returning();

    console.log(`  ✅ Created organization: ${organization.name}`);

    // Create members
    console.log("👤 Creating members...");
    const members = await db
      .insert(schema.member)
      .values([
        {
          id: nanoid(),
          organizationId: "org_1",
          userId: "user_test",
          role: "owner",
        },
        {
          id: nanoid(),
          organizationId: "org_1",
          userId: "user_admin",
          role: "admin",
        },
        {
          id: nanoid(),
          organizationId: "org_1",
          userId: "user_1",
          role: "admin",
        },
        {
          id: nanoid(),
          organizationId: "org_1",
          userId: "user_2",
          role: "member",
        },
      ])
      .returning();

    console.log(`  ✅ Created ${members.length} members`);

    // Create boards
    console.log("📋 Creating boards...");
    const boards = await db
      .insert(schema.board)
      .values([
        {
          id: "board_feedback",
          organizationId: "org_1",
          name: "Feature Requests",
          slug: "feature-requests",
          description: "Share your ideas and vote on features",
          isPublic: true,
          settings: {
            allowAnonymousVoting: false,
            requireApproval: false,
            defaultStatus: "open",
          },
          createdAt: now,
          updatedAt: now,
        },
        {
          id: "board_bugs",
          organizationId: "org_1",
          name: "Bug Reports",
          slug: "bugs",
          description: "Report bugs and issues",
          isPublic: true,
          settings: {
            allowAnonymousVoting: false,
            requireApproval: true,
            defaultStatus: "open",
          },
          createdAt: now,
          updatedAt: now,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${boards.length} boards`);

    // Create tags
    console.log("🏷️ Creating tags...");
    const tags = await db
      .insert(schema.tag)
      .values([
        // Regular tags
        {
          id: "tag_ux",
          organizationId: "org_1",
          name: "UX",
          color: "#3b82f6",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: false,
        },
        {
          id: "tag_performance",
          organizationId: "org_1",
          name: "Performance",
          color: "#ef4444",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: false,
        },
        {
          id: "tag_api",
          organizationId: "org_1",
          name: "API",
          color: "#22c55e",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: false,
        },
        {
          id: "tag_mobile",
          organizationId: "org_1",
          name: "Mobile",
          color: "#f59e0b",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: false,
        },
        {
          id: "tag_security",
          organizationId: "org_1",
          name: "Security",
          color: "#8b5cf6",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: false,
        },
        // Roadmap lane tags
        {
          id: "tag_lane_planned",
          organizationId: "org_1",
          name: "Planned",
          color: "#6366f1",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: true,
          laneOrder: 1,
        },
        {
          id: "tag_lane_in_progress",
          organizationId: "org_1",
          name: "In Progress",
          color: "#f59e0b",
          createdAt: now,
          isDoneStatus: false,
          isRoadmapLane: true,
          laneOrder: 2,
        },
        {
          id: "tag_lane_done",
          organizationId: "org_1",
          name: "Done",
          color: "#22c55e",
          createdAt: now,
          isDoneStatus: true,
          isRoadmapLane: true,
          laneOrder: 3,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${tags.length} tags`);

    // Create feedback
    console.log("💬 Creating feedback...");
    const feedbacks = await db
      .insert(schema.feedback)
      .values([
        {
          id: "feedback_1",
          boardId: "board_feedback",
          title: "Add dark mode support",
          description: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "It would be great to have a dark mode option for the app. This would help reduce eye strain during night usage.",
                  },
                ],
              },
            ],
          }),
          status: "planned",
          authorId: "user_1",
          voteCount: 42,
          commentCount: 3,
          isApproved: true,
          isPinned: true,
          roadmapLane: "tag_lane_in_progress",
          roadmapOrder: 1,
          createdAt: now - 86_400_000 * 7, // 7 days ago
          updatedAt: now - 86_400_000 * 2,
        },
        {
          id: "feedback_2",
          boardId: "board_feedback",
          title: "Keyboard shortcuts for common actions",
          description: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Please add keyboard shortcuts for navigation and common actions like creating new items, searching, etc.",
                  },
                ],
              },
            ],
          }),
          status: "under_review",
          authorId: "user_2",
          voteCount: 28,
          commentCount: 1,
          isApproved: true,
          isPinned: false,
          roadmapLane: "tag_lane_planned",
          roadmapOrder: 1,
          createdAt: now - 86_400_000 * 5,
          updatedAt: now - 86_400_000 * 3,
        },
        {
          id: "feedback_3",
          boardId: "board_feedback",
          title: "Mobile app for iOS and Android",
          description: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "A native mobile app would make it much easier to stay updated on the go.",
                  },
                ],
              },
            ],
          }),
          status: "open",
          authorId: "user_1",
          voteCount: 156,
          commentCount: 12,
          isApproved: true,
          isPinned: false,
          roadmapLane: "tag_lane_planned",
          roadmapOrder: 2,
          createdAt: now - 86_400_000 * 30,
          updatedAt: now - 86_400_000 * 1,
        },
        {
          id: "feedback_4",
          boardId: "board_bugs",
          title: "Login fails on Safari browser",
          description: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "When trying to log in using Safari, the page just refreshes without any error message.",
                  },
                ],
              },
            ],
          }),
          status: "in_progress",
          authorId: "user_3",
          voteCount: 8,
          commentCount: 2,
          isApproved: true,
          isPinned: false,
          createdAt: now - 86_400_000 * 3,
          updatedAt: now - 86_400_000 * 1,
        },
        {
          id: "feedback_5",
          boardId: "board_feedback",
          title: "Export data to CSV",
          description: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Allow users to export their feedback data to CSV format for reporting purposes.",
                  },
                ],
              },
            ],
          }),
          status: "completed",
          authorId: "user_2",
          voteCount: 35,
          commentCount: 5,
          isApproved: true,
          isPinned: false,
          roadmapLane: "tag_lane_done",
          roadmapOrder: 1,
          completedAt: now - 86_400_000 * 3, // Completed 3 days ago
          createdAt: now - 86_400_000 * 20,
          updatedAt: now - 86_400_000 * 3,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${feedbacks.length} feedback items`);

    // Create votes
    console.log("👍 Creating votes...");
    const votes = await db
      .insert(schema.vote)
      .values([
        {
          id: nanoid(),
          feedbackId: "feedback_1",
          userId: "user_1",
          createdAt: now - 86_400_000 * 6,
        },
        {
          id: nanoid(),
          feedbackId: "feedback_1",
          userId: "user_2",
          createdAt: now - 86_400_000 * 5,
        },
        {
          id: nanoid(),
          feedbackId: "feedback_1",
          userId: "user_admin",
          createdAt: now - 86_400_000 * 4,
        },
        {
          id: nanoid(),
          feedbackId: "feedback_2",
          userId: "user_1",
          createdAt: now - 86_400_000 * 4,
        },
        {
          id: nanoid(),
          feedbackId: "feedback_3",
          userId: "user_1",
          createdAt: now - 86_400_000 * 29,
        },
        {
          id: nanoid(),
          feedbackId: "feedback_3",
          userId: "user_2",
          createdAt: now - 86_400_000 * 28,
        },
        {
          id: nanoid(),
          feedbackId: "feedback_3",
          userId: "user_admin",
          createdAt: now - 86_400_000 * 27,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${votes.length} votes`);

    // Create comments
    console.log("💭 Creating comments...");
    const comments = await db
      .insert(schema.comment)
      .values([
        {
          id: "comment_1",
          feedbackId: "feedback_1",
          authorId: "user_admin",
          body: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Great suggestion! We've added this to our roadmap for Q2.",
                  },
                ],
              },
            ],
          }),
          isOfficial: true,
          parentId: null,
          createdAt: now - 86_400_000 * 5,
          updatedAt: now - 86_400_000 * 5,
        },
        {
          id: "comment_2",
          feedbackId: "feedback_1",
          authorId: "user_2",
          body: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Yes please! My eyes will thank you." },
                ],
              },
            ],
          }),
          isOfficial: false,
          parentId: null,
          createdAt: now - 86_400_000 * 4,
          updatedAt: now - 86_400_000 * 4,
        },
        {
          id: "comment_3",
          feedbackId: "feedback_1",
          authorId: "user_1",
          body: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Awesome! Can't wait for it." },
                ],
              },
            ],
          }),
          isOfficial: false,
          parentId: "comment_1",
          createdAt: now - 86_400_000 * 3,
          updatedAt: now - 86_400_000 * 3,
        },
        {
          id: "comment_4",
          feedbackId: "feedback_4",
          authorId: "user_admin",
          body: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "Thanks for reporting! We're investigating this issue.",
                  },
                ],
              },
            ],
          }),
          isOfficial: true,
          parentId: null,
          createdAt: now - 86_400_000 * 2,
          updatedAt: now - 86_400_000 * 2,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${comments.length} comments`);

    // Create feedback tags
    console.log("🔗 Creating feedback-tag associations...");
    const feedbackTags = await db
      .insert(schema.feedbackTag)
      .values([
        { id: nanoid(), feedbackId: "feedback_1", tagId: "tag_ux" },
        { id: nanoid(), feedbackId: "feedback_2", tagId: "tag_ux" },
        { id: nanoid(), feedbackId: "feedback_3", tagId: "tag_mobile" },
        { id: nanoid(), feedbackId: "feedback_4", tagId: "tag_security" },
      ])
      .returning();

    console.log(
      `  ✅ Created ${feedbackTags.length} feedback-tag associations`
    );

    // Create admin notes
    console.log("📝 Creating admin notes...");
    const adminNotes = await db
      .insert(schema.adminNote)
      .values([
        {
          id: nanoid(),
          feedbackId: "feedback_4",
          authorId: "user_admin",
          body: "This is a known Safari WebKit issue. Engineering is working on a workaround.",
          createdAt: now - 86_400_000 * 2,
          updatedAt: now - 86_400_000 * 2,
        },
      ])
      .returning();

    console.log(`  ✅ Created ${adminNotes.length} admin notes`);

    console.log("\n✨ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
