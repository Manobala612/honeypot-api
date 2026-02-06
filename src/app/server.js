import express from "express";
import cors from "cors";
import { handleMessage } from "./routes.js";
import { healthCheck } from "./health.js";
import { runtimeConfig } from "../config/runtime.js";

const app = express();
app.use(cors());
app.use(express.json());

// API Key Auth Middleware (Matches tester header)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'supersecretkey123') { // This key is required by the tester
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/health", healthCheck);
app.post("/chat", handleMessage); // This MUST be /chat

app.listen(runtimeConfig.port, () => {
  console.log(`🚀 Honeypot live on port ${runtimeConfig.port}`);
});