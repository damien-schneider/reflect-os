import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { ChevronUp, MessageSquare, Calendar, User } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { StatusBadge } from "../components/feedback/status-badge";
import type { Schema } from "../schema";
import type { FeedbackStatus } from "../lib/constants";

export const Route = createFileRoute("/u/$userId")({
  component: UserProfile,
});

function UserProfile() {
  const { userId } = Route.useParams();
  const z = useZero<Schema>();

  // Get user info
  const [users] = useQuery(z.query.user.where("id", "=", userId));
  const user = users?.[0];

  // Get user's public feedback (from public boards only)
  const [allFeedback] = useQuery(
    z.query.feedback
      .where("authorId", "=", userId)
      .related("board")
      .orderBy("createdAt", "desc")
  );

  // Filter to only public boards
  const publicFeedback = allFeedback?.filter((f) => f.board?.isPublic) ?? [];

  // Get user's votes
  const [votes] = useQuery(z.query.vote.where("userId", "=", userId));

  // Get user's comments on public feedback
  const [allComments] = useQuery(
    z.query.comment
      .where("authorId", "=", userId)
      .related("feedback", (fb) => fb.one().related("board"))
      .orderBy("createdAt", "desc")
  );

  // Filter to only comments on public feedback
  const publicComments = allComments?.filter(
    (c) => c.feedback?.board?.isPublic
  ) ?? [];

  // Stats
  const totalVotes = votes?.length ?? 0;
  const totalFeedback = publicFeedback.length;
  const totalComments = publicComments.length;

  if (!user) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      {/* User Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          {user.bio && (
            <p className="text-muted-foreground">{user.bio}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalFeedback}</div>
              <div className="text-muted-foreground text-sm">Feedback</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalVotes}</div>
              <div className="text-muted-foreground text-sm">Votes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{totalComments}</div>
              <div className="text-muted-foreground text-sm">Comments</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Recent Feedback */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Recent Feedback</h2>

        {publicFeedback.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No public feedback yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {publicFeedback.slice(0, 10).map((feedback) => (
              <Card key={feedback.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Vote count */}
                    <div className="flex flex-col items-center text-muted-foreground">
                      <ChevronUp className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {feedback.voteCount}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to="/$orgSlug/$boardSlug/$feedbackId"
                          params={{
                            orgSlug: feedback.board?.organizationId ?? "",
                            boardSlug: feedback.board?.slug ?? "",
                            feedbackId: feedback.id,
                          }}
                          className="font-medium hover:text-primary line-clamp-1"
                        >
                          {feedback.title}
                        </Link>
                        <StatusBadge status={feedback.status as FeedbackStatus} />
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </span>
                        {feedback.board && (
                          <Badge variant="outline" className="text-xs">
                            {feedback.board.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {publicFeedback.length > 10 && (
              <p className="text-center text-muted-foreground text-sm">
                Showing 10 of {publicFeedback.length} feedback items
              </p>
            )}
          </div>
        )}
      </div>

      <Separator className="my-8" />

      {/* Recent Comments */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Recent Comments</h2>

        {publicComments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No public comments yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {publicComments.slice(0, 5).map((comment) => (
              <Card key={comment.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-sm line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: comment.body }}
                      />
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>
                          on{" "}
                          {comment.feedback && (
                            <Link
                              to="/$orgSlug/$boardSlug/$feedbackId"
                              params={{
                                orgSlug: comment.feedback.board?.organizationId ?? "",
                                boardSlug: comment.feedback.board?.slug ?? "",
                                feedbackId: comment.feedbackId,
                              }}
                              className="hover:text-primary"
                            >
                              {comment.feedback.title}
                            </Link>
                          )}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {publicComments.length > 5 && (
              <p className="text-center text-muted-foreground text-sm">
                Showing 5 of {publicComments.length} comments
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
