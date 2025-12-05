import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router";
import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/subscription/success")({
  component: () => (
    <AuthGuard>
      <SubscriptionSuccess />
    </AuthGuard>
  ),
  validateSearch: (search: Record<string, unknown>) => ({
    checkout_id: search.checkout_id as string | undefined,
    customer_session_token: search.customer_session_token as string | undefined,
  }),
});

function SubscriptionSuccess() {
  const { checkout_id } = useSearch({ from: "/subscription/success" });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: organizations, isPending: isOrgsPending } =
    authClient.useListOrganizations();
  const z = useZero<Schema>();

  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");

  // Get the first organization to redirect to
  const firstOrg = organizations?.[0];

  // Query the organization to verify subscription was updated
  const [orgs] = useQuery(
    z.query.organization.where("id", "=", firstOrg?.id ?? "")
  );
  const org = orgs?.[0];

  // Auto-sync subscription on mount (catches webhook failures)
  useEffect(() => {
    if (!firstOrg?.id || syncStatus !== "idle") {
      return;
    }

    const syncSubscription = async () => {
      setSyncStatus("syncing");
      try {
        const response = await fetch("/api/sync-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId: firstOrg.id }),
        });

        const data = await response.json();

        if (response.ok && data.synced) {
          console.log("[Success Page] Subscription synced:", data.subscription);
          setSyncStatus("success");
        } else {
          // Not an error - just no subscription to sync
          console.log("[Success Page] Sync result:", data.message);
          setSyncStatus("success");
        }
      } catch (error) {
        console.error("[Success Page] Sync failed:", error);
        setSyncStatus("error");
      }
    };

    syncSubscription();
  }, [firstOrg?.id, syncStatus]);

  // Auto redirect countdown (starts after sync attempt)
  useEffect(() => {
    if (!firstOrg || syncStatus === "idle" || syncStatus === "syncing") {
      return;
    }

    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [firstOrg, syncStatus]);

  // Loading state
  if (isSessionPending || isOrgsPending || syncStatus === "syncing") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {syncStatus === "syncing"
              ? "Confirming your subscription..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // No session - shouldn't happen with AuthGuard
  if (!session) {
    return <Navigate to="/login" />;
  }

  // No organizations - redirect to create one
  if (!firstOrg) {
    return <Navigate to="/dashboard/account" />;
  }

  // Auto redirect when countdown reaches 0
  if (redirectCountdown === 0) {
    return (
      <Navigate
        params={{ orgSlug: firstOrg.slug }}
        to="/dashboard/$orgSlug/subscription"
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for upgrading your subscription. Your new plan features
            are now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkout_id && (
            <div className="rounded-lg bg-muted p-3 text-center text-muted-foreground text-sm">
              Order ID: <span className="font-mono">{checkout_id}</span>
            </div>
          )}

          {org?.subscriptionTier && org.subscriptionTier !== "free" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-900/10">
              <p className="font-medium text-green-700 dark:text-green-400">
                Your plan has been upgraded to{" "}
                <span className="capitalize">{org.subscriptionTier}</span>
              </p>
            </div>
          )}

          <div className="text-center text-muted-foreground text-sm">
            Redirecting to your subscription page in {redirectCountdown}
            seconds...
          </div>

          <Button asChild className="w-full">
            <a href={`/dashboard/${firstOrg.slug}/subscription`}>
              Go to Subscription Page
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
