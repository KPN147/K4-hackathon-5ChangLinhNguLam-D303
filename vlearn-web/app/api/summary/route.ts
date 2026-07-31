import { NextResponse } from "next/server";
import { generateGeminiText, parseJsonObject } from "../../../lib/gemini";
import { getPreloadedDeck } from "../../../lib/preloaded-decks";

export const runtime = "nodejs";

const LOW_TEXT_THRESHOLD = 120;

type PageInput = {
  page: number;
  text: string;
  hasText: boolean;
  meta?: { charCount?: number; imageCount?: number };
};

type ChunkInput = {
  chunkId: string;
  pages: number[];
  text: string;
};

type SummaryPoint = {
  id: string;
  text: string;
  pages: number[];
  confidence: "high" | "low";
};

type SummarySection = {
  id: string;
  heading: string;
  points: SummaryPoint[];
};

type DeckSummary = {
  deckId: string;
  sections: SummarySection[];
  unclassified: SummaryPoint[];
  skippedPages: number[];
  generatedAt: string;
  model: string;
};

type SummaryMode = "balanced" | "deep" | "review";

const SUMMARY_MODE_GUIDANCE: Record<SummaryMode, string> = {
  balanced: "Cân bằng: giữ các ý chính và giải thích vừa đủ để người mới vẫn hiểu bài.",
  deep: "Hiểu sâu: ưu tiên cơ chế, quan hệ nhân quả, ví dụ, giới hạn và các điểm dễ nhầm; có thể lược bớt chi tiết trang trí.",
  review: "Ôn tập: ưu tiên định nghĩa, thuật ngữ, phân biệt, quy tắc, quy trình và các ý cần nhớ khi ôn lại bài.",
};

function normalizeSummaryMode(value: unknown): SummaryMode {
  return value === "deep" || value === "review" ? value : "balanced";
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 800) : "";
}

function asPositiveNumbers(value: unknown, allowed: Set<number>) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0 && allowed.has(item))));
}

function normalizePages(value: unknown, fallback: number[], allowed: Set<number>) {
  const pages = asPositiveNumbers(value, allowed);
  return pages.length ? pages : fallback.filter((page) => allowed.has(page));
}

function normalizePoint(value: unknown, index: number, fallbackPages: number[], allowed: Set<number>, lowPages: Set<number>): SummaryPoint | null {
  const record = typeof value === "string" ? { text: value } : asRecord(value);
  if (!record) return null;
  const text = asText(record.text ?? record.point ?? record.summary);
  if (!text) return null;
  const pages = normalizePages(record.pages ?? record.slideRefs ?? record.slides ?? record.slide ?? record.page, fallbackPages, allowed);
  if (!pages.length) return null;
  const confidence = record.confidence === "low" || pages.some((page) => lowPages.has(page)) ? "low" : "high";
  return { id: `point-${index + 1}`, text, pages, confidence };
}

function normalizeMap(value: Record<string, unknown>, fallbackPages: number[], allowed: Set<number>, lowPages: Set<number>) {
  const rawSections = Array.isArray(value.sections) ? value.sections : Array.isArray(value.topics) ? value.topics : [];
  const sections: SummarySection[] = [];
  const unclassified: SummaryPoint[] = [];
  let pointIndex = 0;

  for (const [sectionIndex, rawSection] of rawSections.entries()) {
    const section = asRecord(rawSection);
    if (!section) continue;
    const heading = asText(section.heading ?? section.title) || `Topic ${sectionIndex + 1}`;
    const rawPoints = Array.isArray(section.points) ? section.points : Array.isArray(section.bullets) ? section.bullets : [];
    const points = rawPoints.map((point) => normalizePoint(point, pointIndex++, fallbackPages, allowed, lowPages)).filter((point): point is SummaryPoint => Boolean(point));
    if (points.length) sections.push({ id: `section-${sectionIndex + 1}`, heading, points });
  }

  const rawUnclassified = Array.isArray(value.unclassified) ? value.unclassified : [];
  for (const point of rawUnclassified) {
    const normalized = normalizePoint(point, pointIndex++, fallbackPages, allowed, lowPages);
    if (normalized) unclassified.push(normalized);
  }
  return { sections, unclassified };
}

function hasSummaryContent(value: { sections: SummarySection[]; unclassified: SummaryPoint[] }) {
  return value.sections.length > 0 || value.unclassified.length > 0;
}

function mergeMapResults(results: Array<{ sections: SummarySection[]; unclassified: SummaryPoint[] }>) {
  let sectionIndex = 0;
  let pointIndex = 0;
  const sections = results.flatMap((result) => result.sections.map((section) => ({
    ...section,
    id: `section-${++sectionIndex}`,
    points: section.points.map((point) => ({ ...point, id: `point-${++pointIndex}` })),
  })));
  const unclassified = results.flatMap((result) => result.unclassified.map((point) => ({ ...point, id: `point-${++pointIndex}` })));
  return { sections, unclassified };
}

function sourceFallback(deck: ReturnType<typeof normalizeDeck>) {
  if (!deck) return null;
  const points = deck.chunks.map((chunk, index) => ({
    id: `point-${index + 1}`,
    text: chunk.text.replace(/\s+/g, " ").trim().slice(0, 800),
    pages: chunk.pages,
    confidence: "low" as const,
  })).filter((point) => point.text);
  return points.length ? { sections: [{ id: "section-1", heading: "Nội dung slide", points }], unclassified: [] } : null;
}

function normalizeDeck(value: unknown) {
  const deck = asRecord(value);
  if (!deck) return null;
  const deckId = typeof deck.deckId === "string" ? deck.deckId : "";
  const totalPages = Number(deck.totalPages);
  const rawPages = Array.isArray(deck.pages) ? deck.pages : [];
  const pages: PageInput[] = rawPages.map((value): PageInput | null => {
    const record = asRecord(value);
    if (!record) return null;
    const page = Number(record.page);
    const text = asText(record.text);
    if (!Number.isInteger(page) || page < 1 || !text && record.hasText !== false) return null;
    const meta = asRecord(record.meta);
    return {
      page,
      text,
      hasText: record.hasText !== false && Boolean(text),
      meta: { charCount: Number(meta?.charCount) || text.length, imageCount: Number(meta?.imageCount) || 0 },
    };
  }).filter((page): page is PageInput => Boolean(page));
  const allowed = new Set(pages.map((page) => page.page));
  const rawChunks = Array.isArray(deck.chunks) ? deck.chunks : [];
  const chunks: ChunkInput[] = rawChunks.map((value, index): ChunkInput | null => {
    const record = asRecord(value);
    if (!record) return null;
    const text = asText(record.text);
    const chunkPages = asPositiveNumbers(record.pages, allowed);
    if (!text || !chunkPages.length) return null;
    return { chunkId: typeof record.chunkId === "string" ? record.chunkId : `chunk-${index + 1}`, pages: chunkPages, text };
  }).filter((chunk): chunk is ChunkInput => Boolean(chunk));
  return { deckId, totalPages: Number.isInteger(totalPages) ? totalPages : pages.length, pages, chunks, allowed };
}

function makeBatches(chunks: ChunkInput[]) {
  const batches: ChunkInput[][] = [];
  let current: ChunkInput[] = [];
  let size = 0;
  for (const chunk of chunks) {
    if (current.length && size + chunk.text.length > 9000) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(chunk);
    size += chunk.text.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

function mapPrompt(batch: ChunkInput[], lowPages: Set<number>, mode: SummaryMode) {
  const source = batch.map((chunk) => `CHUNK ${chunk.chunkId} | slides ${chunk.pages.join(", ")}\n${chunk.text}`).join("\n\n");
  return `Create a grounded, knowledge-rich teaching outline from ONLY the supplied lecture slide text. Write the points in Vietnamese. Return JSON only with this shape: {"sections":[{"heading":"...","points":[{"text":"...","pages":[1],"confidence":"high"}]}],"unclassified":[]}.

Summary criterion: ${SUMMARY_MODE_GUIDANCE[mode]}

This is a learning summary, not a keyword index. Keep the main ideas while preserving the knowledge needed to understand them. For each point:
- name the concept or claim clearly;
- explain what it means and how, why, or where it fits when the source supports that explanation;
- include an important example, comparison, implication, limitation, or practical takeaway when present in the source.
Write 2-3 complete sentences per point, usually 35-65 words. Use at most 5 sections and at most 4 points per section. Group related ideas, remove repetition and decorative slide copy, and order ideas from foundations to mechanisms to applications or limits. Keep technical terms in their original form.

Every pages value must be one of: ${Array.from(new Set(batch.flatMap((chunk) => chunk.pages))).join(", ")}. Never invent a slide number, outside fact, example, or explanation that is not supported by the supplied text. Mark confidence low for slides in this list: ${Array.from(lowPages).join(", ") || "none"}.

${source}`;
}

function reducePrompt(mapResults: Array<{ sections: SummarySection[]; unclassified: SummaryPoint[] }>, allowed: Set<number>, lowPages: Set<number>, mode: SummaryMode) {
  return `Merge the grounded map results into one key Vietnamese lecture summary that is concise but still teaches the subject. Return JSON only with this exact shape: {"sections":[{"heading":"...","points":[{"text":"...","pages":[1],"confidence":"high"}]}],"unclassified":[]}.

Summary criterion: ${SUMMARY_MODE_GUIDANCE[mode]}

Keep the major knowledge, not just headings: preserve definitions, hierarchies, mechanisms, cause-and-effect, workflows, examples, comparisons, trade-offs, limitations, and practical rules whenever they are supported by the map results. Make every point self-contained and readable without opening the original slide. Write 2-3 complete sentences per point, usually 40-75 words. Use at most 9 sections and at most 4 points per section. Do not make one bullet per slide, do not repeat the same idea, and do not add outside facts. Prefer a logical progression from concept to mechanism to application or limitation.

Allowed slide numbers are: ${Array.from(allowed).join(", ")}. Every point must cite one or more allowed slide numbers. Mark a point low confidence if it cites one of these slides: ${Array.from(lowPages).join(", ") || "none"}.

MAP RESULTS:
${JSON.stringify(mapResults)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
    const mode = normalizeSummaryMode(body.mode);
    const deck = normalizeDeck(getPreloadedDeck(deckId));
    if (!deck?.deckId || !deck.pages.length || !deck.chunks.length) {
      return NextResponse.json({ error: "no-text" }, { status: 422 });
    }

    const lowPages = new Set(deck.pages.filter((page) => !page.hasText || (page.meta?.charCount ?? page.text.length) < LOW_TEXT_THRESHOLD).map((page) => page.page));
    const batches = makeBatches(deck.chunks);
    const mapResults: Array<{ sections: SummarySection[]; unclassified: SummaryPoint[] }> = [];
    const failedMapPages = new Set<number>();
    let mapModel = "fallback";
    for (const batch of batches) {
      const fallbackPages = batch.flatMap((chunk) => chunk.pages);
      const allowedBatchPages = new Set(fallbackPages);
      let normalized: { sections: SummarySection[]; unclassified: SummaryPoint[] } | null = null;
      for (let attempt = 0; attempt < 2 && !normalized; attempt += 1) {
        const result = await generateGeminiText({
          provider: "vilao",
          systemInstruction: "You are the Map stage of a grounded slide summarizer. Do not reveal reasoning. Output valid JSON only.",
          prompt: `${mapPrompt(batch, lowPages, mode)}${attempt ? "\n\nRetry: return only a compact valid JSON object. Do not use Markdown fences or explanatory text." : ""}`,
          maxOutputTokens: 2400,
          responseMimeType: "application/json",
          thinkingBudget: 0,
        });
        const parsed = result && parseJsonObject(result.text);
        const candidate = parsed && normalizeMap(parsed, fallbackPages, allowedBatchPages, lowPages);
        if (candidate && hasSummaryContent(candidate)) {
          normalized = candidate;
          mapModel = result?.model ?? mapModel;
        }
      }
      if (normalized) mapResults.push(normalized);
      else fallbackPages.forEach((page) => failedMapPages.add(page));
    }

    let normalizedReduced: { sections: SummarySection[]; unclassified: SummaryPoint[] } | null = null;
    let reducedModel = mapModel;
    if (mapResults.length) {
      for (let attempt = 0; attempt < 2 && !normalizedReduced; attempt += 1) {
        const reduced = await generateGeminiText({
          provider: "vilao",
          systemInstruction: "You are the Reduce stage of a grounded slide summarizer. Do not reveal reasoning. Output valid JSON only.",
          prompt: `${reducePrompt(mapResults, deck.allowed, lowPages, mode)}${attempt ? "\n\nRetry: return only a compact valid JSON object. Do not use Markdown fences or explanatory text." : ""}`,
          maxOutputTokens: 3600,
          responseMimeType: "application/json",
          thinkingBudget: 0,
        });
        const parsedReduced = reduced && parseJsonObject(reduced.text);
        const candidate = parsedReduced && normalizeMap(parsedReduced, [], deck.allowed, lowPages);
        if (candidate && hasSummaryContent(candidate)) {
          normalizedReduced = candidate;
          reducedModel = reduced?.model ?? reducedModel;
        }
      }
      if (!normalizedReduced) normalizedReduced = mergeMapResults(mapResults);
    }
    if (!normalizedReduced) normalizedReduced = sourceFallback(deck);
    if (!normalizedReduced || !hasSummaryContent(normalizedReduced)) return NextResponse.json({ error: "api" }, { status: 502 });

    const summary: DeckSummary = {
      deckId: deck.deckId,
      sections: normalizedReduced.sections,
      unclassified: normalizedReduced.unclassified,
      skippedPages: deck.pages.filter((page) => !page.hasText).map((page) => page.page),
      generatedAt: new Date().toISOString(),
      model: reducedModel,
    };
    const partial = lowPages.size > 0 || failedMapPages.size > 0 || summary.sections.some((section) => section.points.some((point) => point.confidence === "low"));
    return NextResponse.json({ summary, partial, lowConfidencePages: Array.from(new Set([...lowPages, ...failedMapPages])).sort((left, right) => left - right) });
  } catch {
    return NextResponse.json({ error: "api" }, { status: 502 });
  }
}
