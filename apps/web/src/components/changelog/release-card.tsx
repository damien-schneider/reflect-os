import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, CheckCircle } from "lucide-react";
import type { Board, Feedback, Release } from "../../schema";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

type ReleaseCardProps = {
  release: Release & {
    feedbacks?: readonly (Feedback & {
      board?: Board | null;
    })[];
  };
  orgSlug: string;
  showFullContent?: boolean;
};

export function ReleaseCard({
  release,
  orgSlug,
  showFullContent = false,
}: ReleaseCardProps) {
  const publishDate = release.publishedAt
    ? format(new Date(release.publishedAt), "MMMM d, yyyy")
    : "Draft";

  return (
    <Card
      className={release.publishedAt ? "" : "border-amber-500/50 border-dashed"}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              {release.version && (
                <Badge className="font-mono" variant="outline">
                  {release.version}
                </Badge>
              )}
              {!release.publishedAt && (
                <Badge className="text-amber-600" variant="secondary">
                  Draft
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{release.title}</CardTitle>
            {release.description && (
              <CardDescription className="mt-2">
                {stripHtml(release.description)}
              </CardDescription>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span>{publishDate}</span>
          </div>
        </div>
      </CardHeader>

      {release.feedbacks && release.feedbacks.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 font-medium text-muted-foreground text-sm">
              <CheckCircle className="h-4 w-4" />
              {release.feedbacks.length} Completed Item
              {release.feedbacks.length !== 1 ? "s" : ""}
            </h4>
            <ul
              className={`space-y-2 ${!showFullContent && release.feedbacks.length > 5 ? "" : ""}`}
            >
              {(showFullContent
                ? release.feedbacks
                : release.feedbacks.slice(0, 5)
              ).map((feedback) => (
                <li className="flex items-start gap-2" key={feedback.id}>
                  <span className="mt-1 text-green-600">•</span>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="font-medium hover:underline"
                      params={{
                        orgSlug,
                        boardSlug: feedback.board?.slug ?? "",
                        feedbackId: feedback.id,
                      }}
                      to="/$orgSlug/$boardSlug/$feedbackId"
                    >
                      {feedback.title}
                    </Link>
                    {feedback.board && (
                      <span className="ml-2 text-muted-foreground text-xs">
                        in {feedback.board.name}
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {!showFullContent && release.feedbacks.length > 5 && (
                <li className="text-muted-foreground text-sm">
                  +{release.feedbacks.length - 5} more items
                </li>
              )}
            </ul>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Helper to strip HTML tags for preview
function stripHtml(html: string): string {
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  } catch {
    return html;
  }
}
