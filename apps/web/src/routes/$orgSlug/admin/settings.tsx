import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ExternalLink, Globe, Lock, Save } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Separator } from "../../../components/ui/separator";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";
import type { Schema } from "../../../schema";

export const Route = createFileRoute("/$orgSlug/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Form state
  const [name, setName] = useState(org?.name ?? "");
  const [logo, setLogo] = useState(org?.logo ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    org?.primaryColor ?? "#3b82f6"
  );
  const [customCss, setCustomCss] = useState(org?.customCss ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Update form when org loads
  if (org && name !== org.name && !isSaving) {
    setName(org.name);
    setLogo(org.logo ?? "");
    setPrimaryColor(org.primaryColor ?? "#3b82f6");
    setCustomCss(org.customCss ?? "");
  }

  const handleSave = async () => {
    if (!org) {
      return;
    }

    setIsSaving(true);
    setSaved(false);

    try {
      await z.mutate.organization.update({
        id: org.id,
        name: name.trim(),
        logo: logo.trim() || undefined,
        primaryColor: primaryColor || undefined,
        customCss: customCss.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Organization Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Customize your organization's branding and appearance
        </p>
      </div>

      {/* General Settings */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">General</h2>

        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Organization"
            value={name}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo URL</Label>
          <div className="flex gap-3">
            <Input
              className="flex-1"
              id="logo"
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              value={logo}
            />
            {logo && (
              <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                <img
                  alt="Logo preview"
                  className="max-h-8 max-w-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                  src={logo}
                />
              </div>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            Enter a URL to your logo image (recommended: 200x200px)
          </p>
        </div>
      </div>

      <Separator />

      {/* Visibility Settings */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">Visibility</h2>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {org.isPublic ? (
                <div className="rounded-lg bg-green-500/10 p-2 text-green-600 dark:text-green-400">
                  <Globe className="h-5 w-5" />
                </div>
              ) : (
                <div className="rounded-lg bg-muted p-2 text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
              )}
              <div>
                <Label
                  className="font-medium text-base"
                  htmlFor="public-toggle"
                >
                  Public Organization
                </Label>
                <p className="text-muted-foreground text-sm">
                  {org.isPublic
                    ? "Your organization and public boards are visible to everyone"
                    : "Only organization members can access your content"}
                </p>
              </div>
            </div>
            <Switch
              checked={org.isPublic ?? false}
              id="public-toggle"
              onCheckedChange={async (checked) => {
                await z.mutate.organization.update({
                  id: org.id,
                  isPublic: checked,
                });
              }}
            />
          </div>

          {org.isPublic && (
            <div className="flex items-center justify-between border-t pt-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Globe className="mr-1 h-3 w-3" />
                  Published
                </Badge>
                <span className="text-muted-foreground text-sm">
                  /{orgSlug}
                </span>
              </div>
              <a
                className="inline-flex items-center gap-1 text-primary text-sm hover:underline"
                href={`/${orgSlug}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-3 w-3" />
                View Public Page
              </a>
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          When your organization is public, visitors can see your public boards
          and submit feedback. You can control individual board visibility in
          the{" "}
          <a
            className="text-primary hover:underline"
            href={`/${orgSlug}/admin/boards`}
          >
            Manage Boards
          </a>{" "}
          section.
        </p>
      </div>

      <Separator />

      {/* Branding */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">Branding</h2>

        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex gap-3">
            <Input
              className="h-10 w-16 cursor-pointer p-1"
              id="primaryColor"
              onChange={(e) => setPrimaryColor(e.target.value)}
              type="color"
              value={primaryColor}
            />
            <Input
              className="flex-1"
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#3b82f6"
              value={primaryColor}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Used for buttons, links, and accents
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customCss">Custom CSS</Label>
          <Textarea
            className="font-mono text-sm"
            id="customCss"
            onChange={(e) => setCustomCss(e.target.value)}
            placeholder={`/* Custom styles */
.your-class {
  /* your styles */
}`}
            rows={8}
            value={customCss}
          />
          <p className="text-muted-foreground text-xs">
            Add custom CSS to further customize the appearance. Be careful with
            this feature.
          </p>
        </div>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {saved && (
          <p className="self-center text-green-600 text-sm">Settings saved!</p>
        )}
        <Button disabled={isSaving} onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
