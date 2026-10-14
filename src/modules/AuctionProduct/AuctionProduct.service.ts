import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import AuctionProduct from './AuctionProduct.model';
import Bid from '../bid/bid.model';
import AppError from '../../errors/AppError';

const toPublicAuctionProduct = (auctionProduct: any) => {
  const item = auctionProduct.toObject();
  const { paymentStatus, pickupStatus, ...publicItem } = item;
  void paymentStatus;
  void pickupStatus;
  return {
    ...publicItem,
    highestBid: {
      amount: item.highestBid?.amount ?? 0,
      placedAt: item.highestBid?.placedAt ?? null,
    },
    winner: undefined,
  };
};

const getProductsByAuctionId = async (auctionId: string) => {
  const result = await AuctionProduct.find({
    auctionId: new Types.ObjectId(auctionId),
  }).populate('productId');

  return result.map(toPublicAuctionProduct);
};

const getSingleAuctionProduct = async (auctionProductId: string) => {
  if (!Types.ObjectId.isValid(auctionProductId)) {
    throw new AppError('Invalid auction product id', StatusCodes.BAD_REQUEST);
  }

  const auctionProduct =
    (await AuctionProduct.findById(auctionProductId)
      .populate('productId')
      .populate('auctionId', 'auctionId title description startsAt endsAt status')) ||
    (await AuctionProduct.findOne({ productId: new Types.ObjectId(auctionProductId) })
      .sort({ createdAt: -1 })
      .populate('productId')
      .populate('auctionId', 'auctionId title description startsAt endsAt status'));

  if (!auctionProduct) {
    throw new AppError('Auction product not found', StatusCodes.NOT_FOUND);
  }

  const product = auctionProduct.productId as any;
  const auction = auctionProduct.auctionId as any;
  const currentBid = auctionProduct.highestBid?.amount ?? 0;
  const minimumNextBid =
    currentBid > 0 ? currentBid + auctionProduct.bidIncrement : auctionProduct.startingBid;

  const bids = await Bid.find({
    auctionProductId: auctionProduct._id,
    isAccepted: { $ne: false },
    amount: { $lte: currentBid },
  })
    .select('bidderId amount createdAt isSystemBid')
    .sort({ amount: -1, createdAt: -1 })
    .lean();
  const seenBidders = new Set<string>();
  const topBids = bids.filter((bid) => {
    const bidderId = String(bid.bidderId);
    if (seenBidders.has(bidderId)) return false;
    seenBidders.add(bidderId);
    return true;
  });
  const bidHistory = topBids.map((bid) => ({
    amount: bid.amount,
    placedAt: bid.createdAt,
  }));
  const customerBids = bids.filter((bid) => !bid.isSystemBid);
  const totalBidders = new Set(customerBids.map((bid) => String(bid.bidderId))).size;
  const totalBids = customerBids.length;

  return {
    auctionProductId: auctionProduct._id,
    status: auctionProduct.status,
    canBid: auctionProduct.status === 'active',
    startingBid: auctionProduct.startingBid,
    reservePrice: auctionProduct.reservePrice,
    bidIncrement: auctionProduct.bidIncrement,
    highestBid: {
      amount: currentBid,
      placedAt: auctionProduct.highestBid?.placedAt ?? null,
    },
    bidHistory,
    totalBidders,
    totalBids,
    minimumNextBid,
    closedAt: auctionProduct.closedAt ?? null,
    auction: auction
      ? {
          _id: auction._id,
          auctionId: auction.auctionId,
          title: auction.title,
          description: auction.description,
          startsAt: auction.startsAt,
          endsAt: auction.endsAt,
          status: auction.status,
        }
      : null,
    product: product
      ? {
          _id: product._id,
          inventoryId: product.inventoryId,
          title: product.title,
          description: product.description,
          category: product.category,
          condition: product.condition,
          day: product.day,
          reservePrice: product.reservePrice,
          inventoryStatus: product.inventoryStatus,
          images: product.images,
          totalReview: product.totalReview,
          type: product.type,
          color: product.color,
          quantity: product.quantity,
          averageReview: product.averageReview,
          manufacturer: product.manufacturer,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        }
      : null,
  };
};

const getAllActiveAuction = async () => {
  const result = await AuctionProduct.find({ status: 'active' })
    .populate('productId')
    .populate('auctionId', 'auctionId startsAt endsAt');

  return result.map((auctionProduct) => {
    const item = auctionProduct.toObject();
    return {
      ...item,
      highestBid: {
        amount: item.highestBid?.amount ?? 0,
        placedAt: item.highestBid?.placedAt ?? null,
      },
      winner: undefined,
      paymentStatus: undefined,
      pickupStatus: undefined,
    };
  });
};

const auctionProductService = {
  getProductsByAuctionId,
  getSingleAuctionProduct,
  getAllActiveAuction,
};

export default auctionProductService;
