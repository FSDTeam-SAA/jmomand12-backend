import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { User } from '../user/user.model';
import AuctionProduct from '../AuctionProduct/AuctionProduct.model';
import Bid from './bid.model';

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

  // Update auction product
  auctionProduct.highestBid = {
    bidder: user._id as any,
    bid: bid._id,
    amount,
    placedAt: new Date(),
  };

  await auctionProduct.save();

  return bid;
};

const bidService = {
  addBid,
};

export default bidService;
