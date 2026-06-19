import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { User } from '../user/user.model';
import { IProduct } from './product.interface';
import { uploadToCloudinary } from '../../utils/cloudinary';
import Product from './product.model';

const createProduct = async (
  payload: Partial<IProduct>,
  email: string,
  files: Express.Multer.File[],
) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('Your account is not found', StatusCodes.FORBIDDEN);
  }

  if (!files?.length) {
    throw new AppError('At least one product image is required', StatusCodes.BAD_REQUEST);
  }

  const uploadedImages = await Promise.all(
    files.map(async (file) => {
      const image = await uploadToCloudinary(file.path, 'products');

      return {
        public_id: image.public_id,
        url: image.secure_url,
      };
    }),
  );

  const productData = {
    ...payload,
    images: uploadedImages,
    inventoryStatus: 'available',
    totalReview: 0,
    averageReview: 0,
  };

  const result = await Product.create(productData);
  return result;
};

const productService = {
  createProduct,
};

export default productService;
