import { isValidUPI, isValidPhone, isValidURL } from "./validators.js";
import { normalizePhone, normalizeText } from "./normalizer.js";

export function extractIntel(message) {
  const upiMatch = message.match(/[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}/);
  const phoneMatch = message.match(/\b\d{10}\b/);
  const urlMatch = message.match(/https?:\/\/[^\s]+/);

  const upi_id =
    upiMatch && isValidUPI(upiMatch[0]) ? normalizeText(upiMatch[0]) : null;

  const phone_number =
    phoneMatch && isValidPhone(phoneMatch[0])
      ? normalizePhone(phoneMatch[0])
      : null;

  const phishing_url =
    urlMatch && isValidURL(urlMatch[0]) ? normalizeText(urlMatch[0]) : null;

  return {
    upi_id,
    phone_number,
    phishing_url,
  };
}
