import { z } from 'zod';

const messageSchema = z.object({
    // Made these optional so your simple tests don't crash
    sender_id: z.string().default("anonymous_scammer"),
    message_body: z.string().min(1, "Message cannot be empty").max(2000, "Message too long"),
    platform: z.enum(['whatsapp', 'telegram', 'sms', 'mock_api']).default("sms"),
    timestamp: z.string().optional()
});

const dangerousKeywords = [
    "ignore previous", "system prompt", "reveal your instructions", 
    "forget your persona", "developer mode", "dan mode", 
    "do anything now", "you are now", "hack a bank", "jailbreak"
];

export const requestGuard = (req, res, next) => {
    // 1. Validate the structure
    const validation = messageSchema.safeParse(req.body);
    
    if (!validation.success) {
        console.log("Validation Failed:", validation.error.format()); // See exactly what's wrong in terminal
        return res.status(400).json({ 
            status: "error", 
            message: "Invalid data format.",
            details: validation.error.issues.map(i => `${i.path}: ${i.message}`) 
        });
    }

    // 2. Check for Jailbreak/Injection attempts
    const content = req.body.message_body.toLowerCase();
    const hasInjectionAttempt = dangerousKeywords.some(keyword => content.includes(keyword));

    if (hasInjectionAttempt) {
        console.warn(`🚨 [SECURITY]: Injection attempt detected!`);
        return res.status(403).json({ status: "error", message: "Security Violation detected." });
    }

    // 3. Success! Move to the router
    next();
};