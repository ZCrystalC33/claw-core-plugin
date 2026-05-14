/**
 * Memory Bank Tools - Unified TypeScript bridge to Python MemoryQueryInterface
 *
 * Integrates:
 * - MemoryQueryInterface (FTS5 + Wiki + Honcho + Docling + ZCrystal)
 * - KnowledgeFusion (deduplication + conflict resolution)
 * - ZCrystalInterface (evolution learning patterns)
 *
 * Progressive disclosure: index → read → fuse
 */
import { Type } from '@sinclair/typebox';
import { mqiSearch, memoryBankIndex, memoryBankRead, compressContextWithMQI } from '../memory/python-bridge.js';
import { okResult, errResult } from '../index.js';
export function registerMemoryBankTools(api) {
    // ─── MQI Search ───────────────────────────────────────────────
    api.registerTool({
        name: 'zcrystal_mqi_search',
        label: '🔍 MQI Search',
        description: 'Search across FTS5, Wiki, Honcho memory sources using Python MemoryQueryInterface',
        parameters: Type.Object({
            query: Type.String({ description: 'Search query' }),
            sources: Type.Optional(Type.Array(Type.String())),
            limit: Type.Optional(Type.Number({ description: 'Max results per source (default: 20)' })),
        }),
        async execute(_id, params) {
            const limit = params.limit ?? 20;
            const sources = params.sources ?? ['fts5', 'wiki', 'honcho'];
            try {
                const results = await mqiSearch(params.query, sources, limit);
                const lines = ['**MQI Search Results**'];
                for (const r of results) {
                    const src = r.source;
                    const status = r.error ? '❌' : '✅';
                    lines.push(`\n${status} **${src}** (${r.total} hits, ${r.duration_ms.toFixed(1)}ms)`);
                    if (r.records?.length) {
                        r.records.slice(0, 3).forEach((rec) => {
                            const content = String(rec.content || '').slice(0, 150);
                            lines.push(`   • ${content.replace(/\n/g, ' ')}`);
                        });
                        if (r.records.length > 3)
                            lines.push(`   ... +${r.records.length - 3} more`);
                    }
                    else if (r.error) {
                        lines.push(`   Error: ${r.error}`);
                    }
                }
                return okResult(lines.join('\n'), { query: params.query, sources, resultCount: results.length });
            }
            catch (e) {
                return errResult('MQI search failed: ' + (e instanceof Error ? e.message : String(e)));
            }
        },
    });
    // ─── Memory Bank Index (Layer 1) ──────────────────────────────
    api.registerTool({
        name: 'zcrystal_mqi_index',
        label: '📚 Memory Bank Index',
        description: 'Layer 1: Get lightweight index of FTS5 entries (metadata only, ~50 tokens/entry). Use before reading full content.',
        parameters: Type.Object({
            query: Type.String({ description: 'Search query' }),
            limit: Type.Optional(Type.Number({ description: 'Max entries (default: 20)' })),
        }),
        async execute(_id, params) {
            const limit = params.limit ?? 20;
            try {
                const table = await memoryBankIndex(params.query, limit);
                return okResult(table, { query: params.query, limit });
            }
            catch (e) {
                return errResult('Memory index failed: ' + (e instanceof Error ? e.message : String(e)));
            }
        },
    });
    // ─── Memory Bank Read (Layer 3) ────────────────────────────────
    api.registerTool({
        name: 'zcrystal_mqi_read',
        label: '📖 Memory Bank Read',
        description: 'Layer 3: Get full FTS5 entry content by ID. Use after zcrystal_mqi_index to fetch details.',
        parameters: Type.Object({
            id: Type.Number({ description: 'Entry ID from memory index' }),
        }),
        async execute(_id, params) {
            try {
                const content = await memoryBankRead(params.id);
                return okResult(content, { id: params.id, tokens: Math.ceil(content.length / 4) });
            }
            catch (e) {
                return errResult('Memory read failed: ' + (e instanceof Error ? e.message : String(e)));
            }
        },
    });
    // ─── Context Compress ─────────────────────────────────────────
    api.registerTool({
        name: 'zcrystal_context_compress',
        label: '🗜️ Context Compress',
        description: 'Compress conversation context using Python KnowledgeFusion deduplication and progressive truncation.',
        parameters: Type.Object({
            messages: Type.Array(Type.Object({
                role: Type.String(),
                content: Type.String(),
                timestamp: Type.Optional(Type.Number()),
            })),
            maxMessages: Type.Optional(Type.Number({ description: 'Max messages to keep (default: 40)' })),
            maxMessageLength: Type.Optional(Type.Number({ description: 'Max chars per message (default: 8000)' })),
        }),
        async execute(_id, params) {
            const maxMessages = params.maxMessages ?? 40;
            const maxMessageLength = params.maxMessageLength ?? 8000;
            try {
                const result = await compressContextWithMQI(params.messages, maxMessages, maxMessageLength);
                return okResult(`Compressed: ${params.messages.length} → ${result.compressed.length} messages, ` +
                    `saved ~${result.savedTokens} tokens`, { before: params.messages.length, after: result.compressed.length, savedTokens: result.savedTokens });
            }
            catch (e) {
                return errResult('Context compress failed: ' + (e instanceof Error ? e.message : String(e)));
            }
        },
    });
}
//# sourceMappingURL=memory-bank-tools.js.map