import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

// 1. Setup Gemini
const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 2. Simple In-Memory Store
const sessions = new Map();

async function sendFinalCallback(sessionId, session) {
  if (session.callbackSent) return;
  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.count,
    extractedIntelligence: session.extracted,
    agentNotes: "Scammer engaged using panicked persona. Extraction complete."
  };
  try {
    const res = await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) session.callbackSent = true;
  } catch (e) { console.error("Callback fail", e); }
}

export async function handleMessage(req, res) {
  try {
    const { sessionId, message } = req.body;
    const text = message?.text || "";
    
    // Initialize session if new
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        stage: "bank",
        count: 0,
        extracted: { bankAccounts: [], upiIds: [], phoneNumbers: [], phishingLinks: [] },
        callbackSent: false
      });
    }
    const session = sessions.get(sessionId);
    session.count++;

    // 3. Extract Intelligence
    const intel = intelExtractor.regexExtract(text);
    if (intel.bank_account) session.extracted.bankAccounts.push(intel.bank_account);
    if (intel.phone_number.length) session.extracted.phoneNumbers.push(...intel.phone_number);
    if (intel.upi_id.length) session.extracted.upiIds.push(...intel.upi_id);
    
    // 4. State Machine Logic (Prevents Loops)
    if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) session.stage = "phone";
    else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) session.stage = "upi";
    else if (session.stage === "upi" && session.extracted.upiIds.length > 0) session.stage = "stall";

    // 5. Generate AI Reply
    const prompt = `Act as a panicking bank customer. You are in the ${session.stage} stage of the scam. Reply ONLY JSON: {"reply": "..."}`;
    const result = await model.generateContent(prompt);
    const aiResponse = JSON.parse(result.response.text().match(/\{.*\}/s)[0]);

    // 6. Mandatory Hackathon Callback
    if (session.stage === "stall") await sendFinalCallback(sessionId, session);

    return res.json({ status: "success", reply: aiResponse.reply });
  } catch (error) {
    return res.json({ status: "success", reply: "I'm so scared, what is happening?" });
  }
}