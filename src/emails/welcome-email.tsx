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

export interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

// Example transactional template — replace/extend per project.
// Preview locally with `npx react-email dev`.
export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome aboard, {name}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Welcome, {name}</Heading>
          <Text style={text}>Your account is ready. Jump in whenever you&apos;re set.</Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={button} href={dashboardUrl}>
              Go to dashboard
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// react-email expects a default export per template file.
export default WelcomeEmail;

const body = { backgroundColor: "#f5f5f5", fontFamily: "sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px",
  maxWidth: "480px",
  borderRadius: "8px",
};
const heading = { fontSize: "22px", fontWeight: 600 as const, color: "#111111" };
const text = { fontSize: "15px", lineHeight: "24px", color: "#444444" };
const button = {
  backgroundColor: "#111111",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 600 as const,
  padding: "12px 24px",
  borderRadius: "6px",
  textDecoration: "none",
};
