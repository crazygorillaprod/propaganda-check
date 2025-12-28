import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { extract_article_meta } from '../lib/html-parser';

function loadFixture(filename: string): string {
  const path = join(__dirname, '..', '__fixtures__', filename);
  return readFileSync(path, 'utf-8');
}

describe('extract_article_meta', () => {
  describe('Reuters article with full JSON-LD', () => {
    test('should extract all metadata from JSON-LD and meta tags', () => {
      const html = loadFixture('reuters-article.html');
      const meta = extract_article_meta(html, 'https://reuters.com/article/test');

      expect(meta.publisher).toBe('Reuters');
      expect(meta.author).toBe('John Smith');
      expect(meta.published_at).toBe('2025-12-28');
      expect(meta.title).toBe('Major Event Occurs in Capital City');
      expect(meta.canonical_url).toBe('https://reuters.com/article/major-event-123');
      expect(meta.detected_via).toBe('json-ld');
      
      // Legacy fields should also be set
      expect(meta.domain).toBe('Reuters');
      expect(meta.publishDate).toBe('2025-12-28');
      expect(meta.url).toBe('https://reuters.com/article/major-event-123');
    });
  });

  describe('MSN wrapper article', () => {
    test('should detect underlying publisher (AP) from MSN wrapper', () => {
      const html = loadFixture('msn-ap-wrapper.html');
      const meta = extract_article_meta(html, 'https://msn.com/en-us/news/other/test');

      // "Associated Press" gets normalized to "AP"
      expect(meta.publisher).toBe('AP');
      expect(meta.title).toBe('Breaking News Story from AP');
      expect(meta.published_at).toBe('2025-12-27');
      expect(meta.canonical_url).toBe('https://msn.com/en-us/news/other/breaking-news-story/ar-AA1bcdef');
      expect(meta.detected_via).toBe('attribution-regex');
    });

    test('should fallback to MSN if no underlying publisher detected', () => {
      const minimalMsn = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:site_name" content="MSN" />
          <title>Some MSN Article</title>
        </head>
        <body><article>Content</article></body>
        </html>
      `;
      
      const meta = extract_article_meta(minimalMsn, 'https://msn.com/test');
      expect(meta.publisher).toBe('MSN (aggregator)');
      // og:site_name is detected as meta-tags, which is correct
      expect(meta.detected_via).toBe('meta-tags');
    });

    test('should extract original publisher from __NEXT_DATA__ JSON', () => {
      const html = loadFixture('msn-next-data.html');
      const meta = extract_article_meta(html, 'https://www.msn.com/en-us/news/other/test');

      expect(meta.publisher_wrapper).toBe('MSN (aggregator)');
      expect(meta.publisher_original).toBe('Reuters');
      expect(meta.publisher_original_url).toBe('https://www.reuters.com/');
      expect(meta.publisher_original_detected_via).toBe('__NEXT_DATA__');
    });

    test('should extract original publisher from window.__PRELOADED_STATE__ assignment', () => {
      const html = loadFixture('msn-preloaded-state.html');
      const meta = extract_article_meta(html, 'https://www.msn.com/en-us/news/other/test');

      expect(meta.publisher_wrapper).toBe('MSN (aggregator)');
      // Normalized from "Associated Press" => "AP"
      expect(meta.publisher_original).toBe('AP');
      expect(meta.publisher_original_url).toBe('https://apnews.com/');
      expect(meta.publisher_original_detected_via).toBe('window.__PRELOADED_STATE__');
    });

    test('should extract original publisher from outbound source link', () => {
      const html = loadFixture('msn-outbound-link.html');
      const meta = extract_article_meta(html, 'https://www.msn.com/en-us/news/other/test');

      expect(meta.publisher_wrapper).toBe('MSN (aggregator)');
      expect(meta.publisher_original).toBe('BBC');
      expect(meta.publisher_original_url).toBe('https://www.bbc.com/news/world-123');
      expect(meta.publisher_original_detected_via).toBe('outbound-link');
    });

    test('should not set original publisher when no reliable signals exist', () => {
      const html = loadFixture('msn-no-signal.html');
      const meta = extract_article_meta(html, 'https://www.msn.com/en-us/news/other/test');

      expect(meta.publisher).toBe('MSN (aggregator)');
      expect(meta.publisher_wrapper).toBe('MSN (aggregator)');
      expect(meta.publisher_original).toBeUndefined();
      expect(meta.publisher_original_url).toBeUndefined();
      expect(meta.publisher_original_detected_via).toBeUndefined();
    });

    test('should derive a headline from MSN URL slug when title is generic', () => {
      const html = `<!doctype html><html><head><title>MSN</title></head><body></body></html>`;
      const meta = extract_article_meta(
        html,
        'https://www.msn.com/en-us/news/crime/dui-suspect-charged-with-murder/ar-AA1T8qtg'
      );

      expect(meta.title).toBe('DUI Suspect Charged With Murder');
    });
  });

  describe('Attribution regex patterns', () => {
    test('should extract publisher from (REUTERS) — pattern', () => {
      const html = loadFixture('attribution-reuters.html');
      const meta = extract_article_meta(html, 'https://example-news.com/test');

      // The fixture has both canonical link and attribution
      // Canonical link has higher priority for non-MSN sites
      expect(meta.publisher).toBe('Example-news.com');
      expect(meta.detected_via).toBe('canonical-link');
      expect(meta.title).toBe('Local Weather Update');
    });

    test('should extract from "(REUTERS) —" pattern when no other metadata', () => {
      const html = `
        <!DOCTYPE html>
        <html><body>
          <article>
            <h1>Title</h1>
            <p>(REUTERS) — Breaking news content here</p>
          </article>
        </body></html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Reuters');
      expect(meta.detected_via).toBe('attribution-regex');
    });

    test('should extract from "By [Publisher]" pattern', () => {
      const html = `
        <!DOCTYPE html>
        <html><body>
          <article>
            <h1>Title</h1>
            <p>By Associated Press</p>
            <p>Content here...</p>
          </article>
        </body></html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      // "Associated Press" gets normalized to "AP"
      expect(meta.publisher).toBe('AP');
    });

    test('should extract from "Source: [Publisher]" pattern', () => {
      const html = `
        <!DOCTYPE html>
        <html><body>
          <article>
            <h1>Title</h1>
            <p>Source: Reuters</p>
            <p>Content here...</p>
          </article>
        </body></html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Reuters');
    });

    test('should handle uppercase news agencies correctly', () => {
      const patterns = [
        { input: 'By AP', expected: 'AP' },
        { input: 'Source: AFP', expected: 'AFP' },
        { input: '(CNN) —', expected: 'CNN' },
        { input: 'By BBC', expected: 'BBC' },
      ];

      patterns.forEach(({ input, expected }) => {
        const html = `<!DOCTYPE html><html><body><p>${input}</p></body></html>`;
        const meta = extract_article_meta(html, 'https://example.com/test');
        expect(meta.publisher).toBe(expected);
      });
    });
  });

  describe('Multiple authors', () => {
    test('should combine multiple authors with comma', () => {
      const html = loadFixture('multi-author.html');
      const meta = extract_article_meta(html, 'https://theguardian.com/test');

      expect(meta.author).toBe('Alice Johnson, Bob Williams');
      expect(meta.publisher).toBe('The Guardian');
    });
  });

  describe('Minimal metadata', () => {
    test('should extract attribution as publisher when no structured data', () => {
      const html = loadFixture('minimal-metadata.html');
      const meta = extract_article_meta(html, 'https://example-blog.com/post');

      // Should extract "By Tech Blogger" from the content
      expect(meta.publisher).toBe('Tech Blogger');
      expect(meta.domain).toBe('Tech Blogger');
      expect(meta.canonical_url).toBe('https://example-blog.com/post');
    });

    test('should fallback to domain when no attribution found', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Blog Post</title></head>
        <body><p>Just some content without any attribution.</p></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example-blog.com/test');
      expect(meta.publisher).toBe('example-blog.com');
      expect(meta.domain).toBe('example-blog.com');
    });

    test('should handle attribution in byline', () => {
      const html = `
        <!DOCTYPE html>
        <html><body>
          <article>
            <h1>Title</h1>
            <p class="byline">By Tech Blogger</p>
            <p>Content...</p>
          </article>
        </body></html>
      `;
      
      const meta = extract_article_meta(html, 'https://blog.example.com/test');
      // Should extract "Tech Blogger" as publisher from attribution
      expect(meta.publisher).toBe('Tech Blogger');
    });
  });

  describe('Meta tag extraction', () => {
    test('should extract og:site_name', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:site_name" content="Example News" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Example News');
    });

    test('should extract og:title', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:title" content="Test Article Title" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.title).toBe('Test Article Title');
    });

    test('should extract article:published_time', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="article:published_time" content="2025-12-28T14:30:00Z" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.published_at).toBe('2025-12-28');
    });

    test('should handle reversed meta tag attribute order', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta content="Test Publisher" property="og:site_name" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Test Publisher');
    });
  });

  describe('Canonical URL extraction', () => {
    test('should extract canonical link', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="canonical" href="https://example.com/canonical-url" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.canonical_url).toBe('https://example.com/canonical-url');
    });

    test('should handle reversed link attribute order', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <link href="https://example.com/canonical-url" rel="canonical" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.canonical_url).toBe('https://example.com/canonical-url');
    });
  });

  describe('Date normalization', () => {
    test('should normalize various date formats to YYYY-MM-DD', () => {
      const dates = [
        { input: '2025-12-28T10:30:00Z', expected: '2025-12-28' },
        { input: '2025-12-28T10:30:00+05:00', expected: '2025-12-28' },
        { input: '2025-12-28', expected: '2025-12-28' },
      ];

      dates.forEach(({ input, expected }) => {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta property="article:published_time" content="${input}" />
          </head>
          <body></body>
          </html>
        `;
        
        const meta = extract_article_meta(html, 'https://example.com/test');
        expect(meta.published_at).toBe(expected);
      });
    });
  });

  describe('JSON-LD edge cases', () => {
    test('should handle JSON-LD array with multiple items', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          [
            {
              "@type": "WebSite",
              "name": "Example Site"
            },
            {
              "@type": "NewsArticle",
              "headline": "Test Article",
              "publisher": {"name": "Test Publisher"}
            }
          ]
          </script>
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.title).toBe('Test Article');
      expect(meta.publisher).toBe('Test Publisher');
    });

    test('should skip invalid JSON-LD gracefully', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          { invalid json here }
          </script>
          <meta property="og:site_name" content="Fallback Publisher" />
        </head>
        <body></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Fallback Publisher');
    });
  });

  describe('Priority order and detected_via tracking', () => {
    test('JSON-LD should have highest priority (detected_via: json-ld)', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:site_name" content="Meta Tag Publisher" />
          <script type="application/ld+json">
          {
            "@type": "NewsArticle",
            "headline": "Test",
            "publisher": {"name": "JSON-LD Publisher"}
          }
          </script>
        </head>
        <body>
          <p>By Attribution Publisher</p>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('JSON-LD Publisher');
      expect(meta.detected_via).toBe('json-ld');
    });

    test('Meta tags should be priority 2 (detected_via: meta-tags)', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:site_name" content="Meta Publisher" />
          <link rel="canonical" href="https://canonical-site.com/article" />
        </head>
        <body>
          <p>By Attribution Publisher</p>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Meta Publisher');
      expect(meta.detected_via).toBe('meta-tags');
    });

    test('Canonical link domain should be priority 3 (detected_via: canonical-link)', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="canonical" href="https://reuters.com/article/123" />
        </head>
        <body>
          <p>By Attribution Publisher</p>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Reuters.com');
      expect(meta.detected_via).toBe('canonical-link');
      expect(meta.canonical_url).toBe('https://reuters.com/article/123');
    });

    test('Attribution regex should be priority 4 (detected_via: attribution-regex)', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test</title>
        </head>
        <body>
          <p>By Reuters</p>
          <p>Content here</p>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example.com/test');
      expect(meta.publisher).toBe('Reuters');
      expect(meta.detected_via).toBe('attribution-regex');
    });

    test('Domain fallback should be last resort (detected_via: domain-fallback)', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body><p>Content without any metadata</p></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://example-blog.com/test');
      expect(meta.publisher).toBe('example-blog.com');
      expect(meta.detected_via).toBe('domain-fallback');
    });
  });

  describe('MSN aggregator robustness', () => {
    test('should prioritize attribution over MSN domain', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:site_name" content="MSN" />
          <title>Test Article</title>
        </head>
        <body>
          <article>
            <p>(REUTERS) — Breaking news content</p>
          </article>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://msn.com/en-us/news/test');
      expect(meta.publisher).toBe('Reuters');
      expect(meta.detected_via).toBe('attribution-regex');
    });

    test('should detect "By Associated Press" in MSN wrapper', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta property="og:site_name" content="MSN" />
        </head>
        <body>
          <article>
            <p class="byline">By Associated Press</p>
            <p>Story content...</p>
          </article>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://msn.com/test');
      expect(meta.publisher).toBe('AP');
      expect(meta.detected_via).toBe('attribution-regex');
    });

    test('should detect "Source: AFP" pattern', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <body>
          <article>
            <p>Source: Agence France-Presse</p>
            <p>Story content...</p>
          </article>
        </body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://msn.com/test');
      expect(meta.publisher).toBe('AFP');
      expect(meta.detected_via).toBe('attribution-regex');
    });

    test('should never set publisher as msn.com from canonical link', () => {
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <link rel="canonical" href="https://www.msn.com/en-us/news/article" />
        </head>
        <body><p>Content</p></body>
        </html>
      `;
      
      const meta = extract_article_meta(html, 'https://msn.com/test');
      // Should fallback to MSN (not msn.com)
      expect(meta.publisher).toBe('MSN (aggregator)');
      expect(meta.detected_via).toBe('domain-fallback');
    });
  });
});
