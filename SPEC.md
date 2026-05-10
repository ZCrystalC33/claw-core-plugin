# Claw_Core Plugin - 規格書

## 1. 概述

- **名稱**: Claw_Core Plugin
- **類型**: OpenClaw 插件（TypeScript）
- **版本**: 1.6.0
- **用途**: 橋接 OpenClaw 與 Python Claw_Core 效率模組
- **入口**: `./dist/register.js`

## 2. 系統架構

```
OpenClaw Gateway
└── claw-core-plugin (TypeScript)
    ├── tools/ (21 個模組)
    │   ├── core-tools.ts
    │   ├── decompose-router.ts
    │   ├── decomposer-tools.ts
    │   ├── task-tools.ts
    │   ├── workflow-tools.ts
    │   └── ... (17 更多)
    ├── intelligence/
    │   ├── self-evolution.ts
    │   ├── skill-manager.ts
    │   └── fts5-bridge.ts
    ├── services/
    │   ├── credential-pool.ts
    │   └── mcp-bridge.ts
    ├── hooks/
    │   ├── context-compressor.ts
    │   └── error-classifier.ts
    └── signals/
        └── tools.ts
```

## 3. 安全性規格

| 編號 | 威脅 | 緩解方式 |
|------|------|----------|
| H1 | SQL 注入（decompose-router L69） | `runPythonWithStdin` + JSON 序列化 |
| H2 | SQL 注入（decompose-router L105） | subtasks 作為 Python 變數透過 stdin 傳遞 |
| H3 | 命令注入（core-tools L72） | query 作為 spawn argv 而非嵌入字串 |
| H4 | API 金鑰明文儲存 | OS Keychain 儲存（secret-tool / security） |
| H5 | 競態條件（self-evolution） | catch + finally 雙重清理 evolvingSkills Set |

## 4. 工具清單

### 核心橋接工具
- `zcrystal_search` — FTS5 對話搜尋
- `zcrystal_health` — 系統健康檢查
- `zcrystal_ask_user` — 透過 Honcho 詢問使用者

### 任務分解工具
- `clawcore_decompose` — 任務分解（stdin 橋接）
- `zcrystal_decompose` — 替代分解器
- `decomposer_decompose` — 真实 Python 橋接

### 路由工具
- `zcrystal_route_task` — 將子任務路由到代理

### 任務工具
- `zcrystal_task_create`
- `zcrystal_task_get`
- `zcrystal_task_stats`

### 記憶工具
- `zcrystal_memory_store`（L1-L5）
- `zcrystal_memory_get`

### 模式與修正工具
- `zcrystal_pattern_add`
- `zcrystal_correction_add`
- `zcrystal_correction_list`

### 認證工具
- `zcrystal_credential_add`
- `zcrystal_credential_list`
- `zcrystal_credential_delete`

## 5. 建置與部署

```bash
npm install
npm run build   # tsc → dist/
openclaw gateway restart
```

### 需求
- Node.js 18+
- TypeScript 5.6+
- openclaw >= 2026.4.15

## 6. 命令

| 命令 | 說明 |
|------|------|
| `/decompose <任務>` | 任務分解 |
| `/route-task <任務>` | 路由到適當代理 |
| `/benchmark` | 執行工具效能基準 |
| `/insights` | 查看系統洞察 |

## 7. 版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.6.0 | 2026-05-10 | 安全修復 H1-H5，真實分解器橋接，p-var 清理 |
| 1.5.1 | 2026-05-07 | 34 工具檔案，MCP 橋接 |
| 1.5.0 | 2026-05-05 | 12 新模組 |
| 1.4.0 | 2026-05-04 | 初始版本 |