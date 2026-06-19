import { tool } from "ai";
import { z } from "zod";

/**
 * Physics Wallah (PW) publication book-search tool.
 *
 * This is the ONLY web-search capability exposed to the chat agent. It is
 * deliberately scoped to Physics Wallah's official publication store
 * (store.pw.live) so the agent can never surface or recommend books from any
 * other publisher. Domain restriction is enforced in two places:
 *   1. The search backend (Tavily) is asked to return results only from the
 *      allowed domains (`include_domains`).
 *   2. Results are re-filtered here by hostname before being returned to the
 *      model (belt-and-suspenders, in case the backend ignores the hint).
 *
 * Backend: Tavily Search API (https://tavily.com). Set TAVILY_API_KEY to enable.
 * Override the allowlist with PW_BOOKS_SEARCH_DOMAINS (comma-separated).
 */

const TAVILY_ENDPOINT = "https://api.tavily.com/search";
const DEFAULT_DOMAINS = ["store.pw.live"];

export function getPwBookDomains(): string[] {
  const raw = process.env.PW_BOOKS_SEARCH_DOMAINS?.trim();
  if (!raw) return DEFAULT_DOMAINS;
  const parsed = raw
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_DOMAINS;
}

export function pwBooksSearchAvailable(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

type TavilyResult = { title?: string; url?: string; content?: string };

function hostMatchesAllowlist(url: string | undefined, domains: string[]): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export const searchPwBooks = tool({
  description:
    "Search the official Physics Wallah (PW) publication store for books and study material to recommend. " +
    "Use this tool ONLY when the student is asking for a book recommendation — which book to buy, which PW " +
    "module/study material to get, or what to purchase for a subject/exam. " +
    "All results come exclusively from Physics Wallah's own publication store, and you must recommend ONLY the " +
    "books this tool returns — never name books from other publishers as purchase recommendations. " +
    "Do NOT use this tool for solving problems, explaining concepts, building study plans, or general questions.",
  inputSchema: z.object({
    query: z
      .string()
      .min(2)
      .describe("What the student wants a book for, e.g. 'physics module for JEE Advanced' or 'NEET biology'"),
    examOrSubject: z
      .string()
      .optional()
      .describe("Optional exam/subject to narrow results, e.g. 'JEE Main', 'NEET', 'Class 12 Chemistry'"),
  }),
  execute: async ({ query, examOrSubject }) => {
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    const domains = getPwBookDomains();

    if (!apiKey) {
      return {
        available: false,
        message:
          "Physics Wallah book search is not configured right now. Recommend the student browse the official PW store, and offer study strategy instead.",
        source: domains[0],
        results: [],
      };
    }

    const searchQuery = examOrSubject
      ? `${query} ${examOrSubject} Physics Wallah books`
      : `${query} Physics Wallah books`;

    try {
      const res = await fetch(TAVILY_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          search_depth: "basic",
          include_domains: domains,
          max_results: 6,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.error("pw books search: tavily returned", res.status);
        return {
          available: false,
          message: "Book search is temporarily unavailable. Offer study strategy instead.",
          source: domains[0],
          results: [],
        };
      }

      const data = (await res.json()) as { results?: TavilyResult[] };
      const results = (data.results ?? [])
        .filter((r) => hostMatchesAllowlist(r.url, domains))
        .map((r) => ({
          title: r.title ?? "Untitled",
          url: r.url ?? "",
          snippet: (r.content ?? "").slice(0, 300),
        }));

      return {
        available: true,
        source: "Physics Wallah Publication store",
        domains,
        results,
      };
    } catch (err) {
      console.error("pw books search failed", err);
      return {
        available: false,
        message: "Book search failed. Offer study strategy instead.",
        source: domains[0],
        results: [],
      };
    }
  },
});
