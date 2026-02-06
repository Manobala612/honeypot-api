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
    agentNotes: "Honeypot concluded. Dynamically identified missing info and closed session after retries."
  };
  try {
    await fetch("https://hackathon.guvi.in/api/updateHoneyPotFinalResult", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    session.callbackSent = true;
  } catch (e) { console.error("GUVI Callback Error", e); }
}

export async function handleMessage(req, res) {
  try {
    const { sessionId, message } = req.body;
    const text = message?.text || "";
    const id = sessionId || "default-session";

    if (!sessions.has(id)) {
      sessions.set(id, {
        count: 0,
        retries: 0,
        lastAsked: null,
        extracted: { bankAccounts: [], upiIds: [], phoneNumbers: [], phishingLinks: [] },
        callbackSent: false,
        isClosed: false
      });
    }
    const session = sessions.get(id);

    // 1. EXIT LOGIC: If session is closed, stay silent or send final goodbye
    if (session.isClosed) {
      return res.json({ status: "success", reply: "I've already done everything you asked. Please check your system." });
    }

    session.count++;

    // 2. EXTRACT AND SYNC
    const found = intelExtractor.regexExtract(text);
    if (found.bank_account) session.extracted.bankAccounts.push(found.bank_account);
    if (found.phone_number?.length) session.extracted.phoneNumbers.push(...found.phone_number);
    if (found.upi_id?.length) session.extracted.upiIds.push(...found.upi_id);
    if (found.phishing_url?.length) session.extracted.phishingLinks.push(...found.phishing_url);
    
    // Deduplicate
    session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];
    session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
    session.extracted.upiIds = [...new Set(session.extracted.upiIds)];
    session.extracted.phishingLinks = [...new Set(session.extracted.phishingLinks)];

    // 3. DYNAMIC CHECK: What is still missing?
    const missing = [];
    if (session.extracted.bankAccounts.length === 0) missing.push("bank account number");
    if (session.extracted.phoneNumbers.length === 0) missing.push("security phone number");
    if (session.extracted.upiIds.length === 0) missing.push("UPI ID");
    if (session.extracted.phishingLinks.length === 0) missing.push("website login link");

    // 4. DECIDE NEXT MOVE
    let currentTarget = missing[0]; // Ask for the first missing thing

    // If scammer didn't provide what we asked for last time, increment retry
    if (currentTarget === session.lastAsked) {
        session.retries++;
    } else {
        session.retries = 0; // Reset if they actually gave what we asked for
    }
    session.lastAsked = currentTarget;

    // 5. TERMINATION LOGIC: If everything found OR we asked 3 times for the same thing and failed
    if (missing.length === 0 || session.retries >= 3) {
        session.isClosed = true;
        await sendGUVICallback(id, session);
        return res.json({ 
            status: "success", 
            reply: "I have submitted all the details you requested. Thank you for securing my account. Goodbye!" 
        });
    }

    // 6. GENERATE TARGETED REPLY
    let botReply = "";
    try {
      const prompt = `Act as a panicked bank customer. You need the scammer to give you the ${currentTarget}. 
      Ask for it specifically because you are "confused" or "scared".
      This is attempt #${session.retries + 1} to get this specific info.
      Reply ONLY JSON: {"reply": "..."}`;
      
      const result = await model.generateContent(prompt);
      const match = result.response.text().match(/\{.*\}/s);
      if (match) botReply = JSON.parse(match[0]).reply;
    } catch (e) { console.error("AI Error"); }

    // Fallback if AI fails
    if (!botReply) {
      const fallbacks = {
        "bank account number": "I'm so worried, can you give me the full account number again?",
        "security phone number": "Which security number should I call? Please send it.",
        "UPI ID": "What is the UPI ID I need to pay to?",
        "website login link": "Where is the website link to login and verify?"
      };
      botReply = fallbacks[currentTarget];
    }

    return res.json({ status: "success", reply: botReply });

  } catch (error) {
    return res.json({ status: "success", reply: "I am so confused, please help me!" });
  }
}