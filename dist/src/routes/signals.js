/**
 * Signal API Tools
 *
 * OpenClaw tools for Signal CRUD + webhook push
 */
import { Type } from '@sinclair/typebox';
import { okResult, errResult } from '../index.js';
import { SignalStore } from '../signals/signal-store.js';
import { SignalWebhook } from '../signals/webhook.js';
import { config } from '../config.js';
// ============================================================================
// Singleton Instances
// ============================================================================
let signalStore = null;
let signalWebhook = null;
function getSignalStore() {
    if (!signalStore) {
        signalStore = new SignalStore(config.paths.data);
        // Init is called at registration time
    }
    return signalStore;
}
function getSignalWebhook() {
    if (!signalWebhook) {
        const webhookUrl = process.env.ZCRYSTAL_SIGNAL_WEBHOOK_URL ?? '';
        signalWebhook = new SignalWebhook({ url: webhookUrl });
    }
    return signalWebhook;
}
// ============================================================================
// Register Signal Tools
// ============================================================================
export function registerSignalTools(api, _state) {
    // Initialize signal store
    const store = getSignalStore();
    store.init().catch(err => {
        console.error('[SignalTools] Failed to init signal store:', err);
    });
    // GET /signals — List all active signals
    api.registerTool({
        name: 'zcrystal_signals_list',
        label: 'ZCrystal Signals List',
        description: 'List all active trading signals (signals from the last 24 hours)',
        parameters: Type.Object({
            symbol: Type.Optional(Type.String()),
            limit: Type.Optional(Type.Number()),
        }),
        async execute(_id, params) {
            const store = getSignalStore();
            let signals;
            if (params.symbol) {
                signals = store.getBySymbol(params.symbol);
            }
            else {
                signals = store.getAll();
            }
            const limited = params.limit ? signals.slice(0, params.limit) : signals;
            return okResult(JSON.stringify(limited, null, 2), { count: limited.length });
        },
    });
    // GET /signals/:id — Get a specific signal
    api.registerTool({
        name: 'zcrystal_signals_get',
        label: 'ZCrystal Signals Get',
        description: 'Get a specific trading signal by ID',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, params) {
            const store = getSignalStore();
            const signal = store.get(params.id);
            if (!signal)
                return errResult(`Signal not found: ${params.id}`);
            return okResult(JSON.stringify(signal, null, 2));
        },
    });
    // POST /signals — Create a new signal (manual entry)
    api.registerTool({
        name: 'zcrystal_signals_create',
        label: 'ZCrystal Signals Create',
        description: 'Create a new trading signal manually',
        parameters: Type.Object({
            symbol: Type.String(),
            side: Type.Union([Type.Literal('long'), Type.Literal('short')]),
            entry_price: Type.Number(),
            stop_loss: Type.Number(),
            take_profit: Type.Number(),
            confidence: Type.Number({ minimum: 0, maximum: 100 }),
            source: Type.String(),
            metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
            push_webhook: Type.Optional(Type.Boolean()),
        }),
        async execute(_id, params) {
            const store = getSignalStore();
            const input = {
                symbol: params.symbol,
                side: params.side,
                entry_price: params.entry_price,
                stop_loss: params.stop_loss,
                take_profit: params.take_profit,
                confidence: params.confidence,
                source: params.source,
                metadata: params.metadata,
            };
            const result = await store.add(input);
            if (!result.ok)
                return errResult(String(result.error ?? 'Failed to create signal'));
            const signal = result.data;
            // Optionally push to webhook
            if (params.push_webhook) {
                const webhook = getSignalWebhook();
                if (webhook.getConfig().url) {
                    const pushResult = await webhook.push(signal);
                    return okResult(JSON.stringify({ signal, webhook: pushResult }, null, 2));
                }
            }
            return okResult(JSON.stringify(signal, null, 2));
        },
    });
    // DELETE /signals/:id — Remove a signal
    api.registerTool({
        name: 'zcrystal_signals_delete',
        label: 'ZCrystal Signals Delete',
        description: 'Delete a trading signal by ID',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, params) {
            const store = getSignalStore();
            const result = await store.remove(params.id);
            if (!result.ok)
                return errResult(`Signal not found: ${params.id}`);
            return okResult(`Signal deleted: ${params.id}`);
        },
    });
    // POST /signals/webhook/push — Push a signal to webhook
    api.registerTool({
        name: 'zcrystal_signals_webhook_push',
        label: 'ZCrystal Signals Webhook Push',
        description: 'Push a specific signal to the configured webhook (Freqtrade format)',
        parameters: Type.Object({
            signal_id: Type.String(),
        }),
        async execute(_id, params) {
            const store = getSignalStore();
            const signal = store.get(params.signal_id);
            if (!signal)
                return errResult(`Signal not found: ${params.signal_id}`);
            const webhook = getSignalWebhook();
            const result = await webhook.push(signal);
            if (result.success) {
                return okResult(JSON.stringify(result, null, 2));
            }
            return errResult(`Webhook push failed after ${result.attempts} attempts: ${result.error}`);
        },
    });
    // POST /signals/webhook/configure — Configure webhook URL
    api.registerTool({
        name: 'zcrystal_signals_webhook_configure',
        label: 'ZCrystal Signals Webhook Configure',
        description: 'Configure the signal webhook URL',
        parameters: Type.Object({
            url: Type.String(),
            secret: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
            const webhook = getSignalWebhook();
            webhook.setUrl(params.url);
            return okResult(`Webhook URL configured: ${params.url}`);
        },
    });
    // GET /signals/stats — Get signal statistics
    api.registerTool({
        name: 'zcrystal_signals_stats',
        label: 'ZCrystal Signals Stats',
        description: 'Get signal store statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const store = getSignalStore();
            const signals = store.getAll();
            const stats = {
                total: signals.length,
                bySymbol: {},
                bySide: { long: 0, short: 0 },
                avgConfidence: 0,
            };
            let totalConfidence = 0;
            for (const s of signals) {
                stats.bySymbol[s.symbol] = (stats.bySymbol[s.symbol] ?? 0) + 1;
                stats.bySide[s.side]++;
                totalConfidence += s.confidence;
            }
            stats.avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;
            return okResult(JSON.stringify(stats, null, 2));
        },
    });
}
//# sourceMappingURL=signals.js.map