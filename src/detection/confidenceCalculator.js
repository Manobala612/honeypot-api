export function calculateConfidence(matches, totalSignals) {
  if (totalSignals === 0) return 0;

  let score = matches / totalSignals;

  // keep realistic range
  if (score > 0.95) score = 0.95;
  if (score < 0.3 && matches > 0) score = 0.3;

  return Number(score.toFixed(2));
}
