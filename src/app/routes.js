import express from "express";
import { apiKeyAuth } from "../auth/apiKeyAuth.js";
import { requestGuard } from "../auth/requestGuard.js";
import { detectScam } from "../detection/scamDetector.js";
import { extractIntel } from "../extraction/intelExtractor.js";


const router = express.Router();

router.post(
  "/honeypot",
  requestGuard,
  apiKeyAuth,
  (req, res) => {
    /* Empty body check */
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Request body cannot be empty"
      });
    }

    const { message } = req.body;

    /* Missing / invalid message check */
    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({
        error: "Bad Request",
        message: "`message` field is required and must be a non-empty string"
      });
    }

    // Orchestration (Role 1 only)
    const detectionResult = detectScam(message);
    const extractedIntel = extractIntel(message);

    return res.status(200).json({
      scam_detected: detectionResult.is_scam,
      scam_type: detectionResult.scam_type,
      confidence: detectionResult.confidence,
      extracted_intel: extractedIntel,
      status: "orchestrated",
      received_message: message
    });
  }
);

export default router;
