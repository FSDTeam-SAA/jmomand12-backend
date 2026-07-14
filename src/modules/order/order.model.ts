import { Schema, model } from 'mongoose';
import { IOrder, IOrderItem } from './order.interface';

const orderItemSchema = new Schema<IOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: any[]) => items && items.length > 0,
        message: 'Order must contain at least one item',
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    stripeSessionId: String,
    stripePaymentIntentId: String,
    paidAt: Date,
    pickupCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pickupTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pickupQrDataUrl: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Order = model<IOrder>('Order', orderSchema);
export default Order;
