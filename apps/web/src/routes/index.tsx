import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import Homepage from "@/components/homepage/homepage";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: Index,
});

/**
 * Root index route
 * - If logged in → redirect to /dashboard (which handles org selection)
 * - If not logged in → show homepage
 */
function Index() {
  const { data: session, isPending } = authClient.useSession();

  // While auth is loading, show loading spinner
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If logged in, redirect to dashboard
  if (session?.user) {
    return <Navigate replace to="/dashboard" />;
  }

  // If not logged in, show landing page
  return <Homepage />;
}
