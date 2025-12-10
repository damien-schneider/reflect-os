/**
 * Email configuration
 * Requires Resend credentials to be present at startup.
 */

export type EmailConfig = {
  apiKey: string;
  fromAddress: string;
  fromName: string;
  isDevelopment: boolean;
};

const DEFAULT_FROM_NAME = "Reflet";

export function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send email");
  }

  const isDevelopment = process.env.NODE_ENV !== "production";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  if (!fromAddress) {
    throw new Error("EMAIL_FROM_ADDRESS is required to send email");
  }

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
