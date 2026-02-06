import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const sessions = new Map();

async function sendGUVICallback(sessionId, session) {
  if (session.callbackSent) return;
  const payload = {
    sessionId: sessionId,
    scamDetected: true,
    totalMessagesExchanged: session.count,
    extractedIntelligence: session.extracted,
    agentNotes: "Honeypot engagement concluded. Captured Bank, Phone, and UPI. Closed session."
  };
  try {
    const res = await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) session.callbackSent = true;
  } catch (e) { console.error("GUVI Callback Error", e); }
}

export async function handleMessage(req, res) {
  try {
    const { sessionId, message } = req.body;
    const text = message?.text || "";
    const id = sessionId || "default-session";

    if (!sessions.has(id)) {
      sessions.set(id, {
        stage: "bank",
        count: 0,
        retries: 0,
        extracted: { bankAccounts: [], upiIds: [], phoneNumbers: [], phishingLinks: [] },
        callbackSent: false,
        isClosed: false
      });
    }
    const session = sessions.get(id);

    // BREAK THE LOOP: If we already sent the goodbye, stop replying
    if (session.isClosed) {
      return res.json({ status: "success", reply: "Thank you for your help. My account seems to be working now. Goodbye." });
    }

    session.count++;

    // 1. Extract Intelligence
    const found = intelExtractor.regexExtract(text);
    let dataFoundThisTurn = false;

    if (found.bank_account) { session.extracted.bankAccounts.push(found.bank_account); dataFoundThisTurn = true; }
    if (found.phone_number?.length) { session.extracted.phoneNumbers.push(...found.phone_number); dataFoundThisTurn = true; }
    if (found.upi_id?.length) { session.extracted.upiIds.push(...found.upi_id); dataFoundThisTurn = true; }
    
    session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];
    session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
    session.extracted.upiIds = [...new Set(session.extracted.upiIds)];

    // 2. STAGE LOGIC: Move stage or increment retries
    if (dataFoundThisTurn) {
        session.retries = 0;
        if (session.stage === "bank") session.stage = "phone";
        else if (session.stage === "phone") session.stage = "upi";
        else if (session.stage === "upi") session.stage = "stall";
    } else {
        session.retries++;
        if (session.retries >= 2) { // Skip to next if scammer ignores us twice
            session.retries = 0;
            if (session.stage === "bank") session.stage = "phone";
            else if (session.stage === "phone") session.stage = "upi";
            else if (session.stage === "upi") session.stage = "stall";
        }
    }

    // 3. Generate Reply
    let botReply = "";
    if (session.stage === "stall") {
        botReply = "I have sent the details and finished the process. Thank you so much for saving my account! Goodbye.";
        session.isClosed = true; // Mark session as done
        await sendGUVICallback(id, session);
    } else {
        try {
          const prompt = `Act as a panicked bank customer. Stage: ${session.stage}. Reply ONLY JSON: {"reply": "..."}`;
          const result = await model.generateContent(prompt);
          const match = result.response.text().match(/\{.*\}/s);
          if (match) botReply = JSON.parse(match[0]).reply;
        } catch (e) { console.error("AI Error"); }

        if (!botReply) {
          const fallbacks = {
            bank: "I'm so scared. Is this my account 1234xxxx? Please tell me the full number.",
            phone: "I'm shaking. What is the security number I should call to fix this?",
            upi: "I want to pay the fine now. What is your UPI ID?"
          };
          botReply = fallbacks[session.stage];
        }
    }

    return res.json({ status: "success", reply: botReply });

  } catch (error) {
    return res.json({ status: "success", reply: "I'm so worried, what is happening?!" });
  }
}