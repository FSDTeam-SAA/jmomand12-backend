export const PUBLIC_USER_SELECT =
  '-password -otp -otpExpires -resetPasswordOtp -resetPasswordOtpExpires -stripeCustomerId -defaultPaymentMethodId';

export const DETAILED_PUBLIC_USER_SELECT =
  '_id firstName lastName email phone street location postalCode dateOfBirth role image isSuspend isBlocked isVerified hasDefaultPaymentMethod createdAt updatedAt';

export const toPublicUser = (user: any) => {
  if (!user) return null;

  if (typeof user !== 'object' || !('_id' in user)) {
    return {
      _id: user,
    };
  }

  const userObject = typeof user.toObject === 'function' ? user.toObject() : user;
  const {
    password,
    otp,
    otpExpires,
    resetPasswordOtp,
    resetPasswordOtpExpires,
    stripeCustomerId,
    defaultPaymentMethodId,
    ...publicUser
  } = userObject;

  return publicUser;
};
