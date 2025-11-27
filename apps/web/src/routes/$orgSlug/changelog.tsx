import { useMemo } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { format } from "date-fns";
import { Calendar, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Schema, Release, Feedback, Board } from "@/schema";

export const Route = createFileRoute("/$orgSlug/changelog")({
  component: PublicChangelog,
});

type ReleaseWithFeedbacks = Release & {
  feedbacks: (Feedback & { board?: Board | null })[];
};

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
  const releasesWithFeedbacks = useMemo((): ReleaseWithFeedbacks[] => {
    if (!releasesData || !Array.isArray(releasesData) || !org) return [];
    
    // Filter to only published releases
    return releasesData
      .filter((r) => r.publishedAt)
      .map((release) => {
        const items = Array.isArray(release.releaseItems) ? release.releaseItems : [];
        const feedbacks = items
          .map((ri) => ri.feedback)
          .filter((f): f is Feedback & { board?: Board | null } => f != null);
        
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
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold">Changelog</h1>
        <p className="text-muted-foreground mt-2">
          The latest updates and improvements from {org.name}
        </p>
      </div>

      {/* Releases */}
      {releasesWithFeedbacks.length > 0 ? (
        <div className="space-y-12">
          {releasesWithFeedbacks.map((release) => (
            <article key={release.id} className="relative">
              {/* Date marker */}
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-border" />
                <time 
                  className="text-sm text-muted-foreground flex items-center gap-1.5 shrink-0"
                  dateTime={release.publishedAt ? new Date(release.publishedAt).toISOString() : undefined}
                >
                  <Calendar className="h-4 w-4" />
                  {release.publishedAt && format(new Date(release.publishedAt), "MMMM d, yyyy")}
                </time>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Release content */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 flex-wrap">
                    {release.version && (
                      <Badge variant="default" className="font-mono">
                        {release.version}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{release.title}</CardTitle>
                  {release.description && (
                    <CardDescription className="text-base">
                      {release.description}
                    </CardDescription>
                  )}
                </CardHeader>

                {release.feedbacks.length > 0 && (
                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        What's New
                      </h4>
                      <ul className="space-y-2">
                        {release.feedbacks.map((feedback) => (
                          <li key={feedback.id} className="flex items-start gap-2">
                            <span className="text-green-600 mt-0.5">•</span>
                            <div className="flex-1">
                              <span className="font-medium">{feedback.title}</span>
                              {feedback.board && (
                                <span className="text-xs text-muted-foreground ml-2">
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
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <p className="text-muted-foreground">
            No releases published yet. Check back soon for updates!
          </p>
        </div>
      )}
    </div>
  );
}
