/**
 * Mention Utility - Parse and render @user mentions in comments
 */

import React from 'react';

// Regex to match @mentions (e.g., @username or @"Full Name")
export const MENTION_REGEX = /@(\w+|"[^"]+"|'[^']+')/g;

/**
 * Extract all mentioned usernames from text
 */
export const extractMentions = (text: string): string[] => {
    const matches = text.match(MENTION_REGEX);
    if (!matches) return [];

    return matches.map(m => {
        // Remove @ prefix and quotes if present
        let name = m.substring(1);
        if ((name.startsWith('"') && name.endsWith('"')) ||
            (name.startsWith("'") && name.endsWith("'"))) {
            name = name.slice(1, -1);
        }
        return name;
    });
};

/**
 * Check if a specific user is mentioned in text
 */
export const isMentioned = (text: string, userName: string): boolean => {
    const mentions = extractMentions(text);
    return mentions.some(m =>
        m.toLowerCase() === userName.toLowerCase() ||
        m.toLowerCase() === userName.split(' ')[0].toLowerCase()
    );
};

/**
 * Render text with highlighted mentions
 */
export const renderWithMentions = (text: string): React.ReactNode => {
    const parts = text.split(MENTION_REGEX);
    const matches = text.match(MENTION_REGEX) || [];

    const result: React.ReactNode[] = [];
    let matchIndex = 0;

    for (let i = 0; i < parts.length; i++) {
        // Add the text before the match
        if (parts[i]) {
            result.push(parts[i]);
        }

        // Add the styled mention
        if (matchIndex < matches.length && i < parts.length - 1) {
            const mention = matches[matchIndex];
            result.push(
                React.createElement('span', {
                    key: `mention-${matchIndex}`,
                    className: 'text-primary font-bold bg-primary/10 px-1 rounded',
                }, mention)
            );
            matchIndex++;
        }
    }

    return React.createElement(React.Fragment, null, ...result);
};

/**
 * Filter users based on search query for autocomplete
 */
export const filterUsersForMention = (
    users: { id: string; name: string }[],
    query: string
): { id: string; name: string }[] => {
    const lowerQuery = query.toLowerCase();
    return users.filter(u =>
        u.name.toLowerCase().includes(lowerQuery) ||
        u.id.toLowerCase().includes(lowerQuery)
    ).slice(0, 5); // Limit to 5 suggestions
};

/**
 * Get the current mention query from text (for autocomplete)
 * Returns null if not currently typing a mention
 */
export const getCurrentMentionQuery = (text: string, cursorPosition: number): string | null => {
    // Find the last @ before cursor
    const textBeforeCursor = text.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) return null;

    // Check if there's a space between @ and cursor (mention completed)
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
    if (textAfterAt.includes(' ')) return null;

    return textAfterAt;
};
