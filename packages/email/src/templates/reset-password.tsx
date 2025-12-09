import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ResetPasswordProps } from "./types";

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
};

const heading = {
  fontSize: "24px",
  letterSpacing: "-0.5px",
  lineHeight: "1.3",
  fontWeight: "400",
  color: "#484848",
  padding: "17px 0 0",
};

const paragraph = {
  margin: "0 0 15px",
  fontSize: "15px",
  lineHeight: "1.4",
  color: "#3c4149",
};

const buttonContainer = {
  padding: "27px 0 27px",
};

const button = {
  backgroundColor: "#000000",
  borderRadius: "6px",
  fontWeight: "600",
  color: "#fff",
  fontSize: "15px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "12px 24px",
};

const footer = {
  fontSize: "12px",
  color: "#898989",
  marginTop: "20px",
};

export function ResetPasswordTemplate({
  userName,
  resetUrl,
}: ResetPasswordProps) {
  const previewText = "Reset your Reflet password";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "0 48px" }}>
            <Heading style={heading}>Reset your password</Heading>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Someone requested a password reset for your Reflet account. If
              this was you, click the button below to set a new password.
            </Text>
            <Section style={buttonContainer}>
              <Button href={resetUrl} style={button}>
                Reset Password
              </Button>
            </Section>
            <Text style={paragraph}>
              If you didn't request a password reset, you can safely ignore this
              email. Your password will remain unchanged.
            </Text>
            <Text style={footer}>
              This link will expire in 1 hour. If you need a new reset link,
              please request another one from the login page.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ResetPasswordTemplate.PreviewProps = {
  userName: "John Doe",
  resetUrl: "https://example.com/reset-password?token=abc123",
} satisfies ResetPasswordProps;

export default ResetPasswordTemplate;
