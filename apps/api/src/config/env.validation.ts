import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),

  // PostgreSQL
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // JWT — TODO: añadir cuando se implemente auth
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Stripe Connect (test: sk_test_*/pk_test_*; live: sk_live_*/pk_live_*)
  STRIPE_SECRET_KEY: Joi.string().pattern(/^sk_(test|live)_/).required(),
  STRIPE_PUBLIC_KEY: Joi.string().pattern(/^pk_(test|live)_/).required(),
  STRIPE_WEBHOOK_SECRET: Joi.string().pattern(/^whsec_/).required(),
  STRIPE_PLATFORM_COMMISSION_PERCENT: Joi.number().min(0).max(100).default(5),
  OPENMARKET_RETURN_URL: Joi.string().uri().required(),
  OPENMARKET_REFRESH_URL: Joi.string().uri().required(),

  // Firebase Admin
  FIREBASE_SERVICE_ACCOUNT_PATH: Joi.string().default('secrets/firebase-service-account.json'),

  // App
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
});
