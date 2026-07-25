import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import pickupScheduleService from './pickupSchedule.service';

const getAuctionPickupSchedule = catchAsync(async (req, res) => {
  const { auctionId } = req.params;
  const result = await pickupScheduleService.getAuctionPickupSchedule(auctionId as string);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Schedule retrieved successfully.',
    data: result,
  });
});

const requestForPickupSchedule = catchAsync(async (req, res) => {
  const result = await pickupScheduleService.requestForPickupSchedule(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Schedule requested successfully.',
    data: result,
  });
});

const getAllPickupSchedules = catchAsync(async (req, res) => {
  const result = await pickupScheduleService.getAllPickupSchedules();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Schedules retrieved successfully.',
    data: result,
  });
});

const getMyRequestForPickupProduct = catchAsync(async (req, res) => {
  const { email } = req.user;
  const result = await pickupScheduleService.getMyRequestForPickupProduct(email);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My pickup requests retrieved successfully.',
    data: result,
  });
});

const pickupScheduleController = {
  getAuctionPickupSchedule,
  requestForPickupSchedule,
  getAllPickupSchedules,
  getMyRequestForPickupProduct,
};

export default pickupScheduleController;
