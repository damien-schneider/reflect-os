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
import type { WelcomeProps } from "./types";

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

const list = {
  margin: "0 0 15px",
  padding: "0 0 0 20px",
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#3c4149",
};

export function WelcomeTemplate({ userName, loginUrl }: WelcomeProps) {
  const previewText = "Welcome to Reflet!";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "0 48px" }}>
            <Heading style={heading}>Welcome to Reflet!</Heading>
            <Text style={paragraph}>Hi {userName},</Text>
            <Text style={paragraph}>
              We're excited to have you on board! Reflet helps you collect
              feedback, prioritize features, and keep your users in the loop
              with beautiful changelogs.
            </Text>
            <Text style={paragraph}>Here's what you can do:</Text>
            <ul style={list}>
              <li>Create feedback boards to collect user input</li>
              <li>Organize and prioritize feature requests</li>
              <li>Publish changelogs to share your progress</li>
              <li>Build a roadmap your users can follow</li>
            </ul>
            <Section style={buttonContainer}>
              <Button href={loginUrl} style={button}>
                Get Started
              </Button>
            </Section>
            <Text style={paragraph}>
              If you have any questions, feel free to reach out. We're here to
              help!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WelcomeTemplate.PreviewProps = {
  userName: "John Doe",
  loginUrl: "https://example.com/login",
} satisfies WelcomeProps;

export default WelcomeTemplate;
