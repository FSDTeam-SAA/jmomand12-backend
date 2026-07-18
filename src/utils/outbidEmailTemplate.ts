import { companyName } from '../lib/globalType';
import type { OutbidEmailJobData } from '../queues/email.queue';

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

const outbidEmailTemplate = (data: OutbidEmailJobData): string => {
  const frontendUrl = data.frontendUrl.replace(/\/$/, '');
  const productUrl = `${frontendUrl}/auction-products/${data.auctionProductId}`;
  const bidderName = escapeHtml(data.previousBidderName);
  const newBidderName = escapeHtml(data.newBidderName);
  const productTitle = escapeHtml(data.productTitle);
  const escapedProductUrl = escapeHtml(productUrl);
  const previousBid = formatCurrency(data.previousBidAmount);
  const newBid = formatCurrency(data.newBidAmount);
  const bidDifference = formatCurrency(data.newBidAmount - data.previousBidAmount);
  const currentYear = new Date().getFullYear();

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="x-apple-disable-message-reformatting" />
        <title>You have been outbid</title>
        <style>
          @media only screen and (max-width: 620px) {
            .email-shell { padding: 18px 12px !important; }
            .email-card { border-radius: 12px !important; }
            .email-header,
            .email-body,
            .email-footer { padding-left: 22px !important; padding-right: 22px !important; }
            .email-title { font-size: 24px !important; line-height: 30px !important; }
            .bid-grid { display: block !important; }
            .bid-cell { display: block !important; width: 100% !important; margin-bottom: 10px !important; }
            .cta-button { display: block !important; text-align: center !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #eef2f7; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; color: #172033;">
        <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
          Another bidder placed a higher bid on ${productTitle}. Return to the auction to bid again.
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #eef2f7; border-collapse: collapse;">
          <tr>
            <td class="email-shell" align="center" style="padding: 34px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="email-card" style="width: 100%; max-width: 640px; background-color: #ffffff; border-radius: 18px; overflow: hidden; border: 1px solid #dbe3ef; box-shadow: 0 18px 48px rgba(23, 32, 51, 0.12); border-collapse: separate;">
                <tr>
                  <td class="email-header" style="padding: 30px 34px 26px; background-color: #172033;">
                    <p style="margin: 0 0 12px; color: #9fb2cf; font-size: 13px; font-weight: 700; text-transform: uppercase;">
                      ${companyName}
                    </p>
                    <h1 class="email-title" style="margin: 0; color: #ffffff; font-size: 30px; line-height: 38px; font-weight: 800;">
                      You have been outbid
                    </h1>
                    <p style="margin: 12px 0 0; color: #d9e2ef; font-size: 15px; line-height: 24px;">
                      A new highest bid was placed on your auction item.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td class="email-body" style="padding: 32px 34px;">
                    <p style="margin: 0 0 16px; color: #172033; font-size: 16px; line-height: 26px;">
                      Hello ${bidderName},
                    </p>
                    <p style="margin: 0 0 24px; color: #46546a; font-size: 15px; line-height: 25px;">
                      ${newBidderName} placed a higher bid on <strong style="color: #172033;">${productTitle}</strong>.
                      You can return to the auction and place a new bid while it is still active.
                    </p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="bid-grid" style="border-collapse: collapse; margin: 0 0 20px;">
                      <tr>
                        <td class="bid-cell" width="50%" style="padding: 0 6px 0 0;">
                          <div style="border: 1px solid #dbe3ef; border-radius: 12px; padding: 16px; background-color: #f8fafc;">
                            <p style="margin: 0 0 6px; color: #6b778c; font-size: 13px; font-weight: 700;">Your previous bid</p>
                            <p style="margin: 0; color: #172033; font-size: 24px; line-height: 30px; font-weight: 800;">${previousBid}</p>
                          </div>
                        </td>
                        <td class="bid-cell" width="50%" style="padding: 0 0 0 6px;">
                          <div style="border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; background-color: #eff6ff;">
                            <p style="margin: 0 0 6px; color: #1d4ed8; font-size: 13px; font-weight: 700;">New highest bid</p>
                            <p style="margin: 0; color: #123c7c; font-size: 24px; line-height: 30px; font-weight: 800;">${newBid}</p>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div style="margin: 0 0 28px; padding: 14px 16px; background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px;">
                      <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 22px;">
                        The new bid is <strong>${bidDifference}</strong> higher than your previous bid.
                      </p>
                    </div>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                      <tr>
                        <td style="background-color: #2563eb; border-radius: 10px;">
                          <a href="${escapedProductUrl}" class="cta-button" style="display: inline-block; padding: 14px 22px; color: #ffffff; font-size: 15px; font-weight: 800; text-decoration: none;">
                            View auction and bid again
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 22px 0 0; color: #6b778c; font-size: 13px; line-height: 21px;">
                      If the button does not work, paste this link into your browser:<br />
                      <a href="${escapedProductUrl}" style="color: #2563eb; word-break: break-all;">${escapedProductUrl}</a>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td class="email-footer" style="padding: 22px 34px; background-color: #f8fafc; border-top: 1px solid #e5ebf3;">
                    <p style="margin: 0; color: #6b778c; font-size: 13px; line-height: 21px;">
                      This automatic email was sent by ${companyName} because another user placed a higher bid.
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

export default outbidEmailTemplate;
