import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash"
});


// Guaranteed fallback using stage
function fallbackReply(session, lastMessage) {

  const intel = session.extracted;


  // Update stage if data found
  if (intel.bankAccounts.length) session.stage = "phone";
  if (intel.phoneNumbers.length) session.stage = "upi";
  if (intel.upiIds.length) session.stage = "link";
  if (intel.phishingLinks.length) session.stage = "stall";


  switch (session.stage) {

    case "bank":
      return "I am very scared. Please send the full account number clearly again.";

    case "phone":
      return "Which phone number should I contact? Please send it.";

    case "upi":
      return "They told me about UPI also. Please send the UPI ID.";

    case "link":
      return "I am not able to open anything. Can you send the link again?";

    case "stall":
      return "Network is very slow. I am trying. Please wait.";

    default:
      return "Please wait, I am checking.";
  }
}


// Extract JSON from Gemini
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
  lastMessage,
  session
}) {

  const prompt = `
You are a honeypot acting as a worried bank customer.

Reply ONLY in JSON.

{ "reply": "..." }

Conversation:
${history.join("\n")}

Known info:
${JSON.stringify(intel)}

Last message:
${lastMessage}
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


  // 💥 Always works
  return {
    reply: fallbackReply(session, lastMessage)
  };
}
