import {
  ResponsiveDialog,
  ResponsiveDialogContent,
} from "@repo/ui/components/responsive-dialog";
import { useQuery } from "@rocicorp/zero/react";
import {
  createFileRoute,
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { FeedbackDetailContent } from "@/features/feedback/components/feedback-detail-content";
import { queries } from "@/queries";

export const Route = createFileRoute("/$orgSlug/$boardSlug")({
  component: BoardLayout,
});

interface FeedbackDetailSearch {
  modal?: boolean | string;
}

function BoardLayout() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const routerState = useRouterState();
  const navigate = useNavigate();

  // Check if we're on a feedback detail route with modal param
  const isFeedbackRoute = routerState.matches.some((m) =>
    m.routeId.includes("$feedbackId")
  );
  const search = (routerState.location.search as FeedbackDetailSearch) ?? {};
  const isModal =
    isFeedbackRoute && (search.modal === true || search.modal === "true");

  // Get feedbackId from route if on feedback route
  const feedbackMatch = routerState.matches.find((m) =>
    m.routeId.includes("$feedbackId")
  );
  const feedbackId = (
    feedbackMatch?.params as { feedbackId?: string } | undefined
  )?.feedbackId;

  const handleClose = useCallback(() => {
    navigate({
      to: "/$orgSlug/$boardSlug",
      params: { orgSlug, boardSlug },
    });
  }, [navigate, orgSlug, boardSlug]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isModal) {
      return;
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isModal, handleClose]);

  // Get organization
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  // Get board
  const [boards] = useQuery(
    queries.board.byOrgAndSlug({
      organizationId: org?.id ?? "",
      slug: boardSlug,
    })
  );
  const board = boards?.[0];

  if (!(org && board)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    );
  }

  return (
    <>
      <Outlet />

      {/* Modal overlay for feedback details */}
      {isModal && feedbackId && (
        <ResponsiveDialog
          onOpenChange={(open) => !open && handleClose()}
          open={true}
        >
          <ResponsiveDialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <FeedbackDetailContent
              boardSlug={boardSlug}
              feedbackId={feedbackId}
              onClose={handleClose}
              orgSlug={orgSlug}
            />
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      )}
    </>
  );
}
