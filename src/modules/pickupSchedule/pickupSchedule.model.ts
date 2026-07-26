import mongoose, { Schema, Types } from 'mongoose';

const PickupScheduleSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    auctionId: {
      type: Types.ObjectId,
      ref: 'Auction',
      required: true,
    },
    auctionProductId: {
      type: Types.ObjectId,
      ref: 'AuctionProduct',
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'not_requested', 'completed', 'cancelled'],
      default: 'not_requested',
    },
    pickupDate: {
      type: String,
      required: true,
    },
    pickupTime: {
      type: String,
      required: true,
    },
  },
  { timestamps: true, versionKey: false },
);

const PickupSchedule = mongoose.model('PickupSchedule', PickupScheduleSchema);
export default PickupSchedule;
