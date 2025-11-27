import { useState, useMemo } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Plus, Pencil, Trash2, ExternalLink, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReleaseEditor } from "@/components/changelog/release-editor";
import type { Schema, Release } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/changelog")({
  component: DashboardChangelog,
});

function DashboardChangelog() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
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

  // Modal state
  const [showEditor, setShowEditor] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);

  const openCreateModal = () => {
    setEditingRelease(null);
    setShowEditor(true);
  };

  const openEditModal = (release: Release) => {
    setEditingRelease(release);
    setShowEditor(true);
  };

  const handleDelete = (release: Release) => {
    if (!confirm(`Delete "${release.title}"? This cannot be undone.`)) return;
    z.mutate.release.delete({ id: release.id });
  };

  // Transform releases to include feedbacks count
  const releasesWithCounts = useMemo(() => {
    if (!releasesData || !Array.isArray(releasesData) || !org) return [];
    
    return releasesData.map((release) => ({
      ...release,
      feedbackCount: Array.isArray(release.releaseItems) ? release.releaseItems.length : 0,
    }));
  }, [releasesData, org]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Changelog</h1>
          <p className="text-muted-foreground mt-1">
            Create releases to showcase what you've shipped
          </p>
        </div>
        <div className="flex gap-2">
          {org?.isPublic && (
            <Button variant="outline" asChild>
              <a
                href={`/${orgSlug}/changelog`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Public
              </a>
            </Button>
          )}
          <Button onClick={openCreateModal}>
            <Plus className="h-4 w-4 mr-2" />
            New Release
          </Button>
        </div>
      </div>

      {/* Releases List */}
      <div className="space-y-4">
        {releasesWithCounts?.map((release: any) => (
          <div
            key={release.id}
            className={`p-4 border rounded-lg ${
              release.publishedAt ? "" : "border-dashed border-amber-500/50"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {release.version && (
                    <Badge variant="outline" className="font-mono">
                      {release.version}
                    </Badge>
                  )}
                  {!release.publishedAt && (
                    <Badge variant="secondary" className="text-amber-600">
                      Draft
                    </Badge>
                  )}
                  <span className="text-muted-foreground text-sm flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {release.publishedAt
                      ? format(new Date(release.publishedAt), "MMM d, yyyy")
                      : "Not published"}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mt-2">{release.title}</h3>
                {release.description && (
                  <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                    {release.description}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {release.feedbackCount} completed item
                  {release.feedbackCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditModal(release)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(release)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {(!releasesWithCounts || releasesWithCounts.length === 0) && (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <p className="text-muted-foreground mb-4">
              No releases yet. Create your first release to showcase what you've shipped.
            </p>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Release
            </Button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRelease ? "Edit Release" : "Create New Release"}
            </DialogTitle>
            <DialogDescription>
              {editingRelease
                ? "Update this release and its contents"
                : "Create a new release to showcase completed work"}
            </DialogDescription>
          </DialogHeader>

          {org && (
            <ReleaseEditor
              organizationId={org.id}
              release={editingRelease}
              onClose={() => {
                setShowEditor(false);
                setEditingRelease(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
