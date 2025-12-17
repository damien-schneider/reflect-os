/**
 * @repo/email
 *
 * Email sending package using Resend.
 *
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                         FILE ORGANIZATION                                  ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  📝 EDIT THESE FILES:                                                      ║
 * ║     src/config.ts          - Email configuration (from address, etc.)      ║
 * ║     src/templates/*.tsx    - Email templates (React Email)                 ║
 * ║                                                                            ║
 * ║  🔧 IMPLEMENTATION FILES (do not edit unless extending):                   ║
 * ║     src/lib/client.ts      - Resend client and sending logic               ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

// =============================================================================
// CONFIGURATION (from config.ts - the file you should edit)
// =============================================================================
export type { EmailConfig } from "./config";
export { formatFromAddress, getEmailConfig } from "./config";
// =============================================================================
// CLIENT (from lib/client.ts - implementation)
// =============================================================================
export type {
  ResendErrorCode,
  SendEmailOptions,
  SendEmailResult,
} from "./lib/client";
export { sendBatchEmails, sendEmail } from "./lib/client";
// =============================================================================
// TEMPLATES (from templates/ - add new email templates here)
// =============================================================================
export type {
  ChangelogUpdateProps,
  EmailTemplateMap,
  EmailTemplateName,
  EmailTemplateProps,
  ResetPasswordProps,
  VerifyEmailProps,
  WelcomeProps,
} from "./templates";
export {
  ChangelogUpdateTemplate,
  ResetPasswordTemplate,
  VerifyEmailTemplate,
  WelcomeTemplate,
} from "./templates";
