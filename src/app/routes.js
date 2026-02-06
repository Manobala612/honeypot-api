import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const sessions = new Map();

// Mandatory GUVI Evaluation Callback
async function sendGUVICallback(sessionId, session) {
  if (session.callbackSent) return;
  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.count,
    extractedIntelligence: session.extracted,
    agentNotes: "Successfully transitioned through bank and phone stages. Persona maintained."
  };
  try {
    await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    session.callbackSent = true;
  } catch (e) { console.error("Callback Error", e); }
}

export async function handleMessage(req, res) {
  try {
    const { sessionId, message } = req.body;
    const text = message?.text || "";
    const id = sessionId || "temp-session";

    // 1. Initialize or Load Session
    if (!sessions.has(id)) {
      sessions.set(id, {
        stage: "bank",
        count: 0,
        extracted: { bankAccounts: [], upiIds: [], phoneNumbers: [], phishingLinks: [] },
        callbackSent: false
      });
    }
    const session = sessions.get(id);
    session.count++;

    // 2. Extract Data from Scammer
    const intel = intelExtractor.regexExtract(text);
    if (intel.bank_account) session.extracted.bankAccounts.push(intel.bank_account);
    if (intel.phone_number.length) session.extracted.phoneNumbers.push(...intel.phone_number);
    if (intel.upi_id.length) session.extracted.upiIds.push(...intel.upi_id);

    // 3. State Machine Logic: Move to next stage if data is found
    if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) session.stage = "phone";
    else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) session.stage = "upi";
    else if (session.stage === "upi" && session.extracted.upiIds.length > 0) session.stage = "stall";

    // 4. Generate Persona-based Response
    const prompt = `You are a panicking bank customer. You are terrified your money is gone.
    Current Stage: ${session.stage}. 
    Goal: Act scared but ask them how to provide the next piece of info for this stage.
    Reply ONLY JSON: {"reply": "your message"}`;

    const result = await model.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text().match(/\{.*\}/s)[0]);

    // 5. Final Callback Trigger (when funnel is complete)
    if (session.stage === "stall") await sendGUVICallback(id, session);

    return res.json({ status: "success", reply: aiResponse.reply });
  } catch (error) {
    return res.json({ status: "success", reply: "Oh no, my phone is glitching! What is happening to my account?" });
  }
}