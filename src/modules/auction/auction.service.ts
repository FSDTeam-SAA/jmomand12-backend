import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import AppError from '../../errors/AppError';
import Product from '../product/product.model';
import { User } from '../user/user.model';
import Bid from '../bid/bid.model';
import paymentService from '../payment/payment.service';
import invoiceService from '../invoice/invoice.service';
import Auction from './auction.model';
import { AuctionStatus, IAuction } from './auction.interface';
import { generateAuctionId } from '../../utils/product.utils';

const resolveAuctionStatus = (startsAt: Date, endsAt: Date): AuctionStatus => {
  const now = new Date();

  if (now < startsAt) return 'upcoming';
  if (now >= startsAt && now < endsAt) {
    return 'active';
  }

  return 'ended';
};

const createAuction = async (payload: any, email: string) => {
  const admin = await User.findOne({ email });

  if (!admin) {
    throw new AppError('Admin account not found', StatusCodes.FORBIDDEN);
  }

  const products = await Product.find({
    _id: { $in: payload.products },
  });

  if (!products.length) {
    throw new AppError('Products not found', StatusCodes.NOT_FOUND);
  }

  for (const product of products) {
    if (product.inventoryStatus !== 'available' && product.inventoryStatus !== 'unsold') {
      throw new AppError(`${product.title} is not available for auction`, StatusCodes.BAD_REQUEST);
    }
  }

  const startsAt = new Date(
    `${payload.auctionSchedule.startDate}T${payload.auctionSchedule.startTime}:00`,
  );

  const endsAt = new Date(startsAt);

  endsAt.setDate(endsAt.getDate() + payload.auctionSchedule.durationInDays);

  const status = resolveAuctionStatus(startsAt, endsAt);

  const auction = await Auction.create({
    auctionId: await generateAuctionId(),
    products: products.map((p) => p._id),
    title: payload.title,
    description: payload.description,
    startsAt,
    endsAt,
    durationInDays: payload.auctionSchedule.durationInDays,
    startingBid: payload.startingBid,
    bidIncrement: payload.bidIncrement,
    reservePrice: payload.reservePrice,
    status,
    pickupSchedule: payload.pickupSchedule,
    highestBid: {
      amount: 0,
    },
  });

  await Product.updateMany(
    {
      _id: {
        $in: products.map((p) => p._id),
      },
    },
    {
      inventoryStatus: status === 'active' ? 'auction_active' : 'available',
    },
  );

  return auction.populate('products');
};

const activateDueAuctions = async () => {
  const now = new Date();

  const auctions = await Auction.find({
    status: 'upcoming',
    startsAt: { $lte: now },
    endsAt: { $gt: now },
  });

  if (auctions.length === 0) {
    return {
      success: false,
      message: 'No auctions are ready to be activated.',
      activatedCount: 0,
    };
  }

  for (const auction of auctions) {
    auction.status = 'active';
    await auction.save();

    await Product.updateMany(
      {
        _id: { $in: auction.products },
      },
      {
        inventoryStatus: 'auction_active',
      },
    );
  }

  return {
    success: true,
    message: `${auctions.length} auction(s) activated successfully.`,
    activatedCount: auctions.length,
  };
};

const getAllAuctions = async (query: Record<string, unknown>) => {
  const {
    status,
    searchTerm,
    page = 1,
    limit = 10,
    sortBy = 'startsAt',
    sortOrder = 'desc',
  } = query;

  const filter: Record<string, unknown> = {};

  // Status Filter
  if (status) {
    filter.status = status;
  }

  // Search
  if (searchTerm) {
    filter.$or = [
      {
        auctionId: {
          $regex: searchTerm,
          $options: 'i',
        },
      },
      {
        title: {
          $regex: searchTerm,
          $options: 'i',
        },
      },
    ];
  }

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const skip = (pageNumber - 1) * limitNumber;

  const sort: Record<string, 1 | -1> = {
    [String(sortBy)]: sortOrder === 'asc' ? 1 : -1,
  };

  const [auctions, total] = await Promise.all([
    Auction.find(filter)
      .populate('products')
      .populate('highestBid.bidder', 'firstName lastName email')
      .populate('winner', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limitNumber),

    Auction.countDocuments(filter),
  ]);

  return {
    meta: {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPage: Math.ceil(total / limitNumber),
    },
    data: auctions,
  };
};

const getAuctionDetails = async (id: string) => {
  const auction = await Auction.findById(id)
    .populate('products')
    .populate('highestBid.bidder', 'firstName lastName email profileImage')
    .populate('winner', 'firstName lastName email profileImage')
    .populate({
      path: 'highestBid.bid',
      populate: {
        path: 'bidder',
        select: 'firstName lastName email',
      },
    });

  if (!auction) {
    throw new AppError('Auction not found', StatusCodes.NOT_FOUND);
  }

  return auction;
};

const getAuctionBids = async (auctionId: string) => {
  const auction = await Auction.findById(auctionId).select('_id');
  if (!auction) {
    throw new AppError('Auction not found', StatusCodes.NOT_FOUND);
  }

  return Bid.find({ auction: auctionId })
    .populate('bidder', 'firstName lastName email')
    .sort({ amount: -1, createdAt: 1 });
};

const placeBid = async (auctionId: string, email: string, amount: number) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  if (!user.hasDefaultPaymentMethod || !user.defaultPaymentMethodId || !user.stripeCustomerId) {
    throw new AppError('A saved payment card is required before bidding', StatusCodes.BAD_REQUEST);
  }

  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new AppError('Auction not found', StatusCodes.NOT_FOUND);
  }

  const now = new Date();
  if (auction.status !== 'active' || auction.startsAt > now || auction.endsAt <= now) {
    throw new AppError('Auction is not active', StatusCodes.BAD_REQUEST);
  }

  const currentHighest = auction.highestBid?.amount || 0;
  const minimumBid =
    currentHighest > 0 ? currentHighest + auction.bidIncrement : auction.startingBid;
  if (amount < minimumBid) {
    throw new AppError(`Bid must be at least ${minimumBid}`, StatusCodes.BAD_REQUEST);
  }

  const bid = await Bid.create({
    auction: auction._id,
    product: auction.product,
    bidder: user._id,
    amount,
  });

  const updated = await Auction.findOneAndUpdate(
    {
      _id: auction._id,
      status: 'active',
      endsAt: { $gt: now },
      $or: [{ 'highestBid.amount': { $lt: amount } }, { 'highestBid.amount': { $exists: false } }],
    },
    {
      highestBid: {
        bidder: user._id,
        amount,
        bid: bid._id,
        placedAt: new Date(),
      },
    },
    { new: true },
  ).populate('product');

  if (!updated) {
    await Bid.findByIdAndDelete(bid._id);
    throw new AppError('A higher bid was placed before yours', StatusCodes.CONFLICT);
  }

  return updated;
};

const closeAuction = async (auctionId: string, reason = 'scheduled_close') => {
  const auction = await Auction.findById(auctionId).populate('product');
  if (!auction) {
    throw new AppError('Auction not found', StatusCodes.NOT_FOUND);
  }

  if (['sold', 'unsold', 'cancelled'].includes(auction.status)) {
    return auction;
  }

  const product: any = auction.product;
  const highestAmount = auction.highestBid?.amount || 0;
  const winnerId = auction.highestBid?.bidder;

  auction.status = 'ended';
  auction.closedAt = new Date();
  auction.closeReason = reason;

  if (!winnerId || highestAmount < auction.reservePrice) {
    auction.status = 'unsold';
    await auction.save();
    await Product.findByIdAndUpdate(product._id, { inventoryStatus: 'unsold' });
    return auction;
  }

  const winner = await User.findById(winnerId);
  if (!winner) {
    throw new AppError('Winning bidder not found', StatusCodes.NOT_FOUND);
  }

  auction.winner = winner._id as unknown as Types.ObjectId;
  auction.status = 'payment_pending';
  await auction.save();
  await Product.findByIdAndUpdate(product._id, {
    inventoryStatus: 'payment_pending',
  });

  try {
    const paymentIntent = await paymentService.chargeSavedPaymentMethod({
      customerId: winner.stripeCustomerId as string,
      paymentMethodId: winner.defaultPaymentMethodId as string,
      amount: highestAmount,
      description: `Auction win: ${product.title}`,
      metadata: {
        auctionId: auction._id.toString(),
        productId: product._id.toString(),
        inventoryId: product.inventoryId,
        winnerId: winner._id.toString(),
      },
    });

    const invoice = await invoiceService.createPaidInvoice({
      auctionId: auction._id.toString(),
      productId: product._id.toString(),
      customerId: winner._id.toString(),
      inventoryId: product.inventoryId,
      amount: highestAmount,
      stripePaymentIntentId: paymentIntent.id,
      productTitle: product.title,
    });

    auction.status = 'sold';
    await auction.save();
    await Product.findByIdAndUpdate(product._id, {
      inventoryStatus: 'ready_for_pickup',
    });

    return { auction, invoice };
  } catch (error: any) {
    await invoiceService.createFailedPaymentInvoice({
      auctionId: auction._id.toString(),
      productId: product._id.toString(),
      customerId: winner._id.toString(),
      inventoryId: product.inventoryId,
      amount: highestAmount,
      failureReason: error.message || 'Payment failed',
    });

    auction.status = 'payment_failed';
    await auction.save();
    await Product.findByIdAndUpdate(product._id, {
      inventoryStatus: 'payment_pending',
    });

    throw new AppError(
      `Winner assigned but saved card charge failed: ${error.message}`,
      StatusCodes.PAYMENT_REQUIRED,
    );
  }
};

const closeDueAuctions = async () => {
  await activateDueAuctions();

  const dueAuctions = await Auction.find({
    status: 'active',
    endsAt: { $lte: new Date() },
  }).select('_id');

  const results = [];
  for (const auction of dueAuctions) {
    try {
      results.push(await closeAuction(auction._id.toString(), 'scheduled_close'));
    } catch (error: any) {
      results.push({
        auction: auction._id,
        success: false,
        message: error.message,
      });
    }
  }

  return {
    closed: results.length,
    results,
  };
};

const auctionService = {
  createAuction,
  activateDueAuctions,
  getAllAuctions,
  getAuctionDetails,
  getAuctionBids,
  placeBid,
  closeAuction,
  closeDueAuctions,
};

export default auctionService;
