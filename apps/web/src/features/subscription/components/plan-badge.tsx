import { Badge } from "@repo/ui/components/badge";
import type { SubscriptionStatus } from "../status.config";
import { STATUS_CONFIG } from "../status.config";
import { PLAN_TIERS, type SubscriptionTier } from "../tiers.config";

interface PlanBadgeProps {
  tier: SubscriptionTier;
  className?: string;
}

/**
 * Badge component to display the current plan tier.
 */
export function PlanBadge({ tier, className }: PlanBadgeProps) {
  const config = PLAN_TIERS[tier];

  return (
    <Badge className={className} variant={config.badgeVariant}>
      {config.label}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: SubscriptionStatus;
  className?: string;
}

/**
 * Badge component to display the subscription status.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      className={`${config.className} ${className ?? ""}`}
      variant={config.variant}
    >
      {config.label}
    </Badge>
  );
}
