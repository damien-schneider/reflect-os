import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { authClient } from "../../lib/auth-client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const navigate = useNavigate();
  const { data: organizations, isPending } = authClient.useListOrganizations();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Redirect to first organization if available (only once)
    if (!isPending && organizations && organizations.length > 0 && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate({
        to: "/dashboard/$orgSlug",
        params: { orgSlug: organizations[0].slug },
        replace: true,
      });
    }
  }, [organizations, isPending, navigate]);

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Welcome to the Dashboard</h1>
          <p className="text-muted-foreground">
            You don't have any organizations yet. Create one from your account settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
