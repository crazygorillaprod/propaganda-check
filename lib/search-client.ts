/**
 * Search Client Module
 * 
 * Provides a unified interface for external search APIs to retrieve
 * corroborating evidence for fact-checking claims.
 */

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  age?: string;
};

export type SearchResponse = {
  query: string;
  results: SearchResult[];
  backend: 'brave' | 'stub';
};

type BraveWebResponse = {
  web?: {
    results?: Array<{
      title?: string;
      url?: string;
      description?: string;
      age?: string;
    }>;
  };
};

/**
 * Abstract search interface
 */
export interface SearchClient {
  search(query: string, excluded_domains: string[], max_results: number): Promise<SearchResponse>;
  isAvailable(): boolean;
}

/**
 * Brave Search API implementation
 */
class BraveSearchClient implements SearchClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async search(
    query: string,
    excluded_domains: string[] = [],
    max_results: number = 8
  ): Promise<SearchResponse> {
    // Build query with domain exclusions
    const excludes = excluded_domains
      .filter(Boolean)
      .map((d) => ` -site:${d}`)
      .join("");

    const finalQuery = `${query}${excludes}`;

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", finalQuery);
    url.searchParams.set("count", Math.min(max_results, 20).toString());
    url.searchParams.set("safesearch", "moderate");

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.apiKey,
        },
      });

      if (!res.ok) {
        console.error(`Brave Search API error: ${res.status}`);
        return { query: finalQuery, results: [], backend: 'brave' };
      }

      const data = (await res.json()) as BraveWebResponse;
      const results = data?.web?.results ?? [];

      const mapped: SearchResult[] = results
        .map((r) => ({
          title: (r.title || "").trim(),
          url: (r.url || "").trim(),
          snippet: (r.description || "").trim(),
          age: (r.age || "").trim(),
        }))
        .filter((r: SearchResult) => r.title && r.url)
        .slice(0, max_results);

      return {
        query: finalQuery,
        results: mapped,
        backend: 'brave',
      };
    } catch (error) {
      console.error("Brave Search API request failed:", error);
      return { query: finalQuery, results: [], backend: 'brave' };
    }
  }
}

/**
 * Stub implementation for when no API key is available
 */
class StubSearchClient implements SearchClient {
  isAvailable(): boolean {
    return false;
  }

  async search(
    query: string,
    excluded_domains: string[] = [],
    max_results: number = 8
  ): Promise<SearchResponse> {
    return {
      query,
      results: [],
      backend: 'stub',
    };
  }
}

/**
 * Factory function to create appropriate search client
 */
export function createSearchClient(): SearchClient {
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  if (braveKey) {
    return new BraveSearchClient(braveKey);
  }

  console.warn("No search API key configured. Search will be disabled.");
  return new StubSearchClient();
}

/**
 * Singleton instance
 */
let searchClientInstance: SearchClient | null = null;

export function getSearchClient(): SearchClient {
  if (!searchClientInstance) {
    searchClientInstance = createSearchClient();
  }
  return searchClientInstance;
}

/**
 * Convenience API matching the requested module shape:
 * search(query, excluded_domains, max_results) -> SearchResult[]
 */
export async function search(
  query: string,
  excluded_domains: string[] = [],
  max_results: number = 8
): Promise<SearchResult[]> {
  const client = getSearchClient();
  const response = await client.search(query, excluded_domains, max_results);
  return response.results;
}

/**
 * Build multiple search queries for a claim to maximize evidence retrieval
 */
export function build_queries_for_claim(claim: string): string[] {
  const queries: string[] = [];

  // 1. Direct claim search
  queries.push(claim);

  // 2. Extract key entities/numbers for focused search
  const numbers = claim.match(/\d+(?:\.\d+)?%?/g);
  const properNouns = claim.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);

  if (numbers && numbers.length > 0) {
    // Search for specific numbers/stats
    queries.push(`${numbers[0]} ${claim.slice(0, 50)}`);
  }

  if (properNouns && properNouns.length > 0) {
    // Search with proper nouns (names, places, organizations)
    const entityQuery = properNouns.slice(0, 3).join(" ");
    queries.push(entityQuery);
  }

  // 3. Quoted phrase search for exact wording
  const importantPhrases = claim.match(/"[^"]+"/g);
  if (importantPhrases) {
    queries.push(importantPhrases[0]);
  }

  // 4. Add context keywords
  if (claim.includes("said") || claim.includes("announced")) {
    queries.push(claim.replace(/\s+said\s+/i, " announced "));
  }

  // Remove duplicates and limit
  return Array.from(new Set(queries)).slice(0, 3);
}

/**
 * Reputable source domains (allowlist)
 */
const REPUTABLE_DOMAINS = [
  // News agencies
  "reuters.com", "apnews.com", "afp.com",
  
  // Major newspapers
  "nytimes.com", "washingtonpost.com", "wsj.com", "theguardian.com",
  "bbc.com", "bbc.co.uk", "ft.com", "economist.com",
  
  // Government/Official
  "gov", "gov.uk", "europa.eu", "un.org", "who.int",
  "cdc.gov", "nih.gov", "fda.gov", "state.gov",
  
  // Academic/Research
  "edu", "nature.com", "science.org", "plos.org", "arxiv.org",
  
  // Fact-checking
  "snopes.com", "factcheck.org", "politifact.com",
  
  // Reputable news
  "npr.org", "pbs.org", "cnn.com", "bloomberg.com",
  "theatlantic.com", "time.com", "forbes.com",
];

/**
 * Check if a domain is reputable
 */
export function is_reputable_source(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    
    return REPUTABLE_DOMAINS.some(domain => {
      if (domain.startsWith(".")) {
        return hostname.endsWith(domain);
      }
      return hostname === domain || hostname.endsWith(`.${domain}`);
    });
  } catch {
    return false;
  }
}

/**
 * Filter search results to only reputable sources
 */
export function filter_to_reputable(results: SearchResult[]): SearchResult[] {
  return results.filter(result => is_reputable_source(result.url));
}

/**
 * Check if URL is a bad citation (homepage, category page, etc.)
 */
export function is_bad_citation(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();

    // Homepage or very short paths
    if (path === "/" || path.length < 2) return true;

    // Common non-article pages
    if (path.includes("/terms")) return true;
    if (path.includes("/privacy")) return true;
    if (path.includes("/about")) return true;
    if (path.includes("/contact")) return true;

    // AP hub pages
    if (u.hostname.includes("apnews.com") && path.startsWith("/hub/")) return true;

    // Shallow category/tag pages
    const segments = path.split("/").filter(Boolean);
    if (segments.length <= 1) return true;

    return false;
  } catch {
    return true;
  }
}

/**
 * Retrieve and filter evidence for a claim
 */
export async function retrieve_evidence_for_claim(
  claim: string,
  excluded_domains: string[] = []
): Promise<SearchResult[]> {
  const client = getSearchClient();
  const shouldLog = process.env.NODE_ENV !== 'test';
  const apiKeyPresent = !!process.env.BRAVE_SEARCH_API_KEY;
  const backendUsed = client.isAvailable() ? 'brave' : 'stub';

  const getTopDomains = (results: SearchResult[], limit = 3): string[] => {
    const out: string[] = [];
    for (const r of results) {
      if (out.length >= limit) break;
      try {
        const host = new URL(r.url).hostname.replace(/^www\./, "");
        if (host) out.push(host);
      } catch {
        // ignore
      }
    }
    return out;
  };

  // Build multiple queries
  const queries = build_queries_for_claim(claim);
  
  // Search with each query
  const allResults: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    if (shouldLog) {
      console.log("[evidence_retrieval:start]", {
        claim_text: claim,
        query,
        excluded_domains,
        backend_used: backendUsed,
        api_key_present: apiKeyPresent,
      });
    }

    const response = await client.search(query, excluded_domains, 8);

    if (shouldLog) {
      console.log("[evidence_retrieval:results]", {
        query: response.query,
        backend_used: response.backend,
        results_count: response.results.length,
        first_3_result_domains: getTopDomains(response.results, 3),
      });
    }
    
    // Deduplicate by URL
    for (const result of response.results) {
      // Defensive: enforce excluded domain filtering locally.
      if (excluded_domains.length > 0) {
        try {
          const host = new URL(result.url).hostname.replace(/^www\./, '').toLowerCase();
          const shouldExclude = excluded_domains
            .filter(Boolean)
            .map((d) => d.toLowerCase().replace(/^www\./, ''))
            .some((d) => host === d || host.endsWith(`.${d}`));
          if (shouldExclude) continue;
        } catch {
          // ignore parse errors
        }
      }

      if (!seenUrls.has(result.url) && !is_bad_citation(result.url)) {
        seenUrls.add(result.url);
        allResults.push(result);
      }
    }
  }

  // Prefer reputable sources, but don't return an empty set just because
  // the allowlist doesn't include local/regional outlets.
  const reputableResults = filter_to_reputable(allResults);
  const candidateResults = reputableResults.length > 0 ? reputableResults : allResults;

  // Deduplicate by domain (keep best result per domain)
  const domainMap = new Map<string, SearchResult>();
  for (const result of candidateResults) {
    try {
      const domain = new URL(result.url).hostname.replace(/^www\./, "");
      if (!domainMap.has(domain)) {
        domainMap.set(domain, result);
      }
    } catch {}
  }

  return Array.from(domainMap.values()).slice(0, 6);
}
