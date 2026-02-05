import { RESPONSE_STATUS } from "./constants.js";

export function buildInProgressResponse(sessionId, reply) {
  return {
    status: RESPONSE_STATUS.IN_PROGRESS,
    session_id: sessionId,
    reply
  };
}

export function buildFinalResponse(logs, intel) {
  return {
    status: RESPONSE_STATUS.COMPLETED,
    conversation_log: logs,
    extracted_intel: intel
  };
}

export function buildErrorResponse(message) {
  return {
    status: RESPONSE_STATUS.ERROR,
    error: message
  };
}
