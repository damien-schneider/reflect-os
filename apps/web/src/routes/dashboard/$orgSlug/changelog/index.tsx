import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { randID } from "@/rand";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/changelog/")({
  component: DashboardChangelogIndex,
});

function DashboardChangelogIndex() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const navigate = useNavigate();
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get releases for this organization
  const [releasesData] = useQuery(
    z.query.release
      .where("organizationId", "=", org?.id ?? "")
      .related("releaseItems")
      .orderBy("createdAt", "desc")
  );

  const [deleteRelease, setDeleteRelease] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Create a new draft release instantly and navigate to it
  const createNewRelease = async () => {
    if (!org) {
      return;
    }

    const releaseId = randID();
    const now = Date.now();

    await z.mutate.release.insert({
      id: releaseId,
      organizationId: org.id,
      title: "Untitled Release",
      description: null,
      version: null,
      publishedAt: null, // Draft
      createdAt: now,
      updatedAt: now,
    });

    // Navigate to the new release detail page
    navigate({
      to: "/dashboard/$orgSlug/changelog/$releaseId",
      params: { orgSlug, releaseId },
    });
  };

  const confirmDelete = () => {
    if (deleteRelease) {
      z.mutate.release.delete({ id: deleteRelease.id });
      setDeleteRelease(null);
    }
  };

  // Transform releases to include feedbacks count
  const releasesWithCounts = (() => {
    if (!(releasesData && Array.isArray(releasesData) && org)) {
      return [];
    }

    return releasesData.map((release) => ({
      ...release,
      feedbackCount: Array.isArray(release.releaseItems)
        ? release.releaseItems.length
        : 0,
    }));
  })();

  return (
    <div className="wrapper-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl">Changelog</h1>
          <p className="mt-1 text-muted-foreground">
            Create releases to showcase what you've shipped
          </p>
        </div>
        <div className="flex gap-2">
          {org?.isPublic && (
            <Button asChild variant="outline">
              <Link
                params={{ orgSlug }}
                target="_blank"
                to="/$orgSlug/changelog"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View Public
              </Link>
            </Button>
          )}
          <Button onClick={createNewRelease}>
            <Plus className="mr-2 h-4 w-4" />
            New Release
          </Button>
        </div>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        {releasesWithCounts?.map((release) => (
          <Link
            className={`block rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
              release.publishedAt ? "" : "border-amber-500/50 border-dashed"
            }`}
            key={release.id as string}
            params={{ orgSlug, releaseId: release.id as string }}
            to="/dashboard/$orgSlug/changelog/$releaseId"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {release.version && (
                    <Badge className="font-mono" variant="outline">
                      {release.version}
                    </Badge>
                  )}
                  {!release.publishedAt && (
                    <Badge className="text-amber-600" variant="secondary">
                      Draft
                    </Badge>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    {release.publishedAt
                      ? format(new Date(release.publishedAt), "MMM d, yyyy")
                      : "Not published"}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-lg">{release.title}</h3>
                {release.description && (
                  <p className="mt-1 line-clamp-2 text-muted-foreground text-sm">
                    {release.description}
                  </p>
                )}
                <p className="mt-2 text-muted-foreground text-sm">
                  {release.feedbackCount} completed item
                  {release.feedbackCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button asChild size="icon" variant="ghost">
                  <Link
                    onClick={(e) => e.stopPropagation()}
                    params={{ orgSlug, releaseId: release.id as string }}
                    to="/dashboard/$orgSlug/changelog/$releaseId"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteRelease({
                      id: release.id as string,
                      title: release.title as string,
                    });
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Link>
        ))}

        {(!releasesWithCounts || releasesWithCounts.length === 0) && (
          <div className="rounded-lg border bg-muted/30 py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              No releases yet. Create your first release to showcase what you've
              shipped.
            </p>
            <Button onClick={createNewRelease}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Release
            </Button>
          </div>
        )}
      </div>

      <AlertDialog
        onOpenChange={(open) => !open && setDeleteRelease(null)}
        open={!!deleteRelease}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete release</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRelease?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
