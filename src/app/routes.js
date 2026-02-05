import { getSession, updateSessionIntel } from '../agent/sessionStore.js';
import { intelExtractor } from '../ai/intelExtractor.js';
import { runAgent } from '../agent/geminiAgent.js';

export async function handleMessage(req, res) {
  const { sessionId, messageText } = req.body;
  
  // 1. Load the user's session
  const session = getSession(sessionId);

  // 2. Scan the current message for intel (Account numbers, etc.)
  const foundIntel = intelExtractor.regexExtract(messageText);

  // 3. SAVE that intel into the session immediately
  updateSessionIntel(session, foundIntel);

  // 4. Update the history
  session.conversation.push(`Scammer: ${messageText}`);

  // 5. Ask the AI Agent for a reply
  const agentResult = await runAgent({
    history: session.conversation,
    intel: session.extracted,
    lastMessage: messageText,
    session
  });

  // 6. Save the bot's reply and send to user
  session.conversation.push(`Honeypot: ${agentResult.reply}`);
  
  res.json({ reply: agentResult.reply });
}