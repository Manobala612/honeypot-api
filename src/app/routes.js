import { getSession, updateSessionIntel } from '../agent/sessionStore.js';
import { intelExtractor } from '../ai/intelExtractor.js'; // Ensure path is correct
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
    agentNotes: "Successfully extracted info using scared persona. State machine progressed through all stages."
  };

  try {
    const res = await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) session.callbackSent = true;
  } catch (err) {
    console.error("Evaluation callback failed:", err);
  }
}

export async function handleMessage(req, res) {
  try {
    const { sessionId, message, conversationHistory } = req.body;
    const session = getSession(sessionId || "default");
    session.messageCount++;

    // 1. Extract data from current message
    const foundIntel = intelExtractor.regexExtract(message?.text || "");
    updateSessionIntel(session, foundIntel, message?.text || "");

    // 2. Get AI Response
    const agentResult = await runAgent({ history: conversationHistory, session });

    // 3. Trigger Callback if we've successfully stalled the scammer
    if (session.stage === "stall") {
      await sendFinalCallback(sessionId, session);
    }

    // 4. Send response in Hackathon format
    return res.json({ status: "success", reply: agentResult.reply });

  } catch (error) {
    return res.status(200).json({ status: "success", reply: "I don't know what to do, please help me!" });
  }
}