import crypto from 'crypto';
import QRCode from 'qrcode';
import Stripe from 'stripe';
import { StatusCodes } from 'http-status-codes';
import config from '../../config';
import AppError from '../../errors/AppError';
import sendEmail from '../../utils/sendEmail';
import { Cart } from '../cart/cart.model';
import Product from '../product/product.model';
import { User } from '../user/user.model';
import Order from './order.model';

const isProbablyPlaceholderKey = (key?: string) => {
  if (!key) return true;
  return (
    key.includes('your_') ||
    key.includes('****************') ||
    key.endsWith('_key') ||
    !/^sk_(test|live)_[A-Za-z0-9]/.test(key)
  );
};

const stripe = !isProbablyPlaceholderKey(config.stripe.secretKey)
  ? new Stripe(config.stripe.secretKey as string, {
      apiVersion: '2025-08-27.basil' as any,
    })
  : null;

const requireStripe = (): Stripe => {
  if (!stripe) {
    throw new AppError(
      'Stripe is not configured. Add STRIPE_SECRET_KEY in .env.',
      StatusCodes.BAD_GATEWAY
    );
  }
  return stripe;
};

const generateOrderNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await Order.countDocuments({
    orderNumber: { $regex: `^ORD-${year}-` },
  });
  return `ORD-${year}-${String(count + 1001).padStart(4, '0')}`;
};

const generatePickupCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const hashPickupToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const createPickupQrDataUrl = async (pickupToken: string) => {
  const qrPayload = `${config.app.frontendUrl}/pickup/verify?token=${pickupToken}`;
  return QRCode.toDataURL(qrPayload, {
    margin: 1,
    width: 240,
  });
};

const sendOrderConfirmationEmail = async (params: {
  to: string;
  customerName: string;
  orderNumber: string;
  items: { title: string; quantity: number; price: number }[];
  totalAmount: number;
  pickupCode: string;
  pickupQrDataUrl?: string;
}) => {
  const itemsList = params.items
    .map(
      (item) =>
        `<li><strong>${item.title}</strong> x ${item.quantity} - $${(
          item.price * item.quantity
        ).toFixed(2)}</li>`
    )
    .join('');

  await sendEmail({
    to: params.to,
    subject: `Order ${params.orderNumber} Confirmed - Pickup Ready`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>Thank you for your purchase!</h2>
        <p>Hello ${params.customerName},</p>
        <p>Your payment was successful and your order is ready for pickup scheduling.</p>
        <p><strong>Order Number:</strong> ${params.orderNumber}</p>
        <p><strong>Items:</strong></p>
        <ul>${itemsList}</ul>
        <p><strong>Total Paid:</strong> $${params.totalAmount.toFixed(2)}</p>
        <p><strong>Pickup Code:</strong> ${params.pickupCode}</p>
        ${
          params.pickupQrDataUrl
            ? `<p><img alt="Pickup QR Code" src="${params.pickupQrDataUrl}" width="180" height="180" /></p>`
            : ''
        }
        <p>Please schedule your pickup from your customer dashboard before visiting the warehouse.</p>
      </div>
    `,
  });
};

const checkout = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  const cartItems = await Cart.find({ userId: user._id, type: 'cart' }).populate('productId');
  if (!cartItems.length) {
    throw new AppError('Cart is empty', StatusCodes.BAD_REQUEST);
  }

  // Validate cart items stock and type
  for (const item of cartItems) {
    const product = item.productId as any;
    if (!product) {
      throw new AppError('Product in cart not found', StatusCodes.NOT_FOUND);
    }

    if (product.type !== 'for_sale') {
      throw new AppError(
        `Product "${product.title}" is not for direct sale.`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (product.inventoryStatus !== 'available') {
      throw new AppError(
        `Product "${product.title}" is no longer available for purchase.`,
        StatusCodes.BAD_REQUEST
      );
    }

    if (!product.quantity || product.quantity <= 0) {
      throw new AppError(
        `Product "${product.title}" is out of stock.`,
        StatusCodes.BAD_REQUEST
      );
    }

    if ((item.quantity || 1) > product.quantity) {
      throw new AppError(
        `Requested quantity for "${product.title}" exceeds available stock (${product.quantity} left).`,
        StatusCodes.BAD_REQUEST
      );
    }
  }

  // Construct line items for Stripe Checkout
  const lineItems = cartItems.map((item) => {
    const product = item.productId as any;
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: product.title,
          description: product.description ? product.description.substring(0, 100) : '',
          images: product.images?.[0]?.url ? [product.images[0].url] : [],
        },
        unit_amount: Math.round(product.price * 100), // convert to cents
      },
      quantity: item.quantity || 1,
    };
  });

  // Calculate order items and total amount
  const orderItems = cartItems.map((item) => {
    const product = item.productId as any;
    return {
      product: product._id,
      quantity: item.quantity || 1,
      price: product.price || 0,
    };
  });

  const totalAmount = cartItems.reduce((sum, item) => {
    const product = item.productId as any;
    return sum + (product.price || 0) * (item.quantity || 1);
  }, 0);

  // Generate pickup credentials
  const pickupToken = crypto.randomBytes(32).toString('hex');
  const pickupCode = generatePickupCode();
  const pickupTokenHash = hashPickupToken(pickupToken);
  const pickupQrDataUrl = await createPickupQrDataUrl(pickupToken);

  // Create pending order record
  const order = await Order.create({
    orderNumber: await generateOrderNumber(),
    customer: user._id,
    items: orderItems,
    totalAmount,
    status: 'pending',
    pickupCode,
    pickupTokenHash,
    pickupQrDataUrl,
  });

  // Create Stripe Checkout Session
  try {
    const stripeClient = requireStripe();
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      customer_email: user.email,
      success_url: `${config.app.frontendUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app.frontendUrl}/orders/cancel`,
      metadata: {
        orderId: order._id.toString(),
        checkoutType: 'cart',
      },
    });

    order.stripeSessionId = session.id;
    await order.save();

    return { checkoutUrl: session.url };
  } catch (error: any) {
    // If Stripe fails, clean up the order or mark it failed
    order.status = 'failed';
    await order.save();
    throw new AppError(
      error.message || 'Failed to create Stripe checkout session.',
      StatusCodes.BAD_REQUEST
    );
  }
};

const handleWebhook = async (rawBody: Buffer, signature: string) => {
  const stripeClient = requireStripe();
  let event: Stripe.Event;

  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      config.stripe.webhookSecret as string
    );
  } catch (error: any) {
    throw new AppError(`Webhook signature verification failed: ${error.message}`, StatusCodes.BAD_REQUEST);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata && metadata.checkoutType === 'cart' && metadata.orderId) {
      const orderId = metadata.orderId;
      const order = await Order.findById(orderId).populate('items.product');

      if (!order) {
        throw new AppError('Order not found from webhook metadata', StatusCodes.NOT_FOUND);
      }

      // Idempotency: Skip if already processed
      if (order.status === 'paid') {
        return { success: true, alreadyProcessed: true };
      }

      // Finalize the Order
      order.status = 'paid';
      order.paidAt = new Date();
      order.stripePaymentIntentId = session.payment_intent as string;
      await order.save();

      // Process product stock deduction
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.quantity = Math.max(0, (product.quantity || 0) - item.quantity);
          if (product.quantity === 0) {
            product.inventoryStatus = 'unavailable';
          }
          await product.save();
        }
      }

      // Clear the customer's cart
      await Cart.deleteMany({ userId: order.customer, type: 'cart' });

      // Send Order confirmation email
      const customer = await User.findById(order.customer);
      if (customer) {
        const emailItems = order.items.map((item) => ({
          title: (item.product as any).title || 'Product',
          quantity: item.quantity,
          price: item.price,
        }));

        await sendOrderConfirmationEmail({
          to: customer.email,
          customerName: `${customer.firstName} ${customer.lastName}`,
          orderNumber: order.orderNumber,
          items: emailItems,
          totalAmount: order.totalAmount,
          pickupCode: order.pickupCode,
          pickupQrDataUrl: order.pickupQrDataUrl,
        });
      }

      return { success: true };
    }
  }

  return { success: true, ignored: true };
};

const getMyOrders = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  return Order.find({ customer: user._id })
    .populate('items.product')
    .sort({ createdAt: -1 });
};

const getAllOrders = async () => {
  return Order.find()
    .populate('customer', 'firstName lastName email phone')
    .populate('items.product')
    .sort({ createdAt: -1 });
};

const orderService = {
  checkout,
  handleWebhook,
  getMyOrders,
  getAllOrders,
};

export default orderService;
