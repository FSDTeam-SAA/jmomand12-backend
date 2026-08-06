import { Queue } from 'bullmq';
import logger from '../logger';
import { EMAIL_DLQ_NAME, EmailJobData } from './email.queue';
import { redisConnection } from './redis.connection';

export interface EmailDeadLetterJobData {
  originalQueue: string;
  originalJobId?: string;
  originalJobName: string;
  originalJobData: EmailJobData;
  failedReason?: string;
  stacktrace?: string[];
  attemptsMade: number;
  failedAt: string;
}

export const emailDlq = new Queue<EmailDeadLetterJobData>(EMAIL_DLQ_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export const addEmailDeadLetterJob = async (data: EmailDeadLetterJobData) => {
  await emailDlq.add('email.dead-letter', data, {
    jobId: data.originalJobId ? `dlq_${data.originalJobId.replace(/:/g, '_')}` : undefined,
    attempts: 1,
    removeOnComplete: false,
    removeOnFail: false,
  });

  logger.error(
    {
      originalJobId: data.originalJobId,
      originalJobName: data.originalJobName,
      attemptsMade: data.attemptsMade,
      failedReason: data.failedReason,
    },
    'Email job moved to DLQ',
  );
};
