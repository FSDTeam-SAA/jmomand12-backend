import config from '../config';
import logger from '../logger';
import { User } from '../modules/user/user.model';
import Product from '../modules/product/product.model';
import { emailQueue, WINNER_EMAIL_JOB } from './email.queue';

interface EnqueueWinnerEmailParams {
  auctionProductId: string;
  productId: string;
  winnerId: string;
  winningBidAmount: number;
}

const getUserDisplayName = (user: any) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Bidder';

export const enqueueWinnerEmailNotification = async ({
  auctionProductId,
  productId,
  winnerId,
  winningBidAmount,
}: EnqueueWinnerEmailParams) => {
  try {
    const [winner, product] = await Promise.all([
      User.findById(winnerId).select('firstName lastName email'),
      Product.findById(productId).select('title'),
    ]);

    if (!winner?.email) {
      logger.warn({ winnerId, auctionProductId }, 'Skipping winner email: winner email missing');
      return;
    }

    if (!product) {
      logger.warn({ productId, auctionProductId }, 'Skipping winner email: product missing');
      return;
    }

    const jobId = `winner-email:${auctionProductId}:${winnerId}`;

    await emailQueue.add(
      WINNER_EMAIL_JOB,
      {
        auctionProductId,
        productId,
        productTitle: product.title,
        winnerId,
        winnerEmail: winner.email,
        winnerName: getUserDisplayName(winner),
        winningBidAmount,
        frontendUrl: config.app.frontendUrl,
      },
      {
        jobId,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 30_000,
        },
        removeOnComplete: {
          age: 60 * 60 * 24 * 7,
          count: 1000,
        },
        removeOnFail: false,
      },
    );
  } catch (error) {
    logger.error({ error, auctionProductId, winnerId }, 'Failed to enqueue winner email');
  }
};
