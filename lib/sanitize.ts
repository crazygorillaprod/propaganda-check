export function stripHtml(input: string): string {
  if (!input) return '';
  // Remove tags and decode a few common entities.
  const withoutTags = input.replace(/<[^>]*>/g, ' ');
  return withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeUrl(input: string): string {
  const raw = (input ?? '').trim();
  if (!raw) return raw;

  // Trim common accidental trailing punctuation/JSON characters.
  // e.g. https://example.com"} -> https://example.com
  const trimmed = raw
    .replace(/^[\s"'`]+/, '')
    .replace(/[\s"'`]+$/, '')
    .replace(/[)}\]>]+$/, '')
    .replace(/[\s]+$/, '');

  // If it parses as a URL, return a normalized href (but strip any trailing
  // encoded junk like %22 or %7D that came from accidental quotes/braces).
  try {
    const u = new URL(trimmed);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      let href = u.toString();
      // Repeatedly strip trailing encoded quote/brace/bracket fragments.
      // e.g. ...&ei=15%22%7D -> ...&ei=15
      href = href.replace(/(%22|%27|%60|%7D|%7B|%5D|%5B|%29|%28)+$/i, '');
      href = href.replace(/["'`{}\]>)]+$/g, '');
      return href;
    }
  } catch {
    // not a URL
  }

  return trimmed;
}
