export function extractIntel(message) {
  const upi = message.match(/[a-zA-Z0-9.\-_]+@[a-zA-Z]+/);
  const phone = message.match(/\b\d{10}\b/);
  const url = message.match(/https?:\/\/[^\s]+/);

  return {
    upi_id: upi ? upi[0] : null,
    phone_number: phone ? phone[0] : null,
    phishing_url: url ? url[0] : null,
    bank_account: null
  };
}
