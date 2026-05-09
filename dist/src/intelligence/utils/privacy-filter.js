/**
 * Privacy Filter - Strips <private> tags from content before storage
 * Based on Claude-Mem's privacy tag feature
 */
const PRIVATE_TAG_REGEX = /<private>[\s\S]*?<\/private>/gi;
/**
 * Strip all <private>...</private> blocks from content
 * Used before persisting to FTS5 or other storage
 */
export function stripPrivateTags(content) {
    if (!content)
        return content;
    return content.replace(PRIVATE_TAG_REGEX, '');
}
/**
 * Check if content contains private tags (for debugging/validation)
 */
export function hasPrivateTags(content) {
    if (!content)
        return false;
    return PRIVATE_TAG_REGEX.test(content);
}
/**
 * Validate that stripping was successful
 */
export function validateClean(content) {
    return !hasPrivateTags(stripPrivateTags(content));
}
//# sourceMappingURL=privacy-filter.js.map