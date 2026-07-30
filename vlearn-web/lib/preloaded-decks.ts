import day01Deck from "../data/slides-day01.json";
import day02Deck from "../data/slides-day02.json";
import type { SlideDeck } from "./types";

/**
 * Fixed demo data only. The client and server resolve the same deck by id so
 * the browser never needs to post the complete slide text back to an API.
 */
export const PRELOADED_DECKS: Record<string, SlideDeck> = {
  day01: day01Deck as SlideDeck,
  day02: day02Deck as SlideDeck,
};

export function getPreloadedDeck(deckId: string) {
  return PRELOADED_DECKS[deckId] ?? null;
}

export function getPreloadedRetrievalChunks(deckId: string) {
  const deck = getPreloadedDeck(deckId);
  return deck?.chunks.flatMap((chunk) => chunk.pages.map((page) => ({
    id: `${chunk.chunkId}-${page}`,
    text: chunk.text,
    slideFrom: page,
  }))) ?? [];
}
