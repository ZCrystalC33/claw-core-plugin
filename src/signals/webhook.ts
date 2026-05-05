/**
 * Signal Webhook Pusher
 * 
 * Pushes signals to external endpoints (e.g., Freqtrade webhook)
 * Supports Freqtrade webhook format with retry mechanism (max 3 attempts)
 */

import type { Signal } from './signal-schema.js';

// ============================================================================
// Types
// ============================================================================

export interface WebhookConfig {
  url: string;
  secret?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface WebhookPayload {
  // Freqtrade-compatible format
  action?: string;
  pair?: string;
  limit?: number;
  order_type?: string;
  // Extended fields
  signal?: Signal;
}

export interface WebhookResult {
  success: boolean;
  attempts: number;
  responseCode?: number;
  error?: string;
}

// ============================================================================
// Webhook Pusher
// ============================================================================

export class SignalWebhook {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
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
  async push(signal: Signal): Promise<WebhookResult> {
    const payload = this.buildFreqtradePayload(signal);
    return this.postWithRetry(payload);
  }

  /**
   * Push a custom payload to the webhook.
   */
  async pushCustom(payload: WebhookPayload): Promise<WebhookResult> {
    return this.postWithRetry(payload);
  }

  /**
   * Build a Freqtrade-compatible webhook payload.
   * Freqtrade webhook expects:
   *   { action: "buy"|"sell", pair: "BTCUSDT", limit: price }
   */
  private buildFreqtradePayload(signal: Signal): WebhookPayload {
    const action = signal.side === 'long' ? 'buy' : 'sell';
    return {
      action,
      pair: signal.symbol,
      limit: signal.entry_price,
      order_type: 'limit',
      signal,
    };
  }

  private async postWithRetry(payload: WebhookPayload): Promise<WebhookResult> {
    const maxRetries = this.config.maxRetries ?? 3;
    let lastError = '';
    let lastResponseCode: number | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.post(payload);
        if (response.ok) {
          return { success: true, attempts: attempt, responseCode: response.status };
        }
        lastResponseCode = response.status;
        lastError = `HTTP ${response.status}`;
      } catch (err) {
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

  private async post(payload: WebhookPayload): Promise<Response> {
    const headers: Record<string, string> = {
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
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update the webhook URL.
   */
  setUrl(url: string): void {
    this.config.url = url;
  }

  /**
   * Get current config (without secret).
   */
  getConfig(): WebhookConfig & { secret?: string } {
    return { ...this.config };
  }
}
