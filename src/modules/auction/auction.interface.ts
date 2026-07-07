import { Types } from 'mongoose';

export type AuctionStatus =
  | 'upcoming'
  | 'active'
  | 'ended'
  | 'payment_pending'
  | 'payment_failed'
  | 'sold'
  | 'unsold'
  | 'cancelled';

export interface IPickUpSchedule {
  startDate: Date;
  endDate: Date;
  dailyStartTime: string;
  dailyEndTime: string;
  durationInDays: number;
}

export interface IAuction {
  auctionId: string;
  products: Types.ObjectId[];
  title: string;
  description?: string;

  // Auction Schedule
  startsAt: Date;
  endsAt: Date;
  durationInDays: number;

  // Bidding Fields
  startingBid: number;
  bidIncrement: number;
  reservePrice: number;
  status: AuctionStatus;

  pickupSchedule?: IPickUpSchedule;

  highestBid?: {
    bidder?: Types.ObjectId;
    amount: number;
    bid?: Types.ObjectId;
    placedAt?: Date;
  };
  winner?: Types.ObjectId;
  closedAt?: Date;
  closeReason?: string;
}
