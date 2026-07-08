import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import bidService from './bid.service';

const addBid = catchAsync(async (req, res) => {
  const { email } = req.user;
  const result = await bidService.addBid(email, req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Bid added successfully',
    data: result,
  });
});

const bidController = {
  addBid,
};

export default bidController;
