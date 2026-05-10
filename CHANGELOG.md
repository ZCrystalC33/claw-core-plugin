# 更新日誌

所有重大變更都會記錄在此檔案。

## [1.6.0] - 2026-05-10

### 安全性（重大）

| 編號 | 威脅 | 緩解方式 |
|------|------|----------|
| H1 | SQL 注入（decompose-router） | 使用 `runPythonWithStdin` + JSON 序列化參數 |
| H2 | SQL 注入（decompose-router） | 透過 stdin 傳遞 subtasks 作為 Python 變數 |
| H3 | 命令注入（core-tools） | query 作為 spawn argv 而非嵌入字串 |
| H4 | API 金鑰明文儲存 | 改用 OS Keychain（secret-tool / security） |
| H5 | 競態條件（self-evolution） | catch + finally 雙重清理 evolvingSkills Set |

### 新增

- **真實 Decomposer 橋接** — `decomposer-tools.ts` 連接到實際 Python `efficiency_core.decompose()`
- **未使用變數清理** — 移除 60+ 個未使用的 `const p = params as any;` 宣告

### 變更

- TypeScript 建置通過驗證（0 錯誤）

---

## [1.5.1] - 2026-05-07

### 新增
- **Python Core 橋接** — 完整橋接 34 個 Python Core 工具檔案
- **工具註冊表服務** — 集中式工具發現與管理
- **洞察引擎** — 效能指標與品質洞察
- **事件鉤子** — 上下文壓縮器與錯誤分類器
- **MCP 橋接服務** — MCP 協議整合

### 變更
- **匯入路徑修正** — `privacy-filter.js` 和 `signals.js` 路徑修正
- **類型系統** — 增強 TypeBox 類型定義
- **Plugin Entry** — 更新使用 `fileURLToPath` 支援 ESM

### 修復
- Rate-limit、workerpool、monitor API 修正
- TS stub 檔案全部橋接工具模組

---

## [1.5.0] - 2026-05-05

### 新增
- 橋接 12 個新 Python Core 模組
- 新增 5 個 efficiency_core 模組
- 新增 12 個事件鉤子處理器

### 變更
- Health/metrics/pipeline/decompose-router 工具註冊

---

## [1.4.0] - 2026-05-04

### 新增
- 初始版本，核心工具橋接
- 13 個 Python efficiency_core 模組橋接
- 任務分解路由器整合

---

*格式：[Keep a Changelog](https://keepachangelog.com/en/1.0.0/)*