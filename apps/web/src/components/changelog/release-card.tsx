import { format } from "date-fns";
import { Calendar, CheckCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import type { Release, Feedback, Board } from "../../schema";

interface ReleaseCardProps {
  release: Release & {
    feedbacks?: readonly (Feedback & {
      board?: Board | null;
    })[];
  };
  orgSlug: string;
  showFullContent?: boolean;
}

export function ReleaseCard({ release, orgSlug, showFullContent = false }: ReleaseCardProps) {
  const publishDate = release.publishedAt 
    ? format(new Date(release.publishedAt), "MMMM d, yyyy")
    : "Draft";

  return (
    <Card className={release.publishedAt ? "" : "border-dashed border-amber-500/50"}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {release.version && (
                <Badge variant="outline" className="font-mono">
                  {release.version}
                </Badge>
              )}
              {!release.publishedAt && (
                <Badge variant="secondary" className="text-amber-600">
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
          <div className="flex items-center gap-1 text-muted-foreground text-sm shrink-0">
            <Calendar className="h-4 w-4" />
            <span>{publishDate}</span>
          </div>
        </div>
      </CardHeader>
      
      {release.feedbacks && release.feedbacks.length > 0 && (
        <CardContent>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {release.feedbacks.length} Completed Item{release.feedbacks.length !== 1 ? "s" : ""}
            </h4>
            <ul className={`space-y-2 ${!showFullContent && release.feedbacks.length > 5 ? "" : ""}`}>
              {(showFullContent ? release.feedbacks : release.feedbacks.slice(0, 5)).map((feedback) => (
                <li key={feedback.id} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  <div className="flex-1 min-w-0">
                    <Link
                      to="/$orgSlug/$boardSlug/$feedbackId"
                      params={{ 
                        orgSlug, 
                        boardSlug: feedback.board?.slug ?? "",
                        feedbackId: feedback.id 
                      }}
                      className="hover:underline font-medium"
                    >
                      {feedback.title}
                    </Link>
                    {feedback.board && (
                      <span className="text-xs text-muted-foreground ml-2">
                        in {feedback.board.name}
                      </span>
                    )}
                  </div>
                </li>
              ))}
              {!showFullContent && release.feedbacks.length > 5 && (
                <li className="text-sm text-muted-foreground">
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
