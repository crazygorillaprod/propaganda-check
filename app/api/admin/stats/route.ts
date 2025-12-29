import { NextResponse } from 'next/server';
import { getGlobalUsageStats } from '@/lib/metering';
import { getCacheStats } from '@/lib/cache';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    usage: getGlobalUsageStats(),
    cache: getCacheStats(),
  });
}
