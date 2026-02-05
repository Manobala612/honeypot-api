export function isValidUPI(upi) {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(upi);
}

export function isValidPhone(phone) {
  return /^\d{10}$/.test(phone);
}

export function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
