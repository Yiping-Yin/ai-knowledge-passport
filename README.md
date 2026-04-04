# AI个人知识护照系统

本仓库实现一个单用户、本地优先的 Web MVP，跑通以下闭环：

`导入 -> 增量编译 -> 本地问答 -> 正式输出 -> 回流 -> 明信片 -> 简版护照 -> 本地备份`

## 技术栈

- Next.js App Router
- React + TypeScript
- SQLite + Drizzle ORM + FTS5
- OpenAI Provider 抽象
- 本地 worker 队列

## 快速开始

1. 安装依赖：`npm install`
2. 配置环境变量：

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. 启动应用和 worker：

```bash
npm run dev:all
```

4. 打开 [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## 目录结构

- `apps/web`: Web UI、Route Handlers、worker
- `packages/shared`: 共享类型、Zod schema、常量
- `data`: SQLite、本地对象存储、导出包、备份

## GitHub 建议配置

- 仓库名：`ai-knowledge-passport`
- 默认分支：`main`
- 开发分支前缀：`codex/`
- 建议 labels：`foundation`、`ingestion`、`compiler`、`research`、`postcard-passport`、`backup`

## 运行校验

```bash
npm run typecheck
npm run test
npm run build
```
