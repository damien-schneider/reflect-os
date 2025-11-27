import { useMemo } from "react";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { ReleaseCard } from "./release-card";
import type { Schema, Release, Feedback, Board } from "../../schema";

interface ReleaseListProps {
  organizationId: string;
  orgSlug: string;
  showDrafts?: boolean;
}

type ReleaseWithFeedbacks = Release & {
  feedbacks: (Feedback & { board?: Board | null })[];
};

export function ReleaseList({ organizationId, orgSlug, showDrafts = false }: ReleaseListProps) {
  const z = useZero<Schema>();

  // Get releases for this organization
  const [releases] = useQuery(
    z.query.release
      .where("organizationId", "=", organizationId)
      .related("releaseItems", (q) => 
        q.related("feedback", (fq) => 
          fq.related("board")
        )
      )
      .orderBy("publishedAt", "desc")
  );

  // Transform releases to include feedbacks - memoized for performance
  const releasesWithFeedbacks = useMemo((): ReleaseWithFeedbacks[] => {
    if (!releases || !Array.isArray(releases)) return [];
    
    // Filter out drafts if not showing them
    const filtered = showDrafts 
      ? releases 
      : releases.filter((r) => r.publishedAt);

    return filtered.map((release) => {
      const items = Array.isArray(release.releaseItems) ? release.releaseItems : [];
      const feedbacks = items
        .map((ri) => ri.feedback)
        .filter((f): f is Feedback & { board?: Board | null } => f != null);
      
      return {
        ...release,
        feedbacks,
      };
    });
  }, [releases, showDrafts]);

  if (releasesWithFeedbacks.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/30">
        <p className="text-muted-foreground">
          No releases yet. Create your first release to showcase what's been shipped.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {releasesWithFeedbacks.map((release) => (
        <ReleaseCard 
          key={release.id} 
          release={release} 
          orgSlug={orgSlug}
        />
      ))}
    </div>
  );
}
