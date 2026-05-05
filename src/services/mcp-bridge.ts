/**
 * MCP Bridge Service for ZCrystal Plugin
 * 
 * Bridges Claw_Core MCP Server tools to OpenClaw via stdio transport.
 * Uses @modelcontextprotocol/sdk for JSON-RPC framing.
 * Registered as an OpenClaw Plugin Service via `api.registerService()`.
 */

import type { OpenClawPluginApi, OpenClawPluginService, OpenClawPluginServiceContext } from 'openclaw/plugin-sdk/plugin-entry';
import { Type } from '@sinclair/typebox';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// =====================================================================
// Types
// =====================================================================

export interface McpBridgeConfig {
  mcpServerPath?: string;    // path to claw-core-mcp server binary/script
  mcpServerArgs?: string[];  // args to pass to MCP server
  autoReconnect?: boolean;
  healthCheckIntervalMs?: number;
  maxRetries?: number;
}

interface BridgeState {
  config: Required<McpBridgeConfig>;
  mcpClient?: InstanceType<typeof Client>;
  connected: boolean;
  tools: Map<string, { name: string; description: string; inputSchema: unknown }>;
  retryCount: number;
  healthCheckTimer?: ReturnType<typeof setInterval>;
  initialized: boolean;
  workspaceDir: string;
}

// Module-level state
let bridgeState: BridgeState | null = null;

function makeDefaults(workspaceDir: string): Required<McpBridgeConfig> {
  return {
    mcpServerPath: join(process.env.HOME || '', '.openclaw', 'extensions', 'zcrystal', 'bin', 'claw-core-mcp'),
    mcpServerArgs: [],
    autoReconnect: true,
    healthCheckIntervalMs: 30_000,
    maxRetries: 3,
  };
}

function okResult(text: string, details?: unknown) {
  return { content: [{ type: 'text' as const, text }], details: details ?? {} };
}

function errResult(text: string) {
  return { content: [{ type: 'text' as const, text }], details: {}, isError: true };
}

// =====================================================================
// MCP Client Lifecycle
// =====================================================================

async function startMcpClient(state: BridgeState): Promise<void> {
  if (state.mcpClient) {
    try {
      await state.mcpClient.close();
    } catch { /* ignore */ }
    state.mcpClient = undefined;
  }

  console.log('[ZCrystal:McpBridge] Starting MCP server:', state.config.mcpServerPath);

  // Use StdioClientTransport which spawns the process internally
  const transport = new StdioClientTransport({
    command: state.config.mcpServerPath,
    args: state.config.mcpServerArgs,
    cwd: state.workspaceDir,
  });

  const client = new Client({
    name: 'zcrystal-mcp-bridge',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  // Handle transport-level errors
  transport.onerror = (e: Error) => {
    console.error('[ZCrystal:McpBridge] Transport error:', e);
    state.connected = false;
  };
  transport.onclose = () => {
    console.log('[ZCrystal:McpBridge] Transport closed');
    state.connected = false;
  };

  try {
    await client.connect(transport);
    state.mcpClient = client;
    state.connected = true;
    state.retryCount = 0;

    // Discover available tools
    try {
      const toolsResult = await client.listTools();
      const toolList = (toolsResult as { tools?: Array<{ name: string; description?: string; inputSchema?: unknown }> }).tools || [];
      state.tools.clear();
      for (const t of toolList) {
        state.tools.set(t.name, {
          name: t.name,
          description: t.description || '',
          inputSchema: t.inputSchema || {},
        });
      }
      console.log('[ZCrystal:McpBridge] Discovered', state.tools.size, 'MCP tools');
    } catch (e) {
      console.warn('[ZCrystal:McpBridge] Failed to list tools:', e);
    }

    console.log('[ZCrystal:McpBridge] Connected to MCP server');
  } catch (e) {
    console.error('[ZCrystal:McpBridge] Client connect failed:', e);
    state.connected = false;
    throw e;
  }
}

// =====================================================================
// Service Definition
// =====================================================================

export function createMcpBridgeService(api: OpenClawPluginApi): OpenClawPluginService {
  return {
    id: 'zcrystal-mcp-bridge',
    async start(ctx: OpenClawPluginServiceContext) {
      console.log('[ZCrystal:McpBridge] Starting service...');

      const workspaceDir = ctx.workspaceDir || process.env.HOME || '';
      bridgeState = {
        config: makeDefaults(workspaceDir),
        connected: false,
        tools: new Map(),
        retryCount: 0,
        initialized: false,
        workspaceDir,
      };

      // Register management tools
      registerMcpBridgeTools(api, bridgeState);

      // Try to connect to MCP server (non-blocking failure is OK)
      try {
        await startMcpClient(bridgeState);
      } catch (e) {
        console.warn('[ZCrystal:McpBridge] Initial connection failed (MCP server may not be installed):', e);
        bridgeState.retryCount++;
      }

      // Start health check
      bridgeState.healthCheckTimer = setInterval(async () => {
        if (!bridgeState) return;
        if (!bridgeState.connected && bridgeState.config.autoReconnect) {
          if (bridgeState.retryCount < bridgeState.config.maxRetries) {
            console.log('[ZCrystal:McpBridge] Attempting reconnect...');
            try {
              await startMcpClient(bridgeState);
            } catch (e) {
              bridgeState.retryCount++;
              console.warn('[ZCrystal:McpBridge] Reconnect failed:', e);
            }
          }
        } else if (bridgeState.mcpClient && bridgeState.connected) {
          // Ping to verify connection
          try {
            await bridgeState.mcpClient.ping();
          } catch {
            bridgeState.connected = false;
            console.warn('[ZCrystal:McpBridge] Connection lost, will reconnect on next health check');
          }
        }
      }, bridgeState.config.healthCheckIntervalMs);

      bridgeState.initialized = true;
      console.log('[ZCrystal:McpBridge] Service started. Tools available:', bridgeState.tools.size);
    },

    async stop(_ctx: OpenClawPluginServiceContext) {
      console.log('[ZCrystal:McpBridge] Stopping service...');
      if (bridgeState?.healthCheckTimer) {
        clearInterval(bridgeState.healthCheckTimer);
      }
      if (bridgeState?.mcpClient) {
        try {
          await bridgeState.mcpClient.close();
        } catch { /* ignore */ }
      }
      bridgeState = null;
      console.log('[ZCrystal:McpBridge] Service stopped.');
    },
  };
}

// =====================================================================
// Tool Registration
// =====================================================================

function registerMcpBridgeTools(api: OpenClawPluginApi, state: BridgeState): void {

  // --- zcrystal_mcp_status ---
  api.registerTool({
    name: 'zcrystal_mcp_status',
    label: 'ZCrystal MCP Bridge Status',
    description: 'Get MCP bridge connection status and available tools',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      if (!state.initialized) return errResult('MCP bridge not initialized');
      const toolNames = [...state.tools.keys()];
      return okResult(`MCP Bridge Status:
- Connected: ${state.connected ? '✅ Yes' : '❌ No'}
- Server: ${state.config.mcpServerPath}
- Retry count: ${state.retryCount}/${state.config.maxRetries}
- Tools available: ${state.tools.size}
${toolNames.length > 0 ? '- Tools: ' + toolNames.join(', ') : ''}`, {
        connected: state.connected,
        toolCount: state.tools.size,
        tools: toolNames,
      });
    },
  });

  // --- zcrystal_mcp_tools_list ---
  api.registerTool({
    name: 'zcrystal_mcp_tools_list',
    label: 'ZCrystal MCP Tools List',
    description: 'List all MCP tools available through the bridge',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      if (!state.initialized) return errResult('MCP bridge not initialized');
      const tools = [...state.tools.values()];
      if (tools.length === 0) return okResult('No MCP tools available', { count: 0 });
      const lines = tools.map(t => `- ${t.name}: ${t.description || '(no description)'}`);
      return okResult(lines.join('\n'), { count: tools.length });
    },
  });

  // --- zcrystal_mcp_call ---
  api.registerTool({
    name: 'zcrystal_mcp_call',
    label: 'ZCrystal MCP Call',
    description: 'Call an MCP tool through the bridge',
    parameters: Type.Object({
      toolName: Type.String(),
      arguments: Type.Optional(Type.Record(Type.String(), Type.Any())),
    }),
    async execute(_id, params) {
      if (!state.initialized) return errResult('MCP bridge not initialized');
      if (!state.connected || !state.mcpClient) {
        return errResult('MCP server not connected');
      }
      if (!state.tools.has(params.toolName)) {
        return errResult(`MCP tool "${params.toolName}" not found. Available: ${[...state.tools.keys()].join(', ')}`);
      }

      try {
        const result = await state.mcpClient.callTool({
          name: params.toolName,
          arguments: params.arguments || {},
        });
        return okResult(JSON.stringify(result, null, 2), { toolName: params.toolName });
      } catch (e) {
        return errResult(`MCP call failed: ${e}`);
      }
    },
  });

  // --- zcrystal_mcp_reconnect ---
  api.registerTool({
    name: 'zcrystal_mcp_reconnect',
    label: 'ZCrystal MCP Reconnect',
    description: 'Force reconnection to MCP server',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      if (!state.initialized) return errResult('MCP bridge not initialized');
      state.retryCount = 0;
      state.connected = false;
      try {
        await startMcpClient(state);
        return okResult('✅ Reconnected to MCP server');
      } catch (e) {
        return errResult(`Reconnect failed: ${e}`);
      }
    },
  });
}

// =====================================================================
// Accessor for internal use
// =====================================================================

export function getMcpBridgeState(): BridgeState | null {
  return bridgeState;
}

export function getMcpTools(): Map<string, { name: string; description: string; inputSchema: unknown }> | null {
  return bridgeState?.tools ?? null;
}