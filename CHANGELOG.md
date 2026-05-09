# Changelog

All notable changes to this project will be documented in this file.

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