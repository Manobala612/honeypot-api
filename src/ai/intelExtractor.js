export const intelExtractor = {
    regexExtract: (text = '') => {
        // Clean punctuation to prevent breaking regex
        const cleanText = text.replace(/[;,]/g, " ");
        
        const upiRegex = /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/g;
        const phoneRegex = /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g;
        const urlRegex = /https?:\/\/[^\s\]\)]+/gi;
        const bankRegex = /\b\d{11,18}\b/g;

        const potentialBanks = cleanText.match(bankRegex) || [];
        const phoneNumbers = (cleanText.match(phoneRegex) || []).map(p => p.replace(/\D/g, ''));
        const realBank = potentialBanks.find(num => !phoneNumbers.includes(num));

        return {
            phishing_url: [...new Set(cleanText.match(urlRegex) || [])],
            phone_number: [...new Set(phoneNumbers)],
            upi_id: [...new Set(cleanText.match(upiRegex) || [])],
            bank_account: realBank || null
        };
    }
};