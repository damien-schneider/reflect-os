import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { useZero, useQuery } from "@rocicorp/zero/react";
import { Loader2, Plus, Building2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { Schema } from "../../schema";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardIndex,
});

function DashboardIndex() {
  const navigate = useNavigate();
  const { data: organizations, isPending: authPending } = authClient.useListOrganizations();
  const hasRedirected = useRef(false);
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

  useEffect(() => {
    // Only redirect when:
    // 1. Better Auth has orgs
    // 2. Zero has synced the org (or we've waited long enough)
    // 3. We haven't redirected yet
    if (
      !authPending && 
      organizations && 
      organizations.length > 0 && 
      !hasRedirected.current &&
      (zeroOrgSynced || syncAttempts >= 10)
    ) {
      hasRedirected.current = true;
      navigate({
        to: "/dashboard/$orgSlug",
        params: { orgSlug: organizations[0].slug },
        replace: true,
      });
    }
  }, [organizations, authPending, navigate, zeroOrgSynced, syncAttempts]);

  // Still loading from Better Auth
  if (authPending) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No organizations - show welcome screen
  if (!organizations || organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
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

  // Orgs exist but Zero hasn't synced yet - show syncing state
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Syncing organization data...</p>
    </div>
  );
}
