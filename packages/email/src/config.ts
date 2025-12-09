/**
 * Email configuration
 *
 * Development: Uses Resend's test domain (onboarding@resend.dev)
 * Production: Uses custom domain from EMAIL_FROM_ADDRESS env var
 */

export type EmailConfig = {
  apiKey: string;
  fromAddress: string;
  fromName: string;
  isDevelopment: boolean;
};

const RESEND_DEV_FROM = "onboarding@resend.dev";
const DEFAULT_FROM_NAME = "Reflet";

export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const isDevelopment = process.env.NODE_ENV !== "production";
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ?? (isDevelopment ? RESEND_DEV_FROM : "");
  const fromName = process.env.EMAIL_FROM_NAME ?? DEFAULT_FROM_NAME;

  return {
    apiKey,
    fromAddress,
    fromName,
    isDevelopment,
  };
}

export function formatFromAddress(config: EmailConfig): string {
  return `${config.fromName} <${config.fromAddress}>`;
}
