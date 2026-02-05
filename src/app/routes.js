import express from "express";
import { apiKeyAuth } from "../auth/apiKeyAuth.js";
import { handleConversation } from "../agent/conversationManager.js";

const router = express.Router();

router.post("/honeypot", apiKeyAuth, (req, res) => {
  const { session_id, message } = req.body;

  if (!session_id) {
    return res.status(400).json({
      error: "Missing session_id"
    });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({
      error: "Invalid message"
    });
  }

  const result = handleConversation(session_id, message);

  return res.status(200).json(result);
});

export default router;
