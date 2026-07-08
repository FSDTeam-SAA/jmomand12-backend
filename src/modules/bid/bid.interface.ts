import { Types } from 'mongoose';

export interface IBid {
  auctionId: Types.ObjectId;
  auctionProductId: Types.ObjectId;
  productId: Types.ObjectId;
  bidderId: Types.ObjectId;
  amount: number;
  isWinningBid: boolean;
  createdAt: Date;
}
