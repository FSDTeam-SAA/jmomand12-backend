import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import orderService from './order.service';

const checkout = catchAsync(async (req, res) => {
  const result = await orderService.checkout(req.user.email);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Stripe checkout session created successfully',
    data: result,
  });
});

const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  const rawBody = (req as any).rawBody;

  if (!signature || !rawBody) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: 'Missing webhook signature or raw body payload.',
    });
  }

  try {
    const result = await orderService.handleWebhook(rawBody, signature);
    return res.status(StatusCodes.OK).json(result);
  } catch (error: any) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      message: error.message || 'Error processing Stripe webhook.',
    });
  }
};

const getMyOrders = catchAsync(async (req, res) => {
  const result = await orderService.getMyOrders(req.user.email);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Your orders retrieved successfully',
    data: result,
  });
});

const getAllOrders = catchAsync(async (req, res) => {
  const result = await orderService.getAllOrders();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'All orders retrieved successfully',
    data: result,
  });
});

const orderController = {
  checkout,
  handleStripeWebhook,
  getMyOrders,
  getAllOrders,
};

export default orderController;
