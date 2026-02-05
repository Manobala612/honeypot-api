import { getSession, updateSessionIntel } from '../agent/sessionStore.js';
import { intelExtractor } from '../ai/intelExtractor.js';
import { runAgent } from '../agent/geminiAgent.js';

// We are using named exports here
export async function handleMessage(req, res) {
  try {
    const { sessionId, messageText } = req.body;
    
    if (!messageText) {
      return res.status(400).json({ error: "No message provided" });
    }

    const session = getSession(sessionId);

    // 1. Extract and Save
    const foundIntel = intelExtractor.regexExtract(messageText);
    updateSessionIntel(session, foundIntel);

    // 2. Track History
    session.conversation.push(`Scammer: ${messageText}`);

    // 3. Get AI Response
    const agentResult = await runAgent({
      history: session.conversation,
      intel: session.extracted,
      lastMessage: messageText,
      session
    });

    // 4. Save Bot Reply
    session.conversation.push(`Honeypot: ${agentResult.reply}`);
    
    return res.json({ reply: agentResult.reply });

  } catch (error) {
    console.error("Route Error:", error);
    return res.status(500).json({ reply: "I... I don't understand. What is happening?" });
  }
}