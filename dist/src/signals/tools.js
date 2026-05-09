/**
 * Signal Tools - Claw Core API format
 */
import { Type } from '@sinclair/typebox';
import { okResult, errResult } from '../intelligence/utils.js';
import { SignalStore } from './signal-store.js';
import { SignalWebhook } from './webhook.js';
let signalStore = null;
let signalWebhook = null;
function getSignalStore() {
    if (!signalStore) {
        signalStore = new SignalStore('./data/signals');
    }
    return signalStore;
}
function getSignalWebhook() {
    if (!signalWebhook) {
        signalWebhook = new SignalWebhook({ url: process.env.CLAWCORE_SIGNAL_WEBHOOK_URL ?? '' });
    }
    return signalWebhook;
}
export function registerSignalTools(api, _state) {
    const store = getSignalStore();
    store.init().catch(err => {
        console.error('[SignalTools] Failed to init:', err);
    });
    api.registerTool({
        name: 'clawcore_signals_list',
        label: 'List Signals',
        description: 'List all signals from the store',
        parameters: Type.Object({ activeOnly: Type.Optional(Type.Boolean()) }),
        async execute(_id, _params) {
            const p = _params;
            try {
                const all = Array.from(store['signals'].values());
                const signals = p.activeOnly ? all.filter((s) => s.active !== false) : all;
                return okResult(`Signals (${signals.length}):`, signals);
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
    api.registerTool({
        name: 'clawcore_signals_get',
        label: 'Get Signal',
        description: 'Get a signal by ID',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, _params) {
            const p = _params;
            try {
                const signal = store['signals'].get(p.id);
                if (!signal)
                    return errResult(`Signal not found: ${p.id}`);
                return okResult('Signal found', signal);
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
    api.registerTool({
        name: 'clawcore_signals_create',
        label: 'Create Signal',
        description: 'Create a new trading signal',
        parameters: Type.Object({
            symbol: Type.String(),
            side: Type.Union([Type.Literal('long'), Type.Literal('short')]),
            entry_price: Type.Number(),
            stop_loss: Type.Number(),
            take_profit: Type.Number(),
            confidence: Type.Optional(Type.Number()),
            source: Type.Optional(Type.String()),
        }),
        async execute(_id, _params) {
            const p = _params;
            try {
                const input = {
                    symbol: p.symbol,
                    side: p.side,
                    entry_price: p.entry_price,
                    stop_loss: p.stop_loss,
                    take_profit: p.take_profit,
                    confidence: p.confidence ?? 0.8,
                    source: p.source ?? 'clawcore',
                };
                const result = await store.add(input);
                if ('error' in result)
                    return errResult(String(result.error));
                return okResult('Signal created', result.data);
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
    api.registerTool({
        name: 'clawcore_signals_delete',
        label: 'Delete Signal',
        description: 'Delete a signal by ID',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, _params) {
            const p = _params;
            try {
                const result = await store.remove(p.id);
                if ('error' in result)
                    return errResult(String(result.error));
                return okResult('Signal deleted');
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
    api.registerTool({
        name: 'clawcore_signals_webhook_push',
        label: 'Push Webhook',
        description: 'Push a signal to the configured webhook',
        parameters: Type.Object({ id: Type.String() }),
        async execute(_id, _params) {
            const p = _params;
            try {
                const signal = store['signals'].get(p.id);
                if (!signal)
                    return errResult(`Signal not found: ${p.id}`);
                const webhook = getSignalWebhook();
                const result = await webhook.push(signal);
                return okResult('Webhook pushed', result);
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
    api.registerTool({
        name: 'clawcore_signals_webhook_configure',
        label: 'Configure Webhook',
        description: 'Configure webhook URL',
        parameters: Type.Object({ url: Type.String(), secret: Type.Optional(Type.String()) }),
        async execute(_id, _params) {
            const p = _params;
            try {
                signalWebhook = new SignalWebhook({ url: p.url, secret: p.secret });
                return okResult('Webhook configured');
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
    api.registerTool({
        name: 'clawcore_signals_stats',
        label: 'Signal Stats',
        description: 'Get signal store statistics',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            try {
                const signals = Array.from(store['signals'].values());
                return okResult('Signal stats', {
                    total: signals.length,
                    active: signals.filter((s) => s.active !== false).length,
                });
            }
            catch (err) {
                return errResult(String(err));
            }
        }
    });
}
//# sourceMappingURL=tools.js.map