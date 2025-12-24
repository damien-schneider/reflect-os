/**
 * Invitation Utilities
 *
 * Helper functions for handling invite links and invitation state through auth flows.
 */

// Valid invite ID pattern: alphanumeric with hyphens, 1-50 chars
const INVITE_ID_PATTERN = /^[a-zA-Z0-9-]{1,50}$/;

// Pattern for extracting invite ID from path
const INVITE_PATH_PATTERN = /^\/invite\/([a-zA-Z0-9-]+)$/;

/**
 * Parse invitation parameters from URL search params.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @returns Object with inviteId and orgName (if present)
 */
export function parseInviteParams(searchParams: URLSearchParams): {
  inviteId: string | null;
  orgName: string | undefined;
} {
  const inviteId = searchParams.get("inviteId");
  const orgName = searchParams.get("orgName") ?? undefined;

  return {
    inviteId: inviteId && isValidInviteId(inviteId) ? inviteId : null,
    orgName,
  };
}

/**
 * Build a login URL with invitation parameters.
 *
 * @param inviteId - The invitation ID to include
 * @param orgName - Optional organization name to display
 * @returns Login URL with encoded invite params
 */
export function buildInviteLoginUrl(
  inviteId: string,
  orgName?: string
): string {
  const params = new URLSearchParams();
  params.set("inviteId", inviteId);

  if (orgName) {
    params.set("orgName", orgName);
  }

  return `/login?${params.toString()}`;
}

/**
 * Validate an invitation ID format.
 * Prevents XSS and path traversal attacks.
 *
 * @param inviteId - The invitation ID to validate
 * @returns True if the ID is valid format
 */
export function isValidInviteId(inviteId: string): boolean {
  if (!inviteId || typeof inviteId !== "string") {
    return false;
  }

  return INVITE_ID_PATTERN.test(inviteId);
}

/**
 * Check if current URL has pending invitation params.
 *
 * @param searchParams - URLSearchParams from the current URL
 * @returns True if there's a valid invite pending
 */
export function hasPendingInvite(searchParams: URLSearchParams): boolean {
  const { inviteId } = parseInviteParams(searchParams);
  return inviteId !== null;
}

/**
 * Clear invitation params from URL without navigation.
 * Useful after an invitation has been processed.
 *
 * @returns New URL path without invite params
 */
export function clearInviteParams(currentUrl: string): string {
  const url = new URL(currentUrl, window.location.origin);
  url.searchParams.delete("inviteId");
  url.searchParams.delete("orgName");

  const remaining = url.searchParams.toString();
  return remaining ? `${url.pathname}?${remaining}` : url.pathname;
}

/**
 * Build an invite link from an invitation ID.
 *
 * @param invitationId - The invitation ID
 * @returns Full invite link path
 */
export function buildInviteLink(invitationId: string): string {
  return `/invite/${invitationId}`;
}

/**
 * Extract invitation ID from an invite link path.
 *
 * @param path - URL path like /invite/abc123
 * @returns The invitation ID or null if invalid
 */
export function extractInviteIdFromPath(path: string): string | null {
  const match = path.match(INVITE_PATH_PATTERN);
  if (!match?.[1]) {
    return null;
  }

  return isValidInviteId(match[1]) ? match[1] : null;
}
