// Client exports

export type { SendEmailOptions, SendEmailResult } from "./client";
export { sendBatchEmails, sendEmail } from "./client";
export type { EmailConfig } from "./config";
// Config exports
export { formatFromAddress, getEmailConfig } from "./config";
export type {
  ChangelogUpdateProps,
  EmailTemplateMap,
  EmailTemplateName,
  EmailTemplateProps,
  ResetPasswordProps,
  VerifyEmailProps,
  WelcomeProps,
} from "./templates";
// Template exports
export {
  ChangelogUpdateTemplate,
  ResetPasswordTemplate,
  VerifyEmailTemplate,
  WelcomeTemplate,
} from "./templates";
