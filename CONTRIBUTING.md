# Contributing

感谢你为 AI个人知识护照系统 做贡献。

这个仓库当前处于公开 MVP 阶段，优先接受以下方向的贡献：

- 本地优先知识工作流
- 多源导入与解析稳定性
- 知识编译与审阅质量
- 检索、引用与研究问答质量
- 备份、恢复与知识主权相关能力

## Before You Start

在开始实现前，请先：

1. 查看已有 issue 和 `MVP` milestone。
2. 如果是较大改动，先开 issue 或在已有 issue 下说明方案。
3. 避免把产品方向性讨论直接变成大面积代码改写。

## Local Setup

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:all
```

默认入口：

- Web UI: `http://localhost:3000/dashboard`

常用校验：

```bash
npm run typecheck
npm run test
npm run build
```

## Branching

- 默认开发分支前缀：`codex/`
- 提交前请确保当前分支不是 `main`
- 如果你的改动对应 issue，建议在分支名中带 issue 语义，例如：`codex/ingestion-retries`

## Pull Requests

PR 应尽量保持单一目的，正文至少说明：

- 解决的问题
- 采取的方案
- 主要权衡
- 验证方式

如果改动影响产品行为，请同时更新：

- `README.md`
- 相关 API/环境变量说明
- 测试或示例

## Coding Expectations

- 保持本地优先和可追溯原则，不要默认把用户数据发送到第三方服务
- 所有正式输出应尽量保留来源回链与证据结构
- 新增能力应优先通过服务层和共享 schema 暴露，而不是把逻辑散落进页面
- 涉及导入、编译、问答、护照、备份的改动，应补最小回归测试

## Good First Contributions

适合开源协作的起点通常包括：

- 修复导入报错和边界条件
- 增加解析与编译测试
- 优化中文界面文案和信息层次
- 补文档、示例数据和开发脚本

## Security

请不要在公开 issue 中披露安全漏洞细节。

参见 [SECURITY.md](./SECURITY.md)。
