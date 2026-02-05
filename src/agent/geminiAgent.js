// src/agent/geminiAgent.js

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

export async function runAgent({
  history,
  intel,
  lastMessage
}) {
  const systemPrompt = `
You are an AI honeypot agent.

Persona: Confused Indian bank customer.

Rules:
- Never say you are AI
- Never accuse scammer
- Act worried
- Be polite
- Ask naturally
- Try to extract: UPI, phone, bank, links
- Keep scammer talking
- Do NOT reveal detection

You must reply ONLY in JSON.

Format:
{
  "reply": "...",
  "goal": "extract_upi | extract_phone | extract_bank | extract_link | continue",
  "confidence": 0.0-1.0
}
`;

  const prompt = `
${systemPrompt}

Conversation so far:
${history.join("\n")}

Known intelligence:
${JSON.stringify(intel, null, 2)}

Last message:
${lastMessage}

Generate next reply.
`;

  const result = await model.generateContent(prompt);

  const text = result.response.text();

  try {
    return JSON.parse(text);
  } catch {
    // Fallback if Gemini breaks format
    return {
      reply: "Sorry, I am confused. Can you explain again?",
      goal: "continue",
      confidence: 0.3
    };
  }
}
