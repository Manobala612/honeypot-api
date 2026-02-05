import {
  createSession,
  getSession,
  updateSession,
  deleteSession
} from "./sessionStore.js";

import { extractIntel } from "../extraction/intelExtractor.js";
import { generateReply } from "./persona.js";

export function handleConversation(sessionId, message) {
  let session = getSession(sessionId);

  if (!session) {
    createSession(sessionId);
    session = getSession(sessionId);
  }

  // Save message
  session.logs.push(message);

  // Extract info
  const intel = extractIntel(message);

  for (const key in intel) {
    if (intel[key] && !session.extracted[key]) {
      session.extracted[key] = intel[key];
    }
  }

  // Check completion
  const done =
    session.extracted.upi_id &&
    session.extracted.phone_number &&
    session.extracted.phishing_url;

  if (done) {
    session.status = "completed";

    const result = {
      status: "completed",
      conversation_log: session.logs,
      extracted_intel: session.extracted
    };

    deleteSession(sessionId);
    return result;
  }

  // Continue conversation
  updateSession(sessionId, session);

  return {
    status: "in_progress",
    reply: generateReply(),
    session_id: sessionId
  };
}
