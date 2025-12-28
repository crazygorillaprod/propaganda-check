import { ArticleMeta } from './types';

type BraveWebResult = {
  title?: string;
  url?: string;
  description?: string;
  age?: string;
};

export function classifySourceType(domain: string): ArticleMeta['sourceType'] {
  const d = domain.toLowerCase();
  
  // Government
  if (d.endsWith('.gov') || d.endsWith('.mil')) return 'gov';
  
  // Academic
  if (d.endsWith('.edu') || d.includes('scholar') || d.includes('research')) return 'academic';
  
  // Social media
  if (['twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com', 'youtube.com'].some(s => d.includes(s))) {
    return 'social';
  }
  
  // News (major outlets)
  const newsPatterns = ['news', 'times', 'post', 'journal', 'tribune', 'herald', 'guardian', 'bbc', 'cnn', 'nbc', 'abc', 'cbs', 'reuters', 'ap.org', 'apnews'];
  if (newsPatterns.some(p => d.includes(p))) return 'news';
  
  // Blog indicators
  if (d.includes('blog') || d.includes('medium.com') || d.includes('substack.com')) return 'blog';
  
  return 'unknown';
}

export function parsePublishDate(ageString: string): string | undefined {
  if (!ageString) return undefined;
  
  // Examples: "2 days ago", "3 hours ago", "1 week ago"
  const match = ageString.match(/(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago/i);
  if (!match) return undefined;
  
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  
  const now = new Date();
  
  switch (unit) {
    case 'second':
      now.setSeconds(now.getSeconds() - value);
      break;
    case 'minute':
      now.setMinutes(now.getMinutes() - value);
      break;
    case 'hour':
      now.setHours(now.getHours() - value);
      break;
    case 'day':
      now.setDate(now.getDate() - value);
      break;
    case 'week':
      now.setDate(now.getDate() - (value * 7));
      break;
    case 'month':
      now.setMonth(now.getMonth() - value);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - value);
      break;
  }
  
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

export async function fetchArticleMeta(
  url: string,
  braveResult?: BraveWebResult
): Promise<ArticleMeta> {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, '');
    
    const meta: ArticleMeta = {
      canonical_url: url,
      publisher: domain,
      // Legacy fields for backward compatibility
      url,
      domain,
      sourceType: classifySourceType(domain),
    };
    
    if (braveResult) {
      meta.title = braveResult.title?.trim();
      meta.snippet = braveResult.description?.trim();
      if (braveResult.age) {
        const parsedDate = parsePublishDate(braveResult.age);
        meta.published_at = parsedDate;
        meta.publishDate = parsedDate; // legacy
      }
    }
    
    return meta;
  } catch {
    return { 
      canonical_url: url,
      publisher: 'unknown',
      sourceType: 'unknown',
      url, // legacy
    };
  }
}
