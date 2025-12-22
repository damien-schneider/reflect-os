import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, Navigate, useSearch } from "@tanstack/react-router";
import { CheckCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { authClient } from "@/lib/auth-client";
import { requireAuthenticated } from "@/lib/route-guards";
import { queries } from "@/queries";

type SubscriptionSuccessSearch = {
  checkout_id?: string;
  customer_session_token?: string;
};

function SubscriptionSuccessPending() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/subscription/success")({
  beforeLoad: async () => {
    await requireAuthenticated();
  },
  pendingComponent: SubscriptionSuccessPending,
  validateSearch: (
    search: Record<string, unknown>
  ): SubscriptionSuccessSearch => {
    const checkoutId =
      typeof search.checkout_id === "string" ? search.checkout_id : undefined;
    const customerSessionToken =
      typeof search.customer_session_token === "string"
        ? search.customer_session_token
        : undefined;

    return {
      checkout_id: checkoutId,
      customer_session_token: customerSessionToken,
    };
  },
  component: SubscriptionSuccess,
});

function SubscriptionSuccess() {
  const { checkout_id } = useSearch({ from: "/subscription/success" });
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: organizations, isPending: isOrgsPending } =
    authClient.useListOrganizations();

  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "success" | "error"
  >("idle");

  // Get the first organization to redirect to
  const firstOrg = organizations?.[0];

  // Query the organization to verify subscription was updated
  const [orgs] = useQuery(
    queries.organization.byId({ id: firstOrg?.id ?? "" })
  );
  const org = orgs?.[0];

  // Auto-sync subscription on mount (catches webhook failures)
  useEffect(() => {
    if (!firstOrg?.id || syncStatus !== "idle") {
      return;
    }

    const syncSubscription = async () => {
      const response = await api.api["sync-subscription"].$post({
        json: { organizationId: firstOrg.id },
      });

      await response.json();
      setSyncStatus("success");
    };

    setSyncStatus("syncing");
    syncSubscription().catch((caughtError: unknown) => {
      if (import.meta.env.DEV) {
        console.error("[Subscription Success] Sync failed", caughtError);
      }
      setSyncStatus("error");
    });
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

  // Should not happen due to beforeLoad guard, but keep defensive.
  if (!session) {
    return <Navigate replace to="/login" />;
  }

  if (!firstOrg) {
    return <Navigate replace to="/dashboard/account" />;
  }

  if (redirectCountdown === 0) {
    return (
      <Navigate
        params={{ orgSlug: firstOrg.slug }}
        replace
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

          <Button
            className="w-full"
            render={
              // biome-ignore lint/a11y/useAnchorContent: content is provided via render prop children, aria-label provides accessibility
              <a
                aria-label="Go to Subscription Page"
                href={`/dashboard/${firstOrg.slug}/subscription`}
              />
            }
          >
            Go to Subscription Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
