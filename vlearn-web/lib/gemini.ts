const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const VILAO_BASE_URL = "https://api.vilao.ai/v1";

export const TUTOR_FALLBACK_MESSAGE = "Hi\u1ec7n t\u1ea1i ch\u1ee9c n\u0103ng h\u1ecfi \u0111\u00e1p \u0111ang g\u1eb7p s\u1ef1 c\u1ed1, mong b\u1ea1n th\u1eed l\u1ea1i sau .";

export type GeminiResult = {
  text: string;
  model: string;
};

export type LlmProvider = "gemini" | "vilao" | "openrouter";

function extractText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const candidates = (value as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates;
  return candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timeout);
  }
}

export function getGeminiConfig() {
  const keys = (process.env.GEMINI_API_KEYS ?? "").split(",").map((key) => key.trim()).filter(Boolean);
  return {
    keys,
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  };
}

type ChatCompletionConfig = {
  endpoint: string;
  keys: string[];
  model: string;
  headers?: Record<string, string>;
};

function getChatCompletionConfig(provider: string): ChatCompletionConfig | null {
  if (provider === "vilao") {
    const baseUrl = process.env.VILAO_BASE_URL?.trim().replace(/\/+$/, "") || VILAO_BASE_URL;
    return {
      endpoint: `${baseUrl}/chat/completions`,
      keys: (process.env.VILAO_API_KEY ?? "").split(",").map((key) => key.trim()).filter(Boolean),
      model: process.env.VILAO_MODEL?.trim() || "ts/gemini-3.1-flash-lite",
    };
  }

  if (provider === "openrouter") {
    return {
      endpoint: OPENROUTER_ENDPOINT,
      keys: (process.env.OPENROUTER_API_KEY ?? "").split(",").map((key) => key.trim()).filter(Boolean),
      model: process.env.OPENROUTER_MODEL?.trim() || "inclusionai/ling-3.0-flash:free",
      headers: { "x-openrouter-title": "VLearn Demo" },
    };
  }

  return null;
}

async function generateChatCompletion(
  config: ChatCompletionConfig,
  systemInstruction: string,
  prompt: string,
  maxOutputTokens: number,
): Promise<GeminiResult | null> {
  const startIndex = Math.floor(Date.now() / 1000) % config.keys.length;
  for (let offset = 0; offset < config.keys.length; offset += 1) {
    const key = config.keys[(startIndex + offset) % config.keys.length];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchWithTimeout(config.endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${key}`,
            "content-type": "application/json",
            ...config.headers,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            max_tokens: maxOutputTokens,
          }),
        }, 20_000);
        const body = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string | null } }> } | null;
        const text = body?.choices?.[0]?.message?.content?.trim();
        if (response.ok && text) return { text, model: config.model };
        if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) break;
      } catch {
        // Retry one transient network/timeout failure before trying the next key.
      }
    }
  }
  return null;
}

async function generateGoogleCompletion(
  systemInstruction: string,
  prompt: string,
  maxOutputTokens: number,
  responseMimeType?: string,
  thinkingBudget?: number,
): Promise<GeminiResult | null> {
  const { keys, model } = getGeminiConfig();
  if (!keys.length) return null;
  const startIndex = Math.floor(Date.now() / 1000) % keys.length;
  const transientStatuses = new Set([408, 425, 429, 500, 502, 503, 504]);

  for (let offset = 0; offset < keys.length; offset += 1) {
    const key = keys[(startIndex + offset) % keys.length];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetchWithTimeout(`${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens,
              ...(responseMimeType ? { responseMimeType } : {}),
              ...(thinkingBudget !== undefined ? { thinkingConfig: { thinkingBudget } } : {}),
            },
          }),
        }, 20_000);
        if (!response.ok) {
          if (!transientStatuses.has(response.status)) break;
          continue;
        }
        const text = extractText(await response.json());
        if (text) return { text, model };
      } catch {
        // Retry one transient network/timeout failure before trying the next key.
      }
    }
  }
  return null;
}

export async function generateGeminiText({
  provider,
  systemInstruction,
  prompt,
  maxOutputTokens = 1200,
  responseMimeType,
  thinkingBudget,
}: {
  provider?: LlmProvider;
  systemInstruction: string;
  prompt: string;
  maxOutputTokens?: number;
  responseMimeType?: string;
  thinkingBudget?: number;
}): Promise<GeminiResult | null> {
  const selectedProvider = provider ?? (process.env.LLM_PROVIDER?.trim().toLowerCase() as LlmProvider | undefined) ?? "gemini";
  if (selectedProvider === "vilao" || selectedProvider === "openrouter") {
    const chatCompletion = getChatCompletionConfig(selectedProvider);
    return chatCompletion?.keys.length
      ? generateChatCompletion(chatCompletion, systemInstruction, prompt, maxOutputTokens)
      : null;
  }
  return generateGoogleCompletion(systemInstruction, prompt, maxOutputTokens, responseMimeType, thinkingBudget);
}

export function parseJsonObject(value: string): Record<string, unknown> | null {
  const cleaned = value.trim().replace(/^\uFEFF/, "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const candidates = [cleaned];
  const objectStart = cleaned.indexOf("{");
  const objectEnd = cleaned.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(cleaned.slice(objectStart, objectEnd + 1));
  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Try the next candidate when the provider adds prose around the JSON.
    }
  }
  return null;
}
