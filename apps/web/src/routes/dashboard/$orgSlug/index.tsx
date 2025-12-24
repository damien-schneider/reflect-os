import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/$orgSlug/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/$orgSlug/boards",
      params: { orgSlug: params.orgSlug },
    });
  },
});
