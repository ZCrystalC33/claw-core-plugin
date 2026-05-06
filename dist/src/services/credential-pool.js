/**
 * Credential Pool Service for ZCrystal Plugin
 *
 * Manages API key lifecycle with rotation, circuit-breaking, and usage tracking.
 * Registered as an OpenClaw Plugin Service via `api.registerService()`.
 */
import { Type } from '@sinclair/typebox';
// Module-level state (survives across service calls within same plugin lifecycle)
let poolState = null;
// =====================================================================
// Helpers
// =====================================================================
function makeResult(text, details) {
    return { content: [{ type: 'text', text }], details: details ?? {} };
}
function makeErr(text) {
    return { content: [{ type: 'text', text }], details: {}, isError: true };
}
function getDefaults() {
    return {
        failureThreshold: 5,
        successThreshold: 3,
        resetWindowMs: 5 * 60 * 1000,
        maxUsagePerKey: 10000,
        healthCheckIntervalMs: 60 * 1000,
    };
}
function loadKeysFromStore(state) {
    try {
        const { readFileSync, existsSync } = require('node:fs');
        const credPath = `${process.env.HOME}/.openclaw/extensions/zcrystal/data/credentials.json`;
        if (existsSync(credPath)) {
            const raw = readFileSync(credPath, 'utf-8');
            const arr = JSON.parse(raw);
            for (const k of arr) {
                state.keys.set(k.id, k);
            }
            console.log('[ZCrystal:CredentialPool] Loaded', state.keys.size, 'credentials from store');
        }
    }
    catch {
        // File may not exist yet, that's fine
    }
}
function saveKeysToStore(state) {
    try {
        const { mkdirSync, writeFileSync } = require('node:fs');
        const dir = `${process.env.HOME}/.openclaw/extensions/zcrystal/data`;
        mkdirSync(dir, { recursive: true });
        const path = `${dir}/credentials.json`;
        const arr = [...state.keys.values()];
        writeFileSync(path, JSON.stringify(arr, null, 2), 'utf-8');
    }
    catch (e) {
        console.warn('[ZCrystal:CredentialPool] Failed to save credentials:', e);
    }
}
function getActiveKeyByProvider(state, provider) {
    const candidates = [...state.keys.values()].filter(k => k.provider === provider && k.isActive && !k.isRotating);
    if (candidates.length === 0)
        return undefined;
    // Pick key with lowest use count (load-balance)
    candidates.sort((a, b) => a.useCount - b.useCount);
    return candidates[0];
}
function isCircuitOpen(key, config) {
    if (key.consecutiveFailures < config.failureThreshold)
        return false;
    const now = Date.now();
    const windowStart = now - config.resetWindowMs;
    return key.lastFailureAt !== undefined && key.lastFailureAt > windowStart;
}
function checkCircuitHealth(key, config) {
    if (key.consecutiveFailures >= config.failureThreshold) {
        const now = Date.now();
        const windowStart = now - config.resetWindowMs;
        if (key.lastFailureAt === undefined || key.lastFailureAt < windowStart) {
            // Reset circuit: failure window expired
            key.consecutiveFailures = 0;
            key.failureCount = 0;
        }
    }
}
function recordUsage(state, keyId, record) {
    state.usageLog.push(record);
    // Keep log bounded (last 10k records)
    if (state.usageLog.length > 10000) {
        state.usageLog = state.usageLog.slice(-5000);
    }
    // Update key stats
    const key = state.keys.get(keyId);
    if (key) {
        key.useCount++;
        key.lastUsedAt = record.timestamp;
    }
}
// =====================================================================
// Service Definition
// =====================================================================
export function createCredentialPoolService(api) {
    return {
        id: 'zcrystal-credential-pool',
        async start(ctx) {
            console.log('[ZCrystal:CredentialPool] Starting service...');
            poolState = {
                keys: new Map(),
                usageLog: [],
                config: getDefaults(),
                initialized: false,
            };
            // Load persisted keys
            loadKeysFromStore(poolState);
            // Register management tools
            registerCredentialTools(api, poolState);
            // Start health check timer
            poolState.healthCheckTimer = setInterval(() => {
                if (!poolState)
                    return;
                for (const key of poolState.keys.values()) {
                    checkCircuitHealth(key, poolState.config);
                }
            }, poolState.config.healthCheckIntervalMs);
            poolState.initialized = true;
            console.log('[ZCrystal:CredentialPool] Service started. Keys:', poolState.keys.size);
        },
        async stop(ctx) {
            console.log('[ZCrystal:CredentialPool] Stopping service...');
            if (poolState?.healthCheckTimer) {
                clearInterval(poolState.healthCheckTimer);
            }
            if (poolState) {
                saveKeysToStore(poolState);
            }
            poolState = null;
            console.log('[ZCrystal:CredentialPool] Service stopped.');
        },
    };
}
// =====================================================================
// Tool Registration
// =====================================================================
function registerCredentialTools(api, state) {
    // --- claw_core_credential_list ---
    api.registerTool({
        name: 'zcrystal_credential_list',
        label: 'ZCrystal Credential List',
        description: 'List all registered API credentials with status',
        parameters: Type.Object({ provider: Type.Optional(Type.String()) }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            const keys = params.provider
                ? [...state.keys.values()].filter(k => k.provider === params.provider)
                : [...state.keys.values()];
            const lines = keys.map(k => {
                const circuit = isCircuitOpen(k, state.config) ? '🔴 OPEN' : '🟢 CLOSED';
                const active = k.isActive ? '✅' : '❌';
                const rotating = k.isRotating ? ' (rotating)' : '';
                const lastUsed = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never';
                return `${active} ${k.name} [${k.provider}] id=${k.id} uses=${k.useCount} last=${lastUsed} circuit=${circuit}${rotating}`;
            });
            return makeResult(lines.length > 0 ? lines.join('\n') : 'No credentials registered.', { count: keys.length });
        },
    });
    // --- claw_core_credential_add ---
    api.registerTool({
        name: 'zcrystal_credential_add',
        label: 'ZCrystal Credential Add',
        description: 'Add a new API credential to the pool',
        parameters: Type.Object({
            id: Type.String(),
            name: Type.String(),
            key: Type.String(),
            provider: Type.String(),
        }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            if (state.keys.has(params.id)) {
                return makeErr(`Credential with id "${params.id}" already exists`);
            }
            const credential = {
                id: params.id,
                name: params.name,
                key: params.key,
                provider: params.provider,
                addedAt: Date.now(),
                useCount: 0,
                isActive: true,
                isRotating: false,
                failureCount: 0,
                consecutiveFailures: 0,
            };
            state.keys.set(params.id, credential);
            saveKeysToStore(state);
            return makeResult(`Added credential "${params.name}" (${params.provider}) with id=${params.id}`);
        },
    });
    // --- claw_core_credential_remove ---
    api.registerTool({
        name: 'zcrystal_credential_remove',
        label: 'ZCrystal Credential Remove',
        description: 'Remove a credential from the pool by id',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            if (!state.keys.has(params.id))
                return makeErr(`Credential "${params.id}" not found`);
            const key = state.keys.get(params.id);
            state.keys.delete(params.id);
            saveKeysToStore(state);
            return makeResult(`Removed credential "${key.name}"`);
        },
    });
    // --- claw_core_credential_rotate ---
    api.registerTool({
        name: 'zcrystal_credential_rotate',
        label: 'ZCrystal Credential Rotate',
        description: 'Mark a key as rotating so it gets replaced on next use',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            const key = state.keys.get(params.id);
            if (!key)
                return makeErr(`Credential "${params.id}" not found`);
            key.isRotating = true;
            saveKeysToStore(state);
            return makeResult(`Credential "${key.name}" marked for rotation on next use`);
        },
    });
    // --- claw_core_credential_use ---
    api.registerTool({
        name: 'zcrystal_credential_use',
        label: 'ZCrystal Credential Use',
        description: 'Use a credential (records usage, handles circuit state)',
        parameters: Type.Object({
            provider: Type.String(),
            tokensUsed: Type.Optional(Type.Number()),
            costEstimate: Type.Optional(Type.Number()),
            success: Type.Boolean(),
            latencyMs: Type.Optional(Type.Number()),
        }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            const key = getActiveKeyByProvider(state, params.provider);
            if (!key)
                return makeErr(`No active credential found for provider "${params.provider}"`);
            if (isCircuitOpen(key, state.config)) {
                return makeErr(`Circuit breaker open for "${key.name}". Last failure: ${key.lastFailureAt ? new Date(key.lastFailureAt).toLocaleString() : 'unknown'}`);
            }
            const record = {
                keyId: key.id,
                timestamp: Date.now(),
                tokensUsed: params.tokensUsed ?? 0,
                costEstimate: params.costEstimate ?? 0,
                success: params.success,
                latencyMs: params.latencyMs ?? 0,
            };
            recordUsage(state, record.keyId, record);
            if (!params.success) {
                key.consecutiveFailures++;
                key.failureCount++;
                key.lastFailureAt = Date.now();
                if (key.consecutiveFailures >= state.config.failureThreshold) {
                    console.warn(`[ZCrystal:CredentialPool] Circuit OPENED for key "${key.name}" (${key.consecutiveFailures} consecutive failures)`);
                }
            }
            else {
                key.consecutiveFailures = 0;
            }
            return makeResult(JSON.stringify({ keyId: key.id, keyName: key.name, key: key.key }), { keyId: key.id });
        },
    });
    // --- claw_core_credential_status ---
    api.registerTool({
        name: 'zcrystal_credential_status',
        label: 'ZCrystal Credential Status',
        description: 'Get overall credential pool status and stats',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            const providers = new Set([...state.keys.values()].map(k => k.provider));
            const stats = {
                totalKeys: state.keys.size,
                providers: [...providers],
                totalUsage: state.usageLog.length,
                totalTokens: state.usageLog.reduce((s, r) => s + r.tokensUsed, 0),
                totalCost: state.usageLog.reduce((s, r) => s + r.costEstimate, 0),
                openCircuits: [...state.keys.values()].filter(k => isCircuitOpen(k, state.config)).length,
            };
            return makeResult(JSON.stringify(stats, null, 2), stats);
        },
    });
    // --- claw_core_credential_reset_circuit ---
    api.registerTool({
        name: 'zcrystal_credential_reset_circuit',
        label: 'ZCrystal Credential Reset Circuit',
        description: 'Manually reset circuit breaker for a key',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return makeErr('Credential pool not initialized');
            const key = state.keys.get(params.id);
            if (!key)
                return makeErr(`Credential "${params.id}" not found`);
            key.consecutiveFailures = 0;
            key.failureCount = 0;
            key.lastFailureAt = undefined;
            saveKeysToStore(state);
            return makeResult(`Circuit reset for "${key.name}"`);
        },
    });
}
// =====================================================================
// Accessor for internal use (tools, hooks, etc.)
// =====================================================================
export function getCredentialPoolState() {
    return poolState;
}
export function getCredentialKey(provider) {
    if (!poolState)
        return undefined;
    return getActiveKeyByProvider(poolState, provider);
}
//# sourceMappingURL=credential-pool.js.map