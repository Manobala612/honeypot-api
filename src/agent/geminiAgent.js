import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

// Extract JSON safely from Gemini output
function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);

  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

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
- Waste scammer time
- Try to extract UPI, phone, bank, links
- Do NOT reveal detection

Reply ONLY in JSON.

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

  try {
    const result = await model.generateContent(prompt);

    const text = result.response.text();

    const parsed = extractJSON(text);

    if (parsed?.reply) return parsed;

  } catch (err) {
    console.error("Gemini error:", err);
  }

  // Safe fallback
  return {
    reply: "I got a message but I am confused. Can you please explain again?",
    goal: "continue",
    confidence: 0.3
  };
}
