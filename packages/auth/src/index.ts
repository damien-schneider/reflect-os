/**
 * @repo/auth
 *
 * Better Auth configuration and helpers package.
 *
 * Features:
 * - Auth configuration with feature flags
 * - Organization plugin with member limits
 * - Email handlers (verification, password reset)
 * - Integration with @repo/polar for subscription limits
 *
 * Usage:
 * ```typescript
 * import {
 *   createAuthConfigFromEnv,
 *   createOrganizationHooks,
 *   createEmailHandlers,
 * } from "@repo/auth";
 *
 * const authConfig = createAuthConfigFromEnv(process.env);
 * const orgHooks = createOrganizationHooks({ pool: dbPool, authConfig });
 * const emailHandlers = createEmailHandlers(authConfig);
 * ```
 */

export type { AuthConfig } from "./config";
// Config
export {
  assertAuthConfig,
  createAuthConfigFromEnv,
  validateAuthConfig,
} from "./config";
// Email
export {
  createEmailHandlers,
  DEFAULT_VERIFICATION_CALLBACK,
  transformVerificationUrl,
} from "./email";
export type {
  OrganizationHooksConfig,
  OrgMemberLimitInfo,
} from "./organization";
// Organization
export {
  createOrganizationHooks,
  generateUniqueSlug,
  getOrgMemberLimitInfo,
  getPendingInvitationCount,
} from "./organization";
