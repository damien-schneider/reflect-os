import { useState } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { Save, Globe, Lock, ExternalLink } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";
import { Separator } from "../../../components/ui/separator";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
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
  const [primaryColor, setPrimaryColor] = useState(org?.primaryColor ?? "#3b82f6");
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
    if (!org) return;

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground mt-1">
          Customize your organization's branding and appearance
        </p>
      </div>

      {/* General Settings */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">General</h2>

        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Organization"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">Logo URL</Label>
          <div className="flex gap-3">
            <Input
              id="logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="flex-1"
            />
            {logo && (
              <div className="h-10 w-10 border rounded flex items-center justify-center bg-muted">
                <img
                  src={logo}
                  alt="Logo preview"
                  className="max-h-8 max-w-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a URL to your logo image (recommended: 200x200px)
          </p>
        </div>
      </div>

      <Separator />

      {/* Visibility Settings */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Visibility</h2>

        <div className="p-4 border rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {org.isPublic ? (
                <div className="p-2 bg-green-500/10 rounded-lg text-green-600 dark:text-green-400">
                  <Globe className="h-5 w-5" />
                </div>
              ) : (
                <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                  <Lock className="h-5 w-5" />
                </div>
              )}
              <div>
                <Label htmlFor="public-toggle" className="text-base font-medium">
                  Public Organization
                </Label>
                <p className="text-sm text-muted-foreground">
                  {org.isPublic
                    ? "Your organization and public boards are visible to everyone"
                    : "Only organization members can access your content"}
                </p>
              </div>
            </div>
            <Switch
              id="public-toggle"
              checked={org.isPublic ?? false}
              onCheckedChange={async (checked) => {
                await z.mutate.organization.update({
                  id: org.id,
                  isPublic: checked,
                });
              }}
            />
          </div>

          {org.isPublic && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  <Globe className="h-3 w-3 mr-1" />
                  Published
                </Badge>
                <span className="text-sm text-muted-foreground">
                  /{orgSlug}
                </span>
              </div>
              <a
                href={`/${orgSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View Public Page
              </a>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          When your organization is public, visitors can see your public boards and submit feedback.
          You can control individual board visibility in the{" "}
          <a
            href={`/${orgSlug}/admin/boards`}
            className="text-primary hover:underline"
          >
            Manage Boards
          </a>{" "}
          section.
        </p>
      </div>

      <Separator />

      {/* Branding */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Branding</h2>

        <div className="space-y-2">
          <Label htmlFor="primaryColor">Primary Color</Label>
          <div className="flex gap-3">
            <Input
              id="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
            />
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#3b82f6"
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Used for buttons, links, and accents
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customCss">Custom CSS</Label>
          <Textarea
            id="customCss"
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
            placeholder={`/* Custom styles */
.your-class {
  /* your styles */
}`}
            rows={8}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Add custom CSS to further customize the appearance. Be careful with this feature.
          </p>
        </div>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {saved && (
          <p className="text-sm text-green-600 self-center">
            Settings saved!
          </p>
        )}
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
