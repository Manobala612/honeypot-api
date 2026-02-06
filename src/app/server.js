import express from "express";
import cors from "cors";
import { handleMessage } from "./routes.js";
import { runtimeConfig } from "../config/runtime.js";

const app = express();
app.use(cors());
app.use(express.json());

// API Key Auth
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== 'supersecretkey123') {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.post("/chat", handleMessage); // This URL for tester: ...onrender.com/chat

app.listen(runtimeConfig.port, () => {
  console.log(`🚀 Honeypot live on port ${runtimeConfig.port}`);
});