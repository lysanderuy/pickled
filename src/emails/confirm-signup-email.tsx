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

export interface ConfirmSignupEmailProps {
  url: string;
}

// Preview locally with `npx react-email dev`.
export function ConfirmSignupEmail({ url }: ConfirmSignupEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Confirm your email to finish signing up</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Confirm your email</Heading>
          <Text style={text}>
            Click below to confirm your email address and activate your account.
          </Text>
          <Section style={{ textAlign: "center", margin: "32px 0" }}>
            <Button style={button} href={url}>
              Confirm email
            </Button>
          </Section>
          <Text style={text}>If you didn&apos;t create an account, you can ignore this email.</Text>
        </Container>
      </Body>
    </Html>
  );
}

// react-email expects a default export per template file.
export default ConfirmSignupEmail;

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
