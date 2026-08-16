import nodemailer from "nodemailer";
import config from "../config";
import logger from "../logger";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

interface SendEmailResponse {
  success: boolean;
  error?: string;
}

const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailParams): Promise<SendEmailResponse> => {
  try {
    const formattedPass = config.email.emailPass ? config.email.emailPass.replace(/\s+/g, '') : '';
    const transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: {
        user: config.email.emailAddress,
        pass: formattedPass,
      },
    });

    const mailOptions = {
      from: config.email.emailAddress,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    logger.info({ to, subject }, 'Email sent successfully via Nodemailer');

    return { success: true };
  } catch (error: any) {
    logger.error({ error: error.message, to, subject }, 'Failed to send email via Nodemailer');
    return { success: false, error: error.message };
  }
};

export default sendEmail;
