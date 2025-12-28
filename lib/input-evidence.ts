import { EvidenceItem } from './types';
import { stripHtml } from './sanitize';
import { assessSourceCredibility } from './evidence';

function safeHostname(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function extractSnippetFromText(fullText: string, claimText: string): string {
  const clean = stripHtml(fullText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  const claim = (claimText || '').trim();
  if (claim.length < 12) return clean.slice(0, 240);

  const lower = clean.toLowerCase();
  const needle = claim.toLowerCase();

  const idx = lower.indexOf(needle);
  if (idx >= 0) {
    const start = Math.max(0, idx - 120);
    const end = Math.min(clean.length, idx + needle.length + 120);
    return clean.slice(start, end).trim();
  }

  // Fallback: use the first ~240 chars of the article text.
  return clean.slice(0, 240);
}

export function buildInputEvidenceForClaim(params: {
  inputUrl: string;
  articleTitle?: string;
  articleSnippet?: string;
  fullArticleText?: string;
  claimText: string;
}): EvidenceItem | null {
  const inputUrl = (params.inputUrl || '').trim();
  if (!inputUrl) return null;

  const domain = safeHostname(inputUrl);
  const title = (params.articleTitle || '').trim() || 'Provided source';

  const snippetFromText = params.fullArticleText
    ? extractSnippetFromText(params.fullArticleText, params.claimText)
    : '';
  const snippet = snippetFromText || stripHtml(params.articleSnippet || '').trim();

  const baseline = domain ? assessSourceCredibility(domain) : 0.55;

  return {
    role: 'INPUT',
    url: inputUrl,
    title,
    domain: domain || 'provided-source',
    publisher: domain || 'provided-source',
    snippet: snippet || params.claimText,
    stance: 'context',
    credibility: Math.max(0.05, Math.min(1, baseline)),

    // legacy fields
    supports_claim: false,
    confidence: 0.35,
    relevanceScore: 0.8,
    credibilityScore: baseline,
    stanceTowardsClaim: 'context',
    keyQuote: undefined,
  };
}
