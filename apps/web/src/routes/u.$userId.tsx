import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calendar, ChevronUp, MessageSquare, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/features/feedback/components/status-badge";
import type { FeedbackStatus } from "@/lib/constants";
import { zql } from "@/zero-schema";

export const Route = createFileRoute("/u/$userId")({
  component: UserProfile,
});

function UserProfile() {
  const { userId } = Route.useParams();

  // Get user info
  const [users] = useQuery(zql.user.where("id", userId));
  const user = users?.[0];

  // Get user's public feedback (from public boards only)
  const [allFeedback] = useQuery(
    zql.feedback
      .where("authorId", userId)
      .related("board")
      .orderBy("createdAt", "desc")
  );

  // Filter to only public boards
  const publicFeedback = allFeedback?.filter((f) => f.board?.isPublic) ?? [];

  // Get user's votes
  const [votes] = useQuery(zql.vote.where("userId", userId));

  // Get user's comments on public feedback
  const [allComments] = useQuery(
    zql.comment
      .where("authorId", userId)
      .related("feedback", (fb) => fb.one().related("board"))
      .orderBy("createdAt", "desc")
  );

  // Filter to only comments on public feedback
  const publicComments =
    allComments?.filter((c) => c.feedback?.board?.isPublic) ?? [];

  // Stats
  const totalVotes = votes?.length ?? 0;
  const totalFeedback = publicFeedback.length;
  const totalComments = publicComments.length;

  if (!user) {
    return (
      <div className="container mx-auto max-w-4xl py-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* User Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted">
          {user.avatar ? (
            <img
              alt={user.name}
              className="h-full w-full object-cover"
              height={80}
              src={user.avatar}
              width={80}
            />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="font-bold text-2xl">{user.name}</h1>
          {user.bio && <p className="text-muted-foreground">{user.bio}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-bold text-3xl">{totalFeedback}</div>
              <div className="text-muted-foreground text-sm">Feedback</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-bold text-3xl">{totalVotes}</div>
              <div className="text-muted-foreground text-sm">Votes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="font-bold text-3xl">{totalComments}</div>
              <div className="text-muted-foreground text-sm">Comments</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      {/* Recent Feedback */}
      <div className="space-y-6">
        <h2 className="font-semibold text-xl">Recent Feedback</h2>

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
                      <span className="font-medium text-sm">
                        {feedback.voteCount}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="line-clamp-1 font-medium hover:text-primary"
                          params={{
                            orgSlug: feedback.board?.organizationId ?? "",
                            boardSlug: feedback.board?.slug ?? "",
                            feedbackId: feedback.id,
                          }}
                          to="/$orgSlug/$boardSlug/$feedbackId"
                        >
                          {feedback.title}
                        </Link>
                        <StatusBadge
                          status={feedback.status as FeedbackStatus}
                        />
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </span>
                        {feedback.board && (
                          <Badge className="text-xs" variant="outline">
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
        <h2 className="font-semibold text-xl">Recent Comments</h2>

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
                    <MessageSquare className="mt-1 h-4 w-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div
                        className="line-clamp-2 text-sm"
                        dangerouslySetInnerHTML={{ __html: comment.body }}
                      />
                      <div className="mt-2 flex items-center gap-2 text-muted-foreground text-xs">
                        <span>
                          on{" "}
                          {comment.feedback && (
                            <Link
                              className="hover:text-primary"
                              params={{
                                orgSlug:
                                  comment.feedback.board?.organizationId ?? "",
                                boardSlug: comment.feedback.board?.slug ?? "",
                                feedbackId: comment.feedbackId,
                              }}
                              to="/$orgSlug/$boardSlug/$feedbackId"
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
