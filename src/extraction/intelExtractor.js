import {
  normalizeUPI,
  normalizePhone,
  normalizeURL,
  normalizeBank
} from "./normalizer.js";

import {
  isValidUPI,
  isValidPhone,
  isValidURL,
  isValidBank
} from "./validators.js";

export function extractIntel(text = "") {
  // UPI IDs
  const upiMatches = [
    ...text.matchAll(/\b[a-zA-Z0-9.\-_]+@[a-zA-Z]+\b/g)
  ].map(m => m[0]);

  // Phone numbers (India focused)
  const phoneMatches = [
    ...text.matchAll(/(?:\+91\s?)?\b\d{10}\b/g)
  ].map(m => m[0]);

  // URLs
  const urlMatches = [
    ...text.matchAll(/https?:\/\/[^\s]+/gi)
  ].map(m => m[0]);

  // Bank account numbers (9–18 digits)
  const bankMatches = [
    ...text.matchAll(/\b\d{9,18}\b/g)
  ].map(m => m[0]);

  const upi = upiMatches
    .map(normalizeUPI)
    .filter(isValidUPI)[0] || null;

  const phone = phoneMatches
    .map(normalizePhone)
    .filter(isValidPhone)[0] || null;

  const url = urlMatches
    .map(normalizeURL)
    .filter(isValidURL)[0] || null;

  const bank = bankMatches
    .map(normalizeBank)
    .filter(isValidBank)[0] || null;

  return {
    upi_id: upi,
    phone_number: phone,
    phishing_url: url,
    bank_account: bank
  };
}
