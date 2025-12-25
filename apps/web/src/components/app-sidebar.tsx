import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@repo/ui/components/sidebar";
import { cn } from "@repo/ui/lib/utils";
import { useQuery } from "@rocicorp/zero/react";
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
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Globe,
  LayoutGrid,
  LogOut,
  Plus,
  Settings,
  Tags,
  User,
  Users,
} from "lucide-react";
import { ThemeToggleMenuItem } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";
import { queries } from "@/queries";
import type { Board, Organization } from "@/schema";

type NavigateFunction = ReturnType<typeof useNavigate>;

export function AppSidebar() {
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
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <OrgSelector
          currentOrg={currentOrg}
          effectiveOrgSlug={effectiveOrgSlug}
          navigate={navigate}
          organizations={organizations ?? []}
        />
      </SidebarHeader>

      <SidebarContent className="justify-between">
        <div>
          <MainNavigation
            boardSlug={boardSlug}
            effectiveOrgSlug={effectiveOrgSlug}
            pathname={pathname}
          />
        </div>

        {effectiveOrgSlug !== "" ? (
          <PublicViewSection
            boards={boards ?? []}
            org={orgData}
            orgSlug={effectiveOrgSlug}
          />
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <UserSection
          isAccountPage={isAccountPage}
          session={session}
          unreadCount={unreadCount}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Building2 className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {currentOrg?.name ?? "Select Org"}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {effectiveOrgSlug || "No organization"}
              </span>
            </div>
            <ChevronDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuGroupLabel className="text-muted-foreground text-xs">
                Organizations
              </DropdownMenuGroupLabel>
              {organizations.map((org) => (
                <DropdownMenuItem
                  className={cn(
                    "gap-2 p-2",
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
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Building2 className="size-4 shrink-0" />
                  </div>
                  {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2"
              onClick={() => navigate({ to: "/dashboard/account" })}
            >
              <Plus className="size-4" />
              <span>Add organization</span>
            </DropdownMenuItem>
            {effectiveOrgSlug ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuGroupLabel className="text-muted-foreground text-xs">
                    Organization
                  </DropdownMenuGroupLabel>
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onClick={() =>
                      navigate({
                        to: "/dashboard/$orgSlug/settings",
                        params: { orgSlug: effectiveOrgSlug },
                      })
                    }
                  >
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 p-2"
                    onClick={() =>
                      navigate({
                        to: "/dashboard/$orgSlug/subscription",
                        params: { orgSlug: effectiveOrgSlug },
                      })
                    }
                  >
                    <CreditCard className="size-4" />
                    <span>Subscription</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function MainNavigation({
  effectiveOrgSlug,
  boardSlug,
  pathname,
}: {
  effectiveOrgSlug: string;
  boardSlug: string | undefined;
  pathname: string;
}) {
  // Check if we're viewing a board (for highlighting)
  const isViewingBoards = boardSlug !== undefined;

  if (effectiveOrgSlug === "") {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 py-4 text-muted-foreground text-sm">
            <p>No organizations yet.</p>
            <Link
              className="text-primary hover:underline"
              to="/dashboard/account"
            >
              Create one
            </Link>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // Main navigation items that are always visible
  const mainNavItems = [
    {
      href: "/dashboard/$orgSlug/boards",
      label: "Boards",
      icon: LayoutGrid,
      isActive: isViewingBoards,
    },
    {
      href: "/dashboard/$orgSlug/settings",
      label: "Settings",
      icon: Settings,
      isActive: pathname.includes("/settings"),
    },
  ];

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            {mainNavItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={item.isActive}
                  render={
                    <Link
                      params={{ orgSlug: effectiveOrgSlug }}
                      to={item.href as "/dashboard/$orgSlug"}
                    />
                  }
                  tooltip={item.label}
                >
                  <item.icon className="size-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <AdminSection effectiveOrgSlug={effectiveOrgSlug} pathname={pathname} />
      </SidebarGroup>
    </>
  );
}

function AdminSection({
  effectiveOrgSlug,
  pathname,
}: {
  effectiveOrgSlug: string;
  pathname: string;
}) {
  const adminItems = [
    { href: "/dashboard/$orgSlug/tags", label: "Tags", icon: Tags },
    {
      href: "/dashboard/$orgSlug/changelog",
      label: "Changelog",
      icon: FileText,
    },
    { href: "/dashboard/$orgSlug/users", label: "Users", icon: Users },
    {
      href: "/dashboard/$orgSlug/subscription",
      label: "Subscription",
      icon: CreditCard,
    },
  ];

  return (
    <>
      <SidebarGroupLabel>Admin</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                isActive={pathname.includes(
                  item.href.replace("$orgSlug", effectiveOrgSlug)
                )}
                render={
                  <Link
                    params={{ orgSlug: effectiveOrgSlug }}
                    to={item.href as "/dashboard/$orgSlug/tags"}
                  />
                }
                tooltip={item.label}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </>
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

  const isOrgPublic = org?.isPublic ?? false;
  const publicBoards = boards.filter((b) => b.isPublic);

  // Determine which status message to show
  const showNotPublished = !isOrgPublic;
  const showPartiallyPublished = isOrgPublic && publicBoards.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Status message - only visible when sidebar is expanded */}
      {showNotPublished && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <div className="mx-2 rounded-lg border border-muted-foreground/30 border-dashed bg-muted/30 p-3">
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
        </SidebarGroup>
      )}
      {showPartiallyPublished && (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <div className="mx-2 rounded-lg border border-amber-500/30 border-dashed bg-amber-500/5 p-3">
            <div className="mb-2 flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Eye className="h-4 w-4" />
              <span className="font-medium text-xs">Partially Published</span>
            </div>
            <p className="text-muted-foreground text-xs">
              Organization is public but no boards are visible yet.
            </p>
          </div>
        </SidebarGroup>
      )}

      {/* View Public Page link - always visible */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  // biome-ignore lint/a11y/useAnchorContent: content is provided via SidebarMenuButton children
                  <a
                    href={`/${orgSlug}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  />
                }
                tooltip="Open public page in new tab"
              >
                <Globe className="size-4" />
                <span>View Public Page</span>
                {publicBoards.length > 0 ? (
                  <Badge
                    className="ml-auto px-1.5 text-[10px] group-data-[collapsible=icon]:hidden"
                    variant="secondary"
                  >
                    {publicBoards.length}
                  </Badge>
                ) : null}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}

type SessionData = {
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
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
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/login" });
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                isActive={isAccountPage}
                size="lg"
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <User className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">
                {session?.user?.name ?? "User"}
              </span>
              <span className="truncate text-muted-foreground text-xs">
                {session?.user?.email ?? ""}
              </span>
            </div>
            <ChevronUp className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="top"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <User className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session?.user?.name ?? "User"}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {session?.user?.email ?? ""}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => navigate({ to: "/dashboard/account" })}
              >
                <User className="size-4" />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 p-2">
                <Bell className="size-4" />
                <span>Notifications</span>
                {unreadCount > 0 ? (
                  <Badge
                    className="ml-auto px-1.5 text-[10px]"
                    variant="destructive"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                ) : null}
              </DropdownMenuItem>
              <ThemeToggleMenuItem />
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
