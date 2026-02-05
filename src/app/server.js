import express from "express";
import cors from "cors";
import { handleMessage } from "./routes.js";
import { runtimeConfig } from "../config/runtime.js";

const app = express();
app.use(cors());
app.use(express.json());

// Hackathon API Key Security
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'supersecretkey123') { // Tester uses this key
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.post("/chat", handleMessage);

app.listen(runtimeConfig.port, () => {
  console.log(`🚀 Honeypot active on port ${runtimeConfig.port}`);
});