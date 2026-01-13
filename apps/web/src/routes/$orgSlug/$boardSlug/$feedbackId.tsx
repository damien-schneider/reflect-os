import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { FeedbackDetailContent } from "@/features/feedback/components/feedback-detail-content";

export const Route = createFileRoute("/$orgSlug/$boardSlug/$feedbackId")({
  component: FeedbackDetail,
});

// Define search params for this route
interface FeedbackDetailSearch {
  modal?: boolean | string;
}

function FeedbackDetail() {
  const { orgSlug, boardSlug, feedbackId } = Route.useParams();
  const routerState = useRouterState();
  const search = (routerState.location.search as FeedbackDetailSearch) ?? {};

  // Check if modal mode is active
  const isModal = search.modal === true || search.modal === "true";

  // If in modal mode, return null - the parent layout handles rendering the modal
  if (isModal) {
    return null;
  }

  // Full page mode: render directly
  return (
    <FeedbackDetailContent
      boardSlug={boardSlug}
      feedbackId={feedbackId}
      orgSlug={orgSlug}
    />
  );
}
