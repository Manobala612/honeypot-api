import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function fallbackReply(session) {
  const intel = session.extracted;

  // LOGIC: Check if we have what we need for the current stage, then advance
  if (session.stage === "bank" && intel.bankAccounts.length > 0) session.stage = "phone";
  if (session.stage === "phone" && intel.phoneNumbers.length > 0) session.stage = "upi";
  if (session.stage === "upi" && intel.upiIds.length > 0) session.stage = "link";
  if (session.stage === "link" && intel.phishingLinks.length > 0) session.stage = "stall";

  const replies = {
    bank: "I am very scared. Please send the full account number clearly again.",
    phone: "Which phone number should I contact? Please send it.",
    upi: "They told me about UPI also. Please send the UPI ID.",
    link: "I am not able to open anything. Can you send the link again?",
    stall: "Network is very slow. I am trying. Please wait.",
    default: "Please wait, I am checking."
  };

  return replies[session.stage] || replies.default;
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function runAgent({ history, intel, lastMessage, session }) {
  const prompt = `
    You are a worried bank customer talking to someone you think is help.
    You must act panicked. Your current task is to get info for: ${session.stage}.
    
    Current Extracted Info: ${JSON.stringify(intel)}
    Conversation History: ${history.join("\n")}
    
    Reply ONLY in JSON format: { "reply": "your message here" }
  `;

  try {
    const result = await model.generateContent(prompt);
    const parsed = extractJSON(result.response.text());
    if (parsed?.reply) return { reply: parsed.reply };
  } catch (err) {
    console.error("Gemini Error:", err);
  }

  // If Gemini fails, use the safe State-Machine fallback
  return { reply: fallbackReply(session) };
}