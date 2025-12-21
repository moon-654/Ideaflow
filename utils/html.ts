/**
 * HTML utility functions for proposal content
 */

/**
 * Strip HTML tags from a string and decode HTML entities (for displaying in lists/summaries)
 */
export const stripHtml = (html: string | undefined): string => {
    if (!html) return '';
    // First strip tags
    let text = html.replace(/<[^>]*>/g, '');
    // Then decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    return text.trim();
};

/**
 * Truncate text to a specific length with ellipsis
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
};

/**
 * Get plain text summary from HTML content
 */
export const getPlainTextSummary = (html: string | undefined, maxLength: number = 100): string => {
    return truncateText(stripHtml(html), maxLength);
};
