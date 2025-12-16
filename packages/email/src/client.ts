import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resend } from "resend";
import { type EmailConfig, formatFromAddress, getEmailConfig } from "./config";

/**
 * Render a React element to HTML string.
 * Uses react-dom/server directly for Bun + React 19 compatibility.
 * The @react-email/render package has issues with the way Bun loads react-dom/server.
 */
function renderEmailTemplate(template: ReactElement): string {
  const html = renderToStaticMarkup(template);
  // Add the XHTML doctype that email clients expect
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">${html}`;
}

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  template: ReactElement;
  replyTo?: string;
  /** Optional tags for categorization and analytics */
  tags?: Array<{ name: string; value: string }>;
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
 * In development without RESEND_API_KEY, emails are logged to console instead.
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

  // In development without API key, log the email instead
  if (!config.apiKey) {
    if (config.isDevelopment) {
      const html = renderEmailTemplate(options.template);
      console.log("\n📧 [DEV MODE] Email would be sent:");
      console.log(
        `   To: ${Array.isArray(options.to) ? options.to.join(", ") : options.to}`
      );
      console.log(`   From: ${formatFromAddress(config)}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   HTML preview: ${html.substring(0, 200)}...`);
      console.log("   (Set RESEND_API_KEY to send actual emails)\n");
      return { success: true, id: "dev-mode-no-send" };
    }
    throw new Error("RESEND_API_KEY is required to send email in production");
  }

  if (!config.fromAddress) {
    throw new Error("EMAIL_FROM_ADDRESS is required to send email");
  }

  const client = getResendClient(config.apiKey);

  try {
    // Render React template to HTML using our Bun-compatible render function
    const html = await renderEmailTemplate(options.template);

    const { data, error } = await client.emails.send({
      from: formatFromAddress(config),
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html,
      replyTo: options.replyTo,
      tags: options.tags,
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
 * Send emails to multiple recipients using Resend's batch API
 * More efficient than sending individual emails - up to 100 emails per batch.
 * Each recipient gets their own email (not CC'd)
 *
 * @see https://resend.com/docs/api-reference/emails/send-batch-emails
 */
export async function sendBatchEmails(
  emails: Omit<SendEmailOptions, "config">[]
): Promise<SendEmailResult[]> {
  const config = getEmailConfig();

  // In development without API key, send emails individually (for logging)
  if (!config.apiKey) {
    return Promise.all(emails.map((email) => sendEmail({ ...email, config })));
  }

  const client = getResendClient(config.apiKey);

  try {
    // Render all templates to HTML
    const emailPayloads = await Promise.all(
      emails.map(async (email) => ({
        from: formatFromAddress(config),
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        html: renderEmailTemplate(email.template),
        replyTo: email.replyTo,
        tags: email.tags,
      }))
    );

    // Use Resend's native batch API for efficiency
    const { data, error } = await client.batch.send(emailPayloads);

    if (error) {
      console.error("[email] Batch send failed:", error);
      const normalizedError = normalizeResendError(error);
      // Return same error for all emails in batch
      return emails.map(() => normalizedError);
    }

    // Map batch response to individual results
    return (data?.data ?? []).map((item) => ({
      success: true as const,
      id: item.id,
    }));
  } catch (err) {
    const normalizedError = normalizeResendError(err);
    console.error("[email] Batch send error:", normalizedError.error);
    return emails.map(() => normalizedError);
  }
}
