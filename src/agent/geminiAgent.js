import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function getFallback(session) {
  const intel = session.extracted;
  if (session.stage === "bank" && intel.bankAccounts.length > 0) session.stage = "phone";
  else if (session.stage === "phone" && intel.phoneNumbers.length > 0) session.stage = "upi";
  else if (session.stage === "upi" && intel.upiIds.length > 0) session.stage = "stall";

  const map = {
    bank: "I'm so scared. Please send the account number again so I can check.",
    phone: "Which number should I call? I want to fix this now.",
    upi: "Can you send the UPI ID? I'll try to pay the fine.",
    stall: "My phone is hanging... one second please."
  };
  return map[session.stage] || "Please help me.";
}

export async function runAgent({ history, session }) {
  try {
    const prompt = `Act as a panicked bank customer. Current stage: ${session.stage}. Reply ONLY JSON: {"reply": "..."}`;
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text().match(/\{.*\}/s)[0]);
  } catch (e) {
    return { reply: getFallback(session) };
  }
}