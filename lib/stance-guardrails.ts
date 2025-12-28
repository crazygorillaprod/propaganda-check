import { ClaimType, EvidenceItem } from './types';

function extractQuotedTerm(claim: string): string | null {
  const m = claim.match(/['"]([^'"]{2,60})['"]/);
  return m ? m[1].trim() : null;
}

function extractKeyEntities(claim: string): string[] {
  // Grab sequences of capitalized words (e.g., "Thomas Massie")
  const matches = claim.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  return Array.from(new Set(matches.map((s) => s.trim()))).slice(0, 3);
}

function hasAuthorshipLanguage(text: string): boolean {
  return /(co-?authored|co-?sponsored|sponsored|introduced|authored|wrote|drafted|filed|led)\b/i.test(text);
}

function hasLawObject(text: string): boolean {
  return /(law|act|bill|legislation|measure)\b/i.test(text);
}

export function applyStanceGuardrails(
  claimText: string,
  claimType: ClaimType,
  evidence: EvidenceItem[]
): EvidenceItem[] {
  const entities = extractKeyEntities(claimText);
  const quoted = extractQuotedTerm(claimText);

  return evidence.map((e) => {
    if (e.stance !== 'support') return e;

    const hay = `${e.title} ${e.snippet}`;

    // Quote guardrail: require the quoted/keyword term to appear for QUOTE-like claims.
    if (claimType === 'QUOTE') {
      const term = quoted || (claimText.match(/\b(lowlife|"[^"]+")\b/i)?.[1] ?? null);
      if (term && !hay.toLowerCase().includes(term.toLowerCase())) {
        return { ...e, stance: 'context', stanceTowardsClaim: 'context', supports_claim: false };
      }
    }

    // Strict support: require entity + relationship + object for authorship/legislation style claims.
    const needsAuthorship = /(co-?author|sponsor|introduc|authored|wrote)\b/i.test(claimText) || hasLawObject(claimText);
    if (needsAuthorship) {
      const hasEntity = entities.length === 0
        ? true
        : entities.some((ent) => hay.toLowerCase().includes(ent.toLowerCase()));
      const ok = hasEntity && hasAuthorshipLanguage(hay) && hasLawObject(hay);
      if (!ok) {
        return { ...e, stance: 'context', stanceTowardsClaim: 'context', supports_claim: false };
      }
    }

    return e;
  });
}
