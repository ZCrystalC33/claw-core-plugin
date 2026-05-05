/**
 * Signal Webhook Pusher
 *
 * Pushes signals to external endpoints (e.g., Freqtrade webhook)
 * Supports Freqtrade webhook format with retry mechanism (max 3 attempts)
 */
// ============================================================================
// Webhook Pusher
// ============================================================================
export class SignalWebhook {
    config;
    constructor(config) {
        this.config = {
            maxRetries: 3,
            timeoutMs: 10000,
            ...config,
        };
    }
    /**
     * Push a signal to the configured webhook URL.
     * Converts signal to Freqtrade webhook format.
     */
    async push(signal) {
        const payload = this.buildFreqtradePayload(signal);
        return this.postWithRetry(payload);
    }
    /**
     * Push a custom payload to the webhook.
     */
    async pushCustom(payload) {
        return this.postWithRetry(payload);
    }
    /**
     * Build a Freqtrade-compatible webhook payload.
     * Freqtrade webhook expects:
     *   { action: "buy"|"sell", pair: "BTCUSDT", limit: price }
     */
    buildFreqtradePayload(signal) {
        const action = signal.side === 'long' ? 'buy' : 'sell';
        return {
            action,
            pair: signal.symbol,
            limit: signal.entry_price,
            order_type: 'limit',
            signal,
        };
    }
    async postWithRetry(payload) {
        const maxRetries = this.config.maxRetries ?? 3;
        let lastError = '';
        let lastResponseCode;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await this.post(payload);
                if (response.ok) {
                    return { success: true, attempts: attempt, responseCode: response.status };
                }
                lastResponseCode = response.status;
                lastError = `HTTP ${response.status}`;
            }
            catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
            }
            // Wait before retry (exponential backoff: 500ms, 1s, 2s)
            if (attempt < maxRetries) {
                await this.sleep(500 * Math.pow(2, attempt - 1));
            }
        }
        return {
            success: false,
            attempts: maxRetries,
            responseCode: lastResponseCode,
            error: lastError,
        };
    }
    async post(payload) {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.config.secret) {
            headers['Authorization'] = `Bearer ${this.config.secret}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 10000);
        try {
            const response = await fetch(this.config.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload, null, 2),
                signal: controller.signal,
            });
            return response;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Update the webhook URL.
     */
    setUrl(url) {
        this.config.url = url;
    }
    /**
     * Get current config (without secret).
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=webhook.js.map