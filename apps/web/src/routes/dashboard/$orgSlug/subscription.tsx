import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  AlertCircle,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  Infinity as InfinityIcon,
  Minus,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  calculateYearlySavings,
  getProductCurrency,
  getProductPrice,
  getSortedPaidTiers,
  PLAN_LIMITS,
  PLAN_TIERS,
  type PolarProduct,
  STATUS_CONFIG,
  type SubscriptionTier,
  useCanManageSubscription,
  useCustomerPortal,
  useProducts,
  useSubscription,
  useSubscriptionCheckout,
  useSubscriptionSync,
} from "@/features/subscription";
import { zql } from "@/zero-schema";

export const Route = createFileRoute("/dashboard/$orgSlug/subscription")({
  component: DashboardSubscription,
});

function DashboardSubscription() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };

  // Get organization with members and boards for usage stats
  const [orgs] = useQuery(
    zql.organization.where("slug", orgSlug).related("members").related("boards")
  );
  const org = orgs?.[0];

  // Subscription data
  const {
    tier,
    status,
    isLoading,
    isPaidPlan,
    isFreePlan,
    limits,
    subscription,
  } = useSubscription();

  // Polar products (fetched in background, doesn't block UI)
  const { productsByTier } = useProducts();

  const { canManage, isOwner } = useCanManageSubscription();
  const { openPortal } = useCustomerPortal();
  const { initiateCheckout } = useSubscriptionCheckout();
  const {
    syncSubscription,
    isSyncing,
    syncResult,
    isOnCooldown,
    cooldownSeconds,
  } = useSubscriptionSync();

  const [isOpening, setIsOpening] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">(
    "month"
  );

  // Calculate usage stats
  const boardCount = org?.boards?.length ?? 0;
  const memberCount = org?.members?.length ?? 0;

  const handleManageSubscription = async () => {
    if (!canManage) {
      return;
    }
    setIsOpening(true);
    setPortalError(null);
    try {
      await openPortal();
    } catch (error) {
      console.error("Failed to open portal:", error);
      setPortalError(
        error instanceof Error ? error.message : "Failed to open billing portal"
      );
    } finally {
      setIsOpening(false);
    }
  };

  const handleUpgrade = async (productSlug: string) => {
    if (!canManage) {
      return;
    }
    setIsCheckingOut(productSlug);
    setCheckoutError(null);
    try {
      await initiateCheckout(productSlug);
    } catch (error) {
      console.error("Checkout failed:", error);
      setCheckoutError(
        error instanceof Error ? error.message : "Failed to start checkout"
      );
    } finally {
      setIsCheckingOut(null);
    }
  };

  if (isLoading || !org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const tierConfig = PLAN_TIERS[tier];
  const statusConfig = STATUS_CONFIG[status];

  // Get upgrade tiers (higher than current) - show all paid tiers, products are optional for display
  const currentTierOrder = PLAN_TIERS[tier].order;
  const upgradeTiers = getSortedPaidTiers().filter(
    (t) => PLAN_TIERS[t].order > currentTierOrder
  );

  return (
    <div className="wrapper-content space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Subscription</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and billing
        </p>
      </div>

      {/* Error alerts */}
      {portalError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to open billing portal</AlertTitle>
          <AlertDescription>{portalError}</AlertDescription>
        </Alert>
      )}

      {checkoutError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checkout failed</AlertTitle>
          <AlertDescription>{checkoutError}</AlertDescription>
        </Alert>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Crown className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {tierConfig.label} Plan
                  <Badge
                    className={statusConfig.className}
                    variant={statusConfig.variant}
                  >
                    {statusConfig.label}
                  </Badge>
                </CardTitle>
                <CardDescription>{tierConfig.description}</CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Sync subscription button - for owners when subscription might be out of sync */}
              {canManage && (
                <Button
                  disabled={isSyncing || isOnCooldown}
                  onClick={syncSubscription}
                  size="sm"
                  title="Sync subscription status from payment provider"
                  variant="ghost"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  />
                  {isOnCooldown && (
                    <span className="ml-1 text-xs">{cooldownSeconds}s</span>
                  )}
                </Button>
              )}
              {isPaidPlan && canManage && (
                <Button
                  disabled={isOpening}
                  onClick={handleManageSubscription}
                  variant="outline"
                >
                  {isOpening ? (
                    <span className="animate-pulse">Opening...</span>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Subscription
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Sync status message */}
          {syncResult.status !== "idle" && (
            <div
              className={`rounded-lg p-3 text-sm ${
                syncResult.status === "success"
                  ? "border border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/10 dark:text-green-400"
                  : syncResult.status === "error"
                    ? "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/10 dark:text-red-400"
                    : "border border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/10 dark:text-yellow-400"
              }`}
            >
              {syncResult.message}
            </div>
          )}

          {/* Subscription period info */}
          {subscription && (
            <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
              {subscription.currentPeriodEnd && (
                <div>
                  <span className="font-medium text-foreground">
                    Next billing date:
                  </span>{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
              )}
              {subscription.cancelAtPeriodEnd && (
                <Badge variant="destructive">Cancels at period end</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Non-owner warning */}
      {!isOwner && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limited access</AlertTitle>
          <AlertDescription>
            Only the organization owner can manage the subscription. Contact{" "}
            {org?.name}'s owner to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Usage
          </CardTitle>
          <CardDescription>
            Current usage against your plan limits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Boards usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Boards</span>
              <span className="text-muted-foreground">
                {boardCount} /{" "}
                {limits.boards === Number.POSITIVE_INFINITY ? (
                  <InfinityIcon className="inline h-4 w-4" />
                ) : (
                  limits.boards
                )}
              </span>
            </div>
            <Progress
              className="h-2"
              value={
                limits.boards === Number.POSITIVE_INFINITY
                  ? 0
                  : (boardCount / limits.boards) * 100
              }
            />
          </div>

          {/* Members usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Team Members</span>
              <span className="text-muted-foreground">
                {memberCount} /{" "}
                {limits.membersPerOrg === Number.POSITIVE_INFINITY ? (
                  <InfinityIcon className="inline h-4 w-4" />
                ) : (
                  limits.membersPerOrg
                )}
              </span>
            </div>
            <Progress
              className="h-2"
              value={
                limits.membersPerOrg === Number.POSITIVE_INFINITY
                  ? 0
                  : (memberCount / limits.membersPerOrg) * 100
              }
            />
          </div>

          <Separator />

          {/* Feature access from current plan */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureItem
              enabled={limits.customBranding}
              label="Custom Branding"
            />
            <FeatureItem enabled={limits.apiAccess} label="API Access" />
            <FeatureItem
              enabled={limits.prioritySupport}
              label="Priority Support"
            />
            <FeatureItem
              enabled={limits.advancedAnalytics}
              label="Advanced Analytics"
            />
            <FeatureItem enabled={limits.sso} label="SSO/SAML" />
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Options - Show immediately using static config */}
      {/* TODO: Re-enable team tier check when ready */}
      {/* {(isFreePlan || (isPaidPlan && tier !== "team")) && */}
      {(isFreePlan || isPaidPlan) && upgradeTiers.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-semibold text-lg">
              {isFreePlan ? "Compare Plans" : "Available Upgrades"}
            </h2>

            {/* Billing interval toggle */}
            <div className="flex items-center gap-2 rounded-lg border p-1">
              <Button
                onClick={() => setBillingInterval("month")}
                size="sm"
                variant={billingInterval === "month" ? "default" : "ghost"}
              >
                Monthly
              </Button>
              <Button
                onClick={() => setBillingInterval("year")}
                size="sm"
                variant={billingInterval === "year" ? "default" : "ghost"}
              >
                Yearly
                <Badge className="ml-2" variant="secondary">
                  Save up to 20%
                </Badge>
              </Button>
            </div>
          </div>

          <div
            className={`grid gap-4 ${isFreePlan ? "md:grid-cols-3" : upgradeTiers.length === 1 ? "max-w-md md:grid-cols-1" : "md:grid-cols-2"}`}
          >
            {/* Show Free tier card when user is on free plan */}
            {isFreePlan && <FreeTierCard isCurrent />}

            {upgradeTiers.map((tierKey) => {
              // TODO: Re-enable team tier when ready
              // Team tier is contact-only (no self-service checkout)
              // if (tierKey === "team") {
              //   return <ContactUsCard key={tierKey} />;
              // }

              const tierProducts = productsByTier[tierKey];
              const product = tierProducts?.[billingInterval];
              const monthlyProduct = tierProducts?.month;
              const yearlyProduct = tierProducts?.year;

              const savings = calculateYearlySavings(
                monthlyProduct,
                yearlyProduct
              );

              return (
                <PlanCard
                  billingInterval={billingInterval}
                  isCheckingOut={isCheckingOut}
                  isOwner={isOwner}
                  key={tierKey}
                  onUpgrade={handleUpgrade}
                  product={product}
                  savings={billingInterval === "year" ? savings : null}
                  tierKey={tierKey}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

type FeatureItemProps = {
  label: string;
  enabled: boolean;
};

function FeatureItem({ label, enabled }: FeatureItemProps) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={enabled ? "" : "text-muted-foreground"}>{label}</span>
    </div>
  );
}

type PlanCardProps = {
  tierKey: Exclude<SubscriptionTier, "free">;
  product: PolarProduct | undefined;
  billingInterval: "month" | "year";
  onUpgrade: (slug: string) => void;
  isOwner: boolean;
  isCheckingOut: string | null;
  savings: number | null;
};

function PlanCard({
  tierKey,
  product,
  billingInterval,
  onUpgrade,
  isOwner,
  isCheckingOut,
  savings,
}: PlanCardProps) {
  const tierConfig = PLAN_TIERS[tierKey];
  const tierLimits = PLAN_LIMITS[tierKey];

  // Use product data if available, otherwise use static config
  const price = product ? getProductPrice(product) : null;
  const currency = product ? getProductCurrency(product) : "USD";
  const productSlug =
    product?.slug ??
    `${tierConfig.label.toLowerCase()}-${billingInterval === "year" ? "yearly" : "monthly"}`;
  const isThisCheckingOut = isCheckingOut === productSlug;
  const priceLoaded = product !== undefined;

  // Format price for display (Polar uses cents)
  const formattedPrice =
    price !== null
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
        }).format(price / 100)
      : null;

  const handleClick = () => {
    onUpgrade(productSlug);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={tierConfig.color}>{tierConfig.label}</CardTitle>
          {savings !== null && savings > 0 && (
            <Badge variant="secondary">Save {savings}%</Badge>
          )}
        </div>
        <CardDescription>{tierConfig.description}</CardDescription>
        <div className="mt-2">
          {formattedPrice ? (
            <>
              <span className="font-bold text-3xl">{formattedPrice}</span>
              <span className="text-muted-foreground">
                /{billingInterval === "year" ? "year" : "month"}
              </span>
            </>
          ) : (
            <span className="font-bold text-3xl text-muted-foreground">—</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Show static plan limits as features */}
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-green-600" />
            <span>{tierLimits.boards} boards</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-green-600" />
            <span>Up to {tierLimits.membersPerOrg} members</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-green-600" />
            <span>{tierLimits.feedbackPerBoard} feedback items</span>
          </li>
          {tierLimits.customBranding && (
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-green-600" />
              <span>Custom branding</span>
            </li>
          )}
          {tierLimits.apiAccess && (
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-green-600" />
              <span>API access</span>
            </li>
          )}
          {tierLimits.prioritySupport && (
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-green-600" />
              <span>Priority support</span>
            </li>
          )}
        </ul>
        <Button
          className="w-full"
          disabled={!isOwner || isThisCheckingOut || !priceLoaded}
          onClick={handleClick}
        >
          {isThisCheckingOut ? (
            <span className="animate-pulse">Redirecting...</span>
          ) : priceLoaded ? (
            <>
              Upgrade to {tierConfig.label}
              <ExternalLink className="ml-2 h-3 w-3" />
            </>
          ) : (
            <span className="animate-pulse">Loading...</span>
          )}
        </Button>
        {!isOwner && (
          <p className="text-center text-muted-foreground text-xs">
            Only the owner can upgrade
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FREE TIER CARD
// =============================================================================

type FreeTierCardProps = {
  isCurrent: boolean;
};

function FreeTierCard({ isCurrent }: FreeTierCardProps) {
  const tierConfig = PLAN_TIERS.free;
  const limits = PLAN_LIMITS.free;

  return (
    <Card className={isCurrent ? "border-primary ring-2 ring-primary/20" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={tierConfig.color}>{tierConfig.label}</CardTitle>
          {isCurrent && (
            <Badge className="text-xs" variant="default">
              Current Plan
            </Badge>
          )}
        </div>
        <CardDescription>{tierConfig.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="font-bold text-3xl">$0</span>
          <span className="text-muted-foreground text-sm">/forever</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>{limits.boards} board</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>Up to {limits.membersPerOrg} members</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            <span>{limits.feedbackPerBoard} feedback items</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            <span>Custom branding</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            <span>API access</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <X className="h-4 w-4" />
            <span>Priority support</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// CONTACT US CARD (for Team tier)
// TODO: Re-enable team tier when ready
// =============================================================================

// function ContactUsCard() {
//   const tierConfig = PLAN_TIERS.team;
//   const tierLimits = PLAN_LIMITS.team;
//
//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className={tierConfig.color}>{tierConfig.label}</CardTitle>
//         <CardDescription>{tierConfig.description}</CardDescription>
//         <div className="mt-2">
//           <span className="font-bold text-3xl">Custom</span>
//         </div>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <ul className="space-y-2 text-sm">
//           <li className="flex items-center gap-2">
//             <Check className="h-4 w-4 shrink-0 text-green-600" />
//             <span>{tierLimits.boards} boards</span>
//           </li>
//           <li className="flex items-center gap-2">
//             <Check className="h-4 w-4 shrink-0 text-green-600" />
//             <span>Up to {tierLimits.membersPerOrg} members</span>
//           </li>
//           <li className="flex items-center gap-2">
//             <Check className="h-4 w-4 shrink-0 text-green-600" />
//             <span>{tierLimits.feedbackPerBoard} feedback items</span>
//           </li>
//           <li className="flex items-center gap-2">
//             <Check className="h-4 w-4 shrink-0 text-green-600" />
//             <span>Custom branding</span>
//           </li>
//           <li className="flex items-center gap-2">
//             <Check className="h-4 w-4 shrink-0 text-green-600" />
//             <span>API access</span>
//           </li>
//           <li className="flex items-center gap-2">
//             <Check className="h-4 w-4 shrink-0 text-green-600" />
//             <span>Priority support</span>
//           </li>
//         </ul>
//         <Button asChild className="w-full" variant="outline">
//           <a href="mailto:contact@reflect-os.com">
//             Contact Us
//             <ExternalLink className="ml-2 h-3 w-3" />
//           </a>
//         </Button>
//       </CardContent>
//     </Card>
//   );
// }
