/**
 * Skill Manager for ZCrystal Plugin
 *
 * OpenClaw-compatible skill system.
 * Aligns with Hermes Skills: https://github.com/nousresearch/hermes-agent/tree/main/skills
 *
 * Features:
 * - SKILL.md discovery
 * - Skill metadata parsing
 * - Skill lifecycle management
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
// ============================================================
// Skill Discovery
// ============================================================
export class SkillManager {
    skills = new Map();
    searchPaths = [];
    initialized = false;
    // Cache with TTL (5 minutes)
    _cache = null;
    CACHE_TTL_MS = 5 * 60 * 1000;
    // Simple in-memory search index (word -> skill slug set)
    _searchIndex = new Map();
    _indexValid = false;
    constructor(searchPaths = []) {
        this.searchPaths = searchPaths.map(p => p.replace('~', homedir()));
    }
    /**
     * Discover all skills in configured paths (cached)
     */
    async discover() {
        // Return cached result if still valid
        if (this._cache && Date.now() - this._cache.timestamp < this.CACHE_TTL_MS) {
            return this._cache.skills;
        }
        this.skills.clear();
        for (const basePath of this.searchPaths) {
            try {
                await this.discoverInDirectory(basePath);
            }
            catch {
                // Directory might not exist, skip
            }
        }
        this.initialized = true;
        const result = Array.from(this.skills.values());
        // Update cache
        this._cache = { skills: result, timestamp: Date.now() };
        // Rebuild search index
        this.buildSearchIndex();
        return result;
    }
    /**
     * Clear the cache to force rediscovery
     */
    clearCache() {
        this._cache = null;
        this._indexValid = false;
    }
    /**
     * Discover skills in a directory (recursive)
     */
    async discoverInDirectory(dirPath, depth = 0) {
        if (depth > 3)
            return; // Max depth to prevent infinite recursion
        try {
            const entries = await readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.'))
                    continue;
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    // Check for SKILL.md in subdirectory (direct read avoids extra stat)
                    const skillMdPath = join(fullPath, 'SKILL.md');
                    try {
                        // Direct readFile is 1 syscall vs stat+readFile = 2 syscalls
                        const skill = await this.parseSkill(fullPath);
                        if (skill) {
                            this.skills.set(skill.slug, skill);
                        }
                        else {
                            // Not a skill directory, recurse
                            await this.discoverInDirectory(fullPath, depth + 1);
                        }
                    }
                    catch {
                        // Not a skill directory, recurse
                        await this.discoverInDirectory(fullPath, depth + 1);
                    }
                }
                else if (entry.isFile() && entry.name.endsWith('.md')) {
                    // Check if this is a skill markdown file
                    const skill = await this.parseStandaloneSkill(fullPath);
                    if (skill) {
                        this.skills.set(skill.slug, skill);
                    }
                }
            }
        }
        catch {
            // Directory not accessible, skip
        }
    }
    /**
     * Parse SKILL.md and extract metadata
     */
    async parseSkill(skillDir) {
        const skillMdPath = join(skillDir, 'SKILL.md');
        try {
            const content = await readFile(skillMdPath, 'utf-8');
            return this.parseSkillContent(skillDir, content);
        }
        catch {
            return null;
        }
    }
    /**
     * Parse standalone .md file as skill
     */
    async parseStandaloneSkill(filePath) {
        try {
            const content = await readFile(filePath, 'utf-8');
            return this.parseSkillContent(basename(filePath, '.md'), content);
        }
        catch {
            return null;
        }
    }
    /**
     * Parse skill content and extract metadata
     */
    parseSkillContent(basePath, content) {
        // Extract frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let name = basename(basePath);
        let slug = this.slugify(name);
        let description = '';
        let version = '1.0.0';
        let metadata = {};
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            // Parse YAML-like frontmatter
            const nameMatch = frontmatter.match(/name:\s*(.+)/i);
            if (nameMatch)
                name = nameMatch[1].trim();
            const slugMatch = frontmatter.match(/slug:\s*(.+)/i);
            if (slugMatch)
                slug = slugMatch[1].trim();
            const versionMatch = frontmatter.match(/version:\s*(.+)/i);
            if (versionMatch)
                version = versionMatch[1].trim();
            const descMatch = frontmatter.match(/description:\s*["'](.+)["']/i);
            if (descMatch)
                description = descMatch[1].trim();
            // Try to parse metadata JSON block
            const metaMatch = frontmatter.match(/metadata:\s*(\{[\s\S]*?\})/);
            if (metaMatch) {
                try {
                    metadata = JSON.parse(metaMatch[1].replace(/'/g, '"'));
                }
                catch {
                    // Ignore parse errors
                }
            }
        }
        // Fallback: extract description from first paragraph
        if (!description) {
            const firstParaMatch = content.match(/^#\s+.+\n\n([^\n#]+)/);
            if (firstParaMatch) {
                description = firstParaMatch[1].trim().slice(0, 200);
            }
        }
        return {
            name,
            slug,
            version,
            description,
            filePath: join(basePath, 'SKILL.md'),
            metadata,
        };
    }
    /**
     * Convert name to slug
     */
    slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    // ============================================================
    // Skill Access
    // ============================================================
    /**
     * Get all discovered skills
     */
    getSkills() {
        return Array.from(this.skills.values());
    }
    /**
     * Get skill by slug
     */
    getSkill(slug) {
        return this.skills.get(slug);
    }
    /**
     * Build search index for fast lookup
     */
    buildSearchIndex() {
        this._searchIndex.clear();
        for (const skill of this.skills.values()) {
            // Index words from name and description
            const words = this.extractWords(skill.name + ' ' + skill.description);
            for (const word of words) {
                if (!this._searchIndex.has(word)) {
                    this._searchIndex.set(word, new Set());
                }
                this._searchIndex.get(word).add(skill.slug);
            }
        }
        this._indexValid = true;
    }
    /**
     * Extract searchable words from text
     */
    extractWords(text) {
        return text
            .toLowerCase()
            .split(/[\s\-_.,!?;:\(\)\[\]{}]+/)
            .filter(w => w.length >= 2);
    }
    /**
     * Search skills using indexed lookup (O(k) vs O(n))
     */
    searchSkills(query, limit = 10) {
        // Rebuild index if needed
        if (!this._indexValid) {
            this.buildSearchIndex();
        }
        const queryWords = this.extractWords(query);
        if (queryWords.length === 0) {
            return Array.from(this.skills.values()).slice(0, limit);
        }
        // Count matching skills
        const matchCount = new Map();
        for (const word of queryWords) {
            // Find skills matching this word
            const partialMatches = [...this._searchIndex.entries()]
                .filter(([key]) => key.includes(word))
                .flatMap(([, slugs]) => [...slugs]);
            for (const slug of partialMatches) {
                matchCount.set(slug, (matchCount.get(slug) || 0) + 1);
            }
        }
        // Sort by match count
        const sorted = [...matchCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([slug]) => this.skills.get(slug))
            .filter((s) => s !== undefined);
        return sorted;
    }
    /**
     * Read skill content
     */
    async readSkillContent(skill) {
        try {
            return await readFile(skill.filePath, 'utf-8');
        }
        catch {
            return '';
        }
    }
    /**
     * Update skill file
     */
    async writeSkillContent(skill, content) {
        try {
            const { writeFile } = await import('node:fs/promises');
            await writeFile(skill.filePath, content, 'utf-8');
            // Re-parse to update metadata
            const updated = await this.parseSkill(basename(skill.filePath, '.md'));
            if (updated) {
                this.skills.set(updated.slug, updated);
            }
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Check if skills are initialized
     */
    isInitialized() {
        return this.initialized;
    }
    /**
     * Reload skills from disk
     */
    async reload() {
        return this.discover();
    }
}
// ============================================================
// Factory
// ============================================================
/**
 * Factory for local SkillManager (distinct from @zcrystal/evo's createSkillManager).
 * FIX: Renamed to avoid naming conflict with @zcrystal/evo export.
 */
export function createLocalSkillManager(paths) {
    const defaultPaths = [
        '~/.openclaw/skills',
        '~/.hermes/skills',
    ];
    return new SkillManager(paths || defaultPaths);
}
//# sourceMappingURL=skill-manager.js.map