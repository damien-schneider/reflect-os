import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@repo/ui/components/sidebar";
import { useQuery, useZero } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft, LayoutGrid, Plus } from "lucide-react";
import { useLimitCheck } from "@/features/subscription";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";

export const Route = createFileRoute("/dashboard/$orgSlug/$boardSlug")({
  component: DashboardBoardLayout,
});

function DashboardBoardLayout() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const navigate = useNavigate();
  const zero = useZero();

  const { data: organizations } = authClient.useListOrganizations();
  const currentOrg = organizations?.find((o) => o.slug === orgSlug);

  // Get organization
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  // Get board
  const [boards] = useQuery(
    queries.board.byOrgAndSlug({
      organizationId: org?.id ?? "",
      slug: boardSlug,
    })
  );
  const board = boards?.[0];

  // Get all boards for sidebar
  const [allBoards] = useQuery(
    queries.board.byOrganizationId({ organizationId: currentOrg?.id ?? "" })
  );

  const boardCount = allBoards?.length ?? 0;
  const { isLimitReached } = useLimitCheck(boardCount, "boards");

  const handleCreateBoard = () => {
    if (!currentOrg?.id || isLimitReached) {
      return;
    }

    const boardId = randID();
    const slug = `board-${boardId}`;
    const now = Date.now();

    zero.mutate(
      mutators.board.insert({
        id: boardId,
        organizationId: currentOrg.id,
        name: "Untitled Board",
        slug,
        description: "",
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      })
    );

    navigate({
      to: "/dashboard/$orgSlug/$boardSlug",
      params: { orgSlug, boardSlug: slug },
    });
  };

  if (!(org && board)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    );
  }

  return (
    <SidebarProvider
      className="min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-2rem)]"
      style={
        {
          "--sidebar-width": "14rem",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="none" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link params={{ orgSlug }} to="/dashboard/$orgSlug" />}
                size="lg"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg border bg-sidebar-accent text-sidebar-accent-foreground">
                  <ArrowLeft className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Boards</span>
                  <span className="text-muted-foreground text-xs">
                    Back to Dashboard
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <span>Your Boards</span>
              <Button
                className="h-6 w-6"
                disabled={isLimitReached}
                onClick={handleCreateBoard}
                size="icon"
                title={isLimitReached ? "Board limit reached" : "Add board"}
                variant="ghost"
              >
                <Plus className="size-4" />
              </Button>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {allBoards?.length === 0 ? (
                  <div className="px-2 py-2 text-muted-foreground text-sm">
                    No boards yet
                  </div>
                ) : (
                  allBoards?.map((b) => {
                    const boardPath = `/dashboard/${orgSlug}/${b.slug}`;
                    const isActive = pathname.startsWith(boardPath);

                    return (
                      <SidebarMenuItem key={b.id}>
                        <SidebarMenuButton
                          isActive={isActive}
                          render={
                            <Link
                              params={{ orgSlug, boardSlug: b.slug }}
                              to="/dashboard/$orgSlug/$boardSlug"
                            />
                          }
                        >
                          <LayoutGrid className="size-4" />
                          <span className="truncate">{b.name}</span>
                          {b.isPublic ? null : (
                            <Badge
                              className="ml-auto px-1 text-[10px]"
                              variant="outline"
                            >
                              Private
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
