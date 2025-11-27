import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { STATUS_CONFIG, type FeedbackStatus } from "../../lib/constants";

interface StatusBadgeProps {
  status: FeedbackStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as FeedbackStatus] ?? {
    label: status,
    variant: "outline" as const,
    className: "",
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
