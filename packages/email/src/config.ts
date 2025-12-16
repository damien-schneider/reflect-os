/**
 * Email configuration
 * In production, requires Resend credentials to be present at startup.
 * In development, allows running without credentials (emails will be logged).
 */

export type EmailConfig = {
  apiKey: string | undefined;
  fromAddress: string;
  fromName: string;
  isDevelopment: boolean;
};

const DEFAULT_FROM_NAME = "Reflet";
const DEFAULT_DEV_FROM_ADDRESS = "onboarding@resend.dev";

export function getEmailConfig(): EmailConfig {
  const isDevelopment = process.env.NODE_ENV !== "production";
  const apiKey = process.env.RESEND_API_KEY;

  // In production, API key is required
  if (!(isDevelopment || apiKey)) {
    throw new Error("RESEND_API_KEY is required in production");
  }

  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ||
    (isDevelopment ? DEFAULT_DEV_FROM_ADDRESS : undefined);

  // In production, from address is required
  if (!(isDevelopment || fromAddress)) {
    throw new Error("EMAIL_FROM_ADDRESS is required in production");
  }

  const fromName = process.env.EMAIL_FROM_NAME ?? DEFAULT_FROM_NAME;

  return {
    apiKey,
    fromAddress: fromAddress ?? DEFAULT_DEV_FROM_ADDRESS,
    fromName,
    isDevelopment,
  };
}

export function formatFromAddress(config: EmailConfig): string {
  return `${config.fromName} <${config.fromAddress}>`;
}
