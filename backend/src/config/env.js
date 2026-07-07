import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.warn(`\n[config] Missing environment variable: ${name}`);
    console.warn('         Some API routes may fail until it is configured.\n');
    return '';
  }
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: process.env.JWT_SECRET || 'changed-this-before-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  port: Number(process.env.PORT) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  isProd: process.env.NODE_ENV === 'production',
};
