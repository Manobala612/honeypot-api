import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

// Initialize Gemini with the key from runtimeConfig
const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// PERSISTENT MEMORY: Stays alive in the Render instance
const sessions = new Map();

async function sendGUVICallback(sessionId, session) {
  if (session.callbackSent) return;
  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.count,
    extractedIntelligence: session.extracted,
    agentNotes: "Successfully transitioned through stages. Funnel completed."
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
    const id = sessionId || "default-session";

    // 1. Initialize session if new
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

    // 2. Extract Data from message
    const foundIntel = intelExtractor.regexExtract(text);
    if (foundIntel.bank_account) session.extracted.bankAccounts.push(foundIntel.bank_account);
    if (foundIntel.phone_number?.length) session.extracted.phoneNumbers.push(...foundIntel.phone_number);
    if (foundIntel.upi_id?.length) session.extracted.upiIds.push(...foundIntel.upi_id);

    // Clean duplicates
    session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];
    session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
    session.extracted.upiIds = [...new Set(session.extracted.upiIds)];

    // 3. STAGE MACHINE: This is what stops the loop
    if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) {
      session.stage = "phone";
    } else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) {
      session.stage = "upi";
    } else if (session.stage === "upi" && session.extracted.upiIds.length > 0) {
      session.stage = "stall";
    }

    // 4. Try AI Response
    let botReply = "";
    try {
      const prompt = `Act as a scared bank customer. Current Goal: Get info for stage: ${session.stage}. Reply ONLY JSON: {"reply": "..."}`;
      const result = await model.generateContent(prompt);
      const match = result.response.text().match(/\{.*\}/s);
      if (match) botReply = JSON.parse(match[0]).reply;
    } catch (e) {
      console.error("AI Error - using stage fallback");
    }

    // 5. PERSONA FALLBACK (Prevents repeating same message if AI fails)
    if (!botReply) {
      const responses = {
        bank: "I'm so scared. Is this my account 1234xxxx? Please tell me the full number again so I can check.",
        phone: "I'm shaking... what is the official security number I should call to fix this?",
        upi: "I want to pay the fine now. What is the UPI ID I should send it to?",
        stall: "My phone is hanging... I am trying to open the app, please wait one second!"
      };
      botReply = responses[session.stage];
    }

    // 6. Callback for scoring
    if (session.stage === "stall") sendGUVICallback(id, session);

    // 7. STRICT HACKATHON OUTPUT
    return res.json({
      status: "success",
      reply: botReply
    });

  } catch (error) {
    // Last resort safety
    return res.json({ status: "success", reply: "I am so worried, what is happening to my bank account?" });
  }
}