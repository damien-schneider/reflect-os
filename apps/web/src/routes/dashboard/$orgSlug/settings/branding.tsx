import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Textarea } from "@repo/ui/components/textarea";
import { useQuery, useZero } from "@rocicorp/zero/react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { mutators } from "@/mutators";
import { queries } from "@/queries";

export const Route = createFileRoute("/dashboard/$orgSlug/settings/branding")({
  component: BrandingSettings,
});

function BrandingSettings() {
  const { orgSlug } = useParams({ strict: false }) as { orgSlug: string };
  const zero = useZero();

  // Get organization
  const [orgs] = useQuery(queries.organization.bySlug({ slug: orgSlug }));
  const org = orgs?.[0];

  // Form state
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [customCss, setCustomCss] = useState("");

  // Track which org we've initialized the form for
  const initializedOrgId = useRef<string | null>(null);

  // Initialize form when org loads or changes to a different org
  useEffect(() => {
    if (org && initializedOrgId.current !== org.id) {
      initializedOrgId.current = org.id;
      setPrimaryColor(org.primaryColor ?? "#3b82f6");
      setCustomCss(org.customCss ?? "");
    }
  }, [org]);

  // Auto-save individual fields
  const saveField = async (field: string, value: unknown) => {
    if (!org) {
      return;
    }
    await zero.mutate(
      mutators.organization.update({
        id: org.id,
        [field]: value,
      })
    );
  };

  if (!org) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Branding</h1>
        <p className="mt-1 text-muted-foreground">
          Customize your organization's colors and appearance
        </p>
      </div>

      {/* Color Settings */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">Colors</h2>

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
            Used for buttons, links, and accents on your public pages
          </p>
        </div>

        {/* Color Preview */}
        <div className="rounded-lg border p-4">
          <p className="mb-3 font-medium text-sm">Preview</p>
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-md px-4 py-2 font-medium text-sm text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: primaryColor }}
              type="button"
            >
              Primary Button
            </button>
            <button
              className="rounded-md border px-4 py-2 font-medium text-sm transition-colors hover:bg-muted"
              style={{ borderColor: primaryColor, color: primaryColor }}
              type="button"
            >
              Secondary Button
            </button>
            <span style={{ color: primaryColor }}>
              <span className="cursor-pointer underline hover:no-underline">
                Link text
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <div className="space-y-6">
        <h2 className="font-semibold text-lg">Custom CSS</h2>

        <div className="space-y-2">
          <Label htmlFor="customCss">Custom Styles</Label>
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
            placeholder={`/* Custom styles for your public pages */
.your-class {
  /* your styles */
}

/* Example: Change header background */
header {
  background-color: #f0f0f0;
}`}
            rows={12}
            value={customCss}
          />
          <p className="text-muted-foreground text-xs">
            Add custom CSS to further customize the appearance of your public
            pages. Use with caution - invalid CSS may break your page layout.
          </p>
        </div>
      </div>
    </div>
  );
}
