import config from '../config';
import logger from '../logger';
import { User } from '../modules/user/user.model';
import Product from '../modules/product/product.model';
import { emailQueue, OUTBID_EMAIL_JOB, outbidEmailJobOptions } from './email.queue';

interface EnqueueOutbidEmailParams {
  auctionProductId: string;
  productId: string;
  previousBidderId?: string;
  newBidderId: string;
  previousBidAmount: number;
  newBidderName: string;
  newBidAmount: number;
  bidId: string;
}

const getUserDisplayName = (user: any) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Bidder';

export const enqueueOutbidEmailNotification = async ({
  auctionProductId,
  productId,
  previousBidderId,
  newBidderId,
  previousBidAmount,
  newBidderName,
  newBidAmount,
  bidId,
}: EnqueueOutbidEmailParams) => {
  if (!previousBidderId) return;
  if (previousBidderId === newBidderId) return;
  if (newBidAmount <= previousBidAmount) return;

  try {
    const [previousBidder, product] = await Promise.all([
      User.findById(previousBidderId).select('firstName lastName email'),
      Product.findById(productId).select('title'),
    ]);

    if (!previousBidder?.email) {
      logger.warn({ previousBidderId, auctionProductId }, 'Skipping outbid email: bidder email missing');
      return;
    }

    if (!product) {
      logger.warn({ productId, auctionProductId }, 'Skipping outbid email: product missing');
      return;
    }

    const jobId = `outbid-email_${auctionProductId}_${previousBidderId}_${bidId}`;

    await emailQueue.add(
      OUTBID_EMAIL_JOB,
      {
        auctionProductId,
        productId,
        productTitle: product.title,
        previousBidderId,
        previousBidderEmail: previousBidder.email,
        previousBidderName: getUserDisplayName(previousBidder),
        previousBidAmount,
        newBidderName,
        newBidAmount,
        bidId,
        frontendUrl: config.app.frontendUrl,
      },
      outbidEmailJobOptions(jobId),
    );
  } catch (error: any) {
    logger.error(
      {
        errorMessage: error?.message || String(error),
        stack: error?.stack,
        auctionProductId,
        previousBidderId,
      },
      'Failed to enqueue outbid email',
    );
  }
};
