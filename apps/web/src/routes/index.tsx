import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { AuthGuard } from "../components/auth-guard";
import { Button } from "../components/ui/button";
import { Building2, Plus, Loader2 } from "lucide-react";
import type { Schema } from "../schema";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGuard>
      <Index />
    </AuthGuard>
  ),
});

function Index() {
  const { data: organizations, isPending } = authClient.useListOrganizations();
  const { data: session } = authClient.useSession();
  const z = useZero<Schema>();
  const [timedOut, setTimedOut] = useState(false);
  
  // Get the first org's ID to check if Zero has synced it
  const firstOrgId = organizations?.[0]?.id ?? "";
  const userId = session?.user?.id ?? "";
  
  // Query Zero member table to see if the org membership is synced
  // Member table has simpler permissions (allowIfLoggedIn) than organization table
  const [zeroMembers, { type: queryStatus }] = useQuery(
    z.query.member
      .where("organizationId", "=", firstOrgId)
      .where("userId", "=", userId)
  );
  const zeroOrgSynced = zeroMembers && zeroMembers.length > 0;
  const zeroQueryComplete = queryStatus === "complete";

  // Time-based fallback: if Zero hasn't synced within 3 seconds, proceed anyway
  // This handles cases where Zero WebSocket connection fails
  useEffect(() => {
    if (organizations && organizations.length > 0 && !zeroOrgSynced && !zeroQueryComplete) {
      const timer = setTimeout(() => setTimedOut(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [organizations, zeroOrgSynced, zeroQueryComplete]);

  // While loading from Better Auth, show loading
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user has organizations, redirect (with brief wait for Zero sync)
  if (organizations && organizations.length > 0) {
    // Redirect if:
    // 1. Zero has synced the membership, OR
    // 2. Zero query completed (even if empty - permissions issue), OR
    // 3. We've waited 3 seconds (Zero connection probably failed)
    const shouldRedirect = zeroOrgSynced || zeroQueryComplete || timedOut;
    
    if (shouldRedirect) {
      return <Navigate to="/$orgSlug" params={{ orgSlug: organizations[0].slug }} />;
    }
    
    // Still waiting for Zero to sync (brief moment)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
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
          <Link to="/dashboard/account">
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </Button>
      </div>
    </div>
  );
}
