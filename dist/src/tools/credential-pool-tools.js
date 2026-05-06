/**
 * Credential Pool Tools - Bridge to Python efficiency_core.credential_pool
 */
import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import { okResult, errResult } from '../index.js';

const CORE_CWD = '/home/snow/.openclaw/workspace/openclaw-efficiency-core';

function runPython(script) {
    try {
        return execSync(`python3 -c "${script.replace(/"/g, '\\"')}"`, {
            encoding: 'utf-8',
            cwd: CORE_CWD,
            timeout: 15000,
        }).trim();
    } catch (e) {
        return null;
    }
}

export function registerCredentialPoolTools(api) {
    // ─── Get Credential ──────────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_credential_get',
        label: '🔑 ClawCore Credential Get',
        description: 'Retrieve a credential by ID from the pool',
        parameters: Type.Object({
            credential_id: Type.String({ description: 'Credential ID to retrieve' }),
        }),
        async execute(_id, _params) {
            const p = _params;
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.credential_pool import CredentialPool

pool = CredentialPool(provider='default')
cred = pool.get('${p.credential_id}')
if cred:
    print(json.dumps({
        'id': cred.id,
        'provider': cred.provider,
        'label': cred.label,
        'api_key': cred.api_key[:8] + '...' if cred.api_key else None,
        'priority': cred.priority,
        'auth_type': cred.auth_type,
        'last_status': cred.last_status,
        'last_used_at': str(cred.last_used_at) if cred.last_used_at else None,
        'use_count': cred.use_count,
        'failure_count': cred.failure_count
    }))
else:
    print('null')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            if (raw === 'null') return errResult('Credential not found');
            try {
                return okResult(raw);
            } catch {
                return errResult('Parse error');
            }
        },
    });

    // ─── List All Credentials ───────────────────────────────────────
    api.registerTool({
        name: 'clawcore_credential_list',
        label: '📋 ClawCore Credential List',
        description: 'List all credentials in the pool',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.credential_pool import CredentialPool

pool = CredentialPool(provider='default')
creds = pool.list_all()
result = [{
    'id': c.id,
    'provider': c.provider,
    'label': c.label,
    'api_key_prefix': c.api_key[:8] + '...' if c.api_key else None,
    'priority': c.priority,
    'auth_type': c.auth_type,
    'last_status': c.last_status,
    'use_count': c.use_count,
    'failure_count': c.failure_count
} for c in creds]
print(json.dumps(result))
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            try {
                return okResult(raw);
            } catch {
                return errResult('Parse error');
            }
        },
    });

    // ─── Select Best Credential ──────────────────────────────────────
    api.registerTool({
        name: 'clawcore_credential_select',
        label: '✅ ClawCore Credential Select',
        description: 'Select the best available credential from the pool',
        parameters: Type.Object({}),
        async execute(_id, _params) {
            const script = `
import sys
import json
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.credential_pool import CredentialPool

pool = CredentialPool(provider='default')
cred = pool.select()
if cred:
    print(json.dumps({
        'id': cred.id,
        'provider': cred.provider,
        'label': cred.label,
        'api_key_prefix': cred.api_key[:8] + '...' if cred.api_key else None,
        'priority': cred.priority,
        'auth_type': cred.auth_type,
        'last_status': cred.last_status
    }))
else:
    print('null')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            if (raw === 'null') return errResult('No available credentials');
            try {
                return okResult(raw);
            } catch {
                return errResult('Parse error');
            }
        },
    });

    // ─── Mark Credential OK ─────────────────────────────────────────
    api.registerTool({
        name: 'clawcore_credential_mark_ok',
        label: '✔️ ClawCore Credential Mark OK',
        description: 'Mark a credential as working correctly',
        parameters: Type.Object({
            credential_id: Type.String({ description: 'Credential ID to mark as OK' }),
        }),
        async execute(_id, _params) {
            const p = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.credential_pool import CredentialPool

pool = CredentialPool(provider='default')
pool.mark_ok('${p.credential_id}')
print('ok')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult('Credential marked as OK');
        },
    });

    // ─── Mark Credential Failed ─────────────────────────────────────
    api.registerTool({
        name: 'clawcore_credential_mark_failed',
        label: '❌ ClawCore Credential Mark Failed',
        description: 'Mark a credential as failed with error',
        parameters: Type.Object({
            credential_id: Type.String({ description: 'Credential ID to mark as failed' }),
            error: Type.Optional(Type.String()),
        }),
        async execute(_id, _params) {
            const p = _params;
            const error = p.error || 'Unknown error';
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.credential_pool import CredentialPool

pool = CredentialPool(provider='default')
pool.mark_failed('${p.credential_id}', '${error}')
print('ok')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult('Credential marked as failed');
        },
    });

    // ─── Mark Credential Exhausted ─────────────────────────────────
    api.registerTool({
        name: 'clawcore_credential_mark_exhausted',
        label: '⏳ ClawCore Credential Mark Exhausted',
        description: 'Mark a credential as exhausted (rate limited)',
        parameters: Type.Object({
            credential_id: Type.String({ description: 'Credential ID to mark as exhausted' }),
        }),
        async execute(_id, _params) {
            const p = _params;
            const script = `
import sys
sys.path.insert(0, '${CORE_CWD}')
from efficiency_core.credential_pool import CredentialPool

pool = CredentialPool(provider='default')
pool.mark_exhausted('${p.credential_id}')
print('ok')
`;
            const raw = runPython(script);
            if (!raw) return errResult('Python call failed');
            return okResult('Credential marked as exhausted');
        },
    });
}