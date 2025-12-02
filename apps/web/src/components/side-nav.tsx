import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  Link,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Layers,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  Tags,
  User,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/utils";
import { randID } from "../rand";
import type { Board, Organization, Schema } from "../schema";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Separator } from "./ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface SideNavProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SideNav({ isOpen, onToggle }: SideNavProps) {
  const isMobile = useIsMobile();
  const { orgSlug, boardSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const z = useZero<Schema>();
  const { data: session } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();

  // Check if we're on dashboard routes
  // Navigation is displayed when on dashboard routes
  const isAccountPage = pathname === "/dashboard/account";

  // Get current organization (or first one if not on org page)
  const currentOrg =
    organizations?.find((o) => o.slug === orgSlug) ?? organizations?.[0];
  const effectiveOrgSlug = orgSlug ?? currentOrg?.slug ?? "";

  // Query organization from Zero to get full data including isPublic
  const [orgs] = useQuery(
    z.query.organization.where("id", "=", currentOrg?.id ?? "")
  );
  const orgData = orgs?.[0];

  // Query boards for current organization
  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", currentOrg?.id ?? "")
      .related("organization")
  );

  // Query unread notifications count
  const [notifications] = useQuery(
    z.query.notification
      .where("userId", "=", session?.user?.id ?? "")
      .where("isRead", "=", false)
  );

  const unreadCount = notifications?.length ?? 0;

  const [boardsExpanded, setBoardsExpanded] = useState(true);

  const handleCreateBoard = () => {
    if (!currentOrg?.id) {
      return;
    }
    const boardId = randID();
    const slug = `board-${randID()}`;
    z.mutate.board.insert({
      id: boardId,
      name: "Untitled Board",
      slug,
      description: "",
      isPublic: false,
      organizationId: currentOrg.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    navigate({
      to: "/dashboard/$orgSlug/$boardSlug",
      params: { orgSlug: effectiveOrgSlug, boardSlug: slug },
    });
  };

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-auto gap-2 p-0 font-semibold text-lg hover:bg-transparent"
              variant="ghost"
            >
              <Building2 className="h-5 w-5" />
              <span className="max-w-[140px] truncate">
                {currentOrg?.name ?? "Select Org"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {organizations?.map((org) => (
              <DropdownMenuItem
                className={cn(org.slug === effectiveOrgSlug && "bg-accent")}
                key={org.id}
                onClick={() =>
                  navigate({
                    to: "/dashboard/$orgSlug",
                    params: { orgSlug: org.slug },
                  })
                }
              >
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate({ to: "/dashboard/account" })}
            >
              <Settings className="mr-2 h-4 w-4" />
              Organization Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {isMobile && (
          <Button onClick={onToggle} size="icon" variant="ghost">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {/* Show org navigation only when an org is available */}
        {effectiveOrgSlug ? (
          <>
            {/* Dashboard */}
            <Link
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                !(boardSlug || isAccountPage) &&
                  pathname === `/dashboard/${effectiveOrgSlug}` &&
                  "bg-accent text-accent-foreground"
              )}
              params={{ orgSlug: effectiveOrgSlug }}
              to="/dashboard/$orgSlug"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            {/* Public View Section */}
            <PublicViewSection
              boards={boards ?? []}
              org={orgData}
              orgSlug={effectiveOrgSlug}
            />

            {/* Boards Section */}
            <div className="pt-4">
              <button
                className="flex w-full items-center gap-2 px-3 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider hover:text-foreground"
                onClick={() => setBoardsExpanded(!boardsExpanded)}
              >
                {boardsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Layers className="h-3 w-3" />
                Boards
              </button>
              {boardsExpanded && (
                <div className="mt-1 space-y-1">
                  {(boards ?? []).map((board) => (
                    <BoardNavItem
                      board={board}
                      isActive={boardSlug === board.slug}
                      key={board.id}
                      orgSlug={effectiveOrgSlug}
                    />
                  ))}
                  {(boards ?? []).length === 0 && (
                    <p className="px-3 py-2 text-muted-foreground text-xs">
                      No boards yet
                    </p>
                  )}
                  <button
                    className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground"
                    onClick={handleCreateBoard}
                    type="button"
                  >
                    <Plus className="h-3 w-3" />
                    Add board
                  </button>
                </div>
              )}
            </div>

            {/* Admin Section */}
            <div className="pt-6">
              <div className="px-3 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                Admin
              </div>
              <div className="mt-1 space-y-1">
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  params={{ orgSlug: effectiveOrgSlug }}
                  to="/dashboard/$orgSlug/tags"
                >
                  <Tags className="h-4 w-4" />
                  Tags
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  params={{ orgSlug: effectiveOrgSlug }}
                  to="/dashboard/$orgSlug/changelog"
                >
                  <FileText className="h-4 w-4" />
                  Changelog
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  params={{ orgSlug: effectiveOrgSlug }}
                  to="/dashboard/$orgSlug/users"
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                <Link
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  params={{ orgSlug: effectiveOrgSlug }}
                  to="/dashboard/$orgSlug/settings"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="px-3 py-4 text-muted-foreground text-sm">
            <p>No organizations yet.</p>
            <Link
              className="text-primary hover:underline"
              to="/dashboard/account"
            >
              Create one
            </Link>
          </div>
        )}
      </nav>

      <Separator />

      {/* User Section */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <Link
            className={cn(
              "flex h-auto items-center gap-2 rounded-md p-0 transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isAccountPage && "bg-accent text-accent-foreground"
            )}
            to="/dashboard/account"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="max-w-[100px] truncate font-medium text-sm">
                {session?.user?.name ?? "User"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="relative" size="icon" variant="ghost">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      className="-top-1 -right-1 absolute flex h-4 w-4 items-center justify-center p-0 text-[10px]"
                      variant="destructive"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>

            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile: slide-out drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile toggle button */}
        <Button
          className="fixed top-4 left-4 z-40 md:hidden"
          onClick={onToggle}
          size="icon"
          variant="ghost"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={onToggle}
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {navContent}
        </aside>
      </>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-background md:flex">
      {navContent}
    </aside>
  );
}

function BoardNavItem({
  board,
  orgSlug,
  isActive,
}: {
  board: Board;
  orgSlug: string;
  isActive: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
      params={{ orgSlug, boardSlug: board.slug }}
      to="/dashboard/$orgSlug/$boardSlug"
    >
      <span className="truncate">{board.name}</span>
      {!board.isPublic && (
        <Badge className="px-1 text-[10px]" variant="outline">
          Private
        </Badge>
      )}
    </Link>
  );
}

function PublicViewSection({
  org,
  boards,
  orgSlug,
}: {
  org: Organization | undefined;
  boards: Board[];
  orgSlug: string;
}) {
  const navigate = useNavigate();

  // Check if org is published and has any public boards
  const isOrgPublic = org?.isPublic ?? false;
  const publicBoards = boards.filter((b) => b.isPublic);

  // If org is not public, show a publish CTA
  if (!isOrgPublic) {
    return (
      <div className="mx-2 mt-2 rounded-lg border border-muted-foreground/30 border-dashed bg-muted/30 p-3">
        <div className="mb-2 flex items-center gap-2 text-muted-foreground">
          <EyeOff className="h-4 w-4" />
          <span className="font-medium text-xs">Not Published</span>
        </div>
        <p className="mb-3 text-muted-foreground text-xs">
          Your organization is not visible to the public yet.
        </p>
        <Button
          className="w-full text-xs"
          onClick={() =>
            navigate({
              to: "/dashboard/$orgSlug/settings",
              params: { orgSlug },
            })
          }
          size="sm"
          variant="outline"
        >
          <Globe className="mr-1 h-3 w-3" />
          Publish Organization
        </Button>
      </div>
    );
  }

  // If org is public but no boards are public
  if (publicBoards.length === 0) {
    return (
      <div className="mx-2 mt-2 rounded-lg border border-amber-500/30 border-dashed bg-amber-500/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Eye className="h-4 w-4" />
          <span className="font-medium text-xs">Partially Published</span>
        </div>
        <p className="mb-3 text-muted-foreground text-xs">
          Organization is public but no boards are visible yet.
        </p>
        <Button
          className="w-full text-xs"
          onClick={() =>
            navigate({ to: "/dashboard/$orgSlug", params: { orgSlug } })
          }
          size="sm"
          variant="outline"
        >
          <Globe className="mr-1 h-3 w-3" />
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // If everything is published, show the view public page button
  return (
    <div className="mt-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            href={`/${orgSlug}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            <Globe className="h-4 w-4" />
            View Public Page
            <Badge className="ml-auto px-1.5 text-[10px]" variant="secondary">
              {publicBoards.length}
            </Badge>
          </a>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Open public page in new tab</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
