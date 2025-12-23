import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@repo/ui/components/sidebar";
import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { ArrowLeft, Building2, Palette } from "lucide-react";

export const Route = createFileRoute("/dashboard/$orgSlug/settings")({
  component: SettingsLayout,
});

const settingsNavItems = [
  {
    href: "/dashboard/$orgSlug/settings",
    label: "Organization",
    icon: Building2,
    exact: true,
  },
  {
    href: "/dashboard/$orgSlug/settings/branding",
    label: "Branding",
    icon: Palette,
  },
];

function SettingsLayout() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

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
                  <span className="font-semibold">Settings</span>
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
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsNavItems.map((item) => {
                  const itemPath = item.href.replace("$orgSlug", orgSlug);
                  const isActive = item.exact
                    ? pathname === itemPath
                    : pathname.startsWith(itemPath);

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link
                            params={{ orgSlug }}
                            to={item.href as "/dashboard/$orgSlug/settings"}
                          />
                        }
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-3xl">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
