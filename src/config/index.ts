import dotenv from 'dotenv';
dotenv.config();

export default {
  port: process.env.PORT,
  mongodbUrl: process.env.MONGODB_URL,
  nodeEnv: process.env.NODE_ENV,

  bcryptSaltRounds: process.env.BCRYPT_SALT_ROUNDS,
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET,
  jwtRefreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,

  email: {
    emailAddress: process.env.EMAIL_ADDRESS,
    emailPass: process.env.EMAIL_PASSWORD,
    adminEmail: process.env.ADMIN_EMAIL,
  },
  reset: {
    reset_password_token_secret: process.env.RESET_PASSWORD_TOKEN_SECRET,
    reset_password_token_expires: process.env.RESET_EXPIRES_IN,
  },

  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },

  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },

  app: {
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  },

  queue: {
    workersEnabled: process.env.QUEUE_WORKERS_ENABLED !== 'false',
  },

  security: {
    AES_KEY: process.env.AES_KEY,
    AES_IV: process.env.AES_IV,
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      : [
          'https://www.discountdealsdmv.com',
          'https://discountdealsdmv.com',
          'https://admin.discountdealsdmv.com',
          'http://localhost:3000',
          'https://localhost:3000',
          'http://localhost:3001',
          'https://localhost:3001',
          'http://localhost:5173',
          'http://localhost:5174',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:5173',
          'http://127.0.0.1:5174',
        ],
  },
  cron: {
    enabled: process.env.CRON_ENABLED !== 'false',
  },
};
