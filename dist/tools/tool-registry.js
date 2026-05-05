/**
 * Claw_Core Tool Registry Service
 *
 * Discovers tools from Claw_Core's Python tool_registry and registers
 * them as OpenClaw tools via api.registerTool().
 *
 * Tool prefix: "clawcore_" to avoid naming conflicts.
 *
 * Uses child_process to call Python, avoiding direct import.
 */
import { execSync } from 'node:child_process';
import { Type } from '@sinclair/typebox';
const TOOL_PREFIX = 'clawcore_';
function discoverPythonTools() {
    try {
        const script = `
import sys
import json
from efficiency_core.tools.tool_registry import tool_registry, discover_builtin_tools

discover_builtin_tools()

tools = []
for name in tool_registry.list_all_tools():
    entry = tool_registry.get_entry(name)
    if entry:
        tools.append({
            "name": entry.name,
            "toolset": entry.toolset,
            "description": entry.description or "",
            "emoji": entry.emoji or "",
        })
print(json.dumps(tools))
`;
        const result = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            cwd: '/home/snow/.openclaw/workspace/openclaw-efficiency-core',
            timeout: 10000,
        });
        return JSON.parse(result.trim());
    }
    catch (err) {
        console.warn('[Claw_Core] Tool discovery failed:', err);
        return [];
    }
}
export function createToolRegistryService(api) {
    const registeredTools = [];
    const cwd = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';
    return {
        name: 'claw-core-tool-registry',
        async onStart() {
            console.log('[Claw_Core] ToolRegistry: Starting discovery...');
            const pythonTools = discoverPythonTools();
            console.log(`[Claw_Core] ToolRegistry: Discovered ${pythonTools.length} Python tools`);
            for (const tool of pythonTools) {
                const toolName = `${TOOL_PREFIX}${tool.name}`;
                try {
                    api.registerTool(() => ({
                        name: toolName,
                        label: `${tool.emoji} ${tool.name}`.trim() || toolName,
                        description: tool.description || `Claw_Core tool: ${tool.toolset}/${tool.name}`,
                        parameters: Type.Object({
                            input: Type.Optional(Type.String({
                                description: 'Tool input payload (JSON string or free text)'
                            })),
                        }),
                        async execute(_id, _params) {
                            const inputPayload = _params.input ?? '';
                            const script = `
import sys
import json
sys.path.insert(0, '${cwd.replace(/'/g, "\\'")}')
from efficiency_core.tools.tool_registry import tool_registry

entry = tool_registry.get_entry('${tool.name}')
if entry is None:
    print(json.dumps({"error": "Tool not found: ${tool.name}"}))
else:
    handler = entry.handler
    schema = entry.schema
    
    # Parse input
    try:
        input_data = json.loads('''${inputPayload.replace(/'/g, "\\'")}''')
    except:
        input_data = {'input': '''${inputPayload.replace(/'/g, "\\'")}'''}
    
    kwargs = {}
    if isinstance(input_data, dict):
        for k, v in input_data.items():
            if k in schema:
                kwargs[k] = v
    
    try:
        if entry.is_async:
            import asyncio
            result = asyncio.run(handler(**kwargs))
        else:
            result = handler(**kwargs)
        
        if hasattr(result, '__dict__'):
            result = vars(result)
        print(json.dumps({"result": result}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
`;
                            try {
                                const out = execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
                                    encoding: 'utf-8',
                                    cwd,
                                    timeout: 30000,
                                });
                                const parsed = JSON.parse(out.trim());
                                if (parsed.error) {
                                    return {
                                        content: [{ type: 'text', text: `Error: ${parsed.error}` }],
                                        details: {},
                                        isError: true,
                                    };
                                }
                                return {
                                    content: [{
                                            type: 'text',
                                            text: typeof parsed.result === 'string'
                                                ? parsed.result
                                                : JSON.stringify(parsed.result, null, 2),
                                        }],
                                    details: { tool: tool.name, toolset: tool.toolset },
                                };
                            }
                            catch (execErr) {
                                return {
                                    content: [{ type: 'text', text: `Execution failed: ${execErr.message}` }],
                                    details: {},
                                    isError: true,
                                };
                            }
                        },
                    }));
                    registeredTools.push(toolName);
                }
                catch (err) {
                    console.warn(`[Claw_Core] Failed to register tool ${toolName}:`, err);
                }
            }
            console.log(`[Claw_Core] ToolRegistry: Registered ${registeredTools.length} tools with prefix "${TOOL_PREFIX}"`);
        },
        async onStop() {
            console.log(`[Claw_Core] ToolRegistry: Stopped (${registeredTools.length} tools cleaned up)`);
            registeredTools.length = 0;
        },
    };
}
//# sourceMappingURL=tool-registry.js.map