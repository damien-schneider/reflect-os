import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChangelogSettings } from "@/features/changelog/components/changelog-settings";
import { zql } from "@/zero-schema";

export const Route = createFileRoute("/dashboard/$orgSlug/changelog/settings")({
  component: ChangelogSettingsPage,
});

function ChangelogSettingsPage() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };

  // Get organization
  const [orgs] = useQuery(zql.organization.where("slug", orgSlug));
  const org = orgs?.[0];

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="wrapper-content space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Changelog Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure how your changelog releases are versioned and displayed
        </p>
      </div>

      {/* Changelog Settings Component */}
      <ChangelogSettings
        org={{
          id: org.id,
          changelogSettings: org.changelogSettings || undefined,
        }}
      />
    </div>
  );
}
