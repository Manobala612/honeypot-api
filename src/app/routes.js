import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Global Session Memory
const sessions = new Map();

async function sendGUVICallback(sessionId, session) {
  if (session.callbackSent) return;
  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.count,
    extractedIntelligence: session.extracted,
    agentNotes: "Honeypot successfully extracted details using panicked persona."
  };
  try {
    await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    session.callbackSent = true;
    console.log("✅ GUVI Callback Sent");
  } catch (e) { console.error("Callback fail", e); }
}

export async function handleMessage(req, res) {
  const { sessionId, message } = req.body;
  const text = message?.text || "";
  const id = sessionId || "default";

  // 1. Get or Create Session
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

  // 2. Extract Data
  const intel = intelExtractor.regexExtract(text);
  if (intel.bank_account) session.extracted.bankAccounts.push(intel.bank_account);
  if (intel.phone_number.length) session.extracted.phoneNumbers.push(...intel.phone_number);
  if (intel.upi_id.length) session.extracted.upiIds.push(...intel.upi_id);

  // 3. Move Stage Forward (The Loop Breaker)
  if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) session.stage = "phone";
  else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) session.stage = "upi";
  else if (session.stage === "upi" && session.extracted.upiIds.length > 0) session.stage = "stall";

  // 4. Try AI Response
  let reply = "";
  try {
    const prompt = `You are a panicking bank customer. You are talking to a scammer. 
    CURRENT STAGE: ${session.stage}. 
    Goal: Act terrified, but ask them how to give the next info.
    Reply ONLY in JSON: {"reply": "..."}`;

    const result = await model.generateContent(prompt);
    const resultText = result.response.text();
    const match = resultText.match(/\{[\s\S]*\}/);
    if (match) {
      reply = JSON.parse(match[0]).reply;
    }
  } catch (e) {
    console.error("Gemini Error, using fallback.");
  }

  // 5. Hard Fallback (If AI fails, don't repeat the glitch message!)
  if (!reply) {
    const fallbacks = {
      bank: "I am so scared. Please send the account number again so I can check.",
      phone: "My phone is acting up. What number should I call to verify this?",
      upi: "I want to pay the fine. What is your UPI ID?",
      stall: "The app is loading so slowly... please wait, I am trying."
    };
    reply = fallbacks[session.stage] || "Please help me, I am so worried.";
  }

  // 6. Callback trigger
  if (session.stage === "stall") sendGUVICallback(id, session);

  return res.json({ status: "success", reply: reply });
}