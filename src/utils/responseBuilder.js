export function buildFinalResponse(logs, intel) {
  return {
    status: "completed",
    conversation_log: logs,
    extracted_intel: intel
  };
}
