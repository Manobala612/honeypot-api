export const intelExtractor = {
  regexExtract: (text = "") => {
    const clean = text.replace(/[;,]/g, " ");
    const upiRegex = /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/g;
    const phoneRegex = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;
    const bankRegex = /\b\d{11,18}\b/g;

    const phones = (clean.match(phoneRegex) || []).map(p => p.replace(/\D/g, ""));
    const potentialBanks = clean.match(bankRegex) || [];
    const banks = potentialBanks.filter(n => !phones.includes(n));

    return {
      phone_number: [...new Set(phones)],
      upi_id: [...new Set(clean.match(upiRegex) || [])],
      bank_account: banks.length ? banks[0] : null
    };
  }
};