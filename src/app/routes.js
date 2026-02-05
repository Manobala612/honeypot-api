import express from "express";
import fetch from "node-fetch";

import { apiKeyAuth } from "../auth/apiKeyAuth.js";
import { requestGuard } from "../auth/requestGuard.js";

import { getSession, clearSession } from "../agent/sessionStore.js";
import { runAgent } from "../agent/geminiAgent.js";
import { intelExtractor } from "../ai/intelExtractor.js";

const router = express.Router();

router.post("/honeypot", apiKeyAuth, requestGuard, async (req, res) => {
  try {
    const sessionId = req.body?.sessionId || "default";

    const messageText =
      req.body?.message?.text?.trim() || "Hello";

    // Load session
    const session = getSession(sessionId);

    // Store message
    session.conversation.push(messageText);

    // Extract intel
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

    // Deduplicate
    session.extracted.upiIds = [...new Set(session.extracted.upiIds)];
    session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
    session.extracted.phishingLinks = [...new Set(session.extracted.phishingLinks)];
    session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];

    const agentResult = await runAgent({
      history: session.conversation,
      intel: session.extracted,
      lastMessage: messageText,
      session
    });


    // Completion check
    if (
      session.extracted.upiIds.length &&
      session.extracted.phoneNumbers.length &&
      session.extracted.bankAccounts.length &&
      session.extracted.phishingLinks.length
    ) {
      session.completed = true;
    }

    // Final callback
    if (session.completed) {
      await sendFinalResult(sessionId, session);
      clearSession(sessionId);
    }

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

    agentNotes: "Scammer used urgency and credential harvesting"
  };

  await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export default router;
