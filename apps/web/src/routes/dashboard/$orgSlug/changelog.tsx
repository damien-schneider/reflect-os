import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$orgSlug/changelog")({
  component: DashboardChangelogLayout,
});

function DashboardChangelogLayout() {
  return <Outlet />;
}
