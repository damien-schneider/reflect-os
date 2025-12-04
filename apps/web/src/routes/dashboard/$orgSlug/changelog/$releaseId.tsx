import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Check,
  FileText,
  Globe,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import type { Organization, ReleaseItem, Schema } from "@/schema";

export const Route = createFileRoute(
  "/dashboard/$orgSlug/changelog/$releaseId"
)({
  component: ReleaseDetailPage,
});

function ReleaseDetailPage() {
  const { orgSlug, releaseId } = useParams({ strict: false }) as {
    orgSlug: string;
    releaseId: string;
  };
  const navigate = useNavigate();
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0] as Organization | undefined;

  // Get release with related items
  const [releases] = useQuery(
    z.query.release
      .where("id", "=", releaseId)
      .related("releaseItems", (q) => q.related("feedback"))
  );
  const release = releases?.[0];

  // Local state for inline editing
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingVersion, setIsEditingVersion] = useState(false);

  // Get selected feedback IDs from release items
  const releaseItems: ReleaseItem[] = Array.isArray(release?.releaseItems)
    ? release.releaseItems
    : [];
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<string[]>([]);

  // Sync local state with release data
  useEffect(() => {
    if (release) {
      setTitle(release.title as string);
      setVersion((release.version as string) ?? "");
      setDescription((release.description as string) ?? "");
      setSelectedFeedbackIds(releaseItems.map((ri) => ri.feedbackId as string));
    }
  }, [
    release?.id,
    release.description,
    release.title,
    release.version,
    release,
    releaseItems.map,
  ]); // Only sync on release change, not on every render

  // Auto-save handlers
  const saveTitle = useCallback(() => {
    if (!(release && title.trim())) {
      return;
    }
    z.mutate.release.update({
      id: release.id,
      title: title.trim(),
      updatedAt: Date.now(),
    });
    setIsEditingTitle(false);
  }, [release, title, z]);

  const saveVersion = useCallback(() => {
    if (!release) {
      return;
    }
    z.mutate.release.update({
      id: release.id,
      version: version.trim() || null,
      updatedAt: Date.now(),
    });
    setIsEditingVersion(false);
  }, [release, version, z]);

  const saveDescription = useCallback(
    (markdown: string) => {
      if (!release) {
        return;
      }
      setDescription(markdown);
      z.mutate.release.update({
        id: release.id,
        description: markdown || null,
        updatedAt: Date.now(),
      });
    },
    [release, z]
  );

  const togglePublish = useCallback(() => {
    if (!release) {
      return;
    }
    const now = Date.now();
    z.mutate.release.update({
      id: release.id,
      publishedAt: release.publishedAt ? null : now,
      updatedAt: now,
    });
  }, [release, z]);

  const handleDelete = useCallback(() => {
    if (!release) {
      return;
    }
    if (!confirm(`Delete "${release.title}"? This cannot be undone.`)) {
      return;
    }

    // Delete release items first
    for (const item of releaseItems) {
      z.mutate.releaseItem.delete({ id: item.id });
    }
    // Then delete the release
    z.mutate.release.delete({ id: release.id });

    navigate({
      to: "/dashboard/$orgSlug/changelog",
      params: { orgSlug },
    });
  }, [release, releaseItems, z, navigate, orgSlug]);

  // Add a single item to the release
  const handleAddItem = useCallback(
    (feedbackId: string) => {
      if (!release) {
        return;
      }
      // Skip if already added
      if (selectedFeedbackIds.includes(feedbackId)) {
        return;
      }

      const now = Date.now();
      z.mutate.releaseItem.insert({
        id: crypto.randomUUID(),
        releaseId: release.id,
        feedbackId,
        createdAt: now,
      });
      setSelectedFeedbackIds((prev) => [...prev, feedbackId]);
      z.mutate.release.update({
        id: release.id,
        updatedAt: now,
      });
    },
    [release, selectedFeedbackIds, z]
  );

  // Add all available items to the release
  const handleAddAllItems = useCallback(
    (feedbackIds: string[]) => {
      if (!release) {
        return;
      }
      const now = Date.now();

      // Only add items that aren't already selected
      const newIds = feedbackIds.filter(
        (id) => !selectedFeedbackIds.includes(id)
      );
      for (const feedbackId of newIds) {
        z.mutate.releaseItem.insert({
          id: crypto.randomUUID(),
          releaseId: release.id,
          feedbackId,
          createdAt: now,
        });
      }

      setSelectedFeedbackIds((prev) => [...prev, ...newIds]);
      z.mutate.release.update({
        id: release.id,
        updatedAt: now,
      });
    },
    [release, selectedFeedbackIds, z]
  );

  // Remove an item from the release
  const handleRemoveItem = useCallback(
    (feedbackId: string) => {
      if (!release) {
        return;
      }
      const item = releaseItems.find((ri) => ri.feedbackId === feedbackId);
      if (item) {
        z.mutate.releaseItem.delete({ id: item.id });
      }
      setSelectedFeedbackIds((prev) => prev.filter((id) => id !== feedbackId));
      z.mutate.release.update({
        id: release.id,
        updatedAt: Date.now(),
      });
    },
    [release, releaseItems, z]
  );

  if (!release) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Release not found</p>
      </div>
    );
  }

  const isPublished = !!release.publishedAt;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header with back button and actions */}
      <div className="flex items-center justify-between">
        <Button asChild className="gap-2" variant="ghost">
          <Link params={{ orgSlug }} to="/dashboard/$orgSlug/changelog">
            <ArrowLeft className="h-4 w-4" />
            Back to Changelog
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {/* Publish/Unpublish toggle */}
          <Button
            className="gap-2"
            onClick={togglePublish}
            variant={isPublished ? "outline" : "default"}
          >
            {isPublished ? (
              <>
                <FileText className="h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Publish
              </>
            )}
          </Button>

          {/* More actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Boolean(org?.isPublic) && isPublished && (
                <>
                  <DropdownMenuItem asChild>
                    <a
                      href={`/${orgSlug}/changelog`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Globe className="mr-2 h-4 w-4" />
                      View Public Page
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Release
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Badge variant={isPublished ? "default" : "secondary"}>
          {isPublished ? "Published" : "Draft"}
        </Badge>
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {isPublished && release.publishedAt
            ? format(new Date(release.publishedAt as number), "MMM d, yyyy")
            : "Not published"}
        </span>
        <span>•</span>
        <span>
          Last updated{" "}
          {format(
            new Date(release.updatedAt as number),
            "MMM d, yyyy 'at' h:mm a"
          )}
        </span>
      </div>

      {/* Main content area - Notion-like */}
      <div className="space-y-6">
        {/* Properties section - above title like Notion */}
        <div className="space-y-3">
          {/* Version badge - click to edit */}
          <div className="flex items-center gap-2">
            {isEditingVersion ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  className="h-8 w-32 font-mono text-sm"
                  onBlur={saveVersion}
                  onChange={(e) => setVersion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      saveVersion();
                    }
                    if (e.key === "Escape") {
                      setVersion((release.version as string) ?? "");
                      setIsEditingVersion(false);
                    }
                  }}
                  placeholder="v1.0.0"
                  value={version}
                />
                <Button onClick={saveVersion} size="sm" variant="ghost">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                className="group flex items-center"
                onClick={() => setIsEditingVersion(true)}
              >
                {version ? (
                  <Badge
                    className="cursor-pointer font-mono hover:bg-accent"
                    variant="outline"
                  >
                    {version}
                  </Badge>
                ) : (
                  <Badge
                    className="cursor-pointer text-muted-foreground hover:bg-accent"
                    variant="outline"
                  >
                    + Add version
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Completed Items - Property row */}
          {org ? (
            <CompletedItemsSection
              onAddAllItems={handleAddAllItems}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              organizationId={org.id}
              selectedFeedbackIds={selectedFeedbackIds}
            />
          ) : null}
        </div>

        {/* Title - click to edit */}
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              className="h-auto border-none px-0 py-2 font-bold text-3xl shadow-none focus-visible:ring-0"
              onBlur={saveTitle}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  saveTitle();
                }
                if (e.key === "Escape") {
                  setTitle(release.title as string);
                  setIsEditingTitle(false);
                }
              }}
              placeholder="Release title"
              value={title}
            />
          </div>
        ) : (
          <button
            className="-mx-2 cursor-text rounded px-2 py-1 text-left font-bold text-3xl transition-colors hover:bg-accent/50"
            onClick={() => setIsEditingTitle(true)}
            type="button"
          >
            {title || "Untitled Release"}
          </button>
        )}

        {/* Description - Markdown editor */}
        <div className="mt-8">
          <MarkdownEditor
            className="min-h-[300px]"
            editorClassName="border-none shadow-none px-0"
            onChange={saveDescription}
            placeholder="Write your release notes here... Press '/' for commands"
            showToolbar={true}
            value={description}
          />
        </div>
      </div>
    </div>
  );
}

// Completed Items Section with Combobox
type CompletedItemsSectionProps = {
  organizationId: string;
  selectedFeedbackIds: string[];
  onAddItem: (feedbackId: string) => void;
  onAddAllItems: (feedbackIds: string[]) => void;
  onRemoveItem: (feedbackId: string) => void;
};

function CompletedItemsSection({
  organizationId,
  selectedFeedbackIds,
  onAddItem,
  onAddAllItems,
  onRemoveItem,
}: CompletedItemsSectionProps) {
  const z = useZero<Schema>();
  const [open, setOpen] = useState(false);

  // Get all boards for this organization
  const [boards] = useQuery(
    z.query.board.where("organizationId", "=", organizationId)
  );

  // Get all completed feedback across all boards
  const [allFeedback] = useQuery(z.query.feedback.related("board"));

  // Filter to only completed items from this org's boards
  const completedItems = useMemo(() => {
    if (!(allFeedback && boards)) {
      return [];
    }
    const boardIds = new Set(boards.map((b) => b.id));
    return allFeedback
      .filter((f) => boardIds.has(f.boardId) && f.completedAt)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  }, [allFeedback, boards]);

  // Items available to add (not yet selected)
  const availableItems = useMemo(
    () =>
      completedItems.filter((item) => !selectedFeedbackIds.includes(item.id)),
    [completedItems, selectedFeedbackIds]
  );

  // Selected items with full details
  const selectedItems = useMemo(
    () =>
      completedItems.filter((item) => selectedFeedbackIds.includes(item.id)),
    [completedItems, selectedFeedbackIds]
  );

  const handleAddAll = () => {
    onAddAllItems(availableItems.map((item) => item.id));
  };

  return (
    <div className="mt-8 space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
              <Button className="gap-2" size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add completed item
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-0">
              <Command>
                <CommandInput placeholder="Search completed items..." />
                <CommandList>
                  <CommandEmpty>No completed items found.</CommandEmpty>
                  <CommandGroup>
                    {availableItems.map((item) => (
                      <CommandItem
                        key={item.id}
                        onSelect={() => {
                          onAddItem(item.id);
                          setOpen(false);
                        }}
                        value={item.title}
                      >
                        <Check className="mr-2 h-4 w-4 text-green-600" />
                        <span className="line-clamp-1">{item.title}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {availableItems.length > 0 && (
            <Button
              className="gap-2"
              onClick={handleAddAll}
              size="sm"
              variant="ghost"
            >
              Add all ({availableItems.length})
            </Button>
          )}
        </div>

        {selectedItems.length > 0 && (
          <span className="text-muted-foreground text-sm">
            {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
        )}
      </div>

      {/* Selected items as badges */}
      {selectedItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedItems.map((item) => (
            <Badge
              className="gap-1.5 py-1.5 pr-1.5 pl-3"
              key={item.id}
              variant="secondary"
            >
              <span className="max-w-[200px] truncate">{item.title}</span>
              <button
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => onRemoveItem(item.id)}
                type="button"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Remove</span>
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No completed items added yet. Select items that were completed in this
          release.
        </p>
      )}
    </div>
  );
}
