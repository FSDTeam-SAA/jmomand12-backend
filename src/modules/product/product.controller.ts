import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import productService from './product.service';

const creteNewProduct = catchAsync(async (req, res) => {
  const { email } = req.user;
  const files = req.files;
  const result = await productService.createProduct(
    req.body,
    email,
    files as Express.Multer.File[],
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'New product created successfully',
    data: result,
  });
});

const productController = {
  creteNewProduct,
};

export default productController;
