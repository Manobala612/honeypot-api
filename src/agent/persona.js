export function generateReply(message, extracted) {
  const text = message.toLowerCase();

  // If UPI not found yet → try to get it
  if (!extracted.upi_id) {
    if (text.includes("pay") || text.includes("send")) {
      return "Payment failed. Please send your UPI ID again.";
    }
    return "How should I pay? Please send UPI ID.";
  }

  // If phone not found yet → ask for contact
  if (!extracted.phone_number) {
    return "It is not working. Can I call you? Send number.";
  }

  // If bank not found → try alternate payment
  if (!extracted.bank_account) {
    return "UPI is not working. Any bank account?";
  }

  // If link issue
  if (text.includes("link") || text.includes("click")) {
    return "Link not opening. Please send again.";
  }

  // Default fallback
  return "Please explain again. I am confused.";
}
