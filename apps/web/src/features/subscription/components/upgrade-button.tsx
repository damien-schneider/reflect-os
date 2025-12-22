import { Button } from "@repo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { Crown, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  useCanManageSubscription,
  useSubscription,
  useSubscriptionCheckout,
} from "../hooks/use-subscription";

type UpgradeButtonProps = {
  productId: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
};

/**
 * Upgrade button that initiates Polar checkout.
 * Only enabled for organization owners.
 */
export function UpgradeButton({
  productId,
  variant = "default",
  size = "default",
  className,
  children,
}: UpgradeButtonProps) {
  const { isFreePlan, isLoading } = useSubscription();
  const { canManage, isOwner } = useCanManageSubscription();
  const { initiateCheckout } = useSubscriptionCheckout();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleUpgrade = async () => {
    if (!canManage) {
      return;
    }

    setIsCheckingOut(true);
    try {
      await initiateCheckout(productId);
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Don't show if already on paid plan or still loading
  if (!(isFreePlan || isLoading)) {
    return null;
  }

  // If not owner, show disabled button with tooltip
  if (!isOwner) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={<span className="inline-block" />}>
            <Button
              className={className}
              disabled
              size={size}
              variant={variant}
            >
              <Crown className="mr-2 h-4 w-4" />
              {children ?? "Upgrade"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Only the organization owner can upgrade the plan</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      className={className}
      disabled={isCheckingOut || isLoading}
      onClick={handleUpgrade}
      size={size}
      variant={variant}
    >
      {isCheckingOut ? (
        <span className="animate-pulse">Redirecting...</span>
      ) : (
        <>
          <Crown className="mr-2 h-4 w-4" />
          {children ?? "Upgrade to Pro"}
          <ExternalLink className="ml-2 h-3 w-3" />
        </>
      )}
    </Button>
  );
}
