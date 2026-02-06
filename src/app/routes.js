import { GoogleGenerativeAI } from "@google/generative-ai";
import { intelExtractor } from '../ai/intelExtractor.js';
import { runtimeConfig } from "../config/runtime.js";

const genAI = new GoogleGenerativeAI(runtimeConfig.geminiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// PERSISTENT MEMORY: Defined outside to stay alive across turn requests
const sessions = new Map();

async function sendGUVICallback(sessionId, session) {
    if (session.callbackSent) return;
    const payload = {
        sessionId: sessionId,
        scamDetected: true,
        totalMessagesExchanged: session.count,
        extractedIntelligence: session.extracted,
        agentNotes: "Honeypot successfully engaged. Moved from bank details to phone and UPI extraction."
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
        const { sessionId, message } = req.body;
        const text = message?.text || "";
        const id = sessionId || "default-session";

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

        // 1. Extract Intelligence from the current message
        const found = intelExtractor.regexExtract(text);
        if (found.bank_account) session.extracted.bankAccounts.push(found.bank_account);
        if (found.phone_number?.length) session.extracted.phoneNumbers.push(...found.phone_number);
        if (found.upi_id?.length) session.extracted.upiIds.push(...found.upi_id);
        if (found.phishing_url?.length) session.extracted.phishingLinks.push(...found.phishing_url);

        // Deduplicate data
        session.extracted.bankAccounts = [...new Set(session.extracted.bankAccounts)];
        session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
        session.extracted.upiIds = [...new Set(session.extracted.upiIds)];

        // 2. STAGE MACHINE: Advance only when we have the info (Breaks the Loop)
        if (session.stage === "bank" && session.extracted.bankAccounts.length > 0) {
            session.stage = "phone";
        } else if (session.stage === "phone" && session.extracted.phoneNumbers.length > 0) {
            session.stage = "upi";
        } else if (session.stage === "upi" && session.extracted.upiIds.length > 0) {
            session.stage = "stall";
        }

        // 3. Generate Persona Reply
        let botReply = "";
        try {
            const prompt = `Act as a panicking bank customer. Goal: Get info for stage: ${session.stage}. Reply ONLY JSON: {"reply": "..."}`;
            const result = await model.generateContent(prompt);
            const match = result.response.text().match(/\{.*\}/s);
            if (match) botReply = JSON.parse(match[0]).reply;
        } catch (e) { console.error("AI Error"); }

        // 4. Fallback (Uses stage-aware persona instead of a static message)
        if (!botReply) {
            const fallbacks = {
                bank: "I am so scared... please tell me the full account number again to check.",
                phone: "I am shaking. What number should I call to fix this immediately?",
                upi: "I want to pay the fine. What is your UPI ID?",
                stall: "My internet is very slow... I am trying to open the app, please wait!"
            };
            botReply = fallbacks[session.stage];
        }

        // 5. Trigger mandatory hackathon callback
        if (session.stage === "stall") {
            sendGUVICallback(id, session);
        }

        // 6. Return strictly in required format
        return res.json({ status: "success", reply: botReply });

    } catch (error) {
        return res.json({ status: "success", reply: "I'm so worried, my phone is acting up!" });
    }
}