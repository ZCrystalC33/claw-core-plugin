# CHANGELOG

All notable changes are recorded in this file.

---

## [1.7.0] - 2026-05-15

### English

#### Observatory L4+L5 Closed-Loop Learning System

##### New Components

| Component | File | Description |
|-----------|------|-------------|
| Observatory Core | `observatory.ts` | Outcome capture + pattern detection |
| Weight Engine Adapter | `weight_engine_adapter.ts` | Python/TypeScript bridge |
| Parallel Executor | `parallel_executor.ts` | Multi-agent parallel execution |
| Memory Observer | `memory_observer.ts` | Active memory injection hook |
| L5 Notification | `l5-notification.ts` | Auto-evolution notifications |

##### 9 New Observatory Tools

| Tool | Function |
|------|----------|
| `observatory_stats` | System metrics & execution counts |
| `observatory_weight_stats` | Weight engine statistics by tag |
| `observatory_suggest` | Weighted strategy suggestions |
| `observatory_recent` | View recent tool outcomes |
| `observatory_record` | Manually record outcome |
| `observatory_notifications` | View L5 notifications |
| `observatory_analyze` | Pattern analysis for task types |
| `observatory_health` | System health check |
| `observatory_parallel` | Execute tasks in parallel |

##### 2 New Hooks

| Hook | Event | Function |
|------|-------|----------|
| `observatory:memory-observer` | `message:preprocessed` | Intent detection + FTS5 memory injection |
| `observatory:outcome-capture` | `after_tool_call` | Capture all tool outcomes (success + failure) |

##### L5 Automatic Notifications

- **Pattern ≥85% success rate** (3+ attempts) → Auto-notify: "Pattern confirmed as recommended"
- **Pattern ≤30% success rate** (5+ attempts) → Auto-notify: "Pattern needs review"
- **Every 30 tool executions** → Evolution check scheduler

##### Hook Execution Chain

```
agent:bootstrap
  → zcrystal:context-compressor (message:preprocessed)
  → observatory:memory-observer (message:preprocessed)
  → zcrystal:error-classifier (after_tool_call)
  → observatory:outcome-capture (after_tool_call) ← Universal outcome
  → L5 scheduler (every 30 executions)
  → ZCrystal self-doubt (llm_output / before_prompt_build)
```

##### Pattern Detection

- Automatic pattern DB update on every outcome
- Category-based success rate tracking
- avgDuration tracking per pattern

##### Files Changed

- `register.ts`: Added 2 hooks + L5 scheduler
- `src/tools/observatory-tools.ts`: 9 new tools
- `src/hooks/events/memory-observer/handler.ts`: New hook handler
- `src/services/l5-notification.ts`: New service
- `src/tools/index.ts`: Export observatory tools

---

## 中文

### Observatory L4+L5 閉環學習系統

##### 新增組件

| 組件 | 檔案 | 說明 |
|------|------|------|
| Observatory 核心 | `observatory.ts` | 結果捕捉 + 模式偵測 |
| Weight Engine 轉接器 | `weight_engine_adapter.ts` | Python/TypeScript 橋接 |
| 平行執行器 | `parallel_executor.ts` | 多代理平行執行 |
| 記憶觀察器 | `memory_observer.ts` | 主動記憶注入鉤子 |
| L5 通知服務 | `l5-notification.ts` | 自動進化通知 |

##### 9 個新 Observatory 工具

| 工具 | 功能 |
|------|------|
| `observatory_stats` | 系統指標與執行計數 |
| `observatory_weight_stats` | 按標籤的權重引擎統計 |
| `observatory_suggest` | 加權策略建議 |
| `observatory_recent` | 查看最近的工具結果 |
| `observatory_record` | 手動記錄結果 |
| `observatory_notifications` | 查看 L5 通知 |
| `observatory_analyze` | 任務類型模式分析 |
| `observatory_health` | 系統健康檢查 |
| `observatory_parallel` | 平行執行任務 |

##### 2 個新鉤子

| 鉤子 | 事件 | 功能 |
|------|-------|------|
| `observatory:memory-observer` | `message:preprocessed` | 意圖偵測 + FTS5 記憶注入 |
| `observatory:outcome-capture` | `after_tool_call` | 捕捉所有工具結果（成功 + 失敗）|

##### L5 自動通知

- **Pattern ≥85% 成功率**（3+ 次執行）→ 自動通知：「已列為首選策略」
- **Pattern ≤30% 成功率**（5+ 次執行）→ 自動通知：「建議檢視策略」
- **每 30 次工具執行** → 進化檢查調度器

##### 鉤子執行鏈

```
agent:bootstrap
  → zcrystal:context-compressor (message:preprocessed)
  → observatory:memory-observer (message:preprocessed)
  → zcrystal:error-classifier (after_tool_call)
  → observatory:outcome-capture (after_tool_call) ← 全域結果
  → L5 調度器（每 30 次執行）
  → ZCrystal self-doubt (llm_output / before_prompt_build)
```

##### 模式偵測

- 每次結果後自動更新模式資料庫
- 按類別的成功率追蹤
- 每個模式的平均執行時間追蹤

##### 變更的檔案

- `register.ts`: 新增 2 個鉤子 + L5 調度器
- `src/tools/observatory-tools.ts`: 9 個新工具
- `src/hooks/events/memory-observer/handler.ts`: 新鉤子處理器
- `src/services/l5-notification.ts`: 新服務
- `src/tools/index.ts`: 匯出 observatory 工具

---

## [1.6.0] - 2026-05-10

### English

#### Security Fixes (Critical)

| # | Threat | Mitigation |
|---|--------|------------|
| H1 | SQL Injection (decompose-router) | Use `runPythonWithStdin` + JSON serialized params |
| H2 | SQL Injection (decompose-router) | Pass subtasks via stdin as Python variables |
| H3 | Command Injection (core-tools) | Query as spawn argv instead of embedded string |
| H4 | API Keys in Plain Text | Use OS Keychain (secret-tool / security) |
| H5 | Race Condition (self-evolution) | catch + finally double cleanup of evolvingSkills Set |

#### New Features

- **Real Decomposer Bridge** — `decomposer-tools.ts` connects to actual Python `efficiency_core.decompose()`
- **Unused Variable Cleanup** — Removed 60+ unused `const p = params as any;` declarations

#### Changes

- TypeScript build passes validation (0 errors)

---

## 中文

### 安全性修復（重大）

| # | 威脅 | 緩解方式 |
|---|------|----------|
| H1 | SQL 注入（decompose-router）| 使用 `runPythonWithStdin` + JSON 序列化參數 |
| H2 | SQL 注入（decompose-router）| 透過 stdin 傳遞 subtasks 作為 Python 變數 |
| H3 | 命令注入（core-tools）| query 作為 spawn argv 而非嵌入字串 |
| H4 | API 金鑰明文儲存 | 改用 OS Keychain（secret-tool / security）|
| H5 | 競態條件（self-evolution）| catch + finally 雙重清理 evolvingSkills Set |

#### 新增功能

- **真實 Decomposer 橋接** — `decomposer-tools.ts` 連接到實際 Python `efficiency_core.decompose()`
- **未使用變數清理** — 移除 60+ 個未使用的 `const p = params as any;` 宣告

#### 變更

- TypeScript 建置通過驗證（0 錯誤）

---

*Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)*