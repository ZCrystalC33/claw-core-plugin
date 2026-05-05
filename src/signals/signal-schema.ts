/**
 * Signal JSON Schema
 * 
 * Unified signal model for trading signals from various sources
 */

export interface Signal {
  id: string;
  symbol: string;           // e.g., "BTCUSDT"
  side: 'long' | 'short';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;       // 0-100
  timestamp: number;        // Unix timestamp (ms)
  source: string;           // e.g., "wss", "manual", "strategy_a"
  metadata?: {
    wss_score?: number;
    volume_ratio?: number;
    rsi?: number;
    [key: string]: number | string | boolean | undefined;
  };
}

export interface SignalCreateInput {
  symbol: string;
  side: 'long' | 'short';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  source: string;
  metadata?: Signal['metadata'];
}

export interface SignalStoreData {
  signals: Record<string, Signal>;  // id -> Signal
  updatedAt: number;
}
