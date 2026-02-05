// src/extraction/validators.js

export function isValidUPI(upi) {
  return typeof upi === 'string' && upi.includes('@upi');
}

export function isValidPhone(phone) {
  return typeof phone === 'string' && phone.length === 10;
}

export function isValidURL(url) {
  return typeof url === 'string' && url.startsWith('http');
}