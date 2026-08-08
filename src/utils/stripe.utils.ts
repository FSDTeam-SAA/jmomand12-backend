import Stripe from 'stripe';
import config from '../config';
import AppError from '../errors/AppError';
import { StatusCodes } from 'http-status-codes';

const isProbablyPlaceholderKey = (key?: string) => {
  if (!key) return true;
  return (
    key.includes('your_') ||
    key.includes('****************') ||
    key.endsWith('_key') ||
    !/^sk_(test|live)_[A-Za-z0-9]/.test(key)
  );
};

export const getStripe = (): Stripe => {
  if (isProbablyPlaceholderKey(config.stripe.secretKey)) {
    throw new AppError(
      'Stripe is not configured with a valid secret key. Add a real STRIPE_SECRET_KEY in .env.',
      StatusCodes.BAD_GATEWAY
    );
  }

  return new Stripe(config.stripe.secretKey as string);
};

export const constructWebhookEvent = (
  rawBody: Buffer | string,
  signature: string
): Stripe.Event => {
  const stripe = getStripe();

  if (!config.stripe.webhookSecret) {
    throw new AppError(
      'Stripe webhook secret is not configured in .env.',
      StatusCodes.BAD_GATEWAY
    );
  }

  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe.webhookSecret as string
  );
};
