/**
 * HTML utility functions for proposal content
 */

/**
 * Strip HTML tags from a string (for displaying in lists/summaries)
 */
export const stripHtml = (html: string | undefined): string => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
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
