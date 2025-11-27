import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { authClient } from "../lib/auth-client";
import { AuthGuard } from "../components/auth-guard";
import { Button } from "../components/ui/button";
import { Building2, Plus } from "lucide-react";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGuard>
      <Index />
    </AuthGuard>
  ),
});

function Index() {
  const { data: organizations, isPending } = authClient.useListOrganizations();

  // While loading, show nothing (AuthGuard handles redirect if not logged in)
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user has organizations, redirect to the first one
  if (organizations && organizations.length > 0) {
    return <Navigate to="/$orgSlug" params={{ orgSlug: organizations[0].slug }} />;
  }

  // No organizations - show welcome screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">Welcome to Featurebase</h1>
          <p className="text-muted-foreground mt-2">
            Get started by creating your first organization to manage feedback and roadmaps.
          </p>
        </div>

        <Button asChild size="lg" className="gap-2">
          <Link to="/my-account">
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </Button>
      </div>
    </div>
  );
}
