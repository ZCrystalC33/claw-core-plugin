/**
 * Claw_Core Insights Engine Service
 * 
 * Collects usage data via Hooks and exposes query API via registerGatewayMethod.
 * Wraps the Python InsightsEngine for actual analysis.
 */

import { execSync } from 'node:child_process';

const INSIGHTS_DB = `${process.env.HOME}/.openclaw/claw-core-insights.db`;

export interface InsightsService {
  name: string;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
}

function queryInsightsPython(days: number = 7): any {
  const cwd = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
  try {
    const script = `
import sys
import json
sys.path.insert(0, '${cwd.replace(/'/g, "\\'")}')

try:
    from efficiency_core.insights import InsightsEngine
    
    engine = InsightsEngine()
    report = engine.generate(days=${days})
    output = engine.to_dict(report)
    print(json.dumps(output))
except Exception as e:
    print(json.dumps({"error": str(e), "raw": None}))
`;
    const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      cwd,
      timeout: 15000,
    });
    return JSON.parse(result.trim());
  } catch (err: any) {
    return { error: err.message, raw: null };
  }
}

function recordSessionUpdatePython(
  sessionId: string,
  messageCount: number,
  inputTokens: number,
  outputTokens: number,
  toolCalls: number,
  errors: number,
): void {
  const cwd = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
  try {
    const script = `
import sys
import json
import time
sys.path.insert(0, '${cwd.replace(/'/g, "\\'")}')

try:
    import sqlite3
    db_path = '${INSIGHTS_DB}'
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS session_usage (
            session_id TEXT,
            timestamp REAL,
            message_count INTEGER,
            input_tokens INTEGER,
            output_tokens INTEGER,
            tool_calls INTEGER,
            errors INTEGER
        )
    ''')
    
    cur.execute('''
        INSERT INTO session_usage 
        (session_id, timestamp, message_count, input_tokens, output_tokens, tool_calls, errors)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', ('${sessionId}', time.time(), ${messageCount}, ${inputTokens}, ${outputTokens}, ${toolCalls}, ${errors}))
    
    conn.commit()
    conn.close()
    print(json.dumps({"ok": True}))
except Exception as e:
    print(json.dumps({"error": str(e)}))
`;
    execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      timeout: 5000,
    });
  } catch {
    // Silently ignore persistence failures
  }
}

export function createInsightsService(api: any): InsightsService {
  return {
    name: 'claw-core-insights',

    async onStart() {
      console.log('[Claw_Core] Insights: Starting...');

      // =====================================================================
      // Register Gateway Method for querying insights
      // =====================================================================

      api.registerGatewayMethod('claw_core.insights.query', async (ctx: any) => {
        const days = ctx.params?.days ?? 7;
        const result = queryInsightsPython(days);
        
        if (result.error) {
          return {
            content: [{
              type: 'text' as const,
              text: `Insights query failed: ${result.error}`,
            }],
            isError: true,
          };
        }

        const formatted = formatInsightsReport(result);
        return {
          content: [{ type: 'text' as const, text: formatted }],
          details: result,
        };
      });

      // =====================================================================
      // Register Internal Hook to capture session updates
      // =====================================================================

      // Try multiple hook name variants for session updates
      const SESSION_HOOKS = [
        'session:updated',
        'sessionPatch',
        'isSessionPatchEvent',
        'onSessionPatch',
      ];

      for (const hookName of SESSION_HOOKS) {
        try {
          api.registerHook(hookName, async (ctx: any) => {
            try {
              const sessionId = ctx?.sessionId ?? ctx?.session?.id ?? 'unknown';
              const messageCount = ctx?.messageCount ?? 0;
              const inputTokens = ctx?.inputTokens ?? ctx?.usage?.inputTokens ?? 0;
              const outputTokens = ctx?.outputTokens ?? ctx?.usage?.outputTokens ?? 0;
              const toolCalls = ctx?.toolCalls ?? 0;
              const errors = ctx?.errors ?? 0;

              recordSessionUpdatePython(
                sessionId,
                messageCount,
                inputTokens,
                outputTokens,
                toolCalls,
                errors,
              );
            } catch {
              // Never let hook failures propagate
            }
          });
          console.log(`[Claw_Core] Insights: Registered hook "${hookName}"`);
          break;
        } catch {
          // Hook not available, try next
        }
      }

      console.log('[Claw_Core] Insights: Service started');
    },

    async onStop() {
      console.log('[Claw_Core] Insights: Service stopped');
    },
  };
}

function formatInsightsReport(data: any): string {
  if (data.error) {
    return `❌ Insights Error: ${data.error}`;
  }

  const o = data.overview ?? {};
  const lines = [
    '📊 **Claw_Core Insights**',
    '',
    `**Period:** Last ${data.period_days ?? 7} days`,
    '',
    '**Overview**',
    `• Sessions: ${o.total_sessions ?? 0}`,
    `• Messages: ${o.total_messages ?? 0}`,
    `• Input Tokens: ${(o.total_tokens_input ?? 0).toLocaleString()}`,
    `• Output Tokens: ${(o.total_tokens_output ?? 0).toLocaleString()}`,
    `• Est. Cost: $${(o.total_cost_usd ?? 0).toFixed(4)}`,
    '',
  ];

  if (data.top_tools?.length > 0) {
    lines.push('**Top Tools**');
    for (const t of data.top_tools.slice(0, 5)) {
      lines.push(`• ${t.name}: ${t.count ?? t.value ?? 0} calls`);
    }
    lines.push('');
  }

  if (data.tool_breakdown?.length > 0) {
    lines.push('**Tool Breakdown**');
    for (const t of data.tool_breakdown.slice(0, 5)) {
      const pct = t.percentage?.toFixed(1) ?? '0.0';
      lines.push(`• ${t.name}: ${t.count ?? 0} (${pct}%)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}