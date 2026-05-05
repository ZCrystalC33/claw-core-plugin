/**
 * Skill, Version, Index, Validator, Merger Tools
 */

import { Type } from '@sinclair/typebox';
import type { OpenClawPluginApi } from 'openclaw/plugin-sdk/plugin-entry';
import type { PluginState } from '../index.js';
import { okResult, errResult } from '../index.js';
import type { Skill } from '@zcrystal/evo';

// Reuse the Result type helpers from core-tools (FIX: Consistent handling across all tool files)
interface Result<T> { ok: true; data: T }
function isResult<T>(val: unknown): val is Result<T> {
  return typeof val === 'object' && val !== null && 'ok' in val && (val as { ok: boolean }).ok === true;
}
function unwrapSkills(val: unknown): Skill[] {
  if (Array.isArray(val)) return val as Skill[];
  if (isResult(val)) return (val as Result<Skill[]>).data;
  return [];
}

export function registerSkillTools(api: OpenClawPluginApi, state: PluginState) {
  // SkillVersioning Tools
  api.registerTool({
    name: 'zcrystal_version_create',
    label: 'ZCrystal Version Create',
    description: 'Create a new version for a skill',
    parameters: Type.Object({
      skillId: Type.String(), content: Type.String(), title: Type.String(),
      taskType: Type.String(), tags: Type.Optional(Type.Array(Type.String())),
    }),
    async execute(_id, params) {
      const version = await state.skillVersioning.createVersion(params.skillId, params.content,
        { title: params.title, taskType: params.taskType, tags: params.tags || [], createdAt: Date.now(), updatedAt: Date.now(), wasAutomated: false });
      return okResult('Version created: ' + version.version, { versionId: version.id });
    },
  });

  api.registerTool({
    name: 'zcrystal_version_get',
    label: 'ZCrystal Version Get',
    description: 'Get a specific version of a skill',
    parameters: Type.Object({ skillId: Type.String(), version: Type.String() }),
    async execute(_id, params) {
      const version = await state.skillVersioning.getVersion(params.skillId, params.version);
      if (version) return okResult(JSON.stringify(version, null, 2));
      return errResult('Version not found');
    },
  });

  api.registerTool({
    name: 'zcrystal_version_list',
    label: 'ZCrystal Version List',
    description: 'List all versions of a skill',
    parameters: Type.Object({ skillId: Type.String() }),
    async execute(_id, params) {
      const versions = await state.skillVersioning.listVersions(params.skillId);
      return okResult(JSON.stringify(versions, null, 2), { count: versions.length });
    },
  });

  api.registerTool({
    name: 'zcrystal_version_diff',
    label: 'ZCrystal Version Diff',
    description: 'Compute diff between two versions',
    parameters: Type.Object({ skillId: Type.String(), fromVersion: Type.String(), toVersion: Type.String() }),
    async execute(_id, params) {
      const from = await state.skillVersioning.getVersion(params.skillId, params.fromVersion);
      const to = await state.skillVersioning.getVersion(params.skillId, params.toVersion);
      if (!from || !to) return errResult('Version not found');
      const diff = state.skillVersioning.computeDiff(from, to);
      return okResult(JSON.stringify(diff, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_version_stats',
    label: 'ZCrystal Version Stats',
    description: 'Get versioning statistics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const stats = state.skillVersioning.getStats();
      return okResult(JSON.stringify(stats, null, 2));
    },
  });

  api.registerTool({
    name: 'zcrystal_version_rollback',
    label: 'ZCrystal Version Rollback',
    description: 'Rollback to a specific version',
    parameters: Type.Object({ skillId: Type.String(), version: Type.String() }),
    async execute(_id, params) {
      const success = await state.skillVersioning.rollback(params.skillId, params.version);
      if (success) return okResult('Rolled back to: ' + params.version);
      return errResult('Rollback failed');
    },
  });

  // SkillIndexer Tools
  api.registerTool({
    name: 'zcrystal_indexer_search',
    label: 'ZCrystal Indexer Search',
    description: 'Search indexed skills',
    parameters: Type.Object({ query: Type.String(), limit: Type.Optional(Type.Number()) }),
    async execute(_id, params) {
      const results = await state.skillIndexer.search({ query: params.query, topK: params.limit || 10 });
      return okResult(JSON.stringify(results, null, 2), { count: results.length });
    },
  });

  api.registerTool({
    name: 'zcrystal_indexer_index',
    label: 'ZCrystal Indexer Index',
    description: 'Index a skill for search',
    parameters: Type.Object({ skillId: Type.String() }),
    async execute(_id, params) {
      const skillResult = await state.skillManager.getSkill(params.skillId);
      if (!skillResult.ok || !skillResult.data) return errResult('Skill not found: ' + params.skillId);
      await state.skillIndexer.indexSkill(skillResult.data);
      return okResult('Indexed: ' + params.skillId);
    },
  });

  api.registerTool({
    name: 'zcrystal_indexer_rebuild',
    label: 'ZCrystal Indexer Rebuild',
    description: 'Rebuild the entire skill index',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      try {
        // Discover all skills first (handle both Result and array returns)
        const discoverResult = await state.skillManager.discover();
        const skills = unwrapSkills(discoverResult);
        let indexed = 0;
        let failed = 0;

        for (const skill of skills) {
          try {
            await state.skillIndexer.indexSkill(skill);
            indexed++;
          } catch (e) {
            failed++;
            console.warn(`[ZCrystal] Failed to index skill ${skill.slug}:`, e);
          }
        }

        return okResult(`Indexer rebuild complete: ${indexed} indexed, ${failed} failed`, { indexed, failed });
      } catch (err) {
        return errResult('Indexer rebuild failed: ' + String(err));
      }
    },
  });

  api.registerTool({
    name: 'zcrystal_indexer_stats',
    label: 'ZCrystal Indexer Stats',
    description: 'Get indexer statistics',
    parameters: Type.Object({}),
    async execute(_id, _params) {
      const stats = state.skillIndexer.getStats();
      return okResult(JSON.stringify(stats, null, 2));
    },
  });

  // SkillValidator Tools
  api.registerTool({
    name: 'zcrystal_validator_validate',
    label: 'ZCrystal Validator Validate',
    description: 'Validate skill content',
    parameters: Type.Object({ content: Type.String() }),
    async execute(_id, params) {
      const result = state.skillValidator.validate(params.content);
      return okResult(JSON.stringify(result, null, 2), { valid: result.valid });
    },
  });

  api.registerTool({
    name: 'zcrystal_validator_validate_sync',
    label: 'ZCrystal Validator Validate Sync',
    description: 'Quick sync validation of skill content',
    parameters: Type.Object({ content: Type.String() }),
    async execute(_id, params) {
      const valid = state.skillValidator.validateSync(params.content);
      return okResult(valid ? 'Valid' : 'Invalid', { valid });
    },
  });

  // SkillMerger Tools
  api.registerTool({
    name: 'zcrystal_merger_suggest',
    label: 'ZCrystal Merger Suggest',
    description: 'Suggest skill merges based on similarity',
    parameters: Type.Object({ skills: Type.Array(Type.String()) }),
    async execute(_id, params) {
      const result = state.skillMerger.suggestMerges(params.skills);
      return okResult(JSON.stringify(result, null, 2), { count: result.length });
    },
  });

  // SkillVersions
  api.registerTool({
    name: 'zcrystal_skill_versions',
    label: 'ZCrystal Skill Versions',
    description: 'Get version history for a skill',
    parameters: Type.Object({ skillId: Type.String() }),
    async execute(_id, params) {
      const result = await state.router.getSkillVersions(params.skillId);
      if (result.success) return okResult(JSON.stringify(result.data, null, 2), { count: result.data?.versions?.length || 0 });
      return errResult(result.error ?? 'Failed to get skill versions');
    },
  });

  api.registerTool({
    name: 'zcrystal_skill_rollback',
    label: 'ZCrystal Skill Rollback',
    description: 'Rollback skill to a specific version',
    parameters: Type.Object({ skillId: Type.String(), version: Type.String() }),
    async execute(_id, params) {
      const result = await state.router.rollbackSkill(params.skillId, params.version);
      if (result.success) return okResult('Rolled back to version: ' + params.version);
      return errResult(result.error ?? 'Rollback failed');
    },
  });
}
