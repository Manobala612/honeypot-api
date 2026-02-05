import { runtimeConfig } from "../config/runtime.js";

/**
 * Role 2: Security Middleware
 * Hardcoded to allow "supersecretkey123" while keeping the 
 * Gemini AI key safe in the background.
 */
export const apiKeyAuth = (req, res, next) => {
    const clientKey = req.headers['x-api-key'];

    // This is what you are typing in PowerShell
    const MASTER_GATE_KEY = "supersecretkey123";

    if (!clientKey) {
        return res.status(401).json({ 
            status: "error",
            message: "Unauthorized: API Key is missing." 
        });
    }

    // Now comparing against the string you actually want to use
    if (clientKey !== MASTER_GATE_KEY) {
        console.warn(`[AUTH FAIL] Received: ${clientKey} - Expected: ${MASTER_GATE_KEY}`);
        return res.status(403).json({ 
            status: "error",
            message: "Forbidden: Invalid API Key." 
        });
    }

    next();
};