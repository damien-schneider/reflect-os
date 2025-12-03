import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/$orgSlug/$boardSlug")({
  component: BoardLayout,
});

function BoardLayout() {
  const { orgSlug, boardSlug } = useParams({ strict: false }) as {
    orgSlug: string;
    boardSlug: string;
  };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Get board
  const [boards] = useQuery(
    z.query.board
      .where("organizationId", "=", org?.id ?? "")
      .where("slug", "=", boardSlug)
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
