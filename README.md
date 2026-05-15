# Claw_Core Plugin

**Version: 1.7.0** | OpenClaw 插件 — 完整閉環學習系統

---

## English

### Overview

Claw_Core is an OpenClaw plugin that combines a **4-command skill system** with **L4+L5 closed-loop learning engine** (Observatory System).

### Features

| Category | Description |
|----------|-------------|
| **Command Skills** | `/decompose`, `/route-task`, `/benchmark`, `/insights` |
| **Observatory Tools** | 9 tools for stats, pattern analysis, strategy suggestions |
| **Hooks** | 11 hooks including memory-observer, outcome-capture |
| **L5 Notifications** | Auto-notify on pattern success rate changes |
| **Pattern Learning** | Automatic pattern DB update on every outcome |
| **Python Bridge** | Async bridge to `efficiency_core` modules |

### 9 Observatory Tools

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

### Hooks

| Hook | Event | Function |
|------|-------|----------|
| `observatory:memory-observer` | `message:preprocessed` | Intent detection + FTS5 memory injection |
| `observatory:outcome-capture` | `after_tool_call` | Capture all tool outcomes (success + failure) |
| `zcrystal:error-classifier` | `after_tool_call` | Error classification with severity |
| `zcrystal:context-compressor` | `message:preprocessed` | Token budget optimization |

### L5 Closed-Loop Learning

```
Tool Execution → after_tool_call hook → write log.jsonl → update patterns.json
                                                      ↓
                        Pattern ≥3 attempts + ≥85% success → Notify user
                        Pattern ≥5 attempts + ≤30% success → Correction alert
                        Every 30 executions → Evolution check scheduler
```

### Security

| Feature | Status |
|---------|--------|
| SQL Injection Protection (stdin JSON) | ✅ |
| Command Injection Prevention (spawn argv) | ✅ |
| API Keys in OS Keychain | ✅ |
| Race Condition Protection | ✅ |

### Installation

```bash
openclaw plugins add /path/to/claw-core-plugin
openclaw gateway restart
```

---

## 中文

### 概述

Claw_Core 是一個 OpenClaw 插件，結合了**4 指令技能系統**與 **L4+L5 閉環學習引擎**（Observatory 系統）。

### 功能

| 類別 | 說明 |
|------|------|
| **指令技能** | `/decompose`, `/route-task`, `/benchmark`, `/insights` |
| **Observatory 工具** | 9 個工具用於統計、模式分析、策略建議 |
| **鉤子** | 11 個鉤子包括 memory-observer、outcome-capture |
| **L5 通知** | 模式成功率變化時自動通知 |
| **模式學習** | 每次結果後自動更新模式資料庫 |
| **Python 橋接** | 非同步橋接到 `efficiency_core` 模組 |

### 9 個 Observatory 工具

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

### 鉤子

| 鉤子 | 事件 | 功能 |
|------|-------|------|
| `observatory:memory-observer` | `message:preprocessed` | 意圖偵測 + FTS5 記憶注入 |
| `observatory:outcome-capture` | `after_tool_call` | 捕捉所有工具結果（成功 + 失敗）|
| `zcrystal:error-classifier` | `after_tool_call` | 錯誤分類與嚴重性 |
| `zcrystal:context-compressor` | `message:preprocessed` | Token 預算優化 |

### L5 閉環學習

```
工具執行 → after_tool_call 鉤子 → 寫入 log.jsonl → 更新 patterns.json
                                                     ↓
                  Pattern ≥3 次執行 + ≥85% 成功率 → 通知用戶
                  Pattern ≥5 次執行 + ≤30% 成功率 → 修正警報
                  每 30 次執行 → 進化檢查調度器
```

### 安全性

| 功能 | 狀態 |
|------|------|
| SQL 注入防護（stdin JSON） | ✅ |
| 命令注入防護（spawn argv） | ✅ |
| API 金鑰 OS Keychain 儲存 | ✅ |
| 競態條件防護 | ✅ |

### 安裝

```bash
openclaw plugins add /path/to/claw-core-plugin
openclaw gateway restart
```

---

## Repository

**GitHub**: https://github.com/ZCrystalC33/claw-core-plugin