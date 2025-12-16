import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { Bell, BellOff, Calendar, CheckCircle } from "lucide-react";
import { nanoid } from "nanoid";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { zql } from "@/zero-schema";

export const Route = createFileRoute("/$orgSlug/changelog")({
  component: PublicChangelog,
});

function PublicChangelog() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const zero = useZero();

  // Get current user session
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Get organization
  const [orgs] = useQuery(zql.organization.where("slug", orgSlug));
  const org = orgs?.[0];

  // Get published releases for this organization
  const [releasesData] = useQuery(
    zql.release
      .where("organizationId", org?.id ?? "")
      .related("releaseItems", (q) =>
        q.related("feedback", (fq) => fq.related("board"))
      )
      .orderBy("publishedAt", "desc")
  );

  // Get user's changelog subscription for this org
  const subscriptionsQuery =
    userId && org?.id
      ? zql.changelogSubscription
          .where("userId", userId)
          .where("organizationId", org.id)
      : zql.changelogSubscription
          .where("userId", "__none__")
          .where("organizationId", "__none__");

  const [subscriptions] = useQuery(subscriptionsQuery);
  const isSubscribed = subscriptions && subscriptions.length > 0;

  // Toggle subscription handler
  const handleToggleSubscription = async () => {
    if (!(userId && org?.id)) {
      return;
    }

    if (isSubscribed && subscriptions?.[0]) {
      // Unsubscribe - delete the subscription
      await zero.mutate(
        mutators.changelogSubscription.delete({
          id: subscriptions[0].id,
        })
      );
    } else {
      // Subscribe - create new subscription
      await zero.mutate(
        mutators.changelogSubscription.insert({
          id: nanoid(),
          userId,
          organizationId: org.id,
          subscribedAt: Date.now(),
        })
      );
    }
  };

  // Transform releases to include feedbacks
  const releasesWithFeedbacks = (() => {
    if (!(releasesData && org)) {
      return [];
    }

    // Filter to only published releases
    return releasesData
      .filter((r) => r.publishedAt)
      .map((release) => {
        const items = release.releaseItems ?? [];
        const feedbacks = items
          .map((ri) => ri.feedback)
          .filter((f): f is NonNullable<typeof f> => f !== null);

        return {
          ...release,
          feedbacks,
        };
      });
  })();

  if (!org) {
    return (
      <div className="wrapper-content py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      {/* Header */}
      <div className="wrapper-content mb-12 text-center">
        <h1 className="font-bold text-3xl">Changelog</h1>
        <p className="mt-2 text-muted-foreground">
          The latest updates and improvements from {org.name}
        </p>

        {/* Email Subscription Toggle - only show for logged-in users */}
        {userId && (
          <div className="mx-auto mt-6 flex max-w-md items-center justify-center gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <Label
                  className="cursor-pointer font-medium text-sm"
                  htmlFor="changelog-subscription"
                >
                  Email Updates
                </Label>
                <p className="text-muted-foreground text-xs">
                  {isSubscribed
                    ? "You'll receive emails for new releases"
                    : "Get notified when new releases are published"}
                </p>
              </div>
            </div>
            <Switch
              checked={isSubscribed}
              id="changelog-subscription"
              onCheckedChange={handleToggleSubscription}
            />
          </div>
        )}
      </div>

      {/* Releases */}
      {releasesWithFeedbacks.length > 0 ? (
        <div className="space-y-12">
          {releasesWithFeedbacks.map((release) => (
            <article className="relative" key={release.id}>
              {/* Date marker */}
              <div className="wrapper-content mb-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <time
                  className="flex shrink-0 items-center gap-1.5 text-muted-foreground text-sm"
                  dateTime={
                    release.publishedAt
                      ? new Date(release.publishedAt).toISOString()
                      : undefined
                  }
                >
                  <Calendar className="h-4 w-4" />
                  {release.publishedAt &&
                    format(new Date(release.publishedAt), "MMMM d, yyyy")}
                </time>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Release content */}
              <div className="wrapper-content">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2">
                      {release.version && (
                        <Badge className="font-mono" variant="default">
                          {release.version}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-2xl">{release.title}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Description - outside wrapper-content for proper editor behavior */}
              {release.description && (
                <div className="mt-4">
                  <MarkdownEditor
                    editable={false}
                    showToolbar={false}
                    value={release.description}
                  />
                </div>
              )}

              {/* Completed items */}
              {release.feedbacks.length > 0 && (
                <div className="wrapper-content mt-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <h4 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          What's New
                        </h4>
                        <ul className="space-y-2">
                          {release.feedbacks.map((feedback) => (
                            <li
                              className="flex items-start gap-2"
                              key={feedback.id}
                            >
                              <span className="mt-0.5 text-green-600">•</span>
                              <div className="flex-1">
                                <span className="font-medium">
                                  {feedback.title}
                                </span>
                                {feedback.board && (
                                  <span className="ml-2 text-muted-foreground text-xs">
                                    in {feedback.board.name}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="wrapper-content rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">
            No releases published yet. Check back soon for updates!
          </p>
        </div>
      )}
    </div>
  );
}
