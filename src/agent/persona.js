// src/extraction/intelExtractor.js
import { normalizeUPI, normalizePhone, normalizeURL } from './normalizer.js';
import { isValidUPI, isValidPhone, isValidURL } from './validators.js';

export function extractIntel(text = '') {
  const upiMatches = [...text.matchAll(/\b[\w.\-]+@upi\b/gi)].map(m => m[0]);
  const phoneMatches = [...text.matchAll(/\+91\s?\d{10}|\b\d{10}\b/g)].map(m => m[0]);
  const urlMatches = [...text.matchAll(/https?:\/\/[^\s]+/gi)].map(m => m[0]);

  const upi_ids = upiMatches
    .map(normalizeUPI)
    .filter(isValidUPI);

  const phone_numbers = phoneMatches
    .map(normalizePhone)
    .filter(isValidPhone);

  const urls = urlMatches
    .map(normalizeURL)
    .filter(isValidURL);

  return {
    upi_ids,
    phone_numbers,
    urls
  };
}