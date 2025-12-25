/**
 * Email Template Type Definitions
 *
 * Provides strict typing for all email templates
 */

// ============================================
// Template Props Interfaces
// ============================================

export interface VerifyEmailProps {
  userName: string;
  verificationUrl: string;
}

export interface ResetPasswordProps {
  userName: string;
  resetUrl: string;
}

export interface WelcomeProps {
  userName: string;
  loginUrl: string;
}

export interface ChangelogUpdateProps {
  orgName: string;
  orgSlug: string;
  releaseTitle: string;
  releaseVersion?: string;
  releaseDescription?: string;
  feedbackItems?: Array<{
    title: string;
    boardName?: string;
  }>;
  viewUrl: string;
  unsubscribeUrl: string;
}

// ============================================
// Template Name to Props Mapping
// ============================================

export interface EmailTemplateMap {
  "verify-email": VerifyEmailProps;
  "reset-password": ResetPasswordProps;
  welcome: WelcomeProps;
  "changelog-update": ChangelogUpdateProps;
}

export type EmailTemplateName = keyof EmailTemplateMap;

// ============================================
// Type-safe template helper
// ============================================

export type EmailTemplateProps<T extends EmailTemplateName> =
  EmailTemplateMap[T];
