import { createFileRoute } from "@tanstack/react-router";
import { BoardView } from "@/features/board/components/board-view";

export const Route = createFileRoute("/$orgSlug/$boardSlug/")({
  component: BoardIndex,
});

function BoardIndex() {
  return <BoardView isAdmin={false} showAdminControls={false} />;
}
