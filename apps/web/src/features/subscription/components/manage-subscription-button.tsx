import { AlertCircle, CreditCard } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useCanManageSubscription,
  useCustomerPortal,
  useSubscription,
} from "../hooks/use-subscription";

type ManageSubscriptionButtonProps = {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
};

/**
 * Button to open Polar customer portal for managing subscription.
 * Only enabled for organization owners with an active subscription.
 */
export function ManageSubscriptionButton({
  variant = "outline",
  size = "default",
  className,
  children,
}: ManageSubscriptionButtonProps) {
  const { isPaidPlan, isLoading } = useSubscription();
  const { canManage, isOwner } = useCanManageSubscription();
  const { openPortal } = useCustomerPortal();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManage = async () => {
    console.log("[ManageSubscriptionButton] handleManage called");
    console.log("[ManageSubscriptionButton] canManage:", canManage);
    console.log("[ManageSubscriptionButton] isOwner:", isOwner);

    if (!canManage) {
      console.log("[ManageSubscriptionButton] Cannot manage, returning early");
      return;
    }

    setIsOpening(true);
    setError(null);
    console.log("[ManageSubscriptionButton] Calling openPortal()...");
    try {
      await openPortal();
      console.log("[ManageSubscriptionButton] openPortal() completed");
    } catch (err) {
      console.error("[ManageSubscriptionButton] openPortal() failed:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to open subscription portal";
      console.error("[ManageSubscriptionButton] Setting error:", errorMessage);
      setError(errorMessage);
    } finally {
      console.log("[ManageSubscriptionButton] Setting isOpening to false");
      setIsOpening(false);
    }
  };

  // Don't show if on free plan
  if (!(isPaidPlan || isLoading)) {
    return null;
  }

  // If not owner, show disabled button with tooltip
  if (!isOwner) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                className={className}
                disabled
                size={size}
                variant={variant}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {children ?? "Manage Subscription"}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Only the organization owner can manage the subscription</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        className={className}
        disabled={isOpening || isLoading}
        onClick={handleManage}
        size={size}
        variant={variant}
      >
        {isOpening ? (
          <span className="animate-pulse">Opening...</span>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            {children ?? "Manage Subscription"}
          </>
        )}
      </Button>
      {error && (
        <p className="flex items-center gap-1 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
