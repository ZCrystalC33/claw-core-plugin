const PRIVATE_TAG_REGEX = /<private>[\s\S]*?<\/private>/gi;
export function stripPrivateTags(content) {
    if (!content)
        return content;
    return content.replace(PRIVATE_TAG_REGEX, '');
}
export function hasPrivateTags(content) {
    if (!content)
        return false;
    return PRIVATE_TAG_REGEX.test(content);
}
export function validateClean(content) {
    return !hasPrivateTags(stripPrivateTags(content));
}
