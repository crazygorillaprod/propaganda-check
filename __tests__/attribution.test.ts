import { describe, expect, test } from '@jest/globals';
import { detect_attribution, calculate_attribution_boost } from '../lib/attribution';

describe('detect_attribution', () => {
  describe('Direct quotes', () => {
    test('should detect direct quote with said attribution', () => {
      const claim = 'the economy is performing better than expected';
      const article = `
        The Federal Reserve chairman spoke at the conference yesterday.
        "The economy is performing better than expected," he said during his remarks.
        Investors reacted positively to the news.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('DIRECT_QUOTE');
      expect(result.attribution_snippet).toContain('economy is performing better');
    });

    test('should detect direct quote with told attribution', () => {
      const claim = 'we will increase production by 20 percent';
      const article = `
        The CEO told reporters at the annual meeting:
        "We will increase production by 20 percent this quarter."
        The announcement came after strong earnings.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('DIRECT_QUOTE');
      expect(result.attribution_snippet).toContain('increase production');
    });

    test('should detect quote with wrote attribution', () => {
      const claim = 'climate change poses an existential threat';
      const article = `
        In her latest book, the scientist wrote that
        "climate change poses an existential threat to humanity"
        and called for immediate action.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('DIRECT_QUOTE');
    });

    test('should not detect quote without attribution markers', () => {
      const claim = 'prices are rising rapidly';
      const article = `
        "Prices are rising rapidly" but there's no clear attribution.
        Just a quote floating in the article.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(false);
      expect(result.attribution_type).toBe('UNATTRIBUTED');
    });
  });

  describe('Reported speech', () => {
    test('should detect spokesperson as official statement', () => {
      const claim = 'negotiations are ongoing';
      const article = `
        The spokesperson said negotiations are ongoing between the two parties.
        No further details were provided about the timeline.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      // Spokesperson is an official title
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
      expect(result.attribution_snippet).toContain('negotiations are ongoing');
    });

    test('should detect according to government department', () => {
      const claim = 'unemployment fell to 3.5 percent';
      const article = `
        According to the Labor Department, unemployment fell to 3.5 percent
        in the latest monthly report released Friday.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      // Government department is official
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should detect person name with reported speech', () => {
      const claim = 'voter turnout exceeded expectations';
      const article = `
        Political analyst Sarah Johnson stated that voter turnout
        exceeded expectations in all major cities during yesterday's election.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('REPORTED_SPEECH');
    });

    test('should detect multiple word names', () => {
      const claim = 'research shows promising results';
      const article = `
        Dr. Maria Gonzalez Martinez announced that research shows
        promising results in the clinical trial phase.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('REPORTED_SPEECH');
    });

    test('should not detect when claim is not in article', () => {
      const claim = 'aliens have landed on earth';
      const article = `
        The president said the economy is strong.
        Officials confirmed the new policy.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(false);
      expect(result.attribution_type).toBe('UNATTRIBUTED');
    });
  });

  describe('Official statements', () => {
    test('should detect officials said pattern', () => {
      const claim = 'the suspect was apprehended without incident';
      const article = `
        Police officials said the suspect was apprehended without incident
        early this morning in a residential neighborhood.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
      expect(result.attribution_snippet).toContain('apprehended without incident');
    });

    test('should detect government department attribution', () => {
      const claim = 'new guidelines will be published next month';
      const article = `
        The Department of Health announced that new guidelines
        will be published next month to address the issue.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should detect White House said pattern', () => {
      const claim = 'sanctions will remain in place';
      const article = `
        The White House said sanctions will remain in place
        until further notice, despite diplomatic efforts.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should detect ministry attribution', () => {
      const claim = 'exports increased by 15 percent';
      const article = `
        The Ministry of Trade reported that exports increased by 15 percent
        compared to the same period last year.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should detect spokesperson pattern', () => {
      const claim = 'military operations continue in the region';
      const article = `
        A Pentagon spokesperson confirmed that military operations
        continue in the region with allied forces.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should detect in a statement pattern', () => {
      const claim = 'all safety protocols were followed';
      const article = `
        In a statement, the company said all safety protocols were followed
        during the incident and no injuries were reported.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should detect according to officials', () => {
      const claim = 'evacuation orders remain in effect';
      const article = `
        According to local officials, evacuation orders remain in effect
        for residents in the affected areas until conditions improve.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });
  });

  describe('Partial claim matching', () => {
    test('should match significant portion of claim', () => {
      const claim = 'the new policy will reduce emissions by 40 percent over the next decade';
      const article = `
        Environmental advocates praised the announcement.
        The governor stated the new policy will reduce emissions by 40 percent
        over the next decade, calling it a historic step forward.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
      // Governor is an official title, so this should be OFFICIAL_STATEMENT
      expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
    });

    test('should handle claims with minor variations', () => {
      const claim = 'inflation remains a concern';
      const article = `
        The Federal Reserve chair said inflation remains a major concern
        for policymakers despite recent improvements in the data.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(true);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty article text', () => {
      const claim = 'some claim';
      const article = '';

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(false);
      expect(result.attribution_type).toBe('UNATTRIBUTED');
    });

    test('should handle very short claim', () => {
      const claim = 'yes';
      const article = 'The official said yes to the proposal.';

      const result = detect_attribution(claim, article);

      // Short claims may not match reliably
      expect(result.attribution_type).toBeDefined();
    });

    test('should not attribute when claim appears without context', () => {
      const claim = 'technology is advancing rapidly';
      const article = `
        Technology is advancing rapidly.
        This is a fact everyone knows.
      `;

      const result = detect_attribution(claim, article);

      expect(result.is_attributed).toBe(false);
      expect(result.attribution_type).toBe('UNATTRIBUTED');
    });
  });
});

describe('calculate_attribution_boost', () => {
  test('should return highest boost for DIRECT_QUOTE', () => {
    expect(calculate_attribution_boost('DIRECT_QUOTE')).toBe(0.15);
  });

  test('should return high boost for OFFICIAL_STATEMENT', () => {
    expect(calculate_attribution_boost('OFFICIAL_STATEMENT')).toBe(0.12);
  });

  test('should return moderate boost for REPORTED_SPEECH', () => {
    expect(calculate_attribution_boost('REPORTED_SPEECH')).toBe(0.10);
  });

  test('should return no boost for UNATTRIBUTED', () => {
    expect(calculate_attribution_boost('UNATTRIBUTED')).toBe(0.0);
  });
});

describe('Real-world examples', () => {
  test('AP News style - official said with quote', () => {
    const claim = 'we remain committed to supporting ukraine';
    const article = `
      WASHINGTON (AP) — President Joe Biden said Friday that
      "we remain committed to supporting Ukraine" in its defense
      against Russian aggression, speaking at a NATO summit.
    `;

    const result = detect_attribution(claim, article);

    expect(result.is_attributed).toBe(true);
    expect(result.attribution_type).toBe('DIRECT_QUOTE');
  });

  test('Reuters style - agency reported pattern', () => {
    const claim = 'interest rates will be held steady';
    const article = `
      LONDON, Dec 28 (Reuters) - The Bank of England announced
      that interest rates will be held steady at current levels,
      according to a statement released on Thursday.
    `;

    const result = detect_attribution(claim, article);

    expect(result.is_attributed).toBe(true);
    expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
  });

  test('BBC style - multiple attributions in paragraph', () => {
    const claim = 'casualties were reported on both sides';
    const article = `
      Military officials said casualties were reported on both sides
      of the conflict. The defence ministry confirmed the reports
      but did not provide specific numbers.
    `;

    const result = detect_attribution(claim, article);

    expect(result.is_attributed).toBe(true);
    expect(result.attribution_type).toBe('OFFICIAL_STATEMENT');
  });
});
