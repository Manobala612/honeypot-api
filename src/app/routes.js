import express from "express";
import { apiKeyAuth } from "../auth/apiKeyAuth.js";
import { processMessage } from "../agent/conversationManager.js";
import { buildErrorResponse } from "../utils/responseBuilder.js";

const router = express.Router();

router.post("/honeypot", apiKeyAuth, (req, res) => {
  const { session_id, message } = req.body;

  if (!session_id) {
    return res
      .status(400)
      .json(buildErrorResponse("Missing session_id"));
  }

  if (!message || typeof message !== "string") {
    return res
      .status(400)
      .json(buildErrorResponse("Invalid message"));
  }

  try {
    const result = processMessage(session_id, message);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json(buildErrorResponse("Internal server error"));
  }
});

export default router;
