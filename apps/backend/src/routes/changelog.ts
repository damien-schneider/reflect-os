/**
 * Changelog Routes
 *
 * Handles sending notification emails to changelog subscribers
 * when a new release is published.
 */

import { ChangelogUpdateTemplate, sendBatchEmails } from "@repo/email";
import { Hono } from "hono";
import { auth, dbPool } from "../auth";
import { env } from "../env";

const app = new Hono();

// Regex for removing trailing slashes from URLs
const TRAILING_SLASH_RE = /\/$/;

type SubscriberRow = {
  user_id: string;
  email: string;
  name: string;
};

type ReleaseRow = {
  id: string;
  title: string;
  version: string | null;
  description: string | null;
  published_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
};

type FeedbackItem = {
  title: string;
  board_name: string | null;
};

// =============================================================================
// NOTIFY SUBSCRIBERS
// =============================================================================

/**
 * Send changelog update emails to all subscribers of an organization
 * Called when a release is published
 *
 * POST /api/changelog/notify
 * Body: { releaseId: string }
 */
app.post("/notify", async (c) => {
  try {
    // Verify user is authenticated and is member of the org
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json<{ releaseId: string }>();
    const { releaseId } = body;

    if (!releaseId) {
      return c.json({ error: "releaseId is required" }, 400);
    }

    // Get the release details
    const releaseResult = await dbPool.query<ReleaseRow>(
      `SELECT id, title, version, description, published_at
       FROM release
       WHERE id = $1`,
      [releaseId]
    );

    const release = releaseResult.rows[0];
    if (!release) {
      return c.json({ error: "Release not found" }, 404);
    }

    if (!release.published_at) {
      return c.json({ error: "Release is not published" }, 400);
    }

    // Get the organization
    const orgResult = await dbPool.query<OrganizationRow>(
      `SELECT o.id, o.name, o.slug
       FROM organization o
       JOIN release r ON r.organization_id = o.id
       WHERE r.id = $1`,
      [releaseId]
    );

    const org = orgResult.rows[0];
    if (!org) {
      return c.json({ error: "Organization not found" }, 404);
    }

    // Verify user is member of the organization
    const memberResult = await dbPool.query(
      "SELECT 1 FROM member WHERE organization_id = $1 AND user_id = $2",
      [org.id, session.user.id]
    );

    if (memberResult.rows.length === 0) {
      return c.json(
        { error: "You are not a member of this organization" },
        403
      );
    }

    // Get all subscribers for this organization
    const subscribersResult = await dbPool.query<SubscriberRow>(
      `SELECT cs.user_id, u.email, u.name
       FROM changelog_subscription cs
       JOIN "user" u ON u.id = cs.user_id
       WHERE cs.organization_id = $1`,
      [org.id]
    );

    const subscribers = subscribersResult.rows;

    if (subscribers.length === 0) {
      return c.json({
        success: true,
        message: "No subscribers to notify",
        emailsSent: 0,
      });
    }

    // Get feedback items included in this release
    const feedbackResult = await dbPool.query<FeedbackItem>(
      `SELECT f.title, b.name as board_name
       FROM release_item ri
       JOIN feedback f ON f.id = ri.feedback_id
       LEFT JOIN board b ON b.id = f.board_id
       WHERE ri.release_id = $1`,
      [releaseId]
    );

    const feedbackItems = feedbackResult.rows.map((f) => ({
      title: f.title,
      boardName: f.board_name ?? undefined,
    }));

    // Build the changelog URL
    const baseUrl = env.BETTER_AUTH_URL.replace(TRAILING_SLASH_RE, "");
    const viewUrl = `${baseUrl}/${org.slug}/changelog`;

    // Prepare emails for all subscribers
    const emails = subscribers.map((subscriber) => {
      // Generate unsubscribe URL (simple link for now - could add JWT token later)
      const unsubscribeUrl = `${baseUrl}/${org.slug}/changelog?unsubscribe=true`;

      return {
        to: subscriber.email,
        subject: `${org.name}: ${release.title}`,
        template: ChangelogUpdateTemplate({
          orgName: org.name,
          orgSlug: org.slug,
          releaseTitle: release.title,
          releaseVersion: release.version ?? undefined,
          releaseDescription: release.description ?? undefined,
          feedbackItems: feedbackItems.length > 0 ? feedbackItems : undefined,
          viewUrl,
          unsubscribeUrl,
        }),
      };
    });

    // Send emails in batch
    const results = await sendBatchEmails(emails);

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(
      `[Changelog] Sent ${successCount} emails for release ${releaseId}, ${failureCount} failed`
    );

    return c.json({
      success: true,
      message: `Notifications sent to ${successCount} subscribers`,
      emailsSent: successCount,
      emailsFailed: failureCount,
    });
  } catch (error) {
    console.error("[Changelog] Error sending notifications:", error);
    return c.json({ error: "Failed to send notifications" }, 500);
  }
});

export default app;
