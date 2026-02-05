import { z } from 'zod';

const messageSchema = z.object({
  sender_id: z.string().default("anonymous_scammer"),

  // Allow empty string (for tester / empty requests)
  message_body: z.string().max(2000, "Message too long").default(""),

  platform: z.enum(['whatsapp', 'telegram', 'sms', 'mock_api']).default("sms"),

  timestamp: z.string().optional()
});

const dangerousKeywords = [
  "ignore previous", "system prompt", "reveal your instructions",
  "forget your persona", "developer mode", "dan mode",
  "do anything now", "you are now", "hack a bank", "jailbreak"
];

export const requestGuard = (req, res, next) => {

  // Ensure body exists
  if (!req.body || typeof req.body !== "object") {
    req.body = {};
  }

  // Convert message → message_body if needed
  if (!req.body.message_body && req.body.message) {
    req.body.message_body = req.body.message;
  }

  // Validate
  const validation = messageSchema.safeParse(req.body);

  if (!validation.success) {
    console.log("Validation Failed:", validation.error.format());

    return res.status(400).json({
      status: "error",
      message: "Invalid data format.",
      details: validation.error.issues.map(i => `${i.path}: ${i.message}`)
    });
  }

  // Injection check (only if message exists)
  const content = (req.body.message_body || "").toLowerCase();

  const hasInjectionAttempt = dangerousKeywords.some(keyword =>
    content.includes(keyword)
  );

  if (hasInjectionAttempt) {
    console.warn(`🚨 [SECURITY]: Injection attempt detected!`);

    return res.status(403).json({
      status: "error",
      message: "Security Violation detected."
    });
  }

  next();
};
