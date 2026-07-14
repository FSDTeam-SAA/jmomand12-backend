import { Types } from 'mongoose';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface IOrderItem {
  product: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface IOrder {
  orderNumber: string;
  customer: Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  pickupCode: string;
  pickupTokenHash: string;
  pickupQrDataUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
