import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { ChangelogUpdateProps } from "./types";

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

const subheading = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#484848",
  margin: "0 0 8px",
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

const versionBadge = {
  display: "inline-block",
  backgroundColor: "#e5e7eb",
  color: "#374151",
  fontSize: "12px",
  fontWeight: "500",
  padding: "4px 8px",
  borderRadius: "4px",
  marginLeft: "8px",
};

const feedbackItem = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#3c4149",
  margin: "0 0 8px",
  paddingLeft: "16px",
  position: "relative" as const,
};

const feedbackBadge = {
  display: "inline-block",
  backgroundColor: "#f3f4f6",
  color: "#6b7280",
  fontSize: "11px",
  padding: "2px 6px",
  borderRadius: "3px",
  marginLeft: "8px",
};

const footer = {
  fontSize: "12px",
  color: "#898989",
  marginTop: "20px",
};

const footerLink = {
  color: "#898989",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

export function ChangelogUpdateTemplate({
  orgName,
  releaseTitle,
  releaseVersion,
  releaseDescription,
  feedbackItems,
  viewUrl,
  unsubscribeUrl,
}: ChangelogUpdateProps) {
  const previewText = `${orgName} just released: ${releaseTitle}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ padding: "0 48px" }}>
            <Heading style={heading}>
              New Release from {orgName}
              {releaseVersion && (
                <span style={versionBadge}>{releaseVersion}</span>
              )}
            </Heading>

            <Text style={subheading}>{releaseTitle}</Text>

            {releaseDescription && (
              <Text style={paragraph}>{releaseDescription}</Text>
            )}

            {feedbackItems && feedbackItems.length > 0 && (
              <>
                <Hr style={hr} />
                <Text style={{ ...paragraph, fontWeight: "500" }}>
                  What's included:
                </Text>
                {feedbackItems.map((item) => (
                  <Text key={item.title} style={feedbackItem}>
                    • {item.title}
                    {item.boardName && (
                      <span style={feedbackBadge}>{item.boardName}</span>
                    )}
                  </Text>
                ))}
              </>
            )}

            <Section style={buttonContainer}>
              <Button href={viewUrl} style={button}>
                View Full Changelog
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              You're receiving this because you subscribed to changelog updates
              from {orgName}.{" "}
              <Link href={unsubscribeUrl} style={footerLink}>
                Unsubscribe
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ChangelogUpdateTemplate.PreviewProps = {
  orgName: "Acme Inc",
  orgSlug: "acme",
  releaseTitle: "Dark Mode & Performance Improvements",
  releaseVersion: "v2.1.0",
  releaseDescription:
    "We've added the highly requested dark mode feature and made significant performance improvements across the board.",
  feedbackItems: [
    { title: "Add dark mode support", boardName: "Feature Requests" },
    { title: "Improve dashboard loading speed", boardName: "Performance" },
    { title: "Fix notification delays" },
  ],
  viewUrl: "https://example.com/acme/changelog",
  unsubscribeUrl: "https://example.com/unsubscribe?token=abc123",
} satisfies ChangelogUpdateProps;

export default ChangelogUpdateTemplate;
