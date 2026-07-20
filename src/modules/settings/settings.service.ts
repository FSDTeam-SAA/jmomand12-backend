import Settings from './settings.model';
import { ISettings } from './settings.interface';
import AppError from '../../errors/AppError';
import { StatusCodes } from 'http-status-codes';

const getSettings = async () => {
  return Settings.findOneAndUpdate(
    { key: 'platform' },
    { $setOnInsert: { key: 'platform' } },
    { new: true, upsert: true },
  );
};

const updateSettings = async (payload: Partial<ISettings>) => {
  const updateData: Partial<ISettings> = {};

  if (payload.pickupGraceDays !== undefined) updateData.pickupGraceDays = payload.pickupGraceDays;
  if (payload.storageFeePerDay !== undefined) updateData.storageFeePerDay = payload.storageFeePerDay;
  if (payload.forfeitureDays !== undefined) updateData.forfeitureDays = payload.forfeitureDays;
  if (payload.pickupInstructions !== undefined) updateData.pickupInstructions = payload.pickupInstructions;
  if (payload.stateTaxRate !== undefined) {
    const stateTaxRate = Number(payload.stateTaxRate);
    if (!Number.isFinite(stateTaxRate) || stateTaxRate < 0) {
      throw new AppError('State tax rate must be a non-negative number', StatusCodes.BAD_REQUEST);
    }
    updateData.stateTaxRate = stateTaxRate;
  }
  if (payload.stateTaxState !== undefined) updateData.stateTaxState = payload.stateTaxState;
  if (payload.stateTaxLabel !== undefined) updateData.stateTaxLabel = payload.stateTaxLabel;

  return Settings.findOneAndUpdate(
    { key: 'platform' },
    { $set: updateData },
    { new: true, upsert: true, runValidators: true },
  );
};

const settingsService = {
  getSettings,
  updateSettings,
};

export default settingsService;
