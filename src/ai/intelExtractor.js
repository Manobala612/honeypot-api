export const intelExtractor = {

  regexExtract: (text = "") => {

    const clean = text.replace(/[;,]/g, " ");

    const upiRegex = /[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}/g;

    const phoneRegex = /(?:\+91[-\s]?)?[6-9]\d{9}/g;

    const urlRegex = /https?:\/\/[^\s]+/gi;

    const bankRegex = /\b\d{11,18}\b/g;


    const phones =
      (clean.match(phoneRegex) || [])
        .map(p => p.replace(/\D/g, ""));

    const banks =
      (clean.match(bankRegex) || [])
        .filter(n => !phones.includes(n));


    return {
      phishing_url: [...new Set(clean.match(urlRegex) || [])],

      phone_number: [...new Set(phones)],

      upi_id: [...new Set(clean.match(upiRegex) || [])],

      bank_account: banks.length ? banks[0] : null
    };
  }
};
