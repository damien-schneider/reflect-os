import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";
import { Resend } from "resend";
import { serverEnv } from "../src/env/server";

const isProduction = serverEnv.NODE_ENV === "production";

// Initialize Resend client only if API key is configured
const resend = serverEnv.RESEND_API_KEY
  ? new Resend(serverEnv.RESEND_API_KEY)
  : null;

console.log("Better Auth initialized with:", {
  baseURL: serverEnv.BETTER_AUTH_URL,
  isProduction,
  databaseConnected: !!serverEnv.ZERO_UPSTREAM_DB,
  emailVerificationEnabled: !!resend,
});

export const auth = betterAuth({
  database: new Pool({
    connectionString: serverEnv.ZERO_UPSTREAM_DB,
  }),
  baseURL: serverEnv.BETTER_AUTH_URL,
  trustedOrigins: [serverEnv.BETTER_AUTH_URL],
  plugins: [organization()],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: !!resend,
  },
  emailVerification: resend
    ? {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
          // RESEND_FROM_EMAIL is required for sending emails
          // Use onboarding@resend.dev for testing with Resend's default domain
          const fromEmail =
            serverEnv.RESEND_FROM_EMAIL || "onboarding@resend.dev";
          await resend.emails.send({
            from: fromEmail,
            to: user.email,
            subject: "Verify your email address",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">Verify your email</h1>
                <p>Hi ${user.name || "there"},</p>
                <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
                <p style="margin: 24px 0;">
                  <a href="${url}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify Email
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  If the button doesn't work, copy and paste this link into your browser:
                  <br />
                  <a href="${url}" style="color: #666;">${url}</a>
                </p>
                <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
              </div>
            `,
          });
        },
      }
    : undefined,
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: isProduction,
    },
    useSecureCookies: isProduction,
  },
  logger: {
    level: "debug", // Always debug to see errors in production logs
  },
});
