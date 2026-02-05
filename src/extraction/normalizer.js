// src/extraction/normalizer.js

export function normalizeUPI(upi) {
  return upi.toLowerCase().trim();
}

export function normalizePhone(phone) {
  return phone.replace(/\D/g, '').slice(-10);
}

export function normalizeURL(url) {
  return url.trim();
}