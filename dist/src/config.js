/**
 * ZCrystal Plugin Configuration
 *
 * Handles path configuration with environment variable support
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// Default paths (can be overridden by environment variables)
const HOME = process.env.HOME || homedir();
const OPENCLAW_PATH = process.env.OPENCLAW_PATH || join(HOME, '.openclaw');
const DATA_PATH = process.env.ZCRYSTAL_DATA_PATH || join(OPENCLAW_PATH, 'extensions', 'zcrystal', 'data');
const SKILLS_PATH = process.env.ZCRYSTAL_SKILLS_PATH || join(OPENCLAW_PATH, 'skills');
// FIX: Use os.tmpdir() instead of hardcoded /tmp/zcrystal
const TEMP_PATH = process.env.ZCRYSTAL_TEMP_PATH || join(tmpdir(), 'zcrystal');
// FTS5 MCP URL
const FTS5_PORT = process.env.ZCRYSTAL_FTS5_PORT || '18795';
const FTS5_MCP_URL = process.env.ZCRYSTAL_FTS5_URL || `http://localhost:${FTS5_PORT}/mcp`;
// Evolution settings
const EVOLUTION_INTERVAL = parseInt(process.env.ZCRYSTAL_EVOLUTION_INTERVAL || '3600000', 10); // 60 min
const HEARTBEAT_INTERVAL = parseInt(process.env.ZCRYSTAL_HEARTBEAT_INTERVAL || '300000', 10); // 5 min
const PROACTIVE_INTERVAL = parseInt(process.env.ZCRYSTAL_PROACTIVE_INTERVAL || '600000', 10); // 10 min
// Export config
export const config = {
    paths: {
        home: HOME,
        openclaw: OPENCLAW_PATH,
        data: DATA_PATH,
        skills: SKILLS_PATH,
        temp: TEMP_PATH,
    },
    fts5: {
        mcpUrl: FTS5_MCP_URL,
        port: FTS5_PORT,
        path: join(OPENCLAW_PATH, 'skills', 'fts5'),
    },
    intervals: {
        evolution: EVOLUTION_INTERVAL,
        heartbeat: HEARTBEAT_INTERVAL,
        proactive: PROACTIVE_INTERVAL,
    },
};
// Helper to get config value
export function getConfig(key) {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value = config;
    for (const k of keys) {
        value = value?.[k];
    }
    return value ?? '';
}
//# sourceMappingURL=config.js.map