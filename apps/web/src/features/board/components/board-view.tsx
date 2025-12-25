"use client";

import { Button } from "@repo/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useZero } from "@rocicorp/zero/react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  List,
  Map as MapIcon,
  Pencil,
  Plus,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { AdminFloatingBar } from "@/components/admin-floating-bar";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { EditableTitle } from "@/components/editable-title";
import { BoardActions } from "@/features/board/components/board-actions";
import { SlugEditDialog } from "@/features/board/components/slug-edit-dialog";
import { FeedbackFilters } from "@/features/feedback/components/feedback-filters";
import { FeedbackListItem } from "@/features/feedback/components/feedback-list-item";
import {
  useBoardData,
  useFeedbackData,
  useFeedbackFilters,
  useSession,
} from "@/features/feedback/hooks/use-feedback-filters";
import { RoadmapKanban } from "@/features/roadmap/components/roadmap-kanban";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";

interface RoadmapFeedbackItem {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  roadmapLane: string | null;
  roadmapOrder: number;
  completedAt: number | null;
}

interface FeedbackForRoadmap {
  id: string;
  title: string;
  description: string;
  status?: string | null;
  voteCount?: number | null;
  roadmapLane?: string | null;
  roadmapOrder?: number | null;
  completedAt?: number | null;
}

function toRoadmapItem(f: FeedbackForRoadmap): RoadmapFeedbackItem {
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    status: f.status ?? "open",
    voteCount: f.voteCount ?? 0,
    roadmapLane: f.roadmapLane ?? null,
    roadmapOrder: f.roadmapOrder ?? 0,
    completedAt: f.completedAt ?? null,
  };
}

interface BoardViewProps {
  /**
   * Whether the current user is an admin/owner of this board
   */
  isAdmin: boolean;
  /**
   * Whether to show admin-only features (editable title, slug, actions)
   * This may differ from isAdmin in cases where we want to show admin view to visitors
   */
  showAdminControls?: boolean;
  /**
   * Custom wrapper classes for the content
   */
  wrapperClassName?: string;
}

/**
 * Unified board view component used by both public and dashboard routes.
 *
 * Features:
 * - List and Roadmap view modes
 * - Feedback filtering
 * - Admin controls (editable title, slug, board actions) when showAdminControls is true
 * - Backlog in roadmap view for admins
 * - Submit feedback button based on permissions
 */
export function BoardView({
  isAdmin,
  showAdminControls = isAdmin,
  wrapperClassName = "wrapper-content",
}: BoardViewProps) {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const zero = useZero();
  const navigate = useNavigate();
  const { openAuthDialog } = useAuthDialog();
  const session = useSession();

  // Check if user is an org member (for showing admin floating bar in public view)
  const { data: authOrganizations } = authClient.useListOrganizations();
  const isOrgMember = authOrganizations?.some((o) => o.slug === orgSlug);

  // Slug edit dialog state
  const [showSlugDialog, setShowSlugDialog] = useState(false);

  // Use shared hooks for filters and data
  const { viewMode, setViewMode, hasFilters } = useFeedbackFilters();
  const { org, board, tags } = useBoardData();
  const { feedbacks, filteredFeedbacks, pinnedFeedbacks, regularFeedbacks } =
    useFeedbackData({ includeUnapproved: isAdmin });

  // Derive roadmap data
  const roadmapLaneTags = tags.filter((t) => t.isRoadmapLane);
  const roadmapItems = feedbacks
    .filter((f) => f.roadmapLane)
    .map(toRoadmapItem)
    .sort((a, b) => a.roadmapOrder - b.roadmapOrder);
  const backlogItems = isAdmin
    ? feedbacks.filter((f) => !f.roadmapLane).map(toRoadmapItem)
    : [];

  // Check if this is a newly created board (has default name)
  const isNewBoard = board?.name === "Untitled Board" && showAdminControls;

  const handleTitleSave = (newName: string) => {
    if (board) {
      zero.mutate(mutators.board.update({ id: board.id, name: newName }));
    }
  };

  const handleSlugSave = (newSlug: string) => {
    if (board) {
      zero.mutate(mutators.board.update({ id: board.id, slug: newSlug }));
      navigate({
        to: showAdminControls
          ? "/dashboard/$orgSlug/$boardSlug"
          : "/$orgSlug/$boardSlug",
        params: { orgSlug, boardSlug: newSlug },
        replace: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {isNewBoard === true && <NewBoardBanner />}

      <div className={wrapperClassName}>
        <BoardHeader
          board={board}
          onSlugClick={() => setShowSlugDialog(true)}
          onTitleSave={handleTitleSave}
          org={org}
          orgSlug={orgSlug}
          setViewMode={setViewMode}
          showAdminControls={showAdminControls}
          viewMode={viewMode}
        />
      </div>

      {viewMode === "list" ? (
        <ListView
          boardSlug={boardSlug}
          filteredFeedbacks={filteredFeedbacks}
          hasFilters={hasFilters}
          isAdmin={isAdmin}
          openAuthDialog={openAuthDialog}
          orgSlug={orgSlug}
          pinnedFeedbacks={pinnedFeedbacks}
          regularFeedbacks={regularFeedbacks}
          session={session}
          wrapperClassName={wrapperClassName}
        />
      ) : (
        <RoadmapView
          backlogItems={backlogItems}
          board={board}
          isAdmin={isAdmin}
          org={org}
          roadmapItems={roadmapItems}
          roadmapLaneTags={roadmapLaneTags}
          wrapperClassName={wrapperClassName}
        />
      )}

      {/* Show admin floating bar for org members viewing public page */}
      {!showAdminControls && isOrgMember === true ? (
        <div className={wrapperClassName}>
          <AdminFloatingBar
            dashboardLink={{
              to: "/dashboard/$orgSlug/$boardSlug",
              params: { orgSlug, boardSlug },
            }}
            message="You're viewing the public page"
          />
        </div>
      ) : null}

      {board !== undefined && showAdminControls && (
        <SlugEditDialog
          currentSlug={board.slug}
          onOpenChange={setShowSlugDialog}
          onSave={handleSlugSave}
          open={showSlugDialog}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

function NewBoardBanner() {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium">Welcome to your new board!</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Get started by customizing your board:
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Pencil className="h-4 w-4 text-muted-foreground" />
              <span>Click the title above to rename your board</span>
            </li>
            <li className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Use the menu (⋮) to edit description and visibility</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface BoardType {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean | null;
  settings: {
    allowAnonymousVoting?: boolean;
    requireApproval?: boolean;
    defaultStatus?: string;
  } | null;
  createdAt: number;
  updatedAt: number;
}

interface OrgType {
  id: string;
  isPublic?: boolean | null;
}

function BoardHeader({
  board,
  org,
  orgSlug,
  viewMode,
  setViewMode,
  onTitleSave,
  onSlugClick,
  showAdminControls,
}: {
  board: BoardType | undefined;
  org: OrgType | undefined;
  orgSlug: string;
  viewMode: "list" | "roadmap";
  setViewMode: (mode: "list" | "roadmap") => void;
  onTitleSave: (name: string) => void;
  onSlugClick: () => void;
  showAdminControls: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        {showAdminControls && (
          <Link
            className="text-muted-foreground hover:text-foreground"
            params={{ orgSlug }}
            to="/dashboard/$orgSlug"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        <div>
          {showAdminControls ? (
            <>
              <EditableTitle onSave={onTitleSave} value={board?.name ?? ""} />
              <button
                className="mt-1 text-muted-foreground text-sm hover:text-foreground hover:underline"
                onClick={onSlugClick}
                type="button"
              >
                /{orgSlug}/{board?.slug}
              </button>
            </>
          ) : (
            <h1 className="font-bold text-2xl">{board?.name}</h1>
          )}
          {board?.description ? (
            <p className="mt-1 text-muted-foreground">{board.description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ToggleGroup
          className="rounded-md border"
          onValueChange={(values) => {
            const value = values[0];
            if (value) {
              setViewMode(value as "list" | "roadmap");
            }
          }}
          value={[viewMode]}
        >
          <ToggleGroupItem aria-label="List view" className="px-3" value="list">
            <List className="mr-1 h-4 w-4" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem
            aria-label="Roadmap view"
            className="px-3"
            value="roadmap"
          >
            <MapIcon className="mr-1 h-4 w-4" />
            Roadmap
          </ToggleGroupItem>
        </ToggleGroup>

        {showAdminControls &&
          board?.isPublic === true &&
          org?.isPublic === true && (
            <Button
              render={
                <Link
                  params={{ orgSlug, boardSlug: board.slug }}
                  to="/$orgSlug/$boardSlug"
                />
              }
              variant="outline"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public
            </Button>
          )}

        {showAdminControls && board !== undefined && org !== undefined ? (
          <BoardActions
            board={board}
            organizationId={org.id}
            orgSlug={orgSlug}
          />
        ) : null}
      </div>
    </div>
  );
}

type FeedbackItem = ReturnType<
  typeof useFeedbackData
>["filteredFeedbacks"][number];

type SessionData = {
  user?: {
    id: string;
  } | null;
} | null;

function ListView({
  orgSlug,
  boardSlug,
  filteredFeedbacks,
  pinnedFeedbacks,
  regularFeedbacks,
  hasFilters,
  session,
  isAdmin,
  openAuthDialog,
  wrapperClassName,
}: {
  orgSlug: string;
  boardSlug: string;
  filteredFeedbacks: FeedbackItem[];
  pinnedFeedbacks: FeedbackItem[];
  regularFeedbacks: FeedbackItem[];
  hasFilters: boolean;
  session: SessionData;
  isAdmin: boolean;
  openAuthDialog: () => void;
  wrapperClassName: string;
}) {
  // In admin mode, hide the submit button from filters (it's handled elsewhere)
  // In public mode, show the submit button
  const showSubmitInFilters = !isAdmin;

  return (
    <div className={`${wrapperClassName} space-y-6`}>
      <FeedbackFilters showSubmitButton={showSubmitInFilters} />

      <p className="text-muted-foreground text-sm">
        {filteredFeedbacks.length} feedback item
        {filteredFeedbacks.length !== 1 ? "s" : ""}
      </p>

      <div className="space-y-3">
        {pinnedFeedbacks.map((feedback) => (
          <FeedbackListItem
            boardSlug={boardSlug}
            feedback={feedback}
            key={feedback.id}
            orgSlug={orgSlug}
          />
        ))}

        {regularFeedbacks.map((feedback) => (
          <FeedbackListItem
            boardSlug={boardSlug}
            feedback={feedback}
            key={feedback.id}
            orgSlug={orgSlug}
          />
        ))}

        {filteredFeedbacks.length === 0 ? (
          <EmptyState
            boardSlug={boardSlug}
            hasFilters={hasFilters}
            isAdmin={isAdmin}
            openAuthDialog={openAuthDialog}
            orgSlug={orgSlug}
            session={session}
          />
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({
  hasFilters,
  session,
  orgSlug,
  boardSlug,
  isAdmin,
  openAuthDialog,
}: {
  hasFilters: boolean;
  session: SessionData;
  orgSlug: string;
  boardSlug: string;
  isAdmin: boolean;
  openAuthDialog: () => void;
}) {
  const renderButton = () => {
    // Admins can always submit
    if (isAdmin || session !== null) {
      return (
        <Button
          render={
            <Link
              params={{ orgSlug, boardSlug }}
              to="/$orgSlug/$boardSlug/new"
            />
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Submit Feedback
        </Button>
      );
    }
    if (hasFilters) {
      return null;
    }
    return (
      <Button onClick={openAuthDialog} variant="outline">
        Sign In to Submit Feedback
      </Button>
    );
  };

  const getEmptyMessage = () => {
    if (hasFilters) {
      return "No feedback matches your filters";
    }
    if (isAdmin) {
      return "No feedback yet";
    }
    return "No feedback yet. Be the first to share your ideas!";
  };

  return (
    <div className="rounded-lg border bg-muted/30 py-12 text-center">
      <p className="mb-4 text-muted-foreground">{getEmptyMessage()}</p>
      {renderButton()}
    </div>
  );
}

interface TagType {
  id: string;
  name: string;
  color: string;
  organizationId: string;
  isDoneStatus: boolean | null;
  isRoadmapLane: boolean | null;
  laneOrder: number | null;
  createdAt: number;
}

function RoadmapView({
  board,
  org,
  roadmapItems,
  backlogItems,
  roadmapLaneTags,
  isAdmin,
  wrapperClassName,
}: {
  board: BoardType | undefined;
  org: OrgType | undefined;
  roadmapItems: RoadmapFeedbackItem[];
  backlogItems: RoadmapFeedbackItem[];
  roadmapLaneTags: TagType[];
  isAdmin: boolean;
  wrapperClassName: string;
}) {
  const navigate = useNavigate();
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };

  // Handle adding a new item to a specific lane
  const handleAddItem = (laneId: string) => {
    // Navigate to the new feedback page with lane pre-selected
    // The lane ID is passed as a query param so the form can pre-set the roadmap lane
    navigate({
      to: "/$orgSlug/$boardSlug/new",
      params: { orgSlug, boardSlug },
      search: { lane: laneId },
    });
  };

  return (
    <div className={`${wrapperClassName} space-y-6`}>
      <RoadmapKanban
        backlogItems={isAdmin ? backlogItems : undefined}
        boardId={board?.id ?? ""}
        customLanes={roadmapLaneTags.length > 0 ? roadmapLaneTags : undefined}
        isAdmin={isAdmin}
        items={roadmapItems}
        onAddItem={isAdmin ? handleAddItem : undefined}
        organizationId={org?.id}
      />

      {roadmapItems.length === 0 &&
        (isAdmin ? backlogItems.length === 0 : true) && (
          <div className="rounded-lg border bg-muted/30 py-12 text-center">
            <p className="text-muted-foreground">
              {isAdmin
                ? "No feedback yet. Create feedback items and drag them from the backlog to the roadmap."
                : "No items on the roadmap yet."}
            </p>
          </div>
        )}
    </div>
  );
}
