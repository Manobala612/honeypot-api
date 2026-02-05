const sessions = new Map();

export function getSession(sessionId) {

  if (!sessions.has(sessionId)) {

    sessions.set(sessionId, {
      conversation: [],

      extracted: {
        upiIds: [],
        phoneNumbers: [],
        phishingLinks: [],
        bankAccounts: []
      },

      // 👇 NEW: track progress
      stage: "bank", // bank → phone → upi → link → stall

      completed: false
    });
  }

  return sessions.get(sessionId);
}

export function clearSession(sessionId) {
  sessions.delete(sessionId);
}
