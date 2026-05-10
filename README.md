# Claw_Core Plugin

OpenClaw 插件 — Claw_Core 系統整合。

## 功能

- **34+ Tool 模組** — 完整橋接 Python Core 效率模組
- **事件鉤子** — 上下文壓縮、錯誤分類
- **工具註冊表** — 集中式工具發現與管理
- **洞察引擎** — 效能與品質指標
- **認證池** — 安全 API 金鑰管理（OS Keychain）
- **熔斷器** — 容錯模式
- **自我進化** — 模式檢測與反饋學習
- **任務分解器** — 真实 Python 橋接

## 安全性

| 項目 | 狀態 |
|------|------|
| SQL 注入防護（stdin 參數化） | ✅ |
| 命令注入防護（spawn argv 隔離） | ✅ |
| API 金鑰 OS Keychain 儲存 | ✅ |
| 競態條件防護（Set 雙重清理） | ✅ |

## 安裝

```bash
openclaw plugins add /path/to/claw-core-plugin
openclaw gateway restart
```

## 插件資訊

| 欄位 | 數值 |
|------|------|
| 名稱 | claw-core-plugin |
| 版本 | 1.6.0 |
| 入口 | `./dist/register.js` |
| 最低 Gateway | 2026.4.15 |
| Plugin API | >=2026.4.12 |

## 建置

```bash
npm install
npm run build
```

## 可用工具

| 工具 | 說明 |
|------|------|
| `clawcore_decompose` | 透過 Python Core 進行任務分解 |
| `zcrystal_decompose` | 替代任務分解器 |
| `zcrystal_route_task` | 將子任務路由到代理 |
| `zcrystal_health` | 系統健康檢查 |
| `zcrystal_search` | FTS5 對話搜尋 |
| `zcrystal_correction_add` | 新增 L3 修正 |
| `zcrystal_pattern_add` | 新增成功模式 |
| `decomposer_decompose` | 真实 Python 橋接分解器 |

## 架構

```
┌──────────────────────────────────────────┐
│         OpenClaw Gateway                 │
├──────────────────────────────────────────┤
│  claw-core-plugin (TypeScript)           │
│  ├── tools/ (21 tool 模組)              │
│  ├── intelligence/ (自我進化)            │
│  ├── services/ (認證池)                 │
│  ├── hooks/ (上下文、錯誤)              │
│  └── signals/                            │
├──────────────────────────────────────────┤
│  Python Core (openclaw-efficiency-core)  │
│  ├── decomposer.py                       │
│  ├── router.py                           │
│  ├── evolution/                           │
│  └── infrastructure/ (重試、快取...)      │
└──────────────────────────────────────────┘
```

---

*Claw_Core System — AI Agent 基礎設施*