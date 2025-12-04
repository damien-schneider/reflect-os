import { useQuery, useZero } from "@rocicorp/zero/react";
import { ReleaseCard } from "@/features/changelog/components/release-card";
import type { Board, Feedback, Release, Schema } from "@/schema";

type ReleaseListProps = {
  organizationId: string;
  orgSlug: string;
  showDrafts?: boolean;
};

type ReleaseWithFeedbacks = Release & {
  feedbacks: (Feedback & { board?: Board | null })[];
};

export function ReleaseList({
  organizationId,
  orgSlug,
  showDrafts = false,
}: ReleaseListProps) {
  const z = useZero<Schema>();

  // Get releases for this organization
  const [releases] = useQuery(
    z.query.release
      .where("organizationId", "=", organizationId)
      .related("releaseItems", (q) =>
        q.related("feedback", (fq) => fq.related("board"))
      )
      .orderBy("publishedAt", "desc")
  );

  // Transform releases to include feedbacks - memoized for performance
  const releasesWithFeedbacks = ((): ReleaseWithFeedbacks[] => {
    if (!(releases && Array.isArray(releases))) {
      return [];
    }

    // Filter out drafts if not showing them
    const filtered = showDrafts
      ? releases
      : releases.filter((r) => r.publishedAt);

    return filtered.map((release) => {
      const items = Array.isArray(release.releaseItems)
        ? release.releaseItems
        : [];
      const feedbacks = items
        .map((ri) => ri.feedback)
        .filter((f): f is Feedback & { board?: Board | null } => f !== null);

      return {
        ...release,
        feedbacks,
      };
    });
  })();

  if (releasesWithFeedbacks.length === 0) {
    return (
      <div className="rounded-lg border bg-muted/30 py-12 text-center">
        <p className="text-muted-foreground">
          No releases yet. Create your first release to showcase what's been
          shipped.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {releasesWithFeedbacks.map((release) => (
        <ReleaseCard key={release.id} orgSlug={orgSlug} release={release} />
      ))}
    </div>
  );
}
