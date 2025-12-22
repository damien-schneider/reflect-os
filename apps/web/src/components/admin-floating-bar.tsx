import { Button } from "@repo/ui/components/button";
import { Link, type LinkProps } from "@tanstack/react-router";
import { PencilLine, X } from "lucide-react";
import { useState } from "react";

type AdminFloatingBarProps = {
  /** The link to the dashboard edit page */
  dashboardLink: Pick<LinkProps, "to" | "params">;
  /** Optional message to display */
  message?: string;
};

/**
 * A floating admin bar that appears at the bottom of public pages
 * when the current user is a member/owner of the organization.
 * Provides a quick link to go back to the dashboard to edit.
 */
export function AdminFloatingBar({
  dashboardLink,
  message = "You are viewing this page as an admin",
}: AdminFloatingBarProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-full border bg-background/95 px-4 py-2 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-1.5">
            <PencilLine className="h-4 w-4 text-primary" />
          </div>
          <span className="text-muted-foreground text-sm">{message}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link {...dashboardLink} />} size="sm">
            Edit in Dashboard
          </Button>
          <Button
            aria-label="Dismiss"
            onClick={() => setIsDismissed(true)}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
