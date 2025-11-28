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
  const z = useZero<Schema>();
  const [syncAttempts, setSyncAttempts] = useState(0);
  
  // Get the first org's ID to check if Zero has synced it
  const firstOrgId = organizations?.[0]?.id ?? "";
  
  // Query Zero to see if the org is synced
  const [zeroOrgs, { type: queryStatus }] = useQuery(
    z.query.organization.where("id", "=", firstOrgId)
  );
  const zeroOrgSynced = zeroOrgs && zeroOrgs.length > 0;
  const zeroQueryComplete = queryStatus === "complete";

  // Retry sync check periodically if org exists in Better Auth but not in Zero yet
  useEffect(() => {
    if (
      organizations && 
      organizations.length > 0 && 
      zeroQueryComplete && 
      !zeroOrgSynced && 
      syncAttempts < 10
    ) {
      const timer = setTimeout(() => {
        setSyncAttempts((prev) => prev + 1);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [organizations, zeroQueryComplete, zeroOrgSynced, syncAttempts]);

  // While loading from Better Auth, show loading
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user has organizations, wait for Zero sync then redirect
  if (organizations && organizations.length > 0) {
    // If Zero has synced or we've waited long enough, redirect
    if (zeroOrgSynced || syncAttempts >= 10) {
      return <Navigate to="/$orgSlug" params={{ orgSlug: organizations[0].slug }} />;
    }
    
    // Still waiting for Zero to sync
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Syncing organization data...</p>
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
          <Link to="/my-account">
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </Button>
      </div>
    </div>
  );
}
