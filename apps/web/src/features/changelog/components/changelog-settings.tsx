import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { useZero } from "@rocicorp/zero/react";
import { Hash } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { mutators } from "@/mutators";

interface ChangelogSettingsProps {
  org: {
    id: string;
    changelogSettings?: {
      autoVersioning?: boolean;
      versionIncrement?: "patch" | "minor" | "major";
      versionPrefix?: string;
    };
  };
}

export function ChangelogSettings({ org }: ChangelogSettingsProps) {
  const zero = useZero();

  // Changelog settings state
  const [autoVersioning, setAutoVersioning] = useState(false);
  const [versionIncrement, setVersionIncrement] = useState<
    "patch" | "minor" | "major"
  >("patch");
  const [versionPrefix, setVersionPrefix] = useState("v");

  // Track which org we've initialized the form for
  const initializedOrgId = useRef<string | null>(null);

  // Initialize form when org loads or changes to a different org
  useEffect(() => {
    if (org && initializedOrgId.current !== org.id) {
      initializedOrgId.current = org.id;
      // Initialize changelog settings
      const settings = org.changelogSettings;
      setAutoVersioning(settings?.autoVersioning ?? false);
      setVersionIncrement(settings?.versionIncrement ?? "patch");
      setVersionPrefix(settings?.versionPrefix ?? "v");
    }
  }, [org]);

  const saveChangelogSettings = async (
    updates: Partial<{
      autoVersioning: boolean;
      versionIncrement: "patch" | "minor" | "major";
      versionPrefix: string;
    }>
  ) => {
    if (!org) {
      return;
    }
    const currentSettings = org.changelogSettings ?? {};
    await zero.mutate(
      mutators.organization.update({
        id: org.id,
        changelogSettings: {
          autoVersioning: currentSettings.autoVersioning ?? false,
          versionIncrement: currentSettings.versionIncrement ?? "patch",
          versionPrefix: currentSettings.versionPrefix ?? "v",
          ...updates,
        },
      })
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Changelog Settings</h2>

      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${autoVersioning ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
            >
              <Hash className="h-5 w-5" />
            </div>
            <div>
              <Label
                className="font-medium text-base"
                htmlFor="auto-versioning-toggle"
              >
                Auto Versioning
              </Label>
              <p className="text-muted-foreground text-sm">
                {autoVersioning
                  ? "Automatically suggest the next version when creating releases"
                  : "Manually enter version numbers for each release"}
              </p>
            </div>
          </div>
          <Switch
            checked={autoVersioning}
            id="auto-versioning-toggle"
            onCheckedChange={(checked) => {
              setAutoVersioning(checked);
              saveChangelogSettings({ autoVersioning: checked });
            }}
          />
        </div>

        {autoVersioning && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label htmlFor="version-increment">Default Increment Type</Label>
              <Select
                onValueChange={(value) => {
                  const increment = value as "patch" | "minor" | "major";
                  setVersionIncrement(increment);
                  saveChangelogSettings({ versionIncrement: increment });
                }}
                value={versionIncrement}
              >
                <SelectTrigger className="w-48" id="version-increment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patch">
                    <span className="flex items-center gap-2">
                      <span className="font-mono">Patch</span>
                      <span className="text-muted-foreground text-xs">
                        1.0.0 → 1.0.1
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value="minor">
                    <span className="flex items-center gap-2">
                      <span className="font-mono">Minor</span>
                      <span className="text-muted-foreground text-xs">
                        1.0.0 → 1.1.0
                      </span>
                    </span>
                  </SelectItem>
                  <SelectItem value="major">
                    <span className="flex items-center gap-2">
                      <span className="font-mono">Major</span>
                      <span className="text-muted-foreground text-xs">
                        1.0.0 → 2.0.0
                      </span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Pre-selected when adding a version to a release
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="version-prefix">Version Prefix</Label>
              <Input
                className="w-24 font-mono"
                id="version-prefix"
                maxLength={5}
                onBlur={() => {
                  const newPrefix = versionPrefix.trim() || "v";
                  if (
                    newPrefix !== (org.changelogSettings?.versionPrefix ?? "v")
                  ) {
                    saveChangelogSettings({ versionPrefix: newPrefix });
                  }
                }}
                onChange={(e) => setVersionPrefix(e.target.value)}
                placeholder="v"
                value={versionPrefix}
              />
              <p className="text-muted-foreground text-xs">
                Prefix added before version numbers (e.g., "v" for v1.0.0)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
