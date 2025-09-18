import { describe, expect, it } from 'bun:test';
import { hasPII } from './pii';

describe('PII detection', () => {
    it('detects emails and phone numbers', () => {
        expect(hasPII('Contact me at user@example.com')).toBeTrue();
        expect(hasPII('Call (415) 555-7890 for info')).toBeTrue();
        expect(hasPII('Numbers like 0123456789 are filtered')).toBeFalse();
        expect(hasPII('Short code 1234 should not count')).toBeFalse();
        expect(hasPII('')).toBeFalse();
    });

    it('handles international numbers and filters obvious false positives', () => {
        expect(hasPII('Reach our UK office at +44 20 1234 5678.')).toBeTrue();
        expect(hasPII('My placeholder number is 1111111111.')).toBeFalse();
        expect(hasPII('Order 9999999999999999 ships soon')).toBeFalse();
        expect(hasPII('Short +1 234 567 8 reference')).toBeFalse();
    });
});
