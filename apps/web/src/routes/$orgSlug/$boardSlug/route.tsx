import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { queries } from "@/queries";

export const Route = createFileRoute("/$orgSlug/$boardSlug")({
  component: BoardLayout,
});

function BoardLayout() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
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

  return <Outlet />;
}
