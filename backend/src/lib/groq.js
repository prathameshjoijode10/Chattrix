import "dotenv/config";

const apiKey = process.env.GROQ_API_KEY;

const GROQ_CHAT_COMPLETIONS_URL =
  process.env.GROQ_CHAT_COMPLETIONS_URL || "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_TEXT_MODELS = [
  process.env.GROQ_MODEL,
  process.env.GROQ_TEXT_MODEL,
  // Common Groq models (availability depends on your account/region)
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
].filter(Boolean);

const DEFAULT_VISION_MODELS = [
  process.env.GROQ_VISION_MODEL,
  process.env.GROQ_MODEL,
  // Vision-capable models (availability depends on Groq)
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
].filter(Boolean);

function isNotFoundOrNotSupported(error) {
  const status = error?.status;
  const msg = String(error?.message || "");
  return (
    status === 400 ||
    status === 404 ||
    msg.toLowerCase().includes("model") &&
      (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("not supported"))
  );
}

async function groqChatCompletion({ model, messages, temperature = 0.2, max_tokens = 512 }) {
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
    }),
  });

  if (!res.ok) {
    let details = "";
    try {
      details = await res.text();
    } catch {
      // ignore
    }
    const err = new Error(`Groq API error (${res.status}): ${details || res.statusText}`);
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Groq API returned no message content");
  }

  return content;
}

async function generateWithFallback(models, generate) {
  let lastError;

  for (const modelName of models) {
    try {
      const text = await generate(modelName);
      return { text, model: modelName };
    } catch (error) {
      lastError = error;
      if (isNotFoundOrNotSupported(error)) continue;
      throw error;
    }
  }

  throw lastError || new Error("No Groq model available");
}

export async function generateGroqText(prompt) {
  const raw = typeof prompt === "string" ? prompt.trim() : "";
  if (!raw) throw new Error("Prompt is required");

  return generateWithFallback(DEFAULT_TEXT_MODELS, async (modelName) => {
    return groqChatCompletion({
      model: modelName,
      messages: [{ role: "user", content: raw }],
      temperature: 0.2,
      max_tokens: 600,
    });
  });
}

export async function generateGroqImageCaption({ base64Data, mimeType }) {
  if (!base64Data || !mimeType) {
    throw new Error("Missing image data or mimeType");
  }

  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  return generateWithFallback(DEFAULT_VISION_MODELS, async (modelName) => {
    return groqChatCompletion({
      model: modelName,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image in 10 words for accessibility." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 80,
    });
  });
}
