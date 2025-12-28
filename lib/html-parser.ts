import { ArticleMeta } from './types';
import { sanitizeUrl } from './sanitize';
import { extractMsnOriginalPublisher } from './msn-source-extractor';

type JsonLdNewsArticle = {
  '@type'?: string | string[];
  headline?: string;
  author?: { name?: string } | { name?: string }[] | string | string[];
  datePublished?: string;
  publisher?: { name?: string };
  url?: string;
};

/**
 * Extract article metadata from HTML content
 * Handles MSN wrappers and various news sites
 * Priority order: 1) JSON-LD, 2) meta tags, 3) canonical link, 4) regex attribution
 */
export function extract_article_meta(html: string, url: string): ArticleMeta {
  const sanitizedInputUrl = sanitizeUrl(url);
  const meta: Partial<ArticleMeta> = {
    canonical_url: sanitizedInputUrl,
    url: sanitizedInputUrl, // legacy
  };

  let publisherDetectedVia: ArticleMeta['detected_via'] | undefined;
  const isMsn = isMsnUrl(url);

  // 1. PRIORITY 1: Try JSON-LD (NewsArticle schema)
  const jsonLdMeta = extractJsonLd(html);
  if (jsonLdMeta.publisher) {
    meta.publisher = jsonLdMeta.publisher;
    publisherDetectedVia = 'json-ld';
  }
  if (jsonLdMeta.author) meta.author = jsonLdMeta.author;
  if (jsonLdMeta.published_at) {
    meta.published_at = jsonLdMeta.published_at;
    meta.publishDate = jsonLdMeta.published_at; // legacy
  }
  if (jsonLdMeta.title) meta.title = jsonLdMeta.title;
  if (jsonLdMeta.canonical_url) {
    meta.canonical_url = jsonLdMeta.canonical_url;
    meta.url = jsonLdMeta.canonical_url; // legacy
  }

  // 2. PRIORITY 2: Extract meta tags (if publisher not found yet)
  const metaTags = extractMetaTags(html);
  
  // og:title for title (if not already found)
  if (!meta.title && metaTags['og:title']) {
    meta.title = metaTags['og:title'];
  }

  // Low-priority fallback: <title> tag (some sites, including MSN shells, omit og:title)
  if (!meta.title) {
    const titleTag = extractTitleTag(html);
    if (titleTag) meta.title = titleTag;
  }

  // MSN fallback: if the title is still generic, derive from URL slug
  if (isMsn && (!meta.title || meta.title.trim().toLowerCase() === 'msn')) {
    const derived = deriveTitleFromMsnUrl(url);
    if (derived) meta.title = derived;
  }
  
  // article:published_time for publish date
  if (!meta.published_at && metaTags['article:published_time']) {
    meta.published_at = normalizeDate(metaTags['article:published_time']);
    meta.publishDate = meta.published_at; // legacy
  }
  
  // og:site_name for publisher (lower priority, only if not found in JSON-LD)
  if (!meta.publisher && metaTags['og:site_name']) {
    meta.publisher = metaTags['og:site_name'];
    publisherDetectedVia = 'meta-tags';
  }
  
  // article:author or author meta tag
  if (!meta.author) {
    if (metaTags['article:author']) {
      meta.author = metaTags['article:author'];
    } else if (metaTags['author']) {
      meta.author = metaTags['author'];
    }
  }

  // og:url is a common canonical equivalent
  if (metaTags['og:url'] && !jsonLdMeta.canonical_url) {
    const ogUrl = sanitizeUrl(metaTags['og:url']);
    if (ogUrl) {
      meta.canonical_url = ogUrl;
      meta.url = ogUrl; // legacy
    }
  }

  // 3. PRIORITY 3: Extract canonical URL
  const canonical = extractCanonical(html);
  if (canonical && !jsonLdMeta.canonical_url) {
    const cleanCanonical = sanitizeUrl(canonical);
    meta.canonical_url = cleanCanonical;
    meta.url = cleanCanonical; // legacy
    
    // If publisher still not found, try to extract from canonical domain
    if (!meta.publisher) {
      try {
        const canonicalDomain = new URL(cleanCanonical).hostname.replace(/^www\./, '');
        // Don't use msn.com as publisher
        if (!canonicalDomain.includes('msn.com')) {
          meta.publisher = formatPublisherName(canonicalDomain);
          publisherDetectedVia = 'canonical-link';
        }
      } catch {}
    }
  }

  // 4. PRIORITY 4: Regex attribution detection (special handling for MSN and when no publisher found)
  // For MSN: ALWAYS try to detect underlying publisher (even if meta tags found "MSN")
  // For non-MSN: only if no publisher found yet
  const shouldTryAttribution = isMsn ? true : !meta.publisher;
  
  if (shouldTryAttribution) {
    // For MSN, try harder to detect underlying wire/publisher
    const attributionPublisher = isMsn 
      ? detectMsnPublisher(html)
      : extractAttributionPublisher(html);
    
    if (attributionPublisher) {
      if (isMsn) {
        meta.publisher_wrapper = 'MSN (aggregator)';
        meta.publisher_original = attributionPublisher;
        meta.publisher_original_detected_via = 'attribution-regex';
      }
      // For MSN: always use attribution if found (even over meta-tags/canonical)
      // For non-MSN: only use if we don't have publisher yet
      if (isMsn || !meta.publisher) {
        meta.publisher = attributionPublisher;
        publisherDetectedVia = 'attribution-regex';
      }
    } else if (isMsn && !meta.publisher) {
      // For MSN: if no underlying wire/publisher detected, mark as aggregator
      meta.publisher = 'MSN (aggregator)';
      meta.publisher_wrapper = 'MSN (aggregator)';
      // If meta-tags had set publisher to "MSN" earlier, treat that as the source
      publisherDetectedVia = publisherDetectedVia ?? (metaTags['og:site_name'] ? 'meta-tags' : 'domain-fallback');
    }
  }

  // If this is an MSN URL and publisher is the generic "MSN", upgrade to the explicit aggregator label
  if (isMsn && meta.publisher && meta.publisher.trim().toLowerCase() === 'msn') {
    meta.publisher = 'MSN (aggregator)';
    meta.publisher_wrapper = 'MSN (aggregator)';
    publisherDetectedVia = publisherDetectedVia ?? 'meta-tags';
  }

  // MSN: attempt to extract original publisher via embedded JSON / outbound links
  if (isMsn) {
    meta.publisher_wrapper = meta.publisher_wrapper ?? 'MSN (aggregator)';

    const embedded = extractMsnOriginalPublisher(html);
    if (embedded.confidence >= 0.6 && embedded.name) {
      const normalizedName = formatPublisherName(embedded.name);

      // Only set/upgrade original publisher fields if missing or consistent.
      if (!meta.publisher_original || meta.publisher_original === normalizedName) {
        meta.publisher_original = normalizedName;
        meta.publisher_original_url = embedded.url;
        meta.publisher_original_detected_via = embedded.detected_via;
      }
    }
  }

  // 5. FINAL FALLBACK: Use domain from URL if still no publisher
  if (!meta.publisher) {
    try {
      const urlObj = new URL(url);
      meta.publisher = urlObj.hostname.replace(/^www\./, '');
      meta.domain = meta.publisher; // legacy
      publisherDetectedVia = 'domain-fallback';
    } catch {}
  }

  // Ensure legacy domain field is set
  if (!meta.domain && meta.publisher) {
    meta.domain = meta.publisher;
  }

  // Set detected_via
  if (publisherDetectedVia) {
    meta.detected_via = publisherDetectedVia;
  }

  return meta as ArticleMeta;
}

/**
 * Extract JSON-LD structured data (NewsArticle schema)
 */
function extractJsonLd(html: string): Partial<ArticleMeta> {
  const meta: Partial<ArticleMeta> = {};

  // Find all JSON-LD script tags
  const jsonLdPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    try {
      const jsonText = match[1].trim();
      const data = JSON.parse(jsonText);

      // Handle both single objects and arrays
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        // Look for NewsArticle or Article type
        const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
        if (types.includes('NewsArticle') || types.includes('Article')) {
          const article = item as JsonLdNewsArticle;

          if (article.headline && !meta.title) {
            meta.title = article.headline;
          }

          if (article.datePublished && !meta.published_at) {
            meta.published_at = normalizeDate(article.datePublished);
          }

          if (article.publisher?.name && !meta.publisher) {
            meta.publisher = article.publisher.name;
          }

          if (article.author && !meta.author) {
            if (typeof article.author === 'string') {
              meta.author = article.author;
            } else if (Array.isArray(article.author)) {
              const names = article.author
                .map(a => typeof a === 'string' ? a : a.name)
                .filter(Boolean);
              meta.author = names.join(', ');
            } else if (article.author.name) {
              meta.author = article.author.name;
            }
          }

          if (article.url && !meta.canonical_url) {
            meta.canonical_url = article.url;
          }
        }
      }
    } catch (e) {
      // Skip invalid JSON
      continue;
    }
  }

  return meta;
}

/**
 * Extract meta tags from HTML
 */
function extractMetaTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};

  // Match meta tags with property or name attributes
  const metaPattern = /<meta\s+(?:[^>]*?\s+)?(property|name)=["']([^"']+)["'][^>]*?\s+content=["']([^"']+)["'][^>]*?>/gi;
  let match;

  while ((match = metaPattern.exec(html)) !== null) {
    const key = match[2];
    const value = match[3];
    tags[key] = value;
  }

  // Also try reversed order (content before property/name)
  const metaPatternReversed = /<meta\s+(?:[^>]*?\s+)?content=["']([^"']+)["'][^>]*?\s+(property|name)=["']([^"']+)["'][^>]*?>/gi;
  while ((match = metaPatternReversed.exec(html)) !== null) {
    const key = match[3];
    const value = match[1];
    if (!tags[key]) {
      tags[key] = value;
    }
  }

  return tags;
}

/**
 * Extract the document <title> content as a low-priority headline fallback.
 */
function extractTitleTag(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (!match?.[1]) return null;

  const text = match[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text || null;
}

/**
 * Extract canonical URL from link tag
 */
function extractCanonical(html: string): string | null {
  const canonicalPattern = /<link\s+(?:[^>]*?\s+)?rel=["']canonical["'][^>]*?\s+href=["']([^"']+)["'][^>]*?>/i;
  const match = canonicalPattern.exec(html);
  
  if (match) {
    return match[1];
  }

  // Try reversed order
  const canonicalPatternReversed = /<link\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*?\s+rel=["']canonical["'][^>]*?>/i;
  const matchReversed = canonicalPatternReversed.exec(html);
  
  return matchReversed ? matchReversed[1] : null;
}

/**
 * Check if URL is an MSN domain
 */
function isMsnUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.includes('msn.com');
  } catch {
    return false;
  }
}

function deriveTitleFromMsnUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    const arIdx = segments.findIndex((s) => s.toLowerCase().startsWith('ar-'));
    if (arIdx <= 0) return null;

    const slug = segments[arIdx - 1];
    if (!slug || slug.length < 5) return null;

    const words = decodeURIComponent(slug)
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!words) return null;

    // Basic title casing; keep a few common acronyms.
    const tokens = words.split(' ').map((w) => {
      const lw = w.toLowerCase();
      if (['dui', 'fbi', 'cia', 'nasa', 'us', 'uk', 'eu'].includes(lw)) return lw.toUpperCase();
      if (/^\d+$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    });

    return tokens.join(' ');
  } catch {
    return null;
  }
}

/**
 * Detect underlying publisher in MSN wrapper articles
 * MSN often wraps content from wire services (Reuters, AP, etc.)
 * Try harder to find the real publisher
 */
function detectMsnPublisher(html: string): string | null {
  // FIRST: Try attribution regex patterns (most reliable for MSN)
  const attributionPublisher = extractAttributionPublisher(html);
  if (attributionPublisher && attributionPublisher !== 'MSN') {
    return attributionPublisher;
  }

  // Check for data-author-id or similar attributes
  const authorIdPattern = /data-author-id=["']([^"']+)["']/i;
  const authorMatch = authorIdPattern.exec(html);
  if (authorMatch) {
    const authorId = authorMatch[1];
    // Common patterns: "reuters", "ap", etc.
    if (authorId && authorId.length > 0 && authorId.length < 50) {
      const formatted = formatPublisherName(authorId);
      if (formatted !== 'MSN') {
        return formatted;
      }
    }
  }

  // Check for publisher name in structured data or meta tags
  const publisherPatterns = [
    /["']publisher["']\s*:\s*["']([^"']+)["']/i,
    /["']provider["']\s*:\s*["']([^"']+)["']/i,
    /"providerName"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of publisherPatterns) {
    const match = pattern.exec(html);
    if (match && match[1] && match[1] !== 'MSN') {
      return formatPublisherName(match[1]);
    }
  }

  return null;
}

/**
 * Extract publisher from attribution lines (By Reuters, Source: AP, etc.)
 * Focuses on the top portion of the HTML (first 5000 chars)
 */
function extractAttributionPublisher(html: string): string | null {
  // Focus on first 5000 characters (likely to contain byline)
  const topHtml = html.slice(0, 5000);
  
  // Strip HTML tags to get plain text for pattern matching
  const plainText = topHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // Direct wire markers near the top (MSN and aggregators often include these)
  // Examples: "(Reuters)", "(AP)", "Associated Press"
  const topWindow = plainText.slice(0, 900);
  const parenWire = /\((Reuters|REUTERS|Associated Press|AP|AFP|BBC|CNN|NPR)\)\b/i.exec(topWindow);
  if (parenWire?.[1]) {
    return formatPublisherName(parenWire[1]);
  }
  const standaloneWire = /\b(Associated Press|Reuters)\b/i.exec(topWindow);
  if (standaloneWire?.[1]) {
    return formatPublisherName(standaloneWire[1]);
  }

  // Common patterns with simple matching
  const patterns = [
    { prefix: /By\s+/i, capture: true },
    { prefix: /Source:\s*/i, capture: true },
    { prefix: /\(([A-Z]{2,}(?:\s+[A-Z]{2,})?)\)\s*(?:[-–—])?/, capture: false }, // (REUTERS) — or (REUTERS)
    { prefix: /—\s+/, capture: true },
  ];

  for (const { prefix, capture } of patterns) {
    const match = prefix.exec(plainText);
    if (!match) continue;

    if (!capture) {
      // Special case: already captured in the pattern (like (REUTERS))
      const publisher = match[1]?.trim();
      if (publisher) {
        return formatPublisherName(publisher);
      }
      continue;
    }

    // Extract publisher after the prefix
    const afterPrefix = plainText.slice(match.index + match[0].length);
    
    // Match 1-5 capitalized words (to catch "Agence France-Presse" and similar)
    const publisherMatch = afterPrefix.match(/^((?:[A-Z][a-z]+(?:-[A-Z][a-z]+)?|[A-Z]{2,})(?:\s+(?:[A-Z][a-z]+(?:-[A-Z][a-z]+)?|[A-Z]{2,})){0,4})/);
    if (publisherMatch) {
      let publisher = publisherMatch[1].trim();
      
      // Remove trailing content words
      const contentWords = ['Content', 'Story', 'Article', 'Text', 'Body', 'Paragraph', 'Staff'];
      for (const word of contentWords) {
        publisher = publisher.replace(new RegExp(`\\s+${word}$`, 'i'), '');
      }
      
      // Filter out common false positives
      const falsePositives = ['the', 'our', 'staff', 'editor', 'team', 'title'];
      const lowerPublisher = publisher.toLowerCase();
      
      if (!falsePositives.some(fp => lowerPublisher === fp || lowerPublisher.includes(' ' + fp) || lowerPublisher.includes(fp + ' ')) && 
          publisher.length > 1 && 
          publisher.length < 50) {
        return formatPublisherName(publisher);
      }
    }
  }

  return null;
}

/**
 * Format publisher name (capitalize properly)
 */
function formatPublisherName(name: string): string {
  // Special mappings for common agencies
  const mappings: Record<string, string> = {
    'associated press': 'AP',
    'agence france-presse': 'AFP',
    'agence france presse': 'AFP',
  };
  
  const lowerName = name.toLowerCase();
  if (mappings[lowerName]) {
    return mappings[lowerName];
  }
  
  // Common news agencies that should be uppercase
  const uppercase = ['AP', 'AFP', 'UPI', 'BBC', 'CNN', 'NBC', 'ABC', 'CBS', 'NPR'];
  const upperName = name.toUpperCase();
  
  if (uppercase.includes(upperName)) {
    return upperName;
  }

  // Capitalize first letter of each word for others
  return name
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalize date to ISO format (YYYY-MM-DD)
 */
function normalizeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch {}
  return dateStr;
}
