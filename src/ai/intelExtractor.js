export const intelExtractor = {
  regexExtract: (text = "") => {
    // Replace special dashes (–) and normalize text
    const clean = text.replace(/–/g, "-").replace(/[;,]/g, " ");

    // Improved Regex Patterns
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const upiRegex = /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/g;
    const phoneRegex = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;
    const bankRegex = /\b\d{11,18}\b/g;

    // Extracting and cleaning URLs
    const rawLinks = clean.match(urlRegex) || [];
    const phishingLinks = rawLinks.map(link => 
        link.replace(/[.,!]$/, "") // Remove trailing punctuation
            .replace(/[()\[\]]$/, "") // Remove trailing brackets
    );

    const phones = (clean.match(phoneRegex) || []).map(p => p.replace(/\D/g, ""));
    const potentialBanks = clean.match(bankRegex) || [];
    const banks = potentialBanks.filter(n => !phones.includes(n));

    return {
      phishing_url: [...new Set(phishingLinks)],
      phone_number: [...new Set(phones)],
      upi_id: [...new Set(clean.match(upiRegex) || [])],
      bank_account: banks.length ? banks[0] : null
    };
  }
};