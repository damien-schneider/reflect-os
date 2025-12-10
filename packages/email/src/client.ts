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

/**
 * Resend API error codes from:
 * https://resend.com/docs/api-reference/errors
 */
export type ResendErrorCode =
  | "validation_error"
  | "invalid_from_address"
  | "missing_api_key"
  | "rate_limit_exceeded"
  | "application_error"
  | "internal_server_error";

export type SendEmailResult =
  | {
      success: true;
      id?: string;
      error?: undefined;
      errorCode?: undefined;
      statusCode?: undefined;
    }
  | {
      success: false;
      id?: undefined;
      error: string;
      errorCode?: ResendErrorCode;
      statusCode?: number;
    };

let resendClient: Resend | null = null;

function getResendClient(apiKey: string): Resend {
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

type ResendErrorPayload = {
  message?: string;
  name?: ResendErrorCode | string;
  statusCode?: number;
};

const testModeAddressPattern =
  /only send testing emails to your own email address\s*\(([^)]+)\)/i;

/**
 * Normalize Resend SDK errors to a consistent SendEmailResult format.
 * Extracts HTTP status codes and error codes from the Resend API response.
 * For validation_error in test mode, includes the allowed test address in guidance.
 *
 * @see https://resend.com/docs/api-reference/errors
 */
const normalizeResendError = (error: unknown): SendEmailResult => {
  const payload = (error as ResendErrorPayload) ?? {};
  const statusCode = Number.isInteger(payload.statusCode)
    ? Number(payload.statusCode)
    : undefined;
  const rawMessage = payload.message ?? "Failed to send email";
  const errorCode = payload.name as ResendErrorCode | undefined;

  // Enhance validation_error messages with actionable guidance for test mode
  if (
    errorCode === "validation_error" &&
    rawMessage.toLowerCase().includes("testing")
  ) {
    const allowedAddress = testModeAddressPattern.exec(rawMessage)?.[1];
    const guidance = allowedAddress
      ? `Email sending is restricted in Resend test mode. Use the authorized test address ${allowedAddress} or verify a domain and update the From address.`
      : "Email sending is restricted in Resend test mode. Use the authorized test address or verify a domain and update the From address.";

    return {
      success: false,
      statusCode: statusCode ?? 403,
      errorCode,
      error: guidance,
    };
  }

  return {
    success: false,
    statusCode,
    errorCode,
    error: rawMessage,
  };
};

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
      return normalizeResendError(error);
    }

    return {
      success: true,
      id: data?.id,
    };
  } catch (err) {
    const normalizedError = normalizeResendError(err);
    console.error("[email] Error sending email:", normalizedError.error);
    return normalizedError;
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
