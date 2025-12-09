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
import type { VerifyEmailProps } from "./types";

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

export function VerifyEmailTemplate({
  userName,
  verificationUrl,
}: VerifyEmailProps) {
  const previewText = "Verify your email address for Reflet";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "0 48px" }}>
            <Heading style={heading}>Verify your email address</Heading>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              Thanks for signing up for Reflet! Please verify your email address
              by clicking the button below.
            </Text>
            <Section style={buttonContainer}>
              <Button href={verificationUrl} style={button}>
                Verify Email Address
              </Button>
            </Section>
            <Text style={paragraph}>
              If you didn't create an account with Reflet, you can safely ignore
              this email.
            </Text>
            <Text style={footer}>
              This link will expire in 24 hours. If you need a new verification
              link, please sign in and request a new one.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

VerifyEmailTemplate.PreviewProps = {
  userName: "John Doe",
  verificationUrl: "https://example.com/verify?token=abc123",
} satisfies VerifyEmailProps;

export default VerifyEmailTemplate;
