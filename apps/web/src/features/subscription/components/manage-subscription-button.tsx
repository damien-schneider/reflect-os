import { CreditCard } from "lucide-react";
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

  const handleManage = async () => {
    if (!canManage) {
      return;
    }

    setIsOpening(true);
    try {
      await openPortal();
    } catch (error) {
      console.error("Failed to open portal:", error);
    } finally {
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
  );
}
