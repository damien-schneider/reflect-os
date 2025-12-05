/**
 * Subscription status display configuration.
 * This file rarely needs to change - only when adding new status types.
 */

/**
 * Subscription status values from Polar/database.
 */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "none";

type StatusDisplayConfig = {
  /** Display label for the status */
  label: string;
  /** Badge variant */
  variant: "default" | "secondary" | "destructive" | "outline";
  /** Additional CSS class for styling */
  className: string;
};

/**
 * Display configuration for subscription status badges.
 */
export const STATUS_CONFIG: Record<SubscriptionStatus, StatusDisplayConfig> = {
  active: {
    label: "Active",
    variant: "default",
    className: "bg-green-600 text-white",
  },
  trialing: {
    label: "Trial",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  past_due: {
    label: "Past Due",
    variant: "destructive",
    className: "",
  },
  canceled: {
    label: "Canceled",
    variant: "secondary",
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  none: {
    label: "No Subscription",
    variant: "outline",
    className: "",
  },
};
