import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Global Map to store session data and prevent loops
const sessions = new Map();

async function sendGUVICallback(sessionId, session) {
  if (session.callbackSent) return;
  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.count,
    extractedIntelligence: session.extracted,
    agentNotes: "Successfully extracted bank and UPI info. Engagement complete."
  };
  try {
    await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    session.callbackSent = true;
  } catch (e) { console.error("GUVI Callback error", e); }
}

export async function handleMessage(req, res) {
  try {
    // Hackathon Format: message.text
    const { sessionId, message } = req.body;
    const text = message?.text || "";
    const id = sessionId || "default-session";

    // Initialize session if new
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

    // 1. Extract Intelligence from the Scammer's current message
    const foundIntel = intelExtractor.regexExtract(text);
    if (foundIntel.bank_account) session.extracted.bankAccounts.push(foundIntel.bank_account);
    if (foundIntel.phone_number?.length) session.extracted.phoneNumbers.push(...foundIntel.phone_number);
    if (foundIntel.upi_id?.length) session.extracted.upiIds.push(...foundIntel.upi_id);

    // 2. Logic to move Stage Forward (This breaks the loop)
    if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) session.stage = "phone";
    else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) session.stage = "upi";
    else if (session.stage === "upi" && session.extracted.upiIds.length > 0) session.stage = "stall";

    // 3. Generate AI Response
    let botReply = "";
    try {
      const prompt = `You are a panicking bank customer. You are talking to a scammer. 
      CURRENT STAGE: ${session.stage}. 
      Goal: Act scared, but ask them how to provide the info needed for this stage.
      Reply ONLY in JSON: {"reply": "your message"}`;

      const result = await model.generateContent(prompt);
      const match = result.response.text().match(/\{.*\}/s);
      if (match) botReply = JSON.parse(match[0]).reply;
    } catch (e) { console.error("AI Error, using fallback"); }

    // 4. Final Fallback if AI fails (Human persona fallback)
    if (!botReply) {
      const fallbacks = {
        bank: "I'm so scared. Is this my account 1234xxxx? Please tell me the full number.",
        phone: "I'm shaking. What number should I call to fix this?",
        upi: "I want to pay. What is your UPI ID?",
        stall: "The screen is freezing... please wait, I'm trying!"
      };
      botReply = fallbacks[session.stage] || "Please help me!";
    }

    // 5. Final Callback for scoring
    if (session.stage === "stall") sendGUVICallback(id, session);

    // Final Hackathon Response format
    return res.json({ status: "success", reply: botReply });
  } catch (error) {
    return res.json({ status: "success", reply: "I'm so scared, what's happening to my account?" });
  }
}