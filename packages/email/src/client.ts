import type { ReactElement } from "react";
import { Resend } from "resend";
import { type EmailConfig, formatFromAddress, getEmailConfig } from "./config";

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  template: ReactElement;
  replyTo?: string;
  config?: Partial<EmailConfig>;
};

export type SendEmailResult = {
  success: boolean;
  id?: string;
  error?: string;
};

let resendClient: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Send an email using Resend with a React Email template
 *
 * @example
 * ```ts
 * import { sendEmail } from "@repo/email/client";
 * import { VerifyEmailTemplate } from "@repo/email/templates";
 *
 * await sendEmail({
 *   to: "user@example.com",
 *   subject: "Verify your email",
 *   template: <VerifyEmailTemplate userName="John" verificationUrl="..." />,
 * });
 * ```
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const config = { ...getEmailConfig(), ...options.config };

  if (!config.apiKey) {
    throw new Error("RESEND_API_KEY is required to send email");
  }

  if (!config.fromAddress) {
    throw new Error("EMAIL_FROM_ADDRESS is required to send email");
  }

  const client = getResendClient(config.apiKey);

  try {
    const { data, error } = await client.emails.send({
      from: formatFromAddress(config),
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      react: options.template,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error("[email] Failed to send email:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      id: data?.id,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[email] Error sending email:", errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send emails to multiple recipients (batch send)
 * Each recipient gets their own email (not CC'd)
 */
export async function sendBatchEmails(
  emails: Omit<SendEmailOptions, "config">[]
): Promise<SendEmailResult[]> {
  const config = getEmailConfig();

  // Send emails in parallel with a concurrency limit
  const results = await Promise.all(
    emails.map((email) => sendEmail({ ...email, config }))
  );

  return results;
}
