import { Resend } from "resend";

function getApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return key;
}

export function getResendClient(): Resend {
  return new Resend(getApiKey());
}

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.RESEND_FROM_EMAIL ?? "Tom Lee Open <onboarding@resend.dev>",
}: SendEmailParams) {
  const resend = getResendClient();
  return resend.emails.send({
    from,
    to,
    subject,
    html,
  });
}
