import { companyName } from '../lib/globalType';
import type { WinnerEmailJobData } from '../queues/email.queue';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

const winnerEmailTemplate = (data: WinnerEmailJobData): string => {
  const frontendUrl = data.frontendUrl.replace(/\/$/, '');
  const dashboardUrl = `${frontendUrl}/dashboard`;
  const winnerName = escapeHtml(data.winnerName);
  const productTitle = escapeHtml(data.productTitle);
  const escapedDashboardUrl = escapeHtml(dashboardUrl);
  const winningBid = formatCurrency(data.winningBidAmount);
  const currentYear = new Date().getFullYear();

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>Congratulations! You won the auction</title>
        <style>
          @media only screen and (max-width: 620px) {
            .email-shell { padding: 18px 12px !important; }
            .email-card { border-radius: 12px !important; }
            .email-header,
            .email-body,
            .email-footer { padding-left: 22px !important; padding-right: 22px !important; }
            .email-title { font-size: 24px !important; line-height: 30px !important; }
            .cta-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #eef2f7; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #172033;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          Congratulations ${winnerName}! You won ${productTitle} for ${winningBid}. Check your dashboard for next steps.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eef2f7; border-collapse: collapse;">
          <tr>
            <td class="email-shell" align="center" style="padding: 34px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card" style="width: 100%; max-width: 640px; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #dbe3ef; box-shadow: 0 18px 48px rgba(23, 32, 51, 0.12); border-collapse: separate;">
                <tr>
                  <td class="email-header" style="padding: 30px 34px 26px; background: linear-gradient(135deg, #059669 0%, #10b981 100%);">
                    <p style="margin: 0 0 12px; color: #a7f3d0; font-size: 13px; font-weight: 700; text-transform: uppercase;">
                      ${companyName}
                    </p>
                    <h1 class="email-title" style="margin: 0; color: #ffffff; font-size: 30px; line-height: 38px; font-weight: 800;">
                      Congratulations!
                    </h1>
                    <p style="margin: 12px 0 0; color: #d1fae5; font-size: 15px; line-height: 24px;">
                      You are the winning bidder!
                    </p>
                  </td>
                </tr>

                <tr>
                  <td class="email-body" style="padding: 32px 34px;">
                    <p style="margin: 0 0 16px; color: #172033; font-size: 16px; line-height: 26px;">
                      Hello ${winnerName},
                    </p>
                    <p style="margin: 0 0 24px; color: #46546a; font-size: 15px; line-height: 25px;">
                      Great news! You have won the auction for <strong style="color: #059669;">${productTitle}</strong>.
                      Your payment has been processed successfully.
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; margin: 0 0 24px;">
                      <tr>
                        <td style="padding: 0;">
                          <div style="border: 1px solid #a7f3d0; border-radius: 12px; padding: 20px; background-color: #f0fdf4;">
                            <p style="margin: 0 0 8px; color: #059669; font-size: 13px; font-weight: 700; text-transform: uppercase;">Winning Bid</p>
                            <p style="margin: 0; color: #065f46; font-size: 32px; line-height: 40px; font-weight: 800;">${winningBid}</p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 0 0 28px; padding: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
                      <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 700;">Next Steps</p>
                      <p style="margin: 0; color: #1e3a5f; font-size: 14px; line-height: 22px;">
                        1. Check your dashboard for the invoice and pickup details<br/>
                        2. Schedule your pickup at the warehouse<br/>
                        3. Bring your pickup code when you arrive
                      </p>
                    </div>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="background-color: #059669; border-radius: 10px;">
                          <a href="${escapedDashboardUrl}" class="cta-button" style="display: inline-block; padding: 14px 22px; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none;">
                            View Your Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 22px 0 0; color: #6b778c; font-size: 13px; line-height: 21px;">
                      If the button does not work, paste this link into your browser:<br />
                      <a href="${escapedDashboardUrl}" style="color: #059669; word-break: break-all;">${escapedDashboardUrl}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td class="email-footer" style="padding: 22px 34px; background-color: #f8fafc; border-top: 1px solid #e5ebf3;">
                    <p style="margin: 0; color: #6b778c; font-size: 13px; line-height: 21px;">
                      This automatic email was sent by ${companyName} to confirm your auction win.
                    </p>
                    <p style="margin: 8px 0 0; color: #8a96a8; font-size: 12px; line-height: 18px;">
                      &copy; ${currentYear} ${companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

export default winnerEmailTemplate;
