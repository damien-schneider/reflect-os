/**
 * Email Handlers
 *
 * Email sending functions for Better Auth events.
 */

import {
  ResetPasswordTemplate,
  sendEmail,
  VerifyEmailTemplate,
} from "@repo/email";
import type { AuthConfig } from "./config";

type User = {
  id: string;
  email: string;
  name?: string | null;
};

// Default callback path for email verification redirects
export const DEFAULT_VERIFICATION_CALLBACK = "/dashboard";

/**
 * Transform verification URL to ensure callbackURL is set correctly.
 * This prevents issues with:
 * - Default "/" callback causing navigation issues
 * - Double paths like "/dashboarddashboard"
 * - Missing callbackURL parameter
 *
 * @param url - The original verification URL from better-auth
 * @param defaultCallback - The default callback path to use (defaults to "/dashboard")
 * @returns Object with transformed URL and any error that occurred
 */
export const transformVerificationUrl = (
  url: string,
  defaultCallback: string = DEFAULT_VERIFICATION_CALLBACK
): { url: string; error?: string; originalCallbackURL?: string | null } => {
  try {
    const parsedUrl = new URL(url);
    const callbackURL = parsedUrl.searchParams.get("callbackURL");

    // Only set to dashboard if it's the default "/" or missing
    // If already set to something else (like "/dashboard"), don't modify
    if (!callbackURL || callbackURL === "/") {
      parsedUrl.searchParams.set("callbackURL", defaultCallback);
      return {
        url: parsedUrl.toString(),
        originalCallbackURL: callbackURL,
      };
    }

    return { url, originalCallbackURL: callbackURL };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown URL parsing error";
    return {
      url, // Return original URL on error
      error: errorMessage,
      originalCallbackURL: null,
    };
  }
};

/**
 * Creates email handlers for Better Auth.
 */
export const createEmailHandlers = (config: AuthConfig) => {
  const { email, isProduction, features, baseUrl } = config;

  // Default from address for development
  const DEFAULT_DEV_FROM_ADDRESS = "onboarding@resend.dev";
  const DEFAULT_FROM_NAME = "Reflet";

  // biome-ignore lint/suspicious/useAwait: intentionally fire-and-forget to not block signup
  const sendVerificationEmail = async ({
    user,
    url,
  }: {
    user: User;
    url: string;
  }) => {
    if (!(features.emailEnabled && email?.apiKey)) {
      console.log(
        `[Auth] Email disabled - Verification URL for ${user.email}: ${url}`
      );
      return;
    }

    // Transform URL to ensure callbackURL is set correctly
    const transformed = transformVerificationUrl(url);
    const verificationUrl = transformed.url;

    // Log transformation details for debugging
    if (transformed.error) {
      console.error(
        `[Auth] URL transformation error for ${user.email}: ${transformed.error}`
      );
      console.error(`[Auth] Original URL: ${url}`);
    } else {
      console.log(
        `[Auth] Verification URL for ${user.email}: callbackURL="${transformed.originalCallbackURL}" -> URL: ${verificationUrl}`
      );
    }

    // Fire-and-forget: Don't block signup if email fails
    sendEmail({
      to: user.email,
      subject: "Verify your email address",
      template: VerifyEmailTemplate({
        userName: user.name ?? "User",
        verificationUrl,
      }),
      config: {
        apiKey: email.apiKey,
        fromAddress: email.fromAddress ?? DEFAULT_DEV_FROM_ADDRESS,
        fromName: email.fromName ?? DEFAULT_FROM_NAME,
        isDevelopment: !isProduction,
      },
    })
      .then((result) => {
        if (result.success) {
          console.log(`[Auth] Verification email sent to ${user.email}`, {
            emailId: result.id,
            userId: user.id,
            verificationUrl,
          });
        } else {
          console.error(
            `[Auth] Failed to send verification email to ${user.email}`,
            {
              error: result.error,
              errorCode: result.errorCode,
              statusCode: result.statusCode,
              userId: user.id,
              verificationUrl,
            }
          );
        }
      })
      .catch((err: unknown) => {
        console.error(
          `[Auth] Error sending verification email to ${user.email}`,
          {
            error: err instanceof Error ? err.message : String(err),
            userId: user.id,
            verificationUrl,
          }
        );
      });
  };

  // biome-ignore lint/suspicious/useAwait: intentionally not awaiting to prevent timing attacks
  const sendResetPassword = async ({
    user,
    url,
  }: {
    user: User;
    url: string;
  }) => {
    if (!(features.emailEnabled && email?.apiKey)) {
      console.log(
        `[Auth] Email disabled - Reset password URL for ${user.email}: ${url}`
      );
      return;
    }

    // Fire and forget to prevent timing attacks - don't await
    sendEmail({
      to: user.email,
      subject: "Reset your password",
      template: ResetPasswordTemplate({
        userName: user.name ?? "User",
        resetUrl: url,
      }),
      config: {
        apiKey: email.apiKey,
        fromAddress: email.fromAddress ?? DEFAULT_DEV_FROM_ADDRESS,
        fromName: email.fromName ?? DEFAULT_FROM_NAME,
        isDevelopment: !isProduction,
      },
    }).catch((err: unknown) => {
      console.error("[Auth] Failed to send reset password email:", err);
    });
  };

  // biome-ignore lint/suspicious/useAwait: better-auth expects async function signature
  const sendInvitationEmail = async (data: {
    id: string;
    email: string;
    inviter: { user: { email: string } };
    organization: { name: string };
  }) => {
    const inviteLink = `${baseUrl}/accept-invitation/${data.id}`;

    if (!(features.emailEnabled && email?.apiKey)) {
      console.log(
        `[Auth] Email disabled - Invitation for ${data.email} to join ${data.organization.name}`
      );
      console.log(`[Auth] Invitation link: ${inviteLink}`);
      return;
    }

    console.log(
      `[Auth] Invitation email to ${data.email} from ${data.inviter.user.email} for org ${data.organization.name}`
    );
    console.log(`[Auth] Invitation link: ${inviteLink}`);
    // TODO: Create and send an InvitationTemplate when needed
  };

  return {
    sendVerificationEmail,
    sendResetPassword,
    sendInvitationEmail,
  };
};
