import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  CALENDLY_TOKEN: process.env.CALENDLY_TOKEN || '',
  MOCK_MODE: process.env.MOCK_MODE === 'true',
  CALENDLY_API_BASE: 'https://api.calendly.com'
};
