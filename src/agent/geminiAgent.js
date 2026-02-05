import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});

// Smart fallback generator
function fallbackReply(intel, lastMessage) {

  // If no bank yet → ask bank
  if (!intel.bankAccounts.length) {
    return "I am very scared. Which account number are you talking about? Please send it again.";
  }

  // If no phone yet → ask phone
  if (!intel.phoneNumbers.length) {
    return "I got a call also. Which number should I contact? Please send the phone number.";
  }

  // If no UPI yet → ask UPI
  if (!intel.upiIds.length) {
    return "They told me about UPI also. Can you send the UPI ID again?";
  }

  // If no link → ask link
  if (!intel.phishingLinks.length) {
    return "I am not able to open anything. Can you send the link again?";
  }

  // Default stall
  return "I am trying but network is slow. Please wait one minute.";
}

// Extract JSON safely
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
You are a honeypot pretending to be a worried Indian bank customer.

You want to waste scammer time and collect details.

Reply ONLY in JSON.

{
  "reply": "string"
}
`;

  const prompt = `
${systemPrompt}

Conversation:
${history.join("\n")}

Known data:
${JSON.stringify(intel)}

Last message:
${lastMessage}

Generate reply.
`;

  try {
    const result = await model.generateContent(prompt);

    const text = result.response.text();

    const parsed = extractJSON(text);

    if (parsed?.reply) {
      return { reply: parsed.reply };
    }

  } catch (err) {
    console.error("Gemini error:", err);
  }

  // 💥 GUARANTEED fallback (never loops stupidly)
  return {
    reply: fallbackReply(intel, lastMessage)
  };
}
