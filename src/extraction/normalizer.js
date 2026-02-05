export function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

export function normalizeText(value) {
  return value ? value.trim() : null;
}
