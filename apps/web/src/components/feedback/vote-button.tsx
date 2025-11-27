import { useZero, useQuery } from "@rocicorp/zero/react";
import { ChevronUp } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../lib/utils";
import { authClient } from "../../lib/auth-client";
import type { Schema } from "../../schema";
import { randID } from "../../rand";

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
  const z = useZero<Schema>();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  // Check if user has voted
  const [votes] = useQuery(
    z.query.vote
      .where("feedbackId", "=", feedbackId)
      .where("userId", "=", userId ?? "")
  );

  const hasVoted = votes && votes.length > 0;
  const userVote = hasVoted ? votes[0] : null;

  const handleVote = async () => {
    if (!userId) {
      // Redirect to login
      navigate({ to: "/login" });
      return;
    }

    if (hasVoted && userVote) {
      // Remove vote
      await z.mutate.vote.delete({ id: userVote.id });
      // Decrement vote count
      await z.mutate.feedback.update({
        id: feedbackId,
        voteCount: Math.max(0, voteCount - 1),
      });
    } else {
      // Add vote
      await z.mutate.vote.insert({
        id: randID(),
        feedbackId,
        userId,
        createdAt: Date.now(),
      });
      // Increment vote count
      await z.mutate.feedback.update({
        id: feedbackId,
        voteCount: voteCount + 1,
      });
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
      variant={hasVoted ? "default" : "outline"}
      onClick={handleVote}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 font-semibold",
        sizeClasses[size],
        hasVoted && "bg-primary text-primary-foreground",
        className
      )}
    >
      <ChevronUp className={iconSizes[size]} />
      <span>{voteCount}</span>
    </Button>
  );

  // Show tooltip for unauthenticated users
  if (!userId) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>
          <p>Sign in to vote</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}
