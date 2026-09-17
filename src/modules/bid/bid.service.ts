import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import { User } from '../user/user.model';
import AuctionProduct from '../AuctionProduct/AuctionProduct.model';
import Product from '../product/product.model';
import Invoice from '../invoice/invoice.model';
import { PickupAppointment } from '../pickup/pickup.model';
import Bid from './bid.model';
import Auction from '../auction/auction.model';
import { getOrCreateSystemUser } from '../user/user.utils';
import { enqueueOutbidEmailNotification } from '../../queues/outbid-email.producer';
import { emitAuctionBidUpdate } from '../../socket/notification.service';
import { invalidateCachePattern } from '../../utils/redis.cache';

const addBid = async (email: string, payload: any) => {
  // Find user
  const { auctionProductId, amount } = payload;
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  // Check if user has a default payment method before accepting bid
  if (!user.hasDefaultPaymentMethod || !user.defaultPaymentMethodId) {
    throw new AppError(
      'You must have a saved payment method before placing a bid.',
      StatusCodes.BAD_REQUEST,
    );
  }

  // Find auction product
  const auctionProduct = await AuctionProduct.findById(auctionProductId);

  if (!auctionProduct) {
    throw new AppError('Auction product not found', StatusCodes.NOT_FOUND);
  }

  // Product must be active
  if (auctionProduct.status !== 'active') {
    throw new AppError('This product is not available for bidding.', StatusCodes.BAD_REQUEST);
  }

  const auction = await Auction.findById(auctionProduct.auctionId);
  if (!auction) {
    throw new AppError('Associated auction not found', StatusCodes.NOT_FOUND);
  }

  // Anti-sniping check: extend timer by 59 seconds if bid is placed within last 1 minute (60s)
  const now = Date.now();
  let timeRemainingMs = auction.endsAt.getTime() - now;

  if (timeRemainingMs > 0 && timeRemainingMs <= 60 * 1000) {
    auction.endsAt = new Date(auction.endsAt.getTime() + 59 * 1000);
    await auction.save();
    timeRemainingMs = auction.endsAt.getTime() - now;
  }

  // Calculate minimum bid
  const minimumBid =
    auctionProduct.highestBid.amount > 0
      ? auctionProduct.highestBid.amount + auctionProduct.bidIncrement
      : auctionProduct.startingBid;

  if (amount < minimumBid) {
    throw new AppError(`Minimum bid amount is ${minimumBid}`, StatusCodes.BAD_REQUEST);
  }

  // Prevent current highest bidder from bidding again (optional)
  if (
    auctionProduct.highestBid.bidder &&
    auctionProduct.highestBid.bidder.toString() === user._id.toString()
  ) {
    throw new AppError('You already have the highest bid.', StatusCodes.BAD_REQUEST);
  }

  // Create bid
  const bid = await Bid.create({
    auctionId: auctionProduct.auctionId,
    auctionProductId: auctionProduct._id,
    productId: auctionProduct.productId,
    bidderId: user._id,
    amount,
    isWinningBid: true,
  });

  const acceptedAuctionProduct = await AuctionProduct.findOneAndUpdate(
    {
      _id: auctionProduct._id,
      status: 'active',
      'highestBid.bidder': { $ne: user._id },
      $or: [
        {
          'highestBid.amount': {
            $gt: 0,
            $lte: amount - auctionProduct.bidIncrement,
          },
        },
        {
          $and: [
            {
              $or: [
                { 'highestBid.amount': { $exists: false } },
                { 'highestBid.amount': { $lte: 0 } },
              ],
            },
            { startingBid: { $lte: amount } },
          ],
        },
      ],
    },
    {
      $set: {
        highestBid: {
          bidder: user._id as any,
          bid: bid._id,
          amount,
          placedAt: new Date(),
        },
      },
    },
  );

  if (!acceptedAuctionProduct) {
    await Bid.findByIdAndUpdate(bid._id, { isWinningBid: false });
    throw new AppError(
      'Minimum bid amount has changed. Please refresh and bid again.',
      StatusCodes.CONFLICT,
    );
  }

  // Previous winning bid becomes false
  await Bid.updateMany(
    {
      auctionProductId: auctionProduct._id,
      _id: { $ne: bid._id },
      isWinningBid: true,
    },
    {
      isWinningBid: false,
    },
  );

  const previousHighestBid = acceptedAuctionProduct.highestBid;

  void enqueueOutbidEmailNotification({
    auctionProductId: auctionProduct._id.toString(),
    productId: auctionProduct.productId.toString(),
    previousBidderId: previousHighestBid.bidder?.toString(),
    newBidderId: user._id.toString(),
    previousBidAmount: previousHighestBid.amount ?? 0,
    newBidderName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Bidder',
    newBidAmount: amount,
    bidId: bid._id.toString(),
  });

  emitAuctionBidUpdate(auctionProduct.auctionId.toString(), {
    auctionId: auctionProduct.auctionId.toString(),
    auctionProductId: auctionProduct._id.toString(),
    productId: auctionProduct.productId.toString(),
    bidId: bid._id.toString(),
    bidderId: user._id.toString(),
    amount,
    minimumNextBid: amount + auctionProduct.bidIncrement,
    endsAt: auction.endsAt,
    placedAt: new Date(),
  });

  void invalidateCachePattern('cache:auction:*');

  const baseProduct = await Product.findById(auctionProduct.productId).select('reservePrice');
  const effectiveReservePrice =
    auctionProduct.reservePrice != null && auctionProduct.reservePrice > 0
      ? auctionProduct.reservePrice
      : baseProduct?.reservePrice != null && baseProduct.reservePrice > 0
        ? baseProduct.reservePrice
        : 0;

  // System Auto-Counter Bidding Logic (Active ONLY in the last 1 hour of auction)
  if (
    auction.status === 'active' &&
    timeRemainingMs <= 60 * 60 * 1000 &&
    effectiveReservePrice > 0 &&
    amount < effectiveReservePrice &&
    !user.isSystemUser
  ) {
    const systemUser = await getOrCreateSystemUser();

    // Counter bid capped at reservePrice
    const systemAmount = Math.min(amount + auctionProduct.bidIncrement, effectiveReservePrice);

    const systemBid = await Bid.create({
      auctionId: auctionProduct.auctionId,
      auctionProductId: auctionProduct._id,
      productId: auctionProduct.productId,
      bidderId: systemUser._id,
      amount: systemAmount,
      isWinningBid: true,
      isSystemBid: true,
    });

    await AuctionProduct.findByIdAndUpdate(auctionProduct._id, {
      $set: {
        highestBid: {
          bidder: systemUser._id as any,
          bid: systemBid._id,
          amount: systemAmount,
          placedAt: new Date(),
        },
      },
    });

    await Bid.findByIdAndUpdate(bid._id, { isWinningBid: false });

    // Anti-sniping check for system bid
    const currentNow = Date.now();
    const systemTimeRemainingMs = auction.endsAt.getTime() - currentNow;
    if (systemTimeRemainingMs > 0 && systemTimeRemainingMs <= 60 * 1000) {
      auction.endsAt = new Date(auction.endsAt.getTime() + 59 * 1000);
      await auction.save();
    }

    emitAuctionBidUpdate(auctionProduct.auctionId.toString(), {
      auctionId: auctionProduct.auctionId.toString(),
      auctionProductId: auctionProduct._id.toString(),
      productId: auctionProduct.productId.toString(),
      bidId: systemBid._id.toString(),
      bidderId: systemUser._id.toString(),
      amount: systemAmount,
      minimumNextBid: systemAmount + auctionProduct.bidIncrement,
      endsAt: auction.endsAt,
      isSystemBid: true,
      placedAt: new Date(),
    });
  }

  return bid;
};

const getMyDashboardAuctionActivity = async (email: string) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  const bidAuctionProductIds = await Bid.distinct('auctionProductId', {
    bidderId: user._id,
  });

  if (!bidAuctionProductIds.length) {
    return {
      summary: {
        active: 0,
        won: 0,
        lost: 0,
      },
      active: [],
      won: [],
      lost: [],
    };
  }

  const objectIds = bidAuctionProductIds.map((id) => new Types.ObjectId(id));

  const [auctionProducts, bidStats, userBidStats, appointments] = await Promise.all([
    AuctionProduct.find({ _id: { $in: objectIds } })
      .populate('auctionId', 'auctionId title endsAt status')
      .populate('productId', 'title category images type')
      .lean(),
    Bid.aggregate([
      {
        $match: {
          auctionProductId: { $in: objectIds },
        },
      },
      {
        $group: {
          _id: '$auctionProductId',
          totalBids: { $sum: 1 },
        },
      },
    ]),
    Bid.aggregate([
      {
        $match: {
          auctionProductId: { $in: objectIds },
          bidderId: user._id,
        },
      },
      {
        $sort: {
          amount: -1,
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: '$auctionProductId',
          yourBid: { $first: '$amount' },
          latestBidAt: { $first: '$createdAt' },
        },
      },
    ]),
    PickupAppointment.find({
      customer: user._id,
    })
      .select('status invoices')
      .lean(),
  ]);

  const productIds = auctionProducts
    .map((item) => normalizeProduct(item.productId)?._id)
    .filter(Boolean);

  const invoices = await Invoice.find({
    customer: user._id,
    product: {
      $in: productIds,
    },
  })
    .select('product invoiceNumber status _id')
    .lean();

  const bidCountByAuctionProductId = new Map<string, number>();
  bidStats.forEach((item) => {
    bidCountByAuctionProductId.set(String(item._id), item.totalBids);
  });

  const userBidByAuctionProductId = new Map<
    string,
    {
      yourBid: number;
      latestBidAt?: Date;
    }
  >();
  userBidStats.forEach((item) => {
    userBidByAuctionProductId.set(String(item._id), {
      yourBid: item.yourBid,
      latestBidAt: item.latestBidAt,
    });
  });

  const invoiceByProductId = new Map<string, (typeof invoices)[number]>();
  invoices.forEach((invoice) => {
    invoiceByProductId.set(String(invoice.product), invoice);
  });

  const appointmentByInvoiceId = new Map<string, (typeof appointments)[number]>();
  appointments.forEach((appointment) => {
    appointment.invoices.forEach((invoiceId) => {
      appointmentByInvoiceId.set(String(invoiceId), appointment);
    });
  });

  const active: Array<Record<string, unknown>> = [];
  const won: Array<Record<string, unknown>> = [];
  const lost: Array<Record<string, unknown>> = [];

  for (const item of auctionProducts) {
    const auctionProductId = String(item._id);
    const auction = normalizeAuction(item.auctionId);
    const product = normalizeProduct(item.productId);
    const highestBidAmount = item.highestBid?.amount ?? 0;
    const yourBidDetails = userBidByAuctionProductId.get(auctionProductId);
    const yourBid = yourBidDetails?.yourBid ?? 0;
    const totalBids = bidCountByAuctionProductId.get(auctionProductId) ?? 0;
    const minimumNextBid =
      highestBidAmount > 0 ? highestBidAmount + item.bidIncrement : item.startingBid;

    const baseData = {
      auctionProductId,
      auctionId: auction?._id ?? null,
      auctionRef: auction?.auctionId ?? null,
      productId: product?._id ?? null,
      title: product?.title ?? 'Auction item',
      category: product?.category ?? 'Uncategorized',
      image: product?.images?.[0]?.url ?? null,
    };

    if (item.status === 'active') {
      active.push({
        ...baseData,
        endsAt: auction?.endsAt ?? null,
        totalBids,
        currentBid: highestBidAmount,
        yourBid,
        minimumNextBid,
        isLeading:
          Boolean(item.highestBid?.bidder) &&
          String(item.highestBid.bidder) === String(user._id),
        outbidBy: yourBid > 0 && highestBidAmount > yourBid ? highestBidAmount - yourBid : 0,
      });
      continue;
    }

    if (item.winner && String(item.winner) === String(user._id)) {
      const invoice = product?._id ? invoiceByProductId.get(String(product._id)) : undefined;
      const appointment = invoice ? appointmentByInvoiceId.get(String(invoice._id)) : undefined;

      won.push({
        ...baseData,
        winningBid: item.soldPrice ?? highestBidAmount,
        winningDate: item.closedAt ?? auction?.endsAt ?? null,
        paymentStatus: invoice?.status ?? item.paymentStatus,
        pickupStatus: appointment?.status ?? item.pickupStatus,
        invoiceId: invoice?._id ?? null,
        invoiceNumber: invoice?.invoiceNumber ?? null,
      });
      continue;
    }

    lost.push({
      ...baseData,
      yourFinalBid: yourBid,
      winningBid: item.soldPrice ?? highestBidAmount,
      endedOn: item.closedAt ?? auction?.endsAt ?? null,
    });
  }

  return {
    summary: {
      active: active.length,
      won: won.length,
      lost: lost.length,
    },
    active,
    won,
    lost,
  };
};

function normalizeAuction(auction: any) {
  if (!auction || Array.isArray(auction)) return null;
  return auction;
}

function normalizeProduct(product: any) {
  if (!product || Array.isArray(product)) return null;
  return product;
}

const bidService = {
  addBid,
  getMyDashboardAuctionActivity,
};

export default bidService;
