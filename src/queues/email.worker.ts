import { Job, Worker } from 'bullmq';
import logger from '../logger';
import sendEmail from '../utils/sendEmail';
import outbidEmailTemplate from '../utils/outbidEmailTemplate';
import {
  EMAIL_QUEUE_NAME,
  EmailJobData,
  OUTBID_EMAIL_JOB,
  OutbidEmailJobData,
} from './email.queue';
import { addEmailDeadLetterJob } from './email.dlq';
import { redisConnection } from './redis.connection';

let emailWorker: Worker<EmailJobData> | null = null;

const processEmailJob = async (job: Job<EmailJobData>) => {
  if (job.name !== OUTBID_EMAIL_JOB) {
    throw new Error(`Unsupported email job type: ${job.name}`);
  }

  const data = job.data as OutbidEmailJobData;
  const result = await sendEmail({
    to: data.previousBidderEmail,
    subject: `You have been outbid on ${data.productTitle}`,
    html: outbidEmailTemplate(data),
  });

  if (!result.success) {
    throw new Error(result.error || 'Email provider failed to send the outbid email');
  }

  return { sentTo: data.previousBidderEmail };
};

export const initializeEmailWorker = () => {
  if (emailWorker) return emailWorker;

  emailWorker = new Worker<EmailJobData>(EMAIL_QUEUE_NAME, processEmailJob, {
    connection: redisConnection,
    concurrency: 5,
  });

  emailWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Email queue job completed');
  });

  emailWorker.on('failed', async (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
        attempts: job?.opts.attempts,
        error,
      },
      'Email queue job failed',
    );

    if (!job || job.attemptsMade < Number(job.opts.attempts ?? 1)) return;

    try {
      await addEmailDeadLetterJob({
        originalQueue: EMAIL_QUEUE_NAME,
        originalJobId: job.id,
        originalJobName: job.name,
        originalJobData: job.data,
        failedReason: error.message,
        stacktrace: job.stacktrace ?? undefined,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
      });
    } catch (dlqError) {
      logger.error({ dlqError, originalJobId: job.id }, 'Failed to add email job to DLQ');
    }
  });

  emailWorker.on('error', (error) => {
    logger.error({ error }, 'Email worker error');
  });

  logger.info('Email worker initialized');
  return emailWorker;
};
