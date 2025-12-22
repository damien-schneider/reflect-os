import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@repo/ui/components/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
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
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { MarkdownEditor } from "@/features/editor/components/markdown-editor";
import {
  useNextVersion,
  type VersionIncrement,
} from "@/hooks/use-next-version";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import type { Organization, ReleaseItem } from "@/schema";

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
  const zero = useZero();

  // Get organization
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0] as Organization | undefined;

  // Get release with related items
  const [releases] = useQuery(
    queries.release.byIdWithItemsAndFeedback({ id: releaseId })
  );
  const release = releases?.[0];

  // Local state for inline editing
  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

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
  const saveTitle = () => {
    if (!(release && title.trim())) {
      return;
    }
    zero.mutate(
      mutators.release.update({
        id: release.id,
        title: title.trim(),
        updatedAt: Date.now(),
      })
    );
    setIsEditingTitle(false);
  };

  const saveVersion = () => {
    if (!release) {
      return;
    }
    zero.mutate(
      mutators.release.update({
        id: release.id,
        version: version.trim() || undefined,
        updatedAt: Date.now(),
      })
    );
  };

  const saveDescription = (markdown: string) => {
    if (!release) {
      return;
    }
    setDescription(markdown);
    zero.mutate(
      mutators.release.update({
        id: release.id,
        description: markdown || undefined,
        updatedAt: Date.now(),
      })
    );
  };

  const togglePublish = () => {
    if (!release) {
      return;
    }
    const now = Date.now();
    zero.mutate(
      mutators.release.update({
        id: release.id,
        publishedAt: release.publishedAt ? null : now,
        updatedAt: now,
      })
    );
  };

  const handleDelete = () => {
    if (!release) {
      return;
    }
    if (!confirm(`Delete "${release.title}"? This cannot be undone.`)) {
      return;
    }

    // Delete release items first
    for (const item of releaseItems) {
      zero.mutate(mutators.releaseItem.delete({ id: item.id }));
    }
    // Then delete the release
    zero.mutate(mutators.release.delete({ id: release.id }));

    navigate({
      to: "/dashboard/$orgSlug/changelog",
      params: { orgSlug },
    });
  };

  // Add a single item to the release
  const handleAddItem = (feedbackId: string) => {
    if (!release) {
      return;
    }
    // Skip if already added
    if (selectedFeedbackIds.includes(feedbackId)) {
      return;
    }

    const now = Date.now();
    zero.mutate(
      mutators.releaseItem.insert({
        id: crypto.randomUUID(),
        releaseId: release.id,
        feedbackId,
        createdAt: now,
      })
    );
    setSelectedFeedbackIds((prev) => [...prev, feedbackId]);
    zero.mutate(
      mutators.release.update({
        id: release.id,
        updatedAt: now,
      })
    );
  };

  // Add all available items to the release
  const handleAddAllItems = (feedbackIds: string[]) => {
    if (!release) {
      return;
    }
    const now = Date.now();

    // Only add items that aren't already selected
    const newIds = feedbackIds.filter(
      (id) => !selectedFeedbackIds.includes(id)
    );
    for (const feedbackId of newIds) {
      zero.mutate(
        mutators.releaseItem.insert({
          id: crypto.randomUUID(),
          releaseId: release.id,
          feedbackId,
          createdAt: now,
        })
      );
    }

    setSelectedFeedbackIds((prev) => [...prev, ...newIds]);
    zero.mutate(
      mutators.release.update({
        id: release.id,
        updatedAt: now,
      })
    );
  };

  // Remove an item from the release
  const handleRemoveItem = (feedbackId: string) => {
    if (!release) {
      return;
    }
    const item = releaseItems.find((ri) => ri.feedbackId === feedbackId);
    if (item) {
      zero.mutate(mutators.releaseItem.delete({ id: item.id }));
    }
    setSelectedFeedbackIds((prev) => prev.filter((id) => id !== feedbackId));
    zero.mutate(
      mutators.release.update({
        id: release.id,
        updatedAt: Date.now(),
      })
    );
  };

  if (!release) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Release not found</p>
      </div>
    );
  }

  const isPublished = !!release.publishedAt;

  return (
    <div className="">
      {/* Header with back button and actions */}
      <div className="wrapper-content flex items-center justify-between">
        <Button
          className="gap-2"
          render={
            <Link params={{ orgSlug }} to="/dashboard/$orgSlug/changelog" />
          }
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Changelog
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
            <DropdownMenuTrigger
              render={<Button size="icon" variant="outline" />}
            >
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Boolean(org?.isPublic) && isPublished && (
                <>
                  <DropdownMenuItem
                    render={
                      // biome-ignore lint/a11y/useAnchorContent: content is provided via render prop children, aria-label provides accessibility
                      <a
                        aria-label="View Public Page"
                        href={`/${orgSlug}/changelog`}
                        rel="noopener noreferrer"
                        target="_blank"
                      />
                    }
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    View Public Page
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
      <div className="wrapper-content flex items-center gap-3 text-muted-foreground text-sm">
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
      <div className="wrapper-content space-y-6">
        {/* Properties section - above title like Notion */}
        <div className="space-y-3">
          {/* Version badge - click to edit */}
          {org ? (
            <VersionEditor
              onSave={saveVersion}
              organizationId={org.id}
              setVersion={setVersion}
              version={version}
            />
          ) : null}

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
      </div>

      {/* Description - Markdown editor (outside wrapper-content for proper full-width behavior) */}
      <MarkdownEditor
        editorClassName=""
        onChange={saveDescription}
        showToolbar={true}
        value={description}
      />
    </div>
  );
}

// Version Editor Component with auto-versioning support
type VersionEditorProps = {
  organizationId: string;
  version: string;
  setVersion: (version: string) => void;
  onSave: () => void;
};

function VersionEditor({
  organizationId,
  version,
  setVersion,
  onSave,
}: VersionEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIncrement, setSelectedIncrement] =
    useState<VersionIncrement>("patch");

  const {
    autoVersioningEnabled,
    defaultIncrement,
    getNextVersion,
    latestVersionString,
  } = useNextVersion(organizationId);

  // Sync selected increment with default from settings
  useEffect(() => {
    setSelectedIncrement(defaultIncrement);
  }, [defaultIncrement]);

  const handleSave = () => {
    onSave();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const applyVersion = (newVersion: string) => {
    setVersion(newVersion);
    onSave();
    setIsEditing(false);
  };

  // If already has a version, show it with edit option
  if (version && !isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          className="cursor-pointer font-mono hover:bg-accent"
          onClick={() => setIsEditing(true)}
          variant="outline"
        >
          {version}
        </Badge>
        <Button
          className="h-6 w-6 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100"
          onClick={() => setIsEditing(true)}
          size="icon"
          variant="ghost"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // Editing mode or no version yet
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          className="h-8 w-32 font-mono text-sm"
          onBlur={handleSave}
          onChange={(e) => setVersion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSave();
            }
            if (e.key === "Escape") {
              handleCancel();
            }
          }}
          placeholder="v1.0.0"
          value={version}
        />
        <Button onClick={handleSave} size="sm" variant="ghost">
          <Check className="h-4 w-4" />
        </Button>
        <Button onClick={handleCancel} size="sm" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // No version - show add version UI
  // If auto-versioning is enabled, show quick version buttons
  if (autoVersioningEnabled) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Version:</span>
          <ToggleGroup
            onValueChange={(values) => {
              const value = values[0];
              if (value) {
                setSelectedIncrement(value as VersionIncrement);
              }
            }}
            value={[selectedIncrement]}
          >
            <ToggleGroupItem size="sm" value="patch">
              Patch
            </ToggleGroupItem>
            <ToggleGroupItem size="sm" value="minor">
              Minor
            </ToggleGroupItem>
            <ToggleGroupItem size="sm" value="major">
              Major
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            className="gap-1.5 font-mono"
            onClick={() => applyVersion(getNextVersion(selectedIncrement))}
            size="sm"
            variant="default"
          >
            <Check className="h-3 w-3" />
            {getNextVersion(selectedIncrement)}
          </Button>
          <Button onClick={() => setIsEditing(true)} size="sm" variant="ghost">
            <Pencil className="mr-1 h-3 w-3" />
            Custom
          </Button>
        </div>
        {latestVersionString && (
          <p className="text-muted-foreground text-xs">
            Latest: <span className="font-mono">{latestVersionString}</span>
          </p>
        )}
      </div>
    );
  }

  // Auto-versioning disabled - show simple add button
  return (
    <Button
      className="group flex items-center"
      onClick={() => setIsEditing(true)}
      variant="ghost"
    >
      <Badge
        className="cursor-pointer text-muted-foreground hover:bg-accent"
        variant="outline"
      >
        + Add version
      </Badge>
    </Button>
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
  const [open, setOpen] = useState(false);

  // Get all boards for this organization
  const [boards] = useQuery(queries.board.byOrganizationId({ organizationId }));

  // Get all completed feedback across all boards
  const [allFeedback] = useQuery(queries.feedback.withRelations({}));

  // Filter to only completed items from this org's boards
  const completedItems = (() => {
    if (!(allFeedback && boards)) {
      return [];
    }
    const boardIds = new Set(boards.map((b) => b.id));
    return allFeedback
      .filter((f) => boardIds.has(f.boardId) && f.completedAt)
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  })();

  // Items available to add (not yet selected)
  const availableItems = completedItems.filter(
    (item) => !selectedFeedbackIds.includes(item.id)
  );

  // Selected items with full details
  const selectedItems = completedItems.filter((item) =>
    selectedFeedbackIds.includes(item.id)
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
            <PopoverTrigger
              render={<Button className="gap-2" size="sm" variant="outline" />}
            >
              <Plus className="h-4 w-4" />
              Add completed item
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
