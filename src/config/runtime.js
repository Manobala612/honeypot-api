import dotenv from 'dotenv';
dotenv.config();

export const runtimeConfig = {
    // This looks into your .env file
    geminiApiKey: process.env.GEMINI_API_KEY,
    port: process.env.PORT || 3000
};