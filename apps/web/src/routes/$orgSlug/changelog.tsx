import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, CheckCircle } from "lucide-react";
import { useMemo } from "react";
import { MarkdownEditor } from "@/components/editor-new/markdown-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/$orgSlug/changelog")({
  component: PublicChangelog,
});

function PublicChangelog() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get published releases for this organization
  const [releasesData] = useQuery(
    z.query.release
      .where("organizationId", "=", org?.id ?? "")
      .related("releaseItems", (q) =>
        q.related("feedback", (fq) => fq.related("board"))
      )
      .orderBy("publishedAt", "desc")
  );

  // Transform releases to include feedbacks - memoized for performance
  const releasesWithFeedbacks = useMemo(() => {
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
  }, [releasesData, org]);

  if (!org) {
    return (
      <div className="container max-w-3xl py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Organization not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="font-bold text-3xl">Changelog</h1>
        <p className="mt-2 text-muted-foreground">
          The latest updates and improvements from {org.name}
        </p>
      </div>

      {/* Releases */}
      {releasesWithFeedbacks.length > 0 ? (
        <div className="space-y-12">
          {releasesWithFeedbacks.map((release) => (
            <article className="relative" key={release.id}>
              {/* Date marker */}
              <div className="mb-4 flex items-center gap-3">
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
                  {release.description && (
                    <div className="mt-2">
                      <MarkdownEditor
                        editable={false}
                        editorClassName="border-none shadow-none px-0 min-h-0 [&_.ProseMirror]:min-h-0"
                        showDragHandle={false}
                        showSlashMenu={false}
                        showToolbar={false}
                        value={release.description}
                      />
                    </div>
                  )}
                </CardHeader>

                {release.feedbacks.length > 0 && (
                  <CardContent>
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
                )}
              </Card>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/30 py-12 text-center">
          <p className="text-muted-foreground">
            No releases published yet. Check back soon for updates!
          </p>
        </div>
      )}
    </div>
  );
}
