import http from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import app from './app';
import config from './config';
import { initializeCronJobs } from './cron';
import logger from './logger';
import { initializeEmailWorker } from './queues/email.worker';
import { initNotificationSocket } from './socket/notification.service';

async function main() {
  try {
    await mongoose.connect(config.mongodbUrl as string, {
      maxPoolSize: 100,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    logger.info('MongoDB connected successfully with maxPoolSize: 100');
    const httpServer = http.createServer(app);

    const io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    if (config.redis?.url) {
      try {
        const pubClient = new Redis(config.redis.url, { maxRetriesPerRequest: null });
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.IO Redis adapter configured successfully');
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Failed to initialize Socket.IO Redis adapter; falling back to in-memory adapter');
      }
    }

    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      socket.on('joinRoom', (userId) => socket.join(userId));
      socket.on('joinAuctionRoom', (auctionId) => socket.join(`auction:${auctionId}`));
      socket.on('leaveAuctionRoom', (auctionId) => socket.leave(`auction:${auctionId}`));
    });

    initNotificationSocket(io);

    if (config.cron.enabled) {
      initializeCronJobs();
    } else {
      logger.warn('Cron jobs are disabled via configuration');
    }

    if (config.queue.workersEnabled) {
      initializeEmailWorker();
    } else {
      logger.warn('Queue workers are disabled via configuration');
    }

    httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
    });
  } catch (error: any) {
    logger.error({ error }, 'Server failed to start');
  }
}

main();
