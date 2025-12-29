import type { UsageTier } from './types';

export type UserRecord = {
  email: string;
  verified: boolean;
  tier: UsageTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  updatedAt: string;
  createdAt: string;
};

// In-memory store (replace with DB in production)
const usersByEmail = new Map<string, UserRecord>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getUserByEmail(email: string): UserRecord | null {
  const normalized = normalizeEmail(email);
  return usersByEmail.get(normalized) ?? null;
}

export function upsertUserByEmail(email: string, patch: Partial<UserRecord>): UserRecord {
  const normalized = normalizeEmail(email);
  const now = new Date().toISOString();
  const existing = usersByEmail.get(normalized);

  const next: UserRecord = {
    email: normalized,
    verified: patch.verified ?? existing?.verified ?? false,
    tier: patch.tier ?? existing?.tier ?? 'free',
    stripeCustomerId: patch.stripeCustomerId ?? existing?.stripeCustomerId,
    stripeSubscriptionId: patch.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  usersByEmail.set(normalized, next);
  return next;
}

export function setUserTier(email: string, tier: UsageTier): UserRecord {
  return upsertUserByEmail(email, { tier, verified: true });
}

export function getEffectiveTier(email: string | null | undefined): UsageTier {
  if (!email) return 'free';
  const record = getUserByEmail(email);
  if (!record) return 'free';
  if (!record.verified) return 'free';
  return record.tier;
}
