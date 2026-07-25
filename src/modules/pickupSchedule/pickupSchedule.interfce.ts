import { Types } from 'mongoose';

export interface IPickupSchedule {
  userId: Types.ObjectId;
  auctionId: Types.ObjectId;
  auctionProductId: Types.ObjectId;
  status: 'requested' | 'approved' | 'rejected' | 'not_requested';
  pickupDate: string;
  pickupTime: string;
}
