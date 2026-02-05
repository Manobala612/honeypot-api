import express from "express";
import { apiKeyAuth } from "../auth/apiKeyAuth.js";
import { requestGuard } from "../auth/requestGuard.js";
import { intelExtractor } from "../ai/intelExtractor.js";

const router = express.Router();

let globalScamStore = {
    conversation_log: [],
    phishing_url: [],
    phone_number: [],
    upi_id: [],
    bank_account: null
};

const cleanResponse = (obj) => {
    return JSON.parse(JSON.stringify(obj).replace(/\\u0027/g, "'"));
};

router.post("/honeypot", apiKeyAuth, requestGuard, async (req, res) => {
    try {

        // ✅ FIX: Read both formats (tester + your old format)
        const safeMessage =
            req.body?.message?.text ||
            req.body?.message_body ||
            "";

        globalScamStore.conversation_log.push(safeMessage);

        const result = await intelExtractor.processMessage(
            safeMessage,
            globalScamStore
        );

        if (result.extracted_intel.phishing_url?.length > 0) {
            globalScamStore.phishing_url = [
                ...new Set([
                    ...globalScamStore.phishing_url,
                    ...result.extracted_intel.phishing_url
                ])
            ];
        }

        if (result.extracted_intel.phone_number?.length > 0) {
            globalScamStore.phone_number = [
                ...new Set([
                    ...globalScamStore.phone_number,
                    ...result.extracted_intel.phone_number
                ])
            ];
        }

        if (result.extracted_intel.upi_id?.length > 0) {
            globalScamStore.upi_id = [
                ...new Set([
                    ...globalScamStore.upi_id,
                    ...result.extracted_intel.upi_id
                ])
            ];
        }

        if (
            result.extracted_intel.bank_account &&
            result.extracted_intel.bank_account !== "No account found"
        ) {
            globalScamStore.bank_account = result.extracted_intel.bank_account;
        }

        const isComplete = !!(
            globalScamStore.phishing_url.length > 0 &&
            globalScamStore.phone_number.length > 0 &&
            globalScamStore.upi_id.length > 0 &&
            globalScamStore.bank_account
        );

        const responseData = {
            status: isComplete ? "completed" : "in_progress",
            conversation_log: globalScamStore.conversation_log,
            extracted_intel: {
                upi_id: globalScamStore.upi_id[0] || null,
                phone_number: globalScamStore.phone_number[0] || null,
                phishing_url: globalScamStore.phishing_url[0] || null,
                bank_account: globalScamStore.bank_account
            },
            chatbot_reply: result.reply
        };

        return res.status(200).json(cleanResponse(responseData));

    } catch (error) {
        console.error("Route Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/reset", apiKeyAuth, (req, res) => {
    globalScamStore = {
        conversation_log: [],
        phishing_url: [],
        phone_number: [],
        upi_id: [],
        bank_account: null
    };

    res.json({ message: "Memory cleared!" });
});

export default router;
