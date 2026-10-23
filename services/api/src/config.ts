import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://codemind:codemind_dev_password@localhost:5432/codemind',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_codemind_change_in_production_32chars!',
  JWT_EXPIRES_IN: '24h',
  INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN || 'dev_internal_service_token_codemind_secret_key_64bit',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  MAX_SOURCE_BYTES: parseInt(process.env.MAX_SOURCE_BYTES || '500000', 10),
  MAX_FILES_PER_REVIEW: parseInt(process.env.MAX_FILES_PER_REVIEW || '30', 10),
  REVIEW_TIMEOUT_SECONDS: parseInt(process.env.REVIEW_TIMEOUT_SECONDS || '300', 10),
  AGENT_TIMEOUT_SECONDS: parseInt(process.env.AGENT_TIMEOUT_SECONDS || '90', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
