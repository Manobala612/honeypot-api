import { z } from "zod";

// Allow empty body (tester sends no message)
const messageSchema = z.object({
  sender_id: z.string().optional().default("anonymous"),
  message_body: z.string().optional().default(""),
  platform: z.string().optional().default("unknown"),
  timestamp: z.string().optional()
});

const dangerousKeywords = [
  "ignore previous",
  "system prompt",
  "reveal your instructions",
  "forget your persona",
  "developer mode",
  "dan mode",
  "do anything now",
  "you are now",
  "hack a bank",
  "jailbreak"
];

export const requestGuard = (req, res, next) => {
  // If body is missing, inject empty object
  if (!req.body) {
    req.body = {};
  }

  const validation = messageSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      status: "error",
      message: "Invalid request format"
    });
  }

  // Normalize body
  req.body = validation.data;

  // Only check injection if message exists
  if (req.body.message_body) {
    const content = req.body.message_body.toLowerCase();

    const hasInjection = dangerousKeywords.some(k =>
      content.includes(k)
    );

    if (hasInjection) {
      return res.status(403).json({
        status: "error",
        message: "Security violation"
      });
    }
  }

  next();
};
