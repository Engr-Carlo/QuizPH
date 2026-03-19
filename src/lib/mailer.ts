import nodemailer from "nodemailer";

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_FROM,
    NODE_ENV,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SMTP_FROM) {
    console.warn("SMTP is not configured. Email not sent.");
    if (NODE_ENV !== "production") {
      console.info("Email debug payload:", {
        to: params.to,
        subject: params.subject,
        text: params.text,
      });
      return { delivered: false, previewMode: true };
    }
    return { delivered: false, error: "Email delivery is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: SMTP_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    return { delivered: true };
  } catch (error) {
    console.error("Failed to send email", error);
    return {
      delivered: false,
      error: "Verification email could not be sent",
    };
  }
}
