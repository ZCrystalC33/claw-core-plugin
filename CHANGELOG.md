# Changelog

All notable changes to this project will be documented in this file.

## [1.6.0] - 2026-05-10

### Security (CRITICAL)
- **H1/H2 Fix**: SQL injection in `decompose-router.ts` — use `runPythonWithStdin` for parameterization
- **H3 Fix**: Command injection in `core-tools.ts` — pass query as spawn argv, not embedded string
- **H4 Fix**: Plaintext API key storage in `credential-pool.ts` — moved to OS Keychain
- **H5 Fix**: Race condition in `self-evolution.ts` — catch + finally dual cleanup for evolvingSkills Set

### Added
- **Real Decomposer Bridge** — `decomposer-tools.ts` now wires to actual Python `efficiency_core.decompose()`
- **Unused Variable Cleanup** — Removed 60+ unused `const p = params as any;` declarations

### Changed
- TypeScript build verified clean (0 errors)

---

## [1.5.1] - 2026-05-07

### Added
- **Python Core Bridge** — Complete bridge to 34 Python Core tool files
- **Tool Registry Service** — Centralized tool discovery and management
- **Insights Engine** — Performance metrics and quality insights
- **Event Hooks** — Context compressor and error classifier hooks
- **MCP Bridge Service** — MCP protocol integration

### Changed
- **Import Path Fixes** — `privacy-filter.js` and `signals.js` path corrections
- **Type System** — Enhanced TypeBox type definitions
- **Plugin Entry** — Updated to use `fileURLToPath` for ESM compatibility

### Fixed
- Rate-limit, workerpool, monitor API corrections
- TS stub files for all bridge tool modules

---

## [1.5.0] - 2026-05-05

### Added
- Bridge 12 new Python Core modules to TypeScript
- Add 5 Python efficiency_core modules
- Add 12 event hook handlers

### Changed
- Health/metrics/pipeline/decompose-router tool registration

---

## [1.4.0] - 2026-05-04

### Added
- Initial release with core tool bridging
- 13 Python efficiency_core modules bridged
- Decompose router integration

---

*Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)*