const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const TUTOR_FALLBACK_MESSAGE = "Hi\u1ec7n t\u1ea1i ch\u1ee9c n\u0103ng h\u1ecfi \u0111\u00e1p \u0111ang g\u1eb7p s\u1ef1 c\u1ed1, mong b\u1ea1n th\u1eed l\u1ea1i sau .";

export type GeminiResult = {
  text: string;
  model: string;
};

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

function getOpenRouterConfig() {
  return {
    keys: (process.env.OPENROUTER_API_KEY ?? "").split(",").map((key) => key.trim()).filter(Boolean),
    model: process.env.OPENROUTER_MODEL?.trim() || "inclusionai/ling-3.0-flash:free",
  };
}

export async function generateGeminiText({
  systemInstruction,
  prompt,
  maxOutputTokens = 1200,
  responseMimeType,
  thinkingBudget,
}: {
  systemInstruction: string;
  prompt: string;
  maxOutputTokens?: number;
  responseMimeType?: string;
  thinkingBudget?: number;
}): Promise<GeminiResult | null> {
  const openRouter = getOpenRouterConfig();
  const preferOpenRouter = process.env.LLM_PROVIDER?.trim().toLowerCase() !== "gemini";
  if (preferOpenRouter && openRouter.keys.length) {
    const startIndex = Math.floor(Date.now() / 1000) % openRouter.keys.length;
    for (let offset = 0; offset < openRouter.keys.length; offset += 1) {
      const key = openRouter.keys[(startIndex + offset) % openRouter.keys.length];
      try {
      const response = await fetchWithTimeout(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
          "x-openrouter-title": "VLearn Demo",
        },
        body: JSON.stringify({
          model: openRouter.model,
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
        if (response.ok && text) return { text, model: openRouter.model };
      } catch {
        // Try the next OpenRouter key for quota, network, timeout, or provider failures.
      }
    }
  }

  const { keys, model } = getGeminiConfig();
  if (!keys.length) return null;
  const startIndex = Math.floor(Date.now() / 1000) % keys.length;

  for (let offset = 0; offset < keys.length; offset += 1) {
    const key = keys[(startIndex + offset) % keys.length];
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
      if (!response.ok) continue;
      const text = extractText(await response.json());
      if (text) return { text, model };
    } catch {
      // Try the next key for quota, network, timeout, or provider failures.
    }
  }
  return null;
}

export function parseJsonObject(value: string): Record<string, unknown> | null {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed: unknown = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
