const sessions = new Map();

export function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      extracted: { upiIds: [], phoneNumbers: [], phishingLinks: [], bankAccounts: [], suspiciousKeywords: [] },
      stage: "bank",
      messageCount: 0,
      callbackSent: false
    });
  }
  return sessions.get(sessionId);
}

export function updateSessionIntel(session, newData, rawText) {
  if (newData.bank_account) session.extracted.bankAccounts.push(newData.bank_account);
  if (newData.phone_number.length) session.extracted.phoneNumbers.push(...newData.phone_number);
  if (newData.upi_id.length) session.extracted.upiIds.push(...newData.upi_id);
  if (newData.phishing_url.length) session.extracted.phishingLinks.push(...newData.phishing_url);

  // Auto-detect suspicious words
  const words = ["blocked", "urgent", "otp", "verify", "pay"];
  words.forEach(w => {
    if (rawText.toLowerCase().includes(w) && !session.extracted.suspiciousKeywords.includes(w)) {
      session.extracted.suspiciousKeywords.push(w);
    }
  });
}