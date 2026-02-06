import express from "express";
import cors from "cors";
import { handleMessage } from "./routes.js";
import { healthCheck } from "./health.js";
import { runtimeConfig } from "../config/runtime.js";

const app = express();
app.use(cors());
app.use(express.json());

// API Key Auth Middleware
app.use((req, res, next) => {
    if (req.path === '/health') return next();
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== 'supersecretkey123') {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
});

app.get("/health", healthCheck);

/* Main Hackathon Endpoint */
app.post("/chat", handleMessage); 

app.listen(runtimeConfig.port, () => {
    console.log(`🚀 Honeypot active on port ${runtimeConfig.port}`);
});