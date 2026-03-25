import { generateStreamToken } from "../lib/stream.js";
import { generateGroqImageCaption, generateGroqText } from "../lib/groq.js";
import { sendBotMessageToChannel, verifyUserInChannel } from "../lib/stream.js";
import { streamClient } from "../lib/stream.js";

function safeTrim(str) {
    return typeof str === "string" ? str.trim() : "";
}

async function getImageDataFromMessage(message) {
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const targetIndex = attachments.findIndex(
        (a) => a?.type === "image" || Boolean(a?.image_url) || Boolean(a?.thumb_url)
    );
    if (targetIndex === -1) {
        return { error: { status: 400, message: "No image attachment found" } };
    }

    const target = attachments[targetIndex];
    const imageUrl = target.image_url || target.thumb_url || target.asset_url || target.url;
    if (!imageUrl) {
        return { error: { status: 400, message: "Image URL not found" } };
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
        return { error: { status: 400, message: "Could not fetch image" } };
    }

    const mimeType = response.headers.get("content-type") || target.mime_type || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");
    return { attachments, targetIndex, mimeType, base64Data };
}

export async function getStreamToken(req,res){
    try {
        const token=generateStreamToken(req.user.id);
        res.status(200).json({token});
    } catch (error) {
        console.log("Error in getStream controller",error.message);
        res.status(500).json({message:"Internal server error"});
    }
}

export async function geminiChat(req, res) {
    try {
        const { cid, prompt } = req.body || {};

        const rawPrompt = typeof prompt === "string" ? prompt.trim() : "";
        if (!rawPrompt) {
            return res.status(400).json({ message: "Prompt is required" });
        }

        if (rawPrompt.length > 4000) {
            return res.status(400).json({ message: "Prompt is too long" });
        }

        const cidStr = typeof cid === "string" ? cid : "";
        const [channelType, channelId] = cidStr.split(":");
        if (!channelType || !channelId) {
            return res.status(400).json({ message: "cid must be like 'messaging:channel-id'" });
        }

        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const allowed = await verifyUserInChannel(channelType, channelId, userId);
        if (!allowed) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        const { text: answerText, model } = await generateGroqText(rawPrompt);
        const cleaned = (answerText || "").trim();

        await sendBotMessageToChannel(channelType, channelId, cleaned || "(no response)", {
            ai: true,
            aiProvider: "groq",
            aiModel: model,
        });

        return res.status(200).json({ text: cleaned, model });
    } catch (error) {
        console.error("Error in geminiChat controller", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export async function captionImageMessage(req, res) {
    try {
        const { messageId } = req.body || {};
        const id = typeof messageId === "string" ? messageId.trim() : "";
        if (!id) {
            return res.status(400).json({ message: "messageId is required" });
        }

        const userId = req.user?.id?.toString();
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const msgResp = await streamClient.getMessage(id);
        const message = msgResp?.message;
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (safeTrim(message.imageAltText)) {
            return res.status(200).json({ caption: safeTrim(message.imageAltText), model: message.imageAltTextModel || null });
        }

        const cidStr = message.cid || "";
        const [channelType, channelId] = cidStr.split(":");
        if (!channelType || !channelId) {
            return res.status(400).json({ message: "Invalid message cid" });
        }

        const allowed = await verifyUserInChannel(channelType, channelId, userId);
        if (!allowed) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        const data = await getImageDataFromMessage(message);
        if (data.error) {
            return res.status(data.error.status).json({ message: data.error.message });
        }

        const { attachments, targetIndex, mimeType, base64Data } = data;

        const { text: captionRaw, model } = await generateGroqImageCaption({ base64Data, mimeType });
        const caption = (captionRaw || "").trim();

        const updatedAttachments = attachments.map((a, idx) => {
            if (idx !== targetIndex) return a;
            return {
                ...a,
                fallback: caption || a?.fallback,
            };
        });

        // Store for future use, plus set attachment fallback so Stream Gallery shows tooltip.
        try {
            await streamClient.partialUpdateMessage(id, {
                set: {
                    imageAltText: caption,
                    imageAltTextProvider: "groq",
                    imageAltTextModel: model,
                    attachments: updatedAttachments,
                },
            });
        } catch (error) {
            // Some Stream configs reject partial updates for attachments; fall back to full update.
            await streamClient.updateMessage({
                id,
                text: message.text,
                attachments: updatedAttachments,
                imageAltText: caption,
                imageAltTextProvider: "groq",
                imageAltTextModel: model,
            });
        }

        return res.status(200).json({ caption, model });
    } catch (error) {
        console.error("Error in captionImageMessage controller", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
