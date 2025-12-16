import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { zql } from "@/zero-schema";

export const Route = createFileRoute("/dashboard/$orgSlug/$boardSlug")({
  component: DashboardBoardLayout,
});

function DashboardBoardLayout() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };

  // Get organization
  const [orgs] = useQuery(zql.organization.where("slug", orgSlug));
  const org = orgs?.[0];

  // Get board
  const [boards] = useQuery(
    zql.board.where("organizationId", org?.id ?? "").where("slug", boardSlug)
  );
  const board = boards?.[0];

  if (!(org && board)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Board not found</p>
      </div>
    );
  }

  return <Outlet />;
}
