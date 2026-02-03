import { SCAM_TYPES } from "./scamTypes.js";
import { calculateConfidence } from "./confidenceCalculator.js";

export function detectScam(message) {
  const text = message.toLowerCase();

  let detectedType = null;
  let matchedKeywords = 0;
  let totalKeywords = 0;

  for (const [type, data] of Object.entries(SCAM_TYPES)) {
    totalKeywords += data.keywords.length;

    for (const keyword of data.keywords) {
      if (text.includes(keyword)) {
        detectedType = type;
        matchedKeywords++;
      }
    }
  }

  const scamDetected = matchedKeywords > 0;
  const confidence = calculateConfidence(matchedKeywords, totalKeywords);

  return {
    scam_detected: scamDetected,
    scam_type: scamDetected ? detectedType : null,
    confidence,
  };
}
