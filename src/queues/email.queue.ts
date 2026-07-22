import { JobsOptions, Queue } from 'bullmq';
import { redisConnection } from './redis.connection';

export const EMAIL_QUEUE_NAME = 'email';
export const EMAIL_DLQ_NAME = 'email-dlq';
export const OUTBID_EMAIL_JOB = 'auction.outbid.email';
export const WINNER_EMAIL_JOB = 'auction.winner.email';

export interface OutbidEmailJobData {
  auctionProductId: string;
  productId: string;
  productTitle: string;
  previousBidderId: string;
  previousBidderEmail: string;
  previousBidderName: string;
  previousBidAmount: number;
  newBidderName: string;
  newBidAmount: number;
  bidId: string;
  frontendUrl: string;
}

export interface WinnerEmailJobData {
  auctionProductId: string;
  productId: string;
  productTitle: string;
  winnerId: string;
  winnerEmail: string;
  winnerName: string;
  winningBidAmount: number;
  frontendUrl: string;
}

export type EmailJobData = OutbidEmailJobData | WinnerEmailJobData;

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
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
});

export const outbidEmailJobOptions = (jobId: string): JobsOptions => ({
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
});
