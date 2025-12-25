import { Button } from "@repo/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { ChevronUp } from "lucide-react";
import { useAuthDialog } from "@/components/auth-dialog-provider";
import { authClient } from "@/lib/auth-client";
import { mutators } from "@/mutators";
import { queries } from "@/queries";
import { randID } from "@/rand";

interface VoteButtonProps {
  feedbackId: string;
  voteCount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VoteButton({
  feedbackId,
  voteCount,
  size = "md",
  className,
}: VoteButtonProps) {
  const zero = useZero();
  const { openAuthDialog } = useAuthDialog();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Check if user has voted
  const [votes] = useQuery(
    queries.vote.byUserAndFeedback({ userId: userId ?? "", feedbackId })
  );

  const hasVoted = votes && votes.length > 0;
  const userVote = hasVoted ? votes[0] : null;

  const handleVote = async () => {
    if (!userId) {
      // Open auth dialog instead of redirecting
      openAuthDialog();
      return;
    }

    if (hasVoted && userVote) {
      // Remove vote
      await zero.mutate(mutators.vote.delete({ id: userVote.id }));
      // Decrement vote count
      await zero.mutate(
        mutators.feedback.update({
          id: feedbackId,
          voteCount: Math.max(0, voteCount - 1),
        })
      );
    } else {
      // Add vote
      await zero.mutate(
        mutators.vote.insert({
          id: randID(),
          feedbackId,
          userId,
          createdAt: Date.now(),
        })
      );
      // Increment vote count
      await zero.mutate(
        mutators.feedback.update({
          id: feedbackId,
          voteCount: voteCount + 1,
        })
      );
    }
  };

  const sizeClasses = {
    sm: "h-8 w-10 text-xs",
    md: "h-10 w-12 text-sm",
    lg: "h-12 w-14 text-base",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const button = (
    <Button
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 font-semibold",
        sizeClasses[size],
        hasVoted && "bg-primary text-primary-foreground",
        className
      )}
      onClick={handleVote}
      variant={hasVoted ? "default" : "outline"}
    >
      <ChevronUp className={iconSizes[size]} />
      <span>{voteCount}</span>
    </Button>
  );

  // Show tooltip for unauthenticated users
  if (!userId) {
    return (
      <Tooltip>
        <TooltipTrigger render={button}>{null}</TooltipTrigger>
        <TooltipContent>
          <p>Sign in to vote</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
