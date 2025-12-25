import { createFileRoute } from "@tanstack/react-router";
import { BoardView } from "@/features/board/components/board-view";

export const Route = createFileRoute("/dashboard/$orgSlug/$boardSlug/")({
  component: DashboardBoardIndex,
});

function DashboardBoardIndex() {
  return <BoardView isAdmin showAdminControls wrapperClassName="" />;
}
