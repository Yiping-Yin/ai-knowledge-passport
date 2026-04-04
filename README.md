# AI个人知识护照系统

本项目是一个本地优先的个人知识编译系统，用来把原始材料持续编译为可追溯的个人 wiki，并将其中经筛选与授权的部分组织成知识明信片、知识护照与后续可扩展的场景签证。

当前公开仓库实现的是单用户 Web MVP，已经打通以下闭环：

`导入 -> 增量编译 -> 本地问答 -> 正式输出 -> 回流 -> 明信片 -> 简版护照 -> 本地备份`

## Project Status

- 当前阶段：公开 MVP / 开源早期阶段
- 产品方向：本地优先、来源可追、AI 维护、用户裁决
- 当前范围：单用户、本地运行、OpenAI 优先 provider、SQLite 持久化

## What Exists Today

- 多源导入：`markdown`、`txt`、`pdf`、`url`、`image`、`chat`、`audio`
- 本地对象存储与 SQLite 数据模型
- FTS5 + embedding 混合检索
- 知识编译、审阅队列、研究问答、输出回流
- 明信片生成、护照快照生成、备份 zip
- Next.js Web UI 与本地 worker

## Architecture

- `apps/web`: Web UI、Route Handlers、worker、服务层
- `packages/shared`: 共享类型、Zod schema、常量
- `data`: SQLite、本地对象存储、导出包、备份

核心技术栈：

- Next.js App Router
- React + TypeScript
- SQLite + Drizzle ORM + FTS5
- OpenAI Provider 抽象
- 本地 worker 队列

## Quick Start

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

```bash
cp apps/web/.env.example apps/web/.env.local
```

3. 启动应用和 worker

```bash
npm run dev:all
```

4. 打开：

- [http://localhost:3000/dashboard](http://localhost:3000/dashboard)

## Environment

`apps/web/.env.example` 中当前使用的变量：

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_EMBEDDING_MODEL`
- `AIKP_DATA_DIR`
- `AIKP_DATABASE_PATH`
- `AIKP_INLINE_JOBS`

如果没有 `OPENAI_API_KEY`，项目仍可进行部分本地操作，但 OCR、转写、编译、研究问答和护照生成会受限。

## Validation

```bash
npm run typecheck
npm run test
npm run build
```

## Roadmap

当前 GitHub 仓库已建立 `MVP` milestone，并按模块拆分了首批 issue：

- `foundation`
- `ingestion`
- `compiler`
- `research`
- `postcard-passport`
- `backup`

后续大方向包括：

- 更稳定的导入与解析
- 更高质量的增量编译和审阅体验
- 更强的引用、比较与冲突分析
- 更适合公开展示的明信片与护照输出
- 更可靠的备份与恢复能力

## Contributing

欢迎贡献代码、文档、测试、样例和设计建议。

开始前请先阅读：

- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md)

## License

本项目采用 [MIT License](./LICENSE)。
