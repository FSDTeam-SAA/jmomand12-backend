import config from '../../config';
import { User } from './user.model';

export const getOrCreateSystemUser = async () => {
  const systemEmail = config.email.emailAddress || 'dicountd@gmail.com';

  let systemUser = await User.findOne({ isSystemUser: true });
  if (!systemUser) {
    systemUser = await User.findOne({ email: systemEmail });
  }
  if (!systemUser) {
    systemUser = await User.create({
      firstName: 'System',
      lastName: 'AutoBidder',
      email: systemEmail,
      password: 'SystemAutoBidderSecretPassword123!',
      isSystemUser: true,
      isVerified: true,
      role: 'admin',
    });
  } else if (!systemUser.isSystemUser) {
    systemUser.isSystemUser = true;
    await systemUser.save();
  }
  return systemUser;
};
