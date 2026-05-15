# Claw_Core Plugin - 規格書 / Specification

**Version: 1.7.0** | **版本: 1.7.0**

---

## English

### 1. Overview

| Field | Value |
|-------|-------|
| Name | Claw_Core Plugin |
| Type | OpenClaw Plugin (TypeScript) |
| Version | 1.7.0 |
| Purpose | Bridge OpenClaw with Python efficiency_core + L4+L5 closed-loop learning |
| Entry | `./dist/register.js` |

### 2. System Architecture

```
OpenClaw Gateway
└── claw-core-plugin (TypeScript)
    ├── tools/ (30+ modules)
    │   ├── core-tools.ts
    │   ├── decompose-router.ts
    │   ├── decomposer-tools.ts
    │   ├── observatory-tools.ts ← NEW (9 tools)
    │   └── ... (26 more)
    ├── hooks/events/
    │   ├── memory-observer/handler.ts ← NEW
    │   ├── context-compressor.ts
    │   └── error-classifier.ts
    ├── services/
    │   ├── l5-notification.ts ← NEW
    │   ├── credential-pool.ts
    │   └── mcp-bridge.ts
    └── signals/
        └── tools.ts
```

### 3. Observatory L4+L5 System

#### Core Components

| Component | File | Description |
|-----------|------|-------------|
| Observatory Core | `observatory.ts` | Outcome capture + pattern detection |
| Weight Engine Adapter | `weight_engine_adapter.ts` | Python/TypeScript bridge |
| Parallel Executor | `parallel_executor.ts` | Multi-agent parallel execution |
| Memory Observer | `memory_observer.ts` | Active memory injection |
| L5 Notification | `l5-notification.ts` | Auto-evolution notifications |

#### Data Flow

```
Tool Execution
  → after_tool_call hook
  → Write to log.jsonl (observatory:outcome-capture)
  → Update patterns.json
  → Check thresholds:
      Pattern ≥3 attempts + ≥85% success → L5 Notify User
      Pattern ≥5 attempts + ≤30% success → L5 Correction Alert
      Every 30 executions → Evolution Check Scheduler
```

#### Data Files

| File | Location | Purpose |
|------|----------|---------|
| `log.jsonl` | `~/.openclaw/workspace/.observatory/` | All tool outcomes |
| `patterns.json` | `~/.openclaw/workspace/.observatory/` | Pattern success rates |
| `notifications.jsonl` | `~/.openclaw/workspace/.observatory/` | L5 notifications |

### 4. 9 Observatory Tools

| Tool | Function | Category |
|------|----------|----------|
| `observatory_stats` | System metrics & execution counts | stats |
| `observatory_weight_stats` | Weight engine statistics by tag | stats |
| `observatory_suggest` | Weighted strategy suggestions | learning |
| `observatory_recent` | View recent tool outcomes | learning |
| `observatory_record` | Manually record outcome | learning |
| `observatory_notifications` | View L5 notifications | learning |
| `observatory_analyze` | Pattern analysis for task types | learning |
| `observatory_health` | System health check | maintenance |
| `observatory_parallel` | Execute tasks in parallel | execution |

### 5. Hooks

| Hook Name | Event | Function |
|-----------|-------|----------|
| `observatory:memory-observer` | `message:preprocessed` | Intent detection + FTS5 memory injection |
| `observatory:outcome-capture` | `after_tool_call` | Capture all tool outcomes (success + failure) |
| `zcrystal:error-classifier` | `after_tool_call` | Error classification with severity |
| `zcrystal:context-compressor` | `message:preprocessed` | Token budget optimization |

### 6. Security Specification

| # | Threat | Mitigation |
|---|--------|------------|
| H1 | SQL Injection (decompose-router) | `runPythonWithStdin` + JSON serialized params |
| H2 | SQL Injection (decompose-router) | Subtasks via stdin as Python variables |
| H3 | Command Injection (core-tools) | Query as spawn argv not embedded string |
| H4 | API Keys in Plain Text | OS Keychain storage |
| H5 | Race Condition (self-evolution) | catch + finally double cleanup |

### 7. Commands

| Command | Description |
|---------|-------------|
| `/decompose <task>` | Task decomposition |
| `/route-task <task>` | Route to appropriate agent |
| `/benchmark` | Tool performance benchmark |
| `/insights` | System insights |

### 8. Build & Deploy

```bash
npm install
npm run build   # tsc → dist/
openclaw gateway restart
```

### Requirements
- Node.js 18+
- TypeScript 5.6+
- OpenClaw >= 2026.4.15

---

## 中文

### 1. 概述

| 欄位 | 數值 |
|------|------|
| 名稱 | Claw_Core Plugin |
| 類型 | OpenClaw 插件（TypeScript）|
| 版本 | 1.7.0 |
| 用途 | 橋接 OpenClaw 與 Python efficiency_core + L4+L5 閉環學習 |
| 入口 | `./dist/register.js` |

### 2. 系統架構

```
OpenClaw Gateway
└── claw-core-plugin (TypeScript)
    ├── tools/ (30+ 模組)
    │   ├── core-tools.ts
    │   ├── decompose-router.ts
    │   ├── decomposer-tools.ts
    │   ├── observatory-tools.ts ← 新增（9 個工具）
    │   └── ...（26 個更多）
    ├── hooks/events/
    │   ├── memory-observer/handler.ts ← 新增
    │   ├── context-compressor.ts
    │   └── error-classifier.ts
    ├── services/
    │   ├── l5-notification.ts ← 新增
    │   ├── credential-pool.ts
    │   └── mcp-bridge.ts
    └── signals/
        └── tools.ts
```

### 3. Observatory L4+L5 系統

#### 核心組件

| 組件 | 檔案 | 說明 |
|------|------|------|
| Observatory 核心 | `observatory.ts` | 結果捕捉 + 模式偵測 |
| Weight Engine 轉接器 | `weight_engine_adapter.ts` | Python/TypeScript 橋接 |
| 平行執行器 | `parallel_executor.ts` | 多代理平行執行 |
| 記憶觀察器 | `memory_observer.ts` | 主動記憶注入 |
| L5 通知服務 | `l5-notification.ts` | 自動進化通知 |

#### 數據流程

```
工具執行
  → after_tool_call 鉤子
  → 寫入 log.jsonl（observatory:outcome-capture）
  → 更新 patterns.json
  → 檢查閾值：
      Pattern ≥3 次執行 + ≥85% 成功率 → L5 通知用戶
      Pattern ≥5 次執行 + ≤30% 成功率 → L5 修正警報
      每 30 次執行 → 進化檢查調度器
```

#### 數據檔案

| 檔案 | 位置 | 用途 |
|------|------|------|
| `log.jsonl` | `~/.openclaw/workspace/.observatory/` | 所有工具結果 |
| `patterns.json` | `~/.openclaw/workspace/.observatory/` | 模式成功率 |
| `notifications.jsonl` | `~/.openclaw/workspace/.observatory/` | L5 通知 |

### 4. 9 個 Observatory 工具

| 工具 | 功能 | 類別 |
|------|------|------|
| `observatory_stats` | 系統指標與執行計數 | 統計 |
| `observatory_weight_stats` | 按標籤的權重引擎統計 | 統計 |
| `observatory_suggest` | 加權策略建議 | 學習 |
| `observatory_recent` | 查看最近的工具結果 | 學習 |
| `observatory_record` | 手動記錄結果 | 學習 |
| `observatory_notifications` | 查看 L5 通知 | 學習 |
| `observatory_analyze` | 任務類型模式分析 | 學習 |
| `observatory_health` | 系統健康檢查 | 維護 |
| `observatory_parallel` | 平行執行任務 | 執行 |

### 5. 鉤子

| 鉤子名稱 | 事件 | 功能 |
|------|-------|------|
| `observatory:memory-observer` | `message:preprocessed` | 意圖偵測 + FTS5 記憶注入 |
| `observatory:outcome-capture` | `after_tool_call` | 捕捉所有工具結果（成功 + 失敗）|
| `zcrystal:error-classifier` | `after_tool_call` | 錯誤分類與嚴重性 |
| `zcrystal:context-compressor` | `message:preprocessed` | Token 預算優化 |

### 6. 安全性規格

| # | 威脅 | 緩解方式 |
|---|------|----------|
| H1 | SQL 注入（decompose-router）| `runPythonWithStdin` + JSON 序列化參數 |
| H2 | SQL 注入（decompose-router）| Subtasks 透過 stdin 作為 Python 變數傳遞 |
| H3 | 命令注入（core-tools）| Query 作為 spawn argv 而非嵌入字串 |
| H4 | API 金鑰明文儲存 | OS Keychain 儲存 |
| H5 | 競態條件（self-evolution）| catch + finally 雙重清理 |

### 7. 命令

| 命令 | 說明 |
|------|------|
| `/decompose <任務>` | 任務分解 |
| `/route-task <任務>` | 路由到適當代理 |
| `/benchmark` | 工具效能基準 |
| `/insights` | 系統洞察 |

### 8. 建置與部署

```bash
npm install
npm run build   # tsc → dist/
openclaw gateway restart
```

### 需求
- Node.js 18+
- TypeScript 5.6+
- OpenClaw >= 2026.4.15

---

## Version History / 版本歷史

| Version | Date | Changes |
|---------|------|---------|
| 1.7.0 | 2026-05-15 | Observatory L4+L5 system: 9 tools, 2 hooks, L5 notifications |
| 1.6.0 | 2026-05-10 | Security fixes H1-H5, real decomposer bridge |
| 1.5.1 | 2026-05-07 | 34 tool files, MCP bridge |
| 1.5.0 | 2026-05-05 | 12 new modules |
| 1.4.0 | 2026-05-04 | Initial version |