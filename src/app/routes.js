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
    agentNotes: "Honeypot engagement concluded. Skips implemented for missing info types."
  };
  try {
    const res = await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) session.callbackSent = true;
  } catch (e) { console.error("Callback Error", e); }
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
        retries: 0, // Counter for current stage
        extracted: { bankAccounts: [], upiIds: [], phoneNumbers: [], phishingLinks: [] },
        callbackSent: false
      });
    }
    const session = sessions.get(id);
    session.count++;

    // 1. Extract Intelligence
    const foundIntel = intelExtractor.regexExtract(text);
    let dataFoundThisTurn = false;

    if (foundIntel.bank_account) { session.extracted.bankAccounts.push(foundIntel.bank_account); dataFoundThisTurn = true; }
    if (foundIntel.phone_number?.length) { session.extracted.phoneNumbers.push(...foundIntel.phone_number); dataFoundThisTurn = true; }
    if (foundIntel.upi_id?.length) { session.extracted.upiIds.push(...foundIntel.upi_id); dataFoundThisTurn = true; }
    if (foundIntel.phishing_url?.length) { session.extracted.phishingLinks.push(...foundIntel.phishing_url); dataFoundThisTurn = true; }

    session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];
    session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
    session.extracted.upiIds = [...new Set(session.extracted.upiIds)];
    session.extracted.phishingLinks = [...new Set(session.extracted.phishingLinks)];

    // 2. LOGIC: Advance Stage OR Increment Retry
    if (dataFoundThisTurn) {
        session.retries = 0; // Reset counter because we got something
        if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) session.stage = "phone";
        else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) session.stage = "upi";
        else if (session.stage === "upi" && session.extracted.upiIds.length > 0) session.stage = "link";
        else if (session.stage === "link" && session.extracted.phishingLinks.length > 0) session.stage = "stall";
    } else {
        session.retries++;
        // If we've asked 3 times and got nothing, force move to the next stage
        if (session.retries >= 3) {
            session.retries = 0;
            if (session.stage === "bank") session.stage = "phone";
            else if (session.stage === "phone") session.stage = "upi";
            else if (session.stage === "upi") session.stage = "link";
            else if (session.stage === "link") session.stage = "stall";
        }
    }

    // 3. Generate Response
    let botReply = "";
    try {
      const prompt = `Act as a scared customer. Stage: ${session.stage}. Attempt: ${session.retries + 1}. Reply ONLY JSON: {"reply": "..."}`;
      const result = await model.generateContent(prompt);
      const match = result.response.text().match(/\{.*\}/s);
      if (match) botReply = JSON.parse(match[0]).reply;
    } catch (e) { console.error("AI Error"); }

    // 4. Fallback persona (Varies by attempt to sound human)
    if (!botReply) {
      const stageMessages = {
        bank: [
          "I'm so scared. Is this my account 1234xxxx? Please tell me the full number.",
          "I can't find my card, can you please repeat the account number for me?",
          "Wait, I think I have it. Is it starting with 5 or 1? Please send it again."
        ],
        phone: [
          "I'm shaking. What is the official security number I should call?",
          "My phone is cutting out. What was that help number again?",
          "I'm trying to call but it's not working. Please give me the number one more time."
        ],
        upi: [
          "I want to pay. What is your UPI ID?",
          "Is the UPI ID your phone number? Please send the ID clearly.",
          "I'm in the payment app now. What ID do I type in?"
        ],
        link: [
          "Can you send the website link? I'll login right now.",
          "The link you sent before isn't working. Can you send it again?",
          "I am on my computer now. Please send the link one last time."
        ],
        stall: ["My phone is totally frozen... please wait, I'm trying!"]
      };
      
      const messages = stageMessages[session.stage];
      botReply = messages[session.retries] || messages[0];
    }

    // 5. Final Callback
    if (session.stage === "stall") sendGUVICallback(id, session);

    return res.json({ status: "success", reply: botReply });

  } catch (error) {
    return res.json({ status: "success", reply: "I'm so worried, please help me!" });
  }
}