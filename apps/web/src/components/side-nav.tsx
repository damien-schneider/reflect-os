import { useState } from "react";
import { Link, useParams, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Layers,
  Settings,
  Users,
  Tags,
  Plus,
  Bell,
  User,
  Building2,
  Menu,
  X,
  Globe,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { ThemeToggle } from "./theme-toggle";
import { authClient } from "../lib/auth-client";
import { useIsMobile } from "../hooks/use-mobile";
import { cn } from "../lib/utils";
import type { Schema, Board, Organization } from "../schema";

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
  const isAccountPage = pathname === "/my-account";

  // Get current organization (or first one if not on org page)
  const currentOrg = organizations?.find((o) => o.slug === orgSlug) ?? organizations?.[0];
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

  const navContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 font-semibold text-lg p-0 h-auto hover:bg-transparent">
              <Building2 className="h-5 w-5" />
              <span className="truncate max-w-[140px]">{currentOrg?.name ?? "Select Org"}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {organizations?.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => navigate({ to: "/dashboard/$orgSlug", params: { orgSlug: org.slug } })}
                className={cn(org.slug === effectiveOrgSlug && "bg-accent")}
              >
                {org.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/my-account" })}>
              <Settings className="h-4 w-4 mr-2" />
              Organization Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={onToggle}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* Show org navigation only when an org is available */}
        {effectiveOrgSlug ? (
          <>
            {/* Dashboard */}
            <Link
              to="/dashboard/$orgSlug"
              params={{ orgSlug: effectiveOrgSlug }}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                !boardSlug && !isAccountPage && pathname === `/dashboard/${effectiveOrgSlug}` && "bg-accent text-accent-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            {/* Public View Section */}
            <PublicViewSection 
              org={orgData} 
              boards={boards ?? []} 
              orgSlug={effectiveOrgSlug} 
            />

            {/* Boards Section */}
            <div className="pt-4">
              <button
                onClick={() => setBoardsExpanded(!boardsExpanded)}
                className="flex items-center gap-2 px-3 py-1 w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {boardsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <Layers className="h-3 w-3" />
                Boards
              </button>
              {boardsExpanded && (
                <div className="mt-1 space-y-1">
                  {(boards ?? []).map((board) => (
                    <BoardNavItem
                      key={board.id}
                      board={board}
                      orgSlug={effectiveOrgSlug}
                      isActive={boardSlug === board.slug}
                    />
                  ))}
                  {(boards ?? []).length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No boards yet</p>
                  )}
                  <Link
                    to="/dashboard/$orgSlug/boards"
                    params={{ orgSlug: effectiveOrgSlug }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                    Add board
                  </Link>
                </div>
              )}
            </div>

            {/* Admin Section */}
            <div className="pt-6">
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin
              </div>
              <div className="mt-1 space-y-1">
                <Link
                  to="/dashboard/$orgSlug/boards"
                  params={{ orgSlug: effectiveOrgSlug }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Manage Boards
                </Link>
                <Link
                  to="/dashboard/$orgSlug/tags"
                  params={{ orgSlug: effectiveOrgSlug }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Tags className="h-4 w-4" />
                  Tags
                </Link>
                <Link
                  to="/dashboard/$orgSlug/changelog"
                  params={{ orgSlug: effectiveOrgSlug }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <FileText className="h-4 w-4" />
                  Changelog
                </Link>
                <Link
                  to="/dashboard/$orgSlug/users"
                  params={{ orgSlug: effectiveOrgSlug }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Users className="h-4 w-4" />
                  Users
                </Link>
                <Link
                  to="/dashboard/$orgSlug/settings"
                  params={{ orgSlug: effectiveOrgSlug }}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>
            </div>
          </>
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            <p>No organizations yet.</p>
            <Link
              to="/my-account"
              className="text-primary hover:underline"
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
            to="/my-account"
            className={cn(
              "flex items-center gap-2 p-0 h-auto rounded-md transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isAccountPage && "bg-accent text-accent-foreground"
            )}
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium truncate max-w-[100px]">
                {session?.user?.name ?? "User"}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
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
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="fixed top-4 left-4 z-40 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onToggle}
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out md:hidden",
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
    <aside className="hidden md:flex w-64 border-r bg-background flex-col h-screen sticky top-0">
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
      to="/dashboard/$orgSlug/$boardSlug"
      params={{ orgSlug, boardSlug: board.slug }}
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <span className="truncate">{board.name}</span>
      {!board.isPublic && (
        <Badge variant="outline" className="text-[10px] px-1">
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
      <div className="mt-2 mx-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <EyeOff className="h-4 w-4" />
          <span className="text-xs font-medium">Not Published</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Your organization is not visible to the public yet.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() => navigate({ to: "/dashboard/$orgSlug/settings", params: { orgSlug } })}
        >
          <Globe className="h-3 w-3 mr-1" />
          Publish Organization
        </Button>
      </div>
    );
  }

  // If org is public but no boards are public
  if (publicBoards.length === 0) {
    return (
      <div className="mt-2 mx-2 p-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
          <Eye className="h-4 w-4" />
          <span className="text-xs font-medium">Partially Published</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Organization is public but no boards are visible yet.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() => navigate({ to: "/dashboard/$orgSlug/boards", params: { orgSlug } })}
        >
          <Globe className="h-3 w-3 mr-1" />
          Publish a Board
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
            href={`/${orgSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            )}
          >
            <Globe className="h-4 w-4" />
            View Public Page
            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
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
