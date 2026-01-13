import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@repo/ui/components/sidebar";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { requireAuthenticated } from "@/lib/route-guards";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    await requireAuthenticated();
  },
  pendingComponent: DashboardPending,
  component: DashboardLayout,
});

function DashboardPending() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function DashboardLayout() {
  return (
    <SidebarProvider className="h-dvh max-h-dvh">
      <AppSidebar />
      <SidebarInset className="flex max-h-dvh flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
