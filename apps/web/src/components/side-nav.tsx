import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Separator } from "@repo/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
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
  CreditCard,
  Crown,
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
import { ThemeToggle } from "@/components/theme-toggle";
import { useLimitCheck } from "@/features/subscription";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";
import type { Board, Organization } from "@/schema";

type SideNavProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function SideNav({ isOpen, onToggle }: SideNavProps) {
  const isMobile = useIsMobile();

  // Mobile: slide-out drawer
  if (isMobile) {
    return <MobileSideNav isOpen={isOpen} onToggle={onToggle} />;
  }

  // Desktop: fixed sidebar
  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r bg-background md:flex">
      <SideNavContent onToggle={onToggle} showMobileCloseButton={false} />
    </aside>
  );
}

function MobileSideNav({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
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
      {isOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onToggle}
          type="button"
        />
      ) : null}

      {/* Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-background transition-transform duration-200 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SideNavContent onToggle={onToggle} showMobileCloseButton />
      </aside>
    </>
  );
}

function SideNavContent({
  onToggle,
  showMobileCloseButton,
}: {
  onToggle: () => void;
  showMobileCloseButton: boolean;
}) {
  const { orgSlug, boardSlug } = useParams({ strict: false });
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { data: session } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();

  const isAccountPage = pathname === "/dashboard/account";

  const currentOrg =
    organizations?.find((o) => o.slug === orgSlug) ?? organizations?.[0];
  const effectiveOrgSlug = orgSlug ?? currentOrg?.slug ?? "";

  const [orgs] = useQuery(
    queries.organization.byId({ id: currentOrg?.id ?? "" })
  );
  const orgData = orgs?.[0];

  const [boards] = useQuery(
    queries.board.byOrganizationId({ organizationId: currentOrg?.id ?? "" })
  );

  const [notifications] = useQuery(
    queries.notification.unreadByUserId({ userId: session?.user?.id ?? "" })
  );

  const unreadCount = notifications?.length ?? 0;

  return (
    <div className="flex h-full flex-col">
      <SideNavHeader
        onToggle={onToggle}
        showMobileCloseButton={showMobileCloseButton}
      />

      <Separator />

      <MainNavigation
        boardSlug={boardSlug}
        boards={boards ?? []}
        currentOrgId={currentOrg?.id}
        effectiveOrgSlug={effectiveOrgSlug}
        isAccountPage={isAccountPage}
        navigate={navigate}
        pathname={pathname}
      />

      <Separator />

      {effectiveOrgSlug !== "" ? (
        <PublicViewSection
          boards={boards ?? []}
          org={orgData}
          orgSlug={effectiveOrgSlug}
        />
      ) : null}

      <OrgSelector
        currentOrg={currentOrg}
        effectiveOrgSlug={effectiveOrgSlug}
        navigate={navigate}
        organizations={organizations ?? []}
      />

      <Separator />

      <UserSection
        isAccountPage={isAccountPage}
        session={session}
        unreadCount={unreadCount}
      />
    </div>
  );
}

function SideNavHeader({
  onToggle,
  showMobileCloseButton,
}: {
  onToggle: () => void;
  showMobileCloseButton: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="font-semibold text-lg">Dashboard</span>
      {showMobileCloseButton ? (
        <Button onClick={onToggle} size="icon" type="button" variant="ghost">
          <X className="h-5 w-5" />
        </Button>
      ) : null}
    </div>
  );
}

type NavigateFunction = ReturnType<typeof useNavigate>;

function MainNavigation({
  effectiveOrgSlug,
  boardSlug,
  pathname,
  isAccountPage,
  boards,
  currentOrgId,
  navigate,
}: {
  effectiveOrgSlug: string;
  boardSlug: string | undefined;
  pathname: string;
  isAccountPage: boolean;
  boards: Board[];
  currentOrgId: string | undefined;
  navigate: NavigateFunction;
}) {
  const [boardsExpanded, setBoardsExpanded] = useState(true);
  const zero = useZero();

  // Check board limit (client-side for UI feedback)
  const boardCount = boards.length;
  const { isLimitReached } = useLimitCheck(boardCount, "boards");

  const handleCreateBoard = () => {
    if (!currentOrgId || isLimitReached) {
      return;
    }

    const boardId = randID();
    const slug = `board-${boardId}`;
    const now = Date.now();

    // Use optimistic insert - server validates via push endpoint
    // If server rejects (limit reached), Zero will auto-rollback
    zero.mutate(
      mutators.board.insert({
        id: boardId,
        organizationId: currentOrgId,
        name: "Untitled Board",
        slug,
        description: "",
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      })
    );

    // Navigate immediately (optimistic)
    navigate({
      to: "/dashboard/$orgSlug/$boardSlug",
      params: { orgSlug: effectiveOrgSlug, boardSlug: slug },
    });
  };

  if (effectiveOrgSlug === "") {
    return (
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <div className="px-3 py-4 text-muted-foreground text-sm">
          <p>No organizations yet.</p>
          <Link
            className="text-primary hover:underline"
            to="/dashboard/account"
          >
            Create one
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-2">
      {/* Dashboard */}
      <Link
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          !(boardSlug || isAccountPage) &&
            pathname === `/dashboard/${effectiveOrgSlug}`
            ? "bg-accent text-accent-foreground"
            : undefined
        )}
        params={{ orgSlug: effectiveOrgSlug }}
        to="/dashboard/$orgSlug"
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>

      {/* Boards Section */}
      <BoardsSection
        boardSlug={boardSlug}
        boards={boards}
        boardsExpanded={boardsExpanded}
        effectiveOrgSlug={effectiveOrgSlug}
        isLimitReached={isLimitReached}
        onCreateBoard={handleCreateBoard}
        onToggleExpanded={() => setBoardsExpanded(!boardsExpanded)}
      />

      {/* Admin Section */}
      <AdminSection effectiveOrgSlug={effectiveOrgSlug} />
    </nav>
  );
}

function BoardsSection({
  boardsExpanded,
  onToggleExpanded,
  boards,
  boardSlug,
  effectiveOrgSlug,
  isLimitReached,
  onCreateBoard,
}: {
  boardsExpanded: boolean;
  onToggleExpanded: () => void;
  boards: Board[];
  boardSlug: string | undefined;
  effectiveOrgSlug: string;
  isLimitReached: boolean;
  onCreateBoard: () => void;
}) {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const handleAddBoardClick = () => {
    if (isLimitReached) {
      setShowUpgradeDialog(true);
    } else {
      onCreateBoard();
    }
  };

  return (
    <div className="pt-4">
      <button
        className="flex w-full items-center gap-2 px-3 py-1 font-semibold text-muted-foreground text-xs uppercase tracking-wider hover:text-foreground"
        onClick={onToggleExpanded}
        type="button"
      >
        {boardsExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Layers className="h-3 w-3" />
        Boards
      </button>
      {boardsExpanded ? (
        <div className="mt-1 space-y-1">
          {boards.map((board) => (
            <BoardNavItem
              board={board}
              isActive={boardSlug === board.slug}
              key={board.id}
              orgSlug={effectiveOrgSlug}
            />
          ))}
          {boards.length === 0 ? (
            <p className="px-3 py-2 text-muted-foreground text-xs">
              No boards yet
            </p>
          ) : null}
          <button
            className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground text-xs hover:text-foreground"
            onClick={handleAddBoardClick}
            type="button"
          >
            <Plus className="h-3 w-3" />
            Add board
          </button>
        </div>
      ) : null}

      {/* Upgrade Dialog */}
      <Dialog onOpenChange={setShowUpgradeDialog} open={showUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              Board Limit Reached
            </DialogTitle>
            <DialogDescription className="text-center">
              You've reached the maximum number of boards on your current plan.
              Upgrade to create more boards and unlock additional features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Link
              className="w-full"
              onClick={() => setShowUpgradeDialog(false)}
              params={{ orgSlug: effectiveOrgSlug }}
              to="/dashboard/$orgSlug/subscription"
            >
              <Button className="w-full">
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>
            <Button
              className="w-full"
              onClick={() => setShowUpgradeDialog(false)}
              variant="outline"
            >
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminSection({ effectiveOrgSlug }: { effectiveOrgSlug: string }) {
  return (
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
          to="/dashboard/$orgSlug/subscription"
        >
          <CreditCard className="h-4 w-4" />
          Subscription
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
  );
}

type AuthOrganization = {
  id: string;
  name: string;
  slug: string;
};

function OrgSelector({
  currentOrg,
  organizations,
  effectiveOrgSlug,
  navigate,
}: {
  currentOrg: AuthOrganization | undefined;
  organizations: AuthOrganization[];
  effectiveOrgSlug: string;
  navigate: NavigateFunction;
}) {
  return (
    <div className="p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              className="w-full justify-start gap-2 font-medium"
              variant="ghost"
            />
          }
        >
          <Building2 className="h-4 w-4" />
          <span className="flex-1 truncate text-left">
            {currentOrg?.name ?? "Select Org"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {organizations.map((org) => (
            <DropdownMenuItem
              className={cn(
                org.slug === effectiveOrgSlug ? "bg-accent" : undefined
              )}
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
    </div>
  );
}

type SessionData = {
  user?: {
    id: string;
    name?: string | null;
  } | null;
};

function UserSection({
  session,
  isAccountPage,
  unreadCount,
}: {
  session: SessionData | null;
  isAccountPage: boolean;
  unreadCount: number;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <Link
          className={cn(
            "flex h-auto items-center gap-2 rounded-md p-0 transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isAccountPage ? "bg-accent text-accent-foreground" : undefined
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
          <NotificationButton unreadCount={unreadCount} />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

function NotificationButton({ unreadCount }: { unreadCount: number }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={<Button className="relative" size="icon" variant="ghost" />}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <Badge
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center p-0 text-[10px]"
            variant="destructive"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        ) : null}
      </TooltipTrigger>
      <TooltipContent>Notifications</TooltipContent>
    </Tooltip>
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
        isActive ? "bg-accent text-accent-foreground" : undefined
      )}
      params={{ orgSlug, boardSlug: board.slug }}
      to="/dashboard/$orgSlug/$boardSlug"
    >
      <span className="truncate">{board.name}</span>
      {board.isPublic ? null : (
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
        <TooltipTrigger
          render={
            // biome-ignore lint/a11y/useAnchorContent: content is provided via render prop children, aria-label provides accessibility
            <a
              aria-label="View Public Page"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              href={`/${orgSlug}`}
              rel="noopener noreferrer"
              target="_blank"
            />
          }
        >
          <Globe className="h-4 w-4" />
          View Public Page
          <Badge className="ml-auto px-1.5 text-[10px]" variant="secondary">
            {publicBoards.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Open public page in new tab</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
