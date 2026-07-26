import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import Auction from '../auction/auction.model';
import PickupSchedule from './pickupSchedule.model';
import AuctionProduct from '../AuctionProduct/AuctionProduct.model';
import { User } from '../user/user.model';

const getAuctionPickupSchedule = async (auctionId: string) => {
  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new Error('Auction not found');
  }
  return auction.pickupSchedule;
};

const requestForPickupSchedule = async ({
  userId,
  auctionId,
  pickupDate,
  pickupTime,
}: {
  userId: string;
  auctionId: string;
  pickupDate: string;
  pickupTime: string;
}) => {
  // Find auction
  const auction = await Auction.findById(auctionId);

  if (!auction) {
    throw new AppError('Auction not found', StatusCodes.NOT_FOUND);
  }

  const schedule = auction.pickupSchedule;

  if (!schedule) {
    throw new AppError('Pickup schedule is not available.', StatusCodes.BAD_REQUEST);
  }

  // -----------------------------
  // Validate pickup date
  // -----------------------------
  const selectedDate = new Date(pickupDate);
  const startDate = new Date(schedule.startDate);
  const endDate = new Date(schedule.endDate);

  // Compare only date portion
  selectedDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (selectedDate < startDate || selectedDate > endDate) {
    throw new AppError(
      'Selected pickup date is outside the allowed schedule.',
      StatusCodes.BAD_REQUEST,
    );
  }

  // -----------------------------
  // Validate pickup time
  // -----------------------------
  const [hour, minute] = pickupTime.split(':').map(Number);
  const selectedMinutes = hour * 60 + minute;

  const [startHour, startMinute] = schedule.dailyStartTime.split(':').map(Number);
  const [endHour, endMinute] = schedule.dailyEndTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  let isValidTime = false;

  if (startMinutes <= endMinutes) {
    // Same-day schedule
    isValidTime = selectedMinutes >= startMinutes && selectedMinutes <= endMinutes;
  } else {
    // Overnight schedule
    isValidTime = selectedMinutes >= startMinutes || selectedMinutes <= endMinutes;
  }

  if (!isValidTime) {
    throw new AppError(
      'Selected pickup time is outside the allowed schedule.',
      StatusCodes.BAD_REQUEST,
    );
  }

  // -----------------------------
  // Find auction product won by this user
  // -----------------------------
  const auctionProduct = await AuctionProduct.findOne({
    auctionId,
    'highestBid.bidder': userId,
  });

  if (!auctionProduct) {
    throw new AppError('You are not the winner of this auction.', StatusCodes.NOT_FOUND);
  }

  // Optional: Payment check
  if (auctionProduct.paymentStatus !== 'paid') {
    throw new AppError(
      'Please complete payment before requesting pickup.',
      StatusCodes.BAD_REQUEST,
    );
  }

  // Duplicate request check
  const existingRequest = await PickupSchedule.findOne({
    userId,
    auctionId,
    auctionProductId: auctionProduct._id,
  });

  if (existingRequest) {
    throw new AppError('Pickup request already exists.', StatusCodes.CONFLICT);
  }

  // Create pickup request
  return await PickupSchedule.create({
    userId,
    auctionId,
    auctionProductId: auctionProduct._id,
    pickupDate,
    pickupTime,
    status: 'requested',
  });
};

const getAllPickupSchedules = async () => {
  return await PickupSchedule.find()
    .populate('userId', 'firstName lastName email image')
    .populate('auctionId', 'auctionId title status')
    .populate({
      path: 'auctionProductId',
      populate: {
        path: 'productId',
        select: 'title inventoryId images',
      },
    })
    .sort({ createdAt: -1 });
};

const getMyRequestForPickupProduct = async (email: string) => {
  // Find the user by email
  const user = await User.findOne({ email });

  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  return await PickupSchedule.find({ userId: user._id })
    .populate('userId', 'firstName lastName email image')
    .populate('auctionId', 'auctionId title status')
    .populate({
      path: 'auctionProductId',
      populate: {
        path: 'productId',
        select: 'title inventoryId',
      },
    })
    .sort({ createdAt: -1 });
};

const updatePickupScheduleStatus = async (id: string, status: string) => {
  const schedule = await PickupSchedule.findById(id);

  if (!schedule) {
    throw new AppError('Pickup schedule not found.', StatusCodes.NOT_FOUND);
  }

  // Prevent moving back to Requested after Approval
  if (schedule.status === 'approved' && status === 'requested') {
    throw new AppError(
      'Approved requests cannot be changed back to Requested.',
      StatusCodes.BAD_REQUEST,
    );
  }

  return await PickupSchedule.findByIdAndUpdate(id, { status }, { new: true });
};

const pickupScheduleService = {
  getAuctionPickupSchedule,
  requestForPickupSchedule,
  getAllPickupSchedules,
  getMyRequestForPickupProduct,
  updatePickupScheduleStatus,
};

export default pickupScheduleService;
