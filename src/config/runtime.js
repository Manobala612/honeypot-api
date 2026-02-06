import dotenv from 'dotenv';
dotenv.config();

export const runtimeConfig = {
  port: process.env.PORT || 3000,
  geminiKey: process.env.GEMINI_API_KEY
};