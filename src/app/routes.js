import { getSession, updateSessionIntel } from '../agent/sessionStore.js';
import { intelExtractor } from '../ai/intelExtractor.js';
import { runAgent } from '../agent/geminiAgent.js';

async function sendFinalCallback(sessionId, session) {
  if (session.callbackSent) return;

  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.messageCount,
    extractedIntelligence: {
      bankAccounts: session.extracted.bankAccounts,
      upiIds: session.extracted.upiIds,
      phishingLinks: session.extracted.phishingLinks,
      phoneNumbers: session.extracted.phoneNumbers,
      suspiciousKeywords: session.extracted.suspiciousKeywords
    },
    agentNotes: "Scammer successfully engaged. Extracted bank and UPI details using panicked persona."
  };

  try {
    const res = await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) session.callbackSent = true;
  } catch (err) {
    console.error("Callback failed:", err);
  }
}

export async function handleMessage(req, res) {
  try {
    const { sessionId, message, conversationHistory } = req.body;
    const messageText = message?.text || "";

    const session = getSession(sessionId || "default");
    session.messageCount++;

    // 1. Extract & Update
    const foundIntel = intelExtractor.regexExtract(messageText);
    updateSessionIntel(session, foundIntel, messageText);

    // 2. Generate Reply
    const agentResult = await runAgent({ history: conversationHistory, session });

    // 3. Check if done (Trigger Callback)
    if (session.stage === "stall") {
      await sendFinalCallback(sessionId, session);
    }

    // 4. Return Hackathon Format
    return res.json({ status: "success", reply: agentResult.reply });

  } catch (error) {
    return res.status(200).json({ status: "success", reply: "I'm so confused... what should I do?" });
  }
}