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

export interface ResetPasswordEmailProps {
  url: string;
}

// Preview locally with `npx react-email dev`.
export function ResetPasswordEmail({ url }: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Reset your password</Heading>
          <Text style={text}>
            Click below to choose a new password. This link expires shortly for your security.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={button} href={url}>
              Reset password
            </Button>
          </Section>
          <Text style={text}>If you didn&apos;t request this, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

// react-email expects a default export per template file.
export default ResetPasswordEmail;

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
