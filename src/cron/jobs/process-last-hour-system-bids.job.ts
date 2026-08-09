import logger from '../../logger';
import auctionCronService from '../services/auction-cron.service';

export const processLastHourSystemBidsJob = async () => {
  const result = await auctionCronService.processLastHourSystemBids();

  if (result.counterBidsPlaced > 0) {
    logger.info(
      {
        counterBidsPlaced: result.counterBidsPlaced,
        executionTimeMs: result.executionTimeMs,
      },
      'Last 1 hour system auto-bids job completed',
    );
  }

  return result;
};
