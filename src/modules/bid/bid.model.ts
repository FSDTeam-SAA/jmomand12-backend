import { Schema, model } from 'mongoose';
import { IBid } from './bid.interface';

const bidSchema = new Schema<IBid>(
  {
    auctionId: {
      type: Schema.Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },

    auctionProductId: {
      type: Schema.Types.ObjectId,
      ref: 'AuctionProduct',
      required: true,
      index: true,
    },

    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },

    bidderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    isWinningBid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
    versionKey: false,
  },
);

// Useful indexes
bidSchema.index({ auctionProductId: 1, amount: -1 });
bidSchema.index({ auctionId: 1, bidderId: 1 });
bidSchema.index({ auctionProductId: 1, createdAt: -1 });

const Bid = model<IBid>('Bid', bidSchema);
export default Bid;
