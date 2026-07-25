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

const pickupScheduleController = {
  getAuctionPickupSchedule,
  requestForPickupSchedule,
  getAllPickupSchedules,
};

export default pickupScheduleController;
