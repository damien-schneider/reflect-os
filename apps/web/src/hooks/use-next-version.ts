import { useQuery } from "@rocicorp/zero/react";
import { zql } from "@/schema";

type VersionIncrement = "patch" | "minor" | "major";

interface ChangelogSettings {
  autoVersioning?: boolean;
  versionIncrement?: VersionIncrement;
  versionPrefix?: string;
}

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prefix: string;
}

// Regex to match semver versions with optional prefix
const VERSION_REGEX = /^([^\d]*)(\d+)\.(\d+)\.(\d+)/u;

/**
 * Parse a version string like "v1.2.3" or "1.2.3" into components
 */
function parseVersion(version: string): ParsedVersion | null {
  const match = VERSION_REGEX.exec(version);
  if (!match) {
    return null;
  }

  const [, prefix, major, minor, patch] = match;
  return {
    prefix: prefix ?? "",
    major: Number.parseInt(major ?? "0", 10),
    minor: Number.parseInt(minor ?? "0", 10),
    patch: Number.parseInt(patch ?? "0", 10),
  };
}

/**
 * Format a parsed version back to a string
 */
function formatVersion(version: ParsedVersion, customPrefix?: string): string {
  const prefix = customPrefix ?? version.prefix;
  return `${prefix}${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Increment a version based on the increment type
 */
function incrementVersion(
  version: ParsedVersion,
  type: VersionIncrement
): ParsedVersion {
  switch (type) {
    case "major":
      return { ...version, major: version.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { ...version, minor: version.minor + 1, patch: 0 };
    case "patch":
      return { ...version, patch: version.patch + 1 };
    default:
      return version;
  }
}

/**
 * Compare two versions, returns positive if a > b, negative if a < b, 0 if equal
 */
function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

/**
 * Hook to get the next suggested version for a release
 */
export function useNextVersion(organizationId: string | undefined) {
  // Get all releases for this organization
  const [releases] = useQuery(
    zql.release.where("organizationId", organizationId ?? "__none__")
  );

  // Get the organization to access changelog settings
  const [orgs] = useQuery(
    zql.organization.where("id", organizationId ?? "__none__")
  );
  const org = orgs?.[0];
  const settings = org?.changelogSettings as ChangelogSettings | undefined;

  // Find the latest version across all releases
  const latestVersion = (() => {
    if (!releases?.length) {
      return null;
    }

    let latest: ParsedVersion | null = null;

    for (const release of releases) {
      if (!release.version) {
        continue;
      }
      const parsed = parseVersion(release.version as string);
      if (parsed && (!latest || compareVersions(parsed, latest) > 0)) {
        latest = parsed;
      }
    }

    return latest;
  })();

  /**
   * Get the next version based on the specified increment type
   */
  const getNextVersion = (type: VersionIncrement): string => {
    const prefix = settings?.versionPrefix ?? "v";

    if (!latestVersion) {
      // No existing versions, start at 0.0.1, 0.1.0, or 1.0.0 based on type
      switch (type) {
        case "major":
          return `${prefix}1.0.0`;
        case "minor":
          return `${prefix}0.1.0`;
        default:
          return `${prefix}0.0.1`;
      }
    }

    const nextVersion = incrementVersion(latestVersion, type);
    return formatVersion(nextVersion, prefix);
  };

  /**
   * Get the suggested next version based on the default increment setting
   */
  const suggestedVersion = getNextVersion(
    settings?.versionIncrement ?? "patch"
  );

  return {
    /** Whether auto-versioning is enabled in settings */
    autoVersioningEnabled: settings?.autoVersioning ?? false,
    /** The default increment type from settings */
    defaultIncrement:
      settings?.versionIncrement ?? ("patch" as VersionIncrement),
    /** The version prefix from settings */
    versionPrefix: settings?.versionPrefix ?? "v",
    /** The latest parsed version found in releases */
    latestVersion,
    /** The latest version as a formatted string, or null if none */
    latestVersionString: latestVersion
      ? formatVersion(latestVersion, settings?.versionPrefix ?? "v")
      : null,
    /** Get the next version for a specific increment type */
    getNextVersion,
    /** The suggested next version based on default settings */
    suggestedVersion,
    /** Utility to parse a version string */
    parseVersion,
    /** Utility to format a parsed version */
    formatVersion,
  };
}

export type { VersionIncrement, ParsedVersion, ChangelogSettings };
