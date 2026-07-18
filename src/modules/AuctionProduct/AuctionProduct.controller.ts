import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import auctionProductService from './AuctionProduct.service';

const getProductsByAuctionId = catchAsync(async (req, res) => {
  const { auctionId } = req.params;
  const result = await auctionProductService.getProductsByAuctionId(auctionId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Products retrieved successfully',
    data: result,
  });
});

const getSingleAuctionProduct = catchAsync(async (req, res) => {
  const { auctionProductId } = req.params;
  const result = await auctionProductService.getSingleAuctionProduct(auctionProductId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Auction product retrieved successfully',
    data: result,
  });
});

const getAllActiveAuction = catchAsync(async (req, res) => {
  const result = await auctionProductService.getAllActiveAuction();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Active auctions retrieved successfully',
    data: result,
  });
});

const auctionProductController = {
  getProductsByAuctionId,
  getSingleAuctionProduct,
  getAllActiveAuction,
};

export default auctionProductController;
