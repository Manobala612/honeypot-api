import express from "express";

import { apiKeyAuth } from "../auth/apiKeyAuth.js";
import { requestGuard } from "../auth/requestGuard.js";

import { getSession, clearSession } from "../agent/sessionStore.js";
import { runAgent } from "../agent/geminiAgent.js";
import { intelExtractor } from "../ai/intelExtractor.js";

const router = express.Router();

router.post("/honeypot", apiKeyAuth, requestGuard, async (req, res) => {
  try {
      // ✅ HARD FIX: Handle tester probe / empty request
    if (
      !req.body ||
      !req.body.message ||
      !req.body.message.text ||
      req.body.message.text.trim() === ""
    ) {
      return res.status(200).json({
        status: "success",
        reply: "Hello, how can I help you?"
      });
    }

    const sessionId = req.body.sessionId || "default";

    const messageText =
      req.body?.message?.text || "";

    const history =
      req.body?.conversationHistory || [];

    const session = getSession(sessionId);

    // Load history once
    if (session.conversation.length === 0 && history.length) {
      history.forEach(m => {
        if (m.text) session.conversation.push(m.text);
      });
    }

    // Store new message
    session.conversation.push(messageText);

    // ✅ Extract intel (FIXED)
    const extracted = intelExtractor.regexExtract(messageText);

    if (extracted.upi_id?.length) {
      session.extracted.upiIds.push(...extracted.upi_id);
    }

    if (extracted.phone_number?.length) {
      session.extracted.phoneNumbers.push(...extracted.phone_number);
    }

    if (extracted.phishing_url?.length) {
      session.extracted.phishingLinks.push(...extracted.phishing_url);
    }

    if (extracted.bank_account) {
      session.extracted.bankAccounts.push(extracted.bank_account);
    }

    // Remove duplicates
    session.extracted.upiIds = [...new Set(session.extracted.upiIds)];
    session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
    session.extracted.phishingLinks = [...new Set(session.extracted.phishingLinks)];
    session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];

    // Run Gemini Agent
    const agentResult = await runAgent({
      history: session.conversation,
      intel: session.extracted,
      lastMessage: messageText
    });

    // Check completion
    if (
      session.extracted.upiIds.length &&
      session.extracted.phoneNumbers.length &&
      session.extracted.bankAccounts.length &&
      session.extracted.phishingLinks.length
    ) {
      session.completed = true;
    }

    // Send final callback
    if (session.completed) {
      await sendFinalResult(sessionId, session);
      clearSession(sessionId);
    }

    // REQUIRED FORMAT
    return res.json({
      status: "success",
      reply: agentResult.reply
    });

  } catch (err) {
    console.error("Route error:", err);

    return res.status(500).json({
      status: "error",
      message: "Internal server error"
    });
  }
});

async function sendFinalResult(sessionId, session) {
  const payload = {
    sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.conversation.length,

    extractedIntelligence: {
      bankAccounts: session.extracted.bankAccounts,
      upiIds: session.extracted.upiIds,
      phishingLinks: session.extracted.phishingLinks,
      phoneNumbers: session.extracted.phoneNumbers,
      suspiciousKeywords: session.extracted.suspiciousKeywords
    },

    agentNotes:
      "Scammer used urgency and payment redirection"
  };

  await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    timeout: 5000
  });
}

export default router;
