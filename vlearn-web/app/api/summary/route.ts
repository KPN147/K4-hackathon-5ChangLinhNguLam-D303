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
  return asPositiveNumbers(value, allowed);
}

function normalizePoint(value: unknown, index: number, fallbackPages: number[], allowed: Set<number>, lowPages: Set<number>): SummaryPoint | null {
  const record = asRecord(value);
  if (!record) return null;
  const text = asText(record.text ?? record.point ?? record.summary);
  if (!text) return null;
  const pages = normalizePages(record.pages ?? record.slideRefs ?? record.slides, fallbackPages, allowed);
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

function mapPrompt(batch: ChunkInput[], lowPages: Set<number>) {
  const source = batch.map((chunk) => `CHUNK ${chunk.chunkId} | slides ${chunk.pages.join(", ")}\n${chunk.text}`).join("\n\n");
  return `Summarize only the supplied lecture slide text. Return JSON only with this shape: {"sections":[{"heading":"...","points":[{"text":"...","pages":[1],"confidence":"high"}]}],"unclassified":[]}. Use at most 4 sections and at most 3 short points per section. Keep each point under 35 words. Every pages value must be one of: ${Array.from(new Set(batch.flatMap((chunk) => chunk.pages))).join(", ")}. Never invent a slide number or outside fact. Keep technical terms in their original form. Mark confidence low for slides in this list: ${Array.from(lowPages).join(", ") || "none"}.\n\n${source}`;
}

function reducePrompt(mapResults: Array<{ sections: SummarySection[]; unclassified: SummaryPoint[] }>, allowed: Set<number>, lowPages: Set<number>) {
  return `Merge the grounded map results into one concise Vietnamese lecture summary. Return JSON only with this exact shape: {"sections":[{"heading":"...","points":[{"text":"...","pages":[1],"confidence":"high"}]}],"unclassified":[]}. Use at most 8 sections and at most 3 short points per section. Keep each point under 40 words. Allowed slide numbers are: ${Array.from(allowed).join(", ")}. Every point must cite one or more allowed slide numbers. Do not add facts that are not present in the map results. Mark a point low confidence if it cites one of these slides: ${Array.from(lowPages).join(", ") || "none"}.\n\nMAP RESULTS:\n${JSON.stringify(mapResults)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
    const deck = normalizeDeck(getPreloadedDeck(deckId));
    if (!deck?.deckId || !deck.pages.length || !deck.chunks.length) {
      return NextResponse.json({ error: "no-text" }, { status: 422 });
    }

    const lowPages = new Set(deck.pages.filter((page) => !page.hasText || (page.meta?.charCount ?? page.text.length) < LOW_TEXT_THRESHOLD).map((page) => page.page));
    const batches = makeBatches(deck.chunks);
    const mapResults: Array<{ sections: SummarySection[]; unclassified: SummaryPoint[] }> = [];
    for (const batch of batches) {
      const result = await generateGeminiText({
        systemInstruction: "You are the Map stage of a grounded slide summarizer. Do not reveal reasoning. Output valid JSON only.",
        prompt: mapPrompt(batch, lowPages),
        maxOutputTokens: 1800,
        responseMimeType: "application/json",
        thinkingBudget: 0,
      });
      const parsed = result && parseJsonObject(result.text);
      const normalized = parsed && normalizeMap(parsed, batch.flatMap((chunk) => chunk.pages), new Set(batch.flatMap((chunk) => chunk.pages)), lowPages);
      if (!normalized) return NextResponse.json({ error: "api" }, { status: 502 });
      mapResults.push(normalized);
    }

    const reduced = await generateGeminiText({
      systemInstruction: "You are the Reduce stage of a grounded slide summarizer. Do not reveal reasoning. Output valid JSON only.",
      prompt: reducePrompt(mapResults, deck.allowed, lowPages),
      maxOutputTokens: 2400,
      responseMimeType: "application/json",
      thinkingBudget: 0,
    });
    const parsedReduced = reduced && parseJsonObject(reduced.text);
    const normalizedReduced = parsedReduced && normalizeMap(parsedReduced, [], deck.allowed, lowPages);
    if (!reduced || !normalizedReduced || (!normalizedReduced.sections.length && !normalizedReduced.unclassified.length)) {
      return NextResponse.json({ error: "api" }, { status: 502 });
    }

    const summary: DeckSummary = {
      deckId: deck.deckId,
      sections: normalizedReduced.sections,
      unclassified: normalizedReduced.unclassified,
      skippedPages: deck.pages.filter((page) => !page.hasText).map((page) => page.page),
      generatedAt: new Date().toISOString(),
      model: reduced.model,
    };
    const partial = lowPages.size > 0 || summary.sections.some((section) => section.points.some((point) => point.confidence === "low"));
    return NextResponse.json({ summary, partial, lowConfidencePages: Array.from(lowPages).sort((left, right) => left - right) });
  } catch {
    return NextResponse.json({ error: "api" }, { status: 502 });
  }
}
