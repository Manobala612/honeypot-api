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
      stage: "bank", // Starting stage
      completed: false
    });
  }
  return sessions.get(sessionId);
}

// Crucial: This moves data from the "Extractor" into the "Session"
export function updateSessionIntel(session, newData) {
  if (newData.bank_account) {
    session.extracted.bankAccounts.push(newData.bank_account);
  }
  if (newData.phone_number.length > 0) {
    session.extracted.phoneNumbers.push(...newData.phone_number);
  }
  if (newData.upi_id.length > 0) {
    session.extracted.upiIds.push(...newData.upi_id);
  }
  if (newData.phishing_url.length > 0) {
    session.extracted.phishingLinks.push(...newData.phishing_url);
  }
  
  // Deduplicate arrays
  session.extracted.phoneNumbers = [...new Set(session.extracted.phoneNumbers)];
  session.extracted.upiIds = [...new Set(session.extracted.upiIds)];
}

export function clearSession(sessionId) {
  sessions.delete(sessionId);
}