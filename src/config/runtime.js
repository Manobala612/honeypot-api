import dotenv from 'dotenv';
dotenv.config();

export const runtimeConfig = {
  port: process.env.PORT || 10000,
  geminiKey: process.env.GEMINI_API_KEY // Ensure this EXACT name is in Render Dashboard
};