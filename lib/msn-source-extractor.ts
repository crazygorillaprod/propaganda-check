import { sanitizeUrl, stripHtml } from './sanitize';

export type MsnOriginalPublisherResult = {
  name?: string;
  url?: string;
  confidence: number;
  detected_via: string;
};

function isMsnOrMicrosoft(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v.includes('msn') ||
    v.includes('microsoft') ||
    v.includes('bing.com') ||
    v.includes('assets.msn')
  );
}

function formatFromDomain(domain: string): string {
  const d = domain.replace(/^www\./, '').toLowerCase();
  const parts = d.split('.').filter(Boolean);
  if (parts.length === 0) return domain;
  const base = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractScriptById(html: string, id: string): string | null {
  const re = new RegExp(`<script[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i');
  const m = re.exec(html);
  return m ? m[1].trim() : null;
}

function extractAssignmentJson(html: string, varName: string): string | null {
  // Looks for: window.__PRELOADED_STATE__ = { ... };
  const idx = html.indexOf(varName);
  if (idx < 0) return null;

  const after = html.slice(idx);
  const eq = after.indexOf('=');
  if (eq < 0) return null;

  const fromEq = after.slice(eq + 1);
  const start = fromEq.indexOf('{');
  if (start < 0) return null;

  // Balance braces to extract a JSON-looking object literal.
  let i = start;
  let depth = 0;
  let inString: string | null = null;
  let escaped = false;

  for (; i < fromEq.length; i++) {
    const ch = fromEq[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      // We only safely parse JSON (double quotes). If we see single quotes,
      // we still extract but JSON.parse may fail.
      inString = ch;
      continue;
    }

    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return fromEq.slice(start, i + 1).trim();
      }
    }
  }

  return null;
}

function collectPublisherCandidates(obj: unknown): Array<{ name?: string; url?: string; path: string; score: number }> {
  const out: Array<{ name?: string; url?: string; path: string; score: number }> = [];
  const seen = new Set<object>();

  const interestingKeys = new Set([
    'publisher',
    'provider',
    'source',
    'brand',
    'brandname',
    'providername',
    'sourcename',
    'sitename',
    'outlet',
    'publication',
  ]);

  function visit(node: unknown, path: string) {
    if (node == null) return;
    if (typeof node !== 'object') return;
    if (seen.has(node as object)) return;
    seen.add(node as object);

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        visit(node[i], `${path}[${i}]`);
      }
      return;
    }

    for (const [rawKey, value] of Object.entries(node as Record<string, unknown>)) {
      const key = String(rawKey);
      const k = key.toLowerCase();
      const nextPath = path ? `${path}.${key}` : key;

      // Objects like { provider: { name, url } }
      if (isRecord(value) && interestingKeys.has(k)) {
        const name = typeof value.name === 'string' ? value.name.trim() : undefined;
        const url = typeof value.url === 'string' ? sanitizeUrl(value.url) : undefined;
        if (name && !isMsnOrMicrosoft(name)) {
          out.push({ name, url, path: nextPath, score: url ? 0.85 : 0.75 });
        }
      }

      // Simple string values on interesting keys
      if (typeof value === 'string' && interestingKeys.has(k)) {
        const v = value.trim();
        if (v && !isMsnOrMicrosoft(v)) {
          const maybeUrl = v.startsWith('http') ? sanitizeUrl(v) : undefined;
          out.push({
            name: maybeUrl ? formatFromDomain(new URL(maybeUrl).hostname) : v,
            url: maybeUrl,
            path: nextPath,
            score: maybeUrl ? 0.75 : 0.65,
          });
        }
      }

      // Heuristic: sibling name/url pairs
      if (typeof value === 'string' && (k === 'name' || k === 'url')) {
        // try to read parentish context when path ends with provider/source/publisher
        if (/\.(provider|source|publisher|brand)\.(name|url)$/i.test(nextPath)) {
          const parentPath = nextPath.replace(/\.(name|url)$/i, '');
          const parent = node as Record<string, unknown>;
          const name = typeof parent.name === 'string' ? parent.name.trim() : undefined;
          const url = typeof parent.url === 'string' ? sanitizeUrl(parent.url) : undefined;
          if (name && !isMsnOrMicrosoft(name)) {
            out.push({ name, url, path: parentPath, score: url ? 0.85 : 0.7 });
          }
        }
      }

      visit(value, nextPath);
    }
  }

  visit(obj, '');
  return out;
}

function scanOutboundSourceLinks(html: string): Array<{ name: string; url: string; score: number; reason: string }> {
  const out: Array<{ name: string; url: string; score: number; reason: string }> = [];
  const re = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = sanitizeUrl(m[1]);
    const text = stripHtml(m[2] || '').toLowerCase();
    const window = html.slice(Math.max(0, m.index - 120), Math.min(html.length, m.index + 200)).toLowerCase();

    if (!href) continue;
    let host = '';
    try {
      host = new URL(href).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (!host || host.includes('msn.com') || host.includes('microsoft.com') || host.includes('bing.com')) continue;

    const isSourcey = /(read full|full story|original|source|visit|read more)/.test(text) || /(read full|full story|original|source)/.test(window);
    if (!isSourcey) continue;

    out.push({
      name: formatFromDomain(host),
      url: href,
      score: 0.65,
      reason: 'outbound-link',
    });
  }

  return out;
}

export function extractMsnOriginalPublisher(html: string): MsnOriginalPublisherResult {
  // 1) __NEXT_DATA__
  const nextData = extractScriptById(html, '__NEXT_DATA__');
  if (nextData) {
    const parsed = tryParseJson(nextData);
    if (parsed) {
      const candidates = collectPublisherCandidates(parsed);
      const best = candidates.sort((a, b) => b.score - a.score)[0];
      if (best?.name && !isMsnOrMicrosoft(best.name)) {
        return {
          name: best.name,
          url: best.url,
          confidence: Math.max(0.6, Math.min(1, best.score)),
          detected_via: '__NEXT_DATA__',
        };
      }
    }
  }

  // 2) window assignments
  for (const varName of ['window.__PRELOADED_STATE__', 'window.__INITIAL_STATE__', '__PRELOADED_STATE__', '__INITIAL_STATE__']) {
    const jsonText = extractAssignmentJson(html, varName);
    if (!jsonText) continue;
    const parsed = tryParseJson(jsonText);
    if (!parsed) continue;

    const candidates = collectPublisherCandidates(parsed);
    const best = candidates.sort((a, b) => b.score - a.score)[0];
    if (best?.name && !isMsnOrMicrosoft(best.name)) {
      return {
        name: best.name,
        url: best.url,
        confidence: Math.max(0.6, Math.min(1, best.score - 0.1)),
        detected_via: varName,
      };
    }
  }

  // 4) outbound source links
  const outbound = scanOutboundSourceLinks(html);
  if (outbound.length > 0) {
    const best = outbound.sort((a, b) => b.score - a.score)[0];
    return {
      name: best.name,
      url: best.url,
      confidence: best.score,
      detected_via: best.reason,
    };
  }

  return { confidence: 0, detected_via: 'none' };
}
