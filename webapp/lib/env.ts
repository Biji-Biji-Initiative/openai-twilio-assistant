export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8081',
  NEXT_PUBLIC_DEV_PHONE_URL: process.env.NEXT_PUBLIC_DEV_PHONE_URL || 'http://localhost:8082'
}; 