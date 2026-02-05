import { GoogleGenerativeAI } from "@google/generative-ai";
import { runtimeConfig } from "../config/runtime.js"; 

const genAI = new GoogleGenerativeAI(runtimeConfig.geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const intelExtractor = {
  regexExtract: (text = '') => {
    const upiRegex = /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/g;
    const phoneRegex = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;
    const urlRegex = /https?:\/\/[^\s\]\)]+/gi;
    const bankRegex = /\b\d{9,18}\b/g;

    const potentialBanks = text.match(bankRegex) || [];
    const phoneNumbers = (text.match(phoneRegex) || []).map(p => p.replace(/\D/g, ''));
    const realBank = potentialBanks.find(num => !phoneNumbers.includes(num));

    return {
      phishing_url: [...new Set(text.match(urlRegex) || [])],
      phone_number: [...new Set(phoneNumbers)],
      upi_id: [...new Set(text.match(upiRegex) || [])],
      bank_account: realBank || null
    };
  },

  async processMessage(scammerMessage, historyIntel = {}) {
    const currentIntel = this.regexExtract(scammerMessage);
    
    // 1. Check current + historical data
    const hasUpi = (historyIntel.upi_id?.length > 0) || (currentIntel.upi_id.length > 0);
    const hasBank = !!historyIntel.bank_account || !!currentIntel.bank_account;
    const hasUrl = (historyIntel.phishing_url?.length > 0) || (currentIntel.phishing_url.length > 0);
    const hasPhone = (historyIntel.phone_number?.length > 0) || (currentIntel.phone_number.length > 0);

    const isMissionComplete = hasUpi && hasBank && hasUrl && hasPhone;

    // 2. Build the "Next Item" list
    const missing = [];
    if (!hasUpi && !hasBank) missing.push("Bank Account or UPI ID");
    if (!hasUrl) missing.push("Website Link");
    if (!hasPhone) missing.push("Phone Number");

    // ✨ THE FIX: Safely determine the next required item string
    const nextItemNeeded = missing.length > 0 ? missing[0] : "details";

    const prompt = `
      You are a gullible victim in a scam conversation.
      SCAMMER SAID: "${scammerMessage}"
      
      MISSION STATUS: ${isMissionComplete ? "COMPLETE" : "IN_PROGRESS"}
      STILL NEED FROM SCAMMER: ${nextItemNeeded}

      YOUR GOAL:
      1. If MISSION STATUS is "COMPLETE": Say "Thank you! I have registered and sent the payment to the bank account. I'm all set now. Goodbye!"
      2. If MISSION STATUS is "IN_PROGRESS": Act confused and specifically ask for the ${nextItemNeeded}.
      
      RETURN ONLY JSON:
      {
        "chatResponse": "your response to the scammer",
        "extractedBank": "any bank number found in this message or null"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const textResponse = result.response.text();
      const data = JSON.parse(textResponse.match(/\{.*\}/s)[0]);

      return {
        reply: data.chatResponse,
        extracted_intel: { ...currentIntel, bank_account: data.extractedBank || currentIntel.bank_account }
      };
    } catch (error) {
        // ✨ THE FALLBACK FIX: Uses the nextItemNeeded variable instead of an array index
        const fallbackReply = isMissionComplete 
            ? "Thank you so much! I've done everything and sent the money. Goodbye!" 
            : `I'm a bit confused, could you please send the ${nextItemNeeded} again?`;
            
        return { 
            reply: fallbackReply, 
            extracted_intel: currentIntel 
        };
    }
  }
};