import { Type } from '@sinclair/typebox';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
let bridgeState = null;
function makeDefaults(workspaceDir) {
    return {
        mcpServerPath: join(process.env.HOME || '', '.openclaw', 'extensions', 'zcrystal', 'bin', 'claw-core-mcp'),
        mcpServerArgs: [],
        autoReconnect: true,
        healthCheckIntervalMs: 30_000,
        maxRetries: 3,
    };
}
function okResult(text, details) {
    return { content: [{ type: 'text', text }], details: details ?? {} };
}
function errResult(text) {
    return { content: [{ type: 'text', text }], details: {}, isError: true };
}
async function startMcpClient(state) {
    if (state.mcpClient) {
        try {
            await state.mcpClient.close();
        }
        catch { }
        state.mcpClient = undefined;
    }
    console.log('[ZCrystal:McpBridge] Starting MCP server:', state.config.mcpServerPath);
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
    transport.onerror = (e) => {
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
        try {
            const toolsResult = await client.listTools();
            const toolList = toolsResult.tools || [];
            state.tools.clear();
            for (const t of toolList) {
                state.tools.set(t.name, {
                    name: t.name,
                    description: t.description || '',
                    inputSchema: t.inputSchema || {},
                });
            }
            console.log('[ZCrystal:McpBridge] Discovered', state.tools.size, 'MCP tools');
        }
        catch (e) {
            console.warn('[ZCrystal:McpBridge] Failed to list tools:', e);
        }
        console.log('[ZCrystal:McpBridge] Connected to MCP server');
    }
    catch (e) {
        console.error('[ZCrystal:McpBridge] Client connect failed:', e);
        state.connected = false;
        throw e;
    }
}
export function createMcpBridgeService(api) {
    return {
        id: 'zcrystal-mcp-bridge',
        async start(ctx) {
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
            registerMcpBridgeTools(api, bridgeState);
            try {
                await startMcpClient(bridgeState);
            }
            catch (e) {
                console.warn('[ZCrystal:McpBridge] Initial connection failed (MCP server may not be installed):', e);
                bridgeState.retryCount++;
            }
            bridgeState.healthCheckTimer = setInterval(async () => {
                if (!bridgeState)
                    return;
                if (!bridgeState.connected && bridgeState.config.autoReconnect) {
                    if (bridgeState.retryCount < bridgeState.config.maxRetries) {
                        console.log('[ZCrystal:McpBridge] Attempting reconnect...');
                        try {
                            await startMcpClient(bridgeState);
                        }
                        catch (e) {
                            bridgeState.retryCount++;
                            console.warn('[ZCrystal:McpBridge] Reconnect failed:', e);
                        }
                    }
                }
                else if (bridgeState.mcpClient && bridgeState.connected) {
                    try {
                        await bridgeState.mcpClient.ping();
                    }
                    catch {
                        bridgeState.connected = false;
                        console.warn('[ZCrystal:McpBridge] Connection lost, will reconnect on next health check');
                    }
                }
            }, bridgeState.config.healthCheckIntervalMs);
            bridgeState.initialized = true;
            console.log('[ZCrystal:McpBridge] Service started. Tools available:', bridgeState.tools.size);
        },
        async stop(_ctx) {
            console.log('[ZCrystal:McpBridge] Stopping service...');
            if (bridgeState?.healthCheckTimer) {
                clearInterval(bridgeState.healthCheckTimer);
            }
            if (bridgeState?.mcpClient) {
                try {
                    await bridgeState.mcpClient.close();
                }
                catch { }
            }
            bridgeState = null;
            console.log('[ZCrystal:McpBridge] Service stopped.');
        },
    };
}
function registerMcpBridgeTools(api, state) {
    api.registerTool({
        name: 'zcrystal_mcp_status',
        label: 'ZCrystal MCP Bridge Status',
        description: 'Get MCP bridge connection status and available tools',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            if (!state.initialized)
                return errResult('MCP bridge not initialized');
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
    api.registerTool({
        name: 'zcrystal_mcp_tools_list',
        label: 'ZCrystal MCP Tools List',
        description: 'List all MCP tools available through the bridge',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            if (!state.initialized)
                return errResult('MCP bridge not initialized');
            const tools = [...state.tools.values()];
            if (tools.length === 0)
                return okResult('No MCP tools available', { count: 0 });
            const lines = tools.map(t => `- ${t.name}: ${t.description || '(no description)'}`);
            return okResult(lines.join('\n'), { count: tools.length });
        },
    });
    api.registerTool({
        name: 'zcrystal_mcp_call',
        label: 'ZCrystal MCP Call',
        description: 'Call an MCP tool through the bridge',
        parameters: Type.Object({
            toolName: Type.String(),
            arguments: Type.Optional(Type.Record(Type.String(), Type.Any())),
        }),
        async execute(_id, _params) {
            const params = _params;
            if (!state.initialized)
                return errResult('MCP bridge not initialized');
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
            }
            catch (e) {
                return errResult(`MCP call failed: ${e}`);
            }
        },
    });
    api.registerTool({
        name: 'zcrystal_mcp_reconnect',
        label: 'ZCrystal MCP Reconnect',
        description: 'Force reconnection to MCP server',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            if (!state.initialized)
                return errResult('MCP bridge not initialized');
            state.retryCount = 0;
            state.connected = false;
            try {
                await startMcpClient(state);
                return okResult('✅ Reconnected to MCP server');
            }
            catch (e) {
                return errResult(`Reconnect failed: ${e}`);
            }
        },
    });
}
export function getMcpBridgeState() {
    return bridgeState;
}
export function getMcpTools() {
    return bridgeState?.tools ?? null;
}
