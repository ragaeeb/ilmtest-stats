/**
 * Detects if a string contains PII (phone numbers or email addresses)
 * @param text - The text to analyze
 * @returns boolean - True if PII is detected, false otherwise
 */
export function hasPII(text: string): boolean {
    if (!text || typeof text !== 'string') {
        return false;
    }

    // Email regex pattern
    // Matches most common email formats including:
    // - Standard emails (user@domain.com)
    // - Emails with subdomains (user@mail.domain.com)
    // - Emails with special characters in local part
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

    // Phone number regex patterns
    // Matches various phone number formats:
    const phonePatterns = [
        // US formats: (123) 456-7890, 123-456-7890, 123.456.7890, 123 456 7890
        /\b\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
        // International format: +1-123-456-7890, +44 20 1234 5678
        /\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
        // 10-11 digit numbers (potential phone numbers): 1234567890, 12345678901
        /\b\d{10,11}\b/g,
    ];

    // Check for email addresses
    if (emailPattern.test(text)) {
        return true;
    }

    // Check for phone numbers
    for (const pattern of phonePatterns) {
        if (pattern.test(text)) {
            // Additional validation to reduce false positives
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    // Filter out common false positives like dates, IDs, etc.
                    if (isLikelyPhoneNumber(match)) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Helper function to validate if a matched string is likely a phone number
 * Reduces false positives by filtering out common non-phone number patterns
 */
function isLikelyPhoneNumber(match: string): boolean {
    // Remove all non-digit characters to analyze the number
    const digitsOnly = match.replace(/\D/g, '');

    // Must be 10-15 digits (typical phone number range)
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return false;
    }

    // Filter out obvious non-phone patterns
    const commonFalsePositives = [
        /^0+$/, // All zeros
        /^1+$/, // All ones
        /^1234567890$/, // Sequential numbers
        /^0123456789$/, // Sequential starting with 0
    ];

    for (const pattern of commonFalsePositives) {
        if (pattern.test(digitsOnly)) {
            return false;
        }
    }

    return true;
}
