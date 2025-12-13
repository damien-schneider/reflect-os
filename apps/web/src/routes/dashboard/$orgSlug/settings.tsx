import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ExternalLink, Globe, Lock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Schema } from "@/schema";

export const Route = createFileRoute("/dashboard/$orgSlug/settings")({
  component: DashboardSettings,
});

function DashboardSettings() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const z = useZero<Schema>();

  // Get organization
  const [orgs] = useQuery(z.query.organization.where("slug", "=", orgSlug));
  const org = orgs?.[0];

  // Form state
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [customCss, setCustomCss] = useState("");
  const [logoError, setLogoError] = useState(false);

  // Track which org we've initialized the form for
  const initializedOrgId = useRef<string | null>(null);

  // Initialize form when org loads or changes to a different org
  useEffect(() => {
    if (org && initializedOrgId.current !== org.id) {
      initializedOrgId.current = org.id;
      setName(org.name);
      setLogo(org.logo ?? "");
      setPrimaryColor(org.primaryColor ?? "#3b82f6");
      setCustomCss(org.customCss ?? "");
    }
  }, [org]);

  // Auto-save individual fields
  const saveField = useCallback(
    async (field: string, value: unknown) => {
      if (!org) {
        return;
      }
      await z.mutate.organization.update({
        id: org.id,
        [field]: value,
      });
    },
    [org, z.mutate.organization]
  );

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
            onBlur={() => {
              if (name.trim() && name.trim() !== org.name) {
                saveField("name", name.trim());
              }
            }}
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
              onBlur={() => {
                const newLogo = logo.trim() || undefined;
                if (newLogo !== (org.logo ?? undefined)) {
                  saveField("logo", newLogo);
                }
              }}
              onChange={(e) => {
                setLogo(e.target.value);
                setLogoError(false);
              }}
              placeholder="https://example.com/logo.png"
              value={logo}
            />
            {logo.length > 0 && !logoError ? (
              <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                <img
                  alt="Logo preview"
                  className="max-h-8 max-w-8 object-contain"
                  height={32}
                  onError={() => setLogoError(true)}
                  src={logo}
                  width={32}
                />
              </div>
            ) : null}
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

          {org.isPublic === true ? (
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
          ) : null}
        </div>

        <p className="text-muted-foreground text-xs">
          When your organization is public, visitors can see your public boards
          and submit feedback. You can control individual board visibility from
          the{" "}
          <Link
            className="text-primary hover:underline"
            params={{ orgSlug }}
            to="/dashboard/$orgSlug"
          >
            Dashboard
          </Link>{" "}
          or directly in each board&apos;s settings.
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
              onBlur={() => {
                if (primaryColor !== (org.primaryColor ?? "#3b82f6")) {
                  saveField("primaryColor", primaryColor || undefined);
                }
              }}
              onChange={(e) => setPrimaryColor(e.target.value)}
              type="color"
              value={primaryColor}
            />
            <Input
              className="flex-1"
              onBlur={() => {
                if (primaryColor !== (org.primaryColor ?? "#3b82f6")) {
                  saveField("primaryColor", primaryColor || undefined);
                }
              }}
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
            onBlur={() => {
              const newCss = customCss.trim() || undefined;
              if (newCss !== (org.customCss ?? undefined)) {
                saveField("customCss", newCss);
              }
            }}
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
    </div>
  );
}
