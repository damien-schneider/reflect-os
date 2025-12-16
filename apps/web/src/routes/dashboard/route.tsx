import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { SideNav } from "@/components/side-nav";
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
  const [sideNavOpen, setSideNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <SideNav
        isOpen={sideNavOpen}
        onToggle={() => setSideNavOpen(!sideNavOpen)}
      />
      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
