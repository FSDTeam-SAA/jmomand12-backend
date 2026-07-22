import { v2 as cloudinary } from 'cloudinary';
import { StatusCodes } from 'http-status-codes';
import fs from 'fs';
import config from '../config';
import logger from '../logger';
import AppError from '../errors/AppError';

// configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloud_name,
  api_key: config.cloudinary.api_key,
  api_secret: config.cloudinary.api_secret,
});

// upload file
export const uploadToCloudinary = async (filePath: string, folder: string) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
    });

    // delete local file after upload
    fs.unlinkSync(filePath);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
    };
  } catch (error: any) {
    logger.error({ error, filePath, folder }, 'Cloudinary upload error');

    const httpCode = error?.http_code || error?.statusCode;

    if (httpCode === 401 || httpCode === 403) {
      throw new AppError('Image service temporarily unavailable. Please try again later.', StatusCodes.BAD_GATEWAY);
    }

    if (httpCode === 400) {
      throw new AppError('Invalid image format. Please upload a valid image file.', StatusCodes.BAD_REQUEST);
    }

    if (httpCode === 413 || error?.message?.includes('file size')) {
      throw new AppError('Image file is too large. Please upload a smaller file.', StatusCodes.BAD_REQUEST);
    }

    throw new AppError('Unable to upload image. Please try again later.', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};

// delete file
export const deleteFromCloudinary = async (publicId: string) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error: any) {
    logger.error({ error, publicId }, 'Cloudinary delete error');
    throw new AppError('Unable to delete image.', StatusCodes.INTERNAL_SERVER_ERROR);
  }
};
