import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { SideNav } from "@/components/side-nav";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const [sideNavOpen, setSideNavOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!(isPending || session)) {
      navigate({ to: "/login", replace: true });
    }
  }, [isPending, session, navigate]);

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show loading while redirecting to login
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
