import { readdir, readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
export class SkillManager {
    skills = new Map();
    searchPaths = [];
    initialized = false;
    _cache = null;
    CACHE_TTL_MS = 5 * 60 * 1000;
    _searchIndex = new Map();
    _indexValid = false;
    constructor(searchPaths = []) {
        this.searchPaths = searchPaths.map(p => p.replace('~', homedir()));
    }
    async discover() {
        if (this._cache && Date.now() - this._cache.timestamp < this.CACHE_TTL_MS) {
            return this._cache.skills;
        }
        this.skills.clear();
        for (const basePath of this.searchPaths) {
            try {
                await this.discoverInDirectory(basePath);
            }
            catch {
            }
        }
        this.initialized = true;
        const result = Array.from(this.skills.values());
        this._cache = { skills: result, timestamp: Date.now() };
        this.buildSearchIndex();
        return result;
    }
    clearCache() {
        this._cache = null;
        this._indexValid = false;
    }
    async discoverInDirectory(dirPath, depth = 0) {
        if (depth > 3)
            return;
        try {
            const entries = await readdir(dirPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.name.startsWith('.'))
                    continue;
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    const skillMdPath = join(fullPath, 'SKILL.md');
                    try {
                        const skill = await this.parseSkill(fullPath);
                        if (skill) {
                            this.skills.set(skill.slug, skill);
                        }
                        else {
                            await this.discoverInDirectory(fullPath, depth + 1);
                        }
                    }
                    catch {
                        await this.discoverInDirectory(fullPath, depth + 1);
                    }
                }
                else if (entry.isFile() && entry.name.endsWith('.md')) {
                    const skill = await this.parseStandaloneSkill(fullPath);
                    if (skill) {
                        this.skills.set(skill.slug, skill);
                    }
                }
            }
        }
        catch {
        }
    }
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
    async parseStandaloneSkill(filePath) {
        try {
            const content = await readFile(filePath, 'utf-8');
            return this.parseSkillContent(basename(filePath, '.md'), content);
        }
        catch {
            return null;
        }
    }
    parseSkillContent(basePath, content) {
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let name = basename(basePath);
        let slug = this.slugify(name);
        let description = '';
        let version = '1.0.0';
        let metadata = {};
        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
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
            const metaMatch = frontmatter.match(/metadata:\s*(\{[\s\S]*?\})/);
            if (metaMatch) {
                try {
                    metadata = JSON.parse(metaMatch[1].replace(/'/g, '"'));
                }
                catch {
                }
            }
        }
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
    slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
    getSkills() {
        return Array.from(this.skills.values());
    }
    getSkill(slug) {
        return this.skills.get(slug);
    }
    buildSearchIndex() {
        this._searchIndex.clear();
        for (const skill of this.skills.values()) {
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
    extractWords(text) {
        return text
            .toLowerCase()
            .split(/[\s\-_.,!?;:\(\)\[\]{}]+/)
            .filter(w => w.length >= 2);
    }
    searchSkills(query, limit = 10) {
        if (!this._indexValid) {
            this.buildSearchIndex();
        }
        const queryWords = this.extractWords(query);
        if (queryWords.length === 0) {
            return Array.from(this.skills.values()).slice(0, limit);
        }
        const matchCount = new Map();
        for (const word of queryWords) {
            const partialMatches = [...this._searchIndex.entries()]
                .filter(([key]) => key.includes(word))
                .flatMap(([, slugs]) => [...slugs]);
            for (const slug of partialMatches) {
                matchCount.set(slug, (matchCount.get(slug) || 0) + 1);
            }
        }
        const sorted = [...matchCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([slug]) => this.skills.get(slug))
            .filter((s) => s !== undefined);
        return sorted;
    }
    async readSkillContent(skill) {
        try {
            return await readFile(skill.filePath, 'utf-8');
        }
        catch {
            return '';
        }
    }
    async writeSkillContent(skill, content) {
        try {
            const { writeFile } = await import('node:fs/promises');
            await writeFile(skill.filePath, content, 'utf-8');
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
    isInitialized() {
        return this.initialized;
    }
    async reload() {
        return this.discover();
    }
}
export function createLocalSkillManager(paths) {
    const defaultPaths = [
        '~/.openclaw/skills',
        '~/.hermes/skills',
    ];
    return new SkillManager(paths || defaultPaths);
}
