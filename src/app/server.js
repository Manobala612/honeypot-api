import express from "express";
import cors from "cors";
import { handleMessage } from "./routes.js";
import { healthCheck } from "./health.js";
import { runtimeConfig } from "../config/runtime.js";

const app = express();
app.use(cors());
app.use(express.json());

// 1. API Key Security (Required for Hackathon)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'supersecretkey123') { 
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/health", healthCheck);
app.post("/chat", handleMessage); // This is your main endpoint

app.listen(runtimeConfig.port, () => {
  console.log(`🚀 Honeypot active on port ${runtimeConfig.port}`);
});